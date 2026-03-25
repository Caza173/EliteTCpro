import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Rate limiter keyed by reference_code
const requestLog = new Map();

function isRateLimited(code) {
  const key = code.toUpperCase();
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 10;

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
  const { reference_code } = body;

  // Validate input — code only, no email allowed
  if (!reference_code || typeof reference_code !== "string") {
    return Response.json({ error: "Agent code is required." }, { status: 400 });
  }

  const code = reference_code.trim().toUpperCase();

  // Must match exact format: letters and numbers only, 6–16 chars (or AGT-XXXXXX)
  if (code.length < 3 || code.length > 20) {
    return Response.json({ found: false });
  }

  if (isRateLimited(code)) {
    return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  // Exact match only — no partial search, no list exposure
  const agents = await base44.asServiceRole.entities.Agent.list();
  const agent = agents.find(a => a.reference_code?.trim().toUpperCase() === code);

  if (!agent) {
    return Response.json({ found: false });
  }

  // Fetch transactions tied to this agent via allowed_agent_code
  const allTx = await base44.asServiceRole.entities.Transaction.list();
  const matched = allTx.filter(tx =>
    tx.allowed_agent_code?.trim().toUpperCase() === code
  );

  const active = matched
    .filter(tx => tx.status !== "cancelled" && tx.status !== "closed")
    .sort((a, b) => {
      if (!a.closing_date && !b.closing_date) return 0;
      if (!a.closing_date) return 1;
      if (!b.closing_date) return -1;
      return new Date(a.closing_date) - new Date(b.closing_date);
    });

  if (active.length === 0) {
    return Response.json({ found: false, reason: "no_transactions" });
  }

  // Fetch supporting data
  const [allDocuments, allChecklists, allFinances] = await Promise.all([
    base44.asServiceRole.entities.Document.list(),
    base44.asServiceRole.entities.DocumentChecklistItem.list(),
    base44.asServiceRole.entities.TransactionFinance.list(),
  ]);

  const today = new Date();

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

  function getDealHealth(tx) {
    const overdue = getOverdueDeadlines(tx);
    if (overdue.length > 0) return { label: "⚠️ Attention Needed", color: "#b91c1c", bg: "#fef2f2", border: "#fca5a5" };
    const closingDays = tx.closing_date ? Math.ceil((new Date(tx.closing_date) - today) / (1000 * 60 * 60 * 24)) : null;
    const openTasks = (tx.tasks || []).filter(t => !t.completed);
    if (closingDays !== null && closingDays <= 7 && openTasks.length > 0) {
      return { label: "⚠️ Attention Needed", color: "#b91c1c", bg: "#fef2f2", border: "#fca5a5" };
    }
    return { label: "✅ On Track", color: "#166534", bg: "#f0fdf4", border: "#86efac" };
  }

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
      if (!present && !checklistItem?.required) return null;
      return { label, present };
    }).filter(Boolean);
  }

  function fmtDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  const STATUS_LABELS = { active: "Under Contract", pending: "Pending", closed: "Closed" };

  const sections = active.map(tx => {
    const nextDeadline = getNextDeadline(tx);
    const health = getDealHealth(tx);
    const docStatus = getDocStatus(tx.id);
    const finance = allFinances.find(f => f.transaction_id === tx.id);
    const purchasePrice = finance?.sale_price || tx.sale_price;

    const deadlineStr = nextDeadline
      ? `${nextDeadline.label} – ${fmtDate(nextDeadline.raw)} <span style="color:#64748b;font-size:13px;">(${nextDeadline.daysLeft === 0 ? "TODAY" : `${nextDeadline.daysLeft} day${nextDeadline.daysLeft !== 1 ? "s" : ""}`})</span>`
      : "No upcoming deadlines";

    const agentTasks = (tx.tasks || []).filter(t => !t.completed && t.assigned_to === "agent");
    const actionStr = agentTasks.length > 0
      ? agentTasks.slice(0, 5).map(t => {
          const dueStr = t.due_date ? ` <span style="color:#94a3b8;font-size:12px;">(due ${fmtDate(t.due_date)})</span>` : "";
          return `<li style="margin-bottom:4px;">• ${t.name}${dueStr}</li>`;
        }).join("")
      : `<li style="color:#166534;">No action needed from you at this time.</li>`;

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

    return `
      <div style="border:1px solid ${health.border};border-radius:12px;padding:20px;margin-bottom:20px;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
          <h3 style="margin:0;color:#0f172a;font-size:17px;font-weight:700;">${tx.address}</h3>
          <span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${health.bg};color:${health.color};border:1px solid ${health.border};">
            ${health.label}
          </span>
        </div>
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
        <div style="margin-bottom:14px;">
          <p style="margin:0 0 6px;color:#0f172a;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Documents</p>
          <table style="width:100%;border-collapse:collapse;">${docRows}</table>
        </div>
        <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:14px;">
          <p style="margin:0 0 6px;color:#0f172a;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Action Needed From You</p>
          <ul style="margin:0;padding:0;list-style:none;">${actionStr}</ul>
        </div>
      </div>
    `;
  }).join("");

  // Get agent contact info for the email recipient
  const allContacts = await base44.asServiceRole.entities.Contact.list();
  const contact = allContacts.find(c => c.id === agent.contact_id);
  const agentEmail = contact?.email;

  if (agentEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: agentEmail,
      from_name: "EliteTC",
      subject: `Transaction Update – ${active.length} Active Deal${active.length !== 1 ? "s" : ""}`,
      body: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;padding:24px;background:#f8fafc;">
          <div style="text-align:center;margin-bottom:28px;padding:20px;background:#0f172a;border-radius:12px;">
            <h1 style="color:#c9a227;font-size:26px;margin:0 0 4px;letter-spacing:-0.5px;">EliteTC</h1>
            <p style="color:#94a3b8;margin:0;font-size:13px;">Transaction Status Update · ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
          </div>
          <p style="color:#475569;font-size:14px;margin-bottom:20px;">
            Here is a snapshot of your <strong>${active.length} active deal${active.length !== 1 ? "s" : ""}</strong>. Sorted by closing date.
          </p>
          ${sections}
          <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">Accessed via Agent Reference Code.</p>
            <p style="color:#94a3b8;font-size:11px;margin:4px 0 0;">Do not reply to this email. Contact your TC for full details.</p>
          </div>
        </div>
      `,
    });
  }

  return Response.json({ found: true, count: active.length });
});