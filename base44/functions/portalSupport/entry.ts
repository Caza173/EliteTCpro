import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Simple in-memory rate limiter (resets on cold start, fine for low-volume use)
const requestLog = new Map();

function isRateLimited(email) {
  const key = email.toLowerCase();
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 3;

  const entries = (requestLog.get(key) || []).filter(t => now - t < windowMs);
  if (entries.length >= maxRequests) return true;
  entries.push(now);
  requestLog.set(key, entries);
  return false;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const body = await req.json();
  const { action } = body;

  // ── CONTACT US ──────────────────────────────────────────────────────────────
  if (action === "contact") {
    const { name, email, brokerage, subject, message } = body;
    if (!name || !email || !subject || !message) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const timestamp = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

    // Find all admin/owner users to notify in-app
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUsers = allUsers.filter(u => u.role === "admin" || u.role === "owner" || u.role === "tc_lead");

    const notifBody = `From: ${name} (${email})${brokerage ? ` | ${brokerage}` : ""} | ${timestamp}\n\n${message}`;

    await Promise.all(adminUsers.map(u =>
      base44.asServiceRole.entities.InAppNotification.create({
        user_email: u.email,
        title: `📩 Contact Form: ${subject}`,
        body: notifBody.substring(0, 500),
        type: "system",
      })
    ));

    return Response.json({ success: true });
  }

  // ── TRANSACTION UPDATE REQUEST — legacy, now handled by agentCodeLookup ─────
  if (action === "transaction_update") {
    return Response.json({ error: "This endpoint has been replaced. Please use your Agent Reference Code." }, { status: 410 });
  }

  if (action === "_legacy_transaction_update") {
    const { agent_email } = body;
    if (!agent_email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    if (isRateLimited(agent_email)) {
      return Response.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
    }

    const normalizedEmail = agent_email.toLowerCase().trim();
    const today = new Date();

    // ── Fetch all data in parallel ───────────────────────────────────────────
    const [allTx, allParticipants, allContacts, allDocuments, allChecklists, allFinances] = await Promise.all([
      base44.asServiceRole.entities.Transaction.list(),
      base44.asServiceRole.entities.TransactionParticipant.list(),
      base44.asServiceRole.entities.Contact.list(),
      base44.asServiceRole.entities.Document.list(),
      base44.asServiceRole.entities.DocumentChecklistItem.list(),
      base44.asServiceRole.entities.TransactionFinance.list(),
    ]);

    // ── Match transactions by any participant connection ─────────────────────
    // 1. Direct agent_email on transaction
    const directMatches = new Set(
      allTx
        .filter(tx =>
          tx.agent_email?.toLowerCase() === normalizedEmail ||
          tx.buyers_agent_name?.toLowerCase() === normalizedEmail ||
          tx.sellers_agent_name?.toLowerCase() === normalizedEmail
        )
        .map(tx => tx.id)
    );

    // 2. Via TransactionParticipant → Contact email
    const matchingContactIds = new Set(
      allContacts
        .filter(c => c.email?.toLowerCase() === normalizedEmail)
        .map(c => c.id)
    );
    const participantTxIds = new Set(
      allParticipants
        .filter(p =>
          matchingContactIds.has(p.contact_id) &&
          (p.role === "listing_agent" || p.role === "buyer_agent")
        )
        .map(p => p.transaction_id)
    );

    const matchedIds = new Set([...directMatches, ...participantTxIds]);
    const transactions = allTx.filter(tx => matchedIds.has(tx.id));
    const active = transactions
      .filter(tx => tx.status !== "cancelled" && tx.status !== "closed")
      .sort((a, b) => {
        if (!a.closing_date && !b.closing_date) return 0;
        if (!a.closing_date) return 1;
        if (!b.closing_date) return -1;
        return new Date(a.closing_date) - new Date(b.closing_date);
      });

    if (active.length === 0) {
      return Response.json({ found: false });
    }

    // ── Helper: next upcoming deadline ───────────────────────────────────────
    const DEADLINE_FIELDS = {
      earnest_money_deadline: "Earnest Money",
      inspection_deadline: "Inspection",
      due_diligence_deadline: "Due Diligence",
      appraisal_deadline: "Appraisal",
      financing_deadline: "Financing Commitment",
      ctc_target: "Clear to Close",
      closing_date: "Closing",
    };

    function getNextDeadline(tx) {
      const upcoming = [];
      for (const [field, label] of Object.entries(DEADLINE_FIELDS)) {
        if (tx[field]) {
          const d = new Date(tx[field]);
          const daysLeft = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
          if (daysLeft >= 0) upcoming.push({ label, date: d, raw: tx[field], daysLeft });
        }
      }
      upcoming.sort((a, b) => a.daysLeft - b.daysLeft);
      return upcoming[0] || null;
    }

    function getOverdueDeadlines(tx) {
      const overdue = [];
      for (const [field, label] of Object.entries(DEADLINE_FIELDS)) {
        if (tx[field]) {
          const d = new Date(tx[field]);
          const daysLeft = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
          if (daysLeft < 0) overdue.push({ label, daysLeft: Math.abs(daysLeft) });
        }
      }
      return overdue;
    }

    // ── Helper: agent action tasks ────────────────────────────────────────────
    function getAgentTasks(tx) {
      if (!tx.tasks) return [];
      return tx.tasks.filter(t => !t.completed && (t.assigned_to === "agent" || t.assigned_to === normalizedEmail));
    }

    function getAllOpenTasks(tx) {
      if (!tx.tasks) return [];
      return tx.tasks.filter(t => !t.completed);
    }

    // ── Helper: deal health ───────────────────────────────────────────────────
    function getDealHealth(tx) {
      const overdue = getOverdueDeadlines(tx);
      if (overdue.length > 0) return { label: "⚠️ Attention Needed", color: "#b91c1c", bg: "#fef2f2", border: "#fca5a5" };

      const closingDays = tx.closing_date
        ? Math.ceil((new Date(tx.closing_date) - today) / (1000 * 60 * 60 * 24))
        : null;
      const openTasks = getAllOpenTasks(tx);
      if (closingDays !== null && closingDays <= 7 && openTasks.length > 0) {
        return { label: "⚠️ Attention Needed", color: "#b91c1c", bg: "#fef2f2", border: "#fca5a5" };
      }
      return { label: "✅ On Track", color: "#166534", bg: "#f0fdf4", border: "#86efac" };
    }

    // ── Helper: document status summary ──────────────────────────────────────
    const KEY_DOCS = [
      { key: "purchase_and_sale", label: "Purchase Agreement" },
      { key: "listing_agreement", label: "Listing Agreement" },
      { key: "buyer_agency_agreement", label: "Buyer Agency Agreement" },
      { key: "addendum", label: "Addendum" },
    ];

    function getDocStatus(txId) {
      const txDocs = allDocuments.filter(d => d.transaction_id === txId);
      const txChecklist = allChecklists.filter(c => c.transaction_id === txId);
      const docTypes = new Set(txDocs.map(d => d.doc_type));

      return KEY_DOCS.map(({ key, label }) => {
        const inDocs = docTypes.has(key);
        const checklistItem = txChecklist.find(c => c.doc_type === key);
        const present = inDocs || (checklistItem && checklistItem.status !== "missing");
        // Only show if this doc type is relevant (present OR required)
        if (!present && !checklistItem?.required) return null;
        return { label, present };
      }).filter(Boolean);
    }

    // ── Format date helper ────────────────────────────────────────────────────
    function fmtDate(dateStr) {
      if (!dateStr) return "—";
      return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }

    // ── Build each transaction section ────────────────────────────────────────
    const STATUS_LABELS = { active: "Under Contract", pending: "Pending", closed: "Closed" };

    const sections = active.map(tx => {
      const nextDeadline = getNextDeadline(tx);
      const agentTasks = getAgentTasks(tx);
      const health = getDealHealth(tx);
      const docStatus = getDocStatus(tx.id);
      const finance = allFinances.find(f => f.transaction_id === tx.id);
      const purchasePrice = finance?.sale_price || tx.sale_price;

      // Next deadline string
      const deadlineStr = nextDeadline
        ? `${nextDeadline.label} – ${fmtDate(nextDeadline.raw)} <span style="color:#64748b;font-size:13px;">(${nextDeadline.daysLeft === 0 ? "TODAY" : `${nextDeadline.daysLeft} day${nextDeadline.daysLeft !== 1 ? "s" : ""}`})</span>`
        : "No upcoming deadlines";

      // Action needed
      const actionStr = agentTasks.length > 0
        ? agentTasks.slice(0, 5).map(t => {
            const dueStr = t.due_date ? ` <span style="color:#94a3b8;font-size:12px;">(due ${fmtDate(t.due_date)})</span>` : "";
            return `<li style="margin-bottom:4px;">• ${t.name}${dueStr}</li>`;
          }).join("")
        : `<li style="color:#166534;">No action needed from you at this time.</li>`;

      // Document rows
      const docRows = docStatus.length > 0
        ? docStatus.map(d => `
            <tr>
              <td style="padding:5px 0;color:#475569;font-size:14px;">${d.label}</td>
              <td style="padding:5px 0;font-size:14px;text-align:right;">
                ${d.present
                  ? `<span style="color:#166534;font-weight:600;">✔ Received</span>`
                  : `<span style="color:#b45309;font-weight:600;">⚠ Missing</span>`}
              </td>
            </tr>`).join("")
        : `<tr><td colspan="2" style="color:#94a3b8;font-size:13px;padding:4px 0;">No document checklist available.</td></tr>`;

      const dealLink = `https://nhcazateam.base44.app/#/TransactionDetail?id=${tx.id}`;

      return `
        <div style="border:1px solid ${health.border};border-radius:12px;padding:20px;margin-bottom:20px;background:#fff;">

          <!-- Header row -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
            <h3 style="margin:0;color:#0f172a;font-size:17px;font-weight:700;">${tx.address}</h3>
            <span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${health.bg};color:${health.color};border:1px solid ${health.border};">
              ${health.label}
            </span>
          </div>

          <!-- Key stats grid -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
            <tr>
              <td style="padding:5px 12px 5px 0;color:#64748b;font-size:13px;white-space:nowrap;width:40%;">Status</td>
              <td style="padding:5px 0;color:#0f172a;font-size:14px;font-weight:600;">${STATUS_LABELS[tx.status] || tx.status}</td>
            </tr>
            ${purchasePrice ? `
            <tr>
              <td style="padding:5px 12px 5px 0;color:#64748b;font-size:13px;">Purchase Price</td>
              <td style="padding:5px 0;color:#0f172a;font-size:14px;font-weight:600;">$${Number(purchasePrice).toLocaleString()}</td>
            </tr>` : ""}
            <tr>
              <td style="padding:5px 12px 5px 0;color:#64748b;font-size:13px;">Closing Date</td>
              <td style="padding:5px 0;color:#0f172a;font-size:14px;font-weight:600;">${fmtDate(tx.closing_date)}</td>
            </tr>
            <tr>
              <td style="padding:5px 12px 5px 0;color:#64748b;font-size:13px;">Next Deadline</td>
              <td style="padding:5px 0;color:#0f172a;font-size:14px;font-weight:600;">${deadlineStr}</td>
            </tr>
          </table>

          <!-- Documents -->
          <div style="margin-bottom:14px;">
            <p style="margin:0 0 6px;color:#0f172a;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Documents</p>
            <table style="width:100%;border-collapse:collapse;">${docRows}</table>
          </div>

          <!-- Action Needed -->
          <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:14px;">
            <p style="margin:0 0 6px;color:#0f172a;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Action Needed From You</p>
            <ul style="margin:0;padding:0;list-style:none;">${actionStr}</ul>
          </div>

          <!-- View Deal Link -->
          <a href="${dealLink}" style="display:inline-block;padding:8px 16px;background:#c9a227;color:#0f172a;border-radius:6px;font-size:13px;font-weight:700;text-decoration:none;">
            View Full Transaction →
          </a>
        </div>
      `;
    }).join("");

    // ── Send email ────────────────────────────────────────────────────────────
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: agent_email,
      from_name: "EliteTC",
      subject: `Transaction Update – ${active.length} Active Deal${active.length !== 1 ? "s" : ""}`,
      body: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;padding:24px;background:#f8fafc;">

          <!-- Header -->
          <div style="text-align:center;margin-bottom:28px;padding:20px;background:#0f172a;border-radius:12px;">
            <h1 style="color:#c9a227;font-size:26px;margin:0 0 4px;letter-spacing:-0.5px;">EliteTC</h1>
            <p style="color:#94a3b8;margin:0;font-size:13px;">Transaction Status Update · ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
          </div>

          <p style="color:#475569;font-size:14px;margin-bottom:20px;">
            Here is a snapshot of your <strong>${active.length} active deal${active.length !== 1 ? "s" : ""}</strong>. Sorted by closing date.
          </p>

          ${sections}

          <!-- Footer -->
          <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">This update was requested for <strong>${agent_email}</strong>.</p>
            <p style="color:#94a3b8;font-size:11px;margin:4px 0 0;">Do not reply to this email. Log into the Agent Portal for full details.</p>
          </div>
        </div>
      `,
    });

    return Response.json({ found: true, count: active.length });
  } // end _legacy_transaction_update

  return Response.json({ error: "Unknown action" }, { status: 400 });
});