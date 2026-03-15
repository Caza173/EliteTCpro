import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow scheduled (no auth) or admin-triggered calls
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

  const today = new Date();

  // ── Fetch all shared data once ───────────────────────────────────────────────
  const [allUsers, allTx, allParticipants, allContacts, allDocuments, allChecklists, allFinances] = await Promise.all([
    base44.asServiceRole.entities.User.list(),
    base44.asServiceRole.entities.Transaction.list(),
    base44.asServiceRole.entities.TransactionParticipant.list(),
    base44.asServiceRole.entities.Contact.list(),
    base44.asServiceRole.entities.Document.list(),
    base44.asServiceRole.entities.DocumentChecklistItem.list(),
    base44.asServiceRole.entities.TransactionFinance.list(),
  ]);

  // Active/pending transactions only
  const activeTransactions = allTx.filter(tx => tx.status === "active" || tx.status === "pending");

  if (activeTransactions.length === 0) {
    return Response.json({ success: true, sent: 0, message: "No active transactions." });
  }

  // ── Build contact email → id map ─────────────────────────────────────────────
  const contactEmailToId = new Map(
    allContacts.filter(c => c.email).map(c => [c.email.toLowerCase(), c.id])
  );

  // ── Collect all unique agent emails from active transactions ─────────────────
  const agentEmailsSet = new Set();

  for (const tx of activeTransactions) {
    if (tx.agent_email) agentEmailsSet.add(tx.agent_email.toLowerCase().trim());
  }

  // Also collect from participants with agent roles
  const agentParticipantContactIds = new Set(
    allParticipants
      .filter(p => p.role === "listing_agent" || p.role === "buyer_agent")
      .map(p => p.contact_id)
  );
  for (const contact of allContacts) {
    if (contact.email && agentParticipantContactIds.has(contact.id)) {
      agentEmailsSet.add(contact.email.toLowerCase().trim());
    }
  }

  // ── Build user lookup for opt-out check and name ─────────────────────────────
  const userByEmail = new Map(allUsers.map(u => [u.email?.toLowerCase(), u]));

  // ── Shared helpers (same as portalSupport) ───────────────────────────────────
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

  function getAllOpenTasks(tx) {
    return (tx.tasks || []).filter(t => !t.completed);
  }

  function getAgentTasks(tx, normalizedEmail) {
    return (tx.tasks || []).filter(t => !t.completed && (t.assigned_to === "agent" || t.assigned_to === normalizedEmail));
  }

  function getDealHealth(tx) {
    const overdue = getOverdueDeadlines(tx);
    if (overdue.length > 0) return { label: "⚠️ Attention Needed", color: "#b91c1c", bg: "#fef2f2", border: "#fca5a5" };
    const closingDays = tx.closing_date
      ? Math.ceil((new Date(tx.closing_date) - today) / (1000 * 60 * 60 * 24))
      : null;
    if (closingDays !== null && closingDays <= 7 && getAllOpenTasks(tx).length > 0) {
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

  function buildTxSection(tx, normalizedEmail) {
    const nextDeadline = getNextDeadline(tx);
    const agentTasks = getAgentTasks(tx, normalizedEmail);
    const health = getDealHealth(tx);
    const docStatus = getDocStatus(tx.id);
    const finance = allFinances.find(f => f.transaction_id === tx.id);
    const purchasePrice = finance?.sale_price || tx.sale_price;

    const deadlineStr = nextDeadline
      ? `${nextDeadline.label} – ${fmtDate(nextDeadline.raw)} <span style="color:#64748b;font-size:13px;">(${nextDeadline.daysLeft === 0 ? "TODAY" : `${nextDeadline.daysLeft} day${nextDeadline.daysLeft !== 1 ? "s" : ""}`})</span>`
      : "No upcoming deadlines";

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

    const dealLink = `https://nhcazateam.base44.app/#/TransactionDetail?id=${tx.id}`;

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
        <a href="${dealLink}" style="display:inline-block;padding:8px 16px;background:#c9a227;color:#0f172a;border-radius:6px;font-size:13px;font-weight:700;text-decoration:none;">
          View Full Transaction →
        </a>
      </div>
    `;
  }

  // ── Send one email per agent ─────────────────────────────────────────────────
  let sent = 0;
  let skipped = 0;
  const errors = [];

  for (const agentEmail of agentEmailsSet) {
    // Check opt-out preference
    const user = userByEmail.get(agentEmail);
    if (user && user.weekly_transaction_updates === false) {
      skipped++;
      continue;
    }

    // Find this agent's active transactions
    const contactId = contactEmailToId.get(agentEmail);
    const participantTxIds = contactId
      ? new Set(
          allParticipants
            .filter(p => p.contact_id === contactId && (p.role === "listing_agent" || p.role === "buyer_agent"))
            .map(p => p.transaction_id)
        )
      : new Set();

    const agentTxs = activeTransactions
      .filter(tx =>
        tx.agent_email?.toLowerCase() === agentEmail ||
        participantTxIds.has(tx.id)
      )
      .sort((a, b) => {
        if (!a.closing_date && !b.closing_date) return 0;
        if (!a.closing_date) return 1;
        if (!b.closing_date) return -1;
        return new Date(a.closing_date) - new Date(b.closing_date);
      });

    if (agentTxs.length === 0) continue;

    const agentName = user?.full_name || agentEmail;
    const sections = agentTxs.map(tx => buildTxSection(tx, agentEmail)).join("");
    const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: agentEmail,
        from_name: "EliteTC",
        subject: `Weekly Transaction Summary – ${agentName}`,
        body: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;padding:24px;background:#f8fafc;">
            <div style="text-align:center;margin-bottom:28px;padding:20px;background:#0f172a;border-radius:12px;">
              <h1 style="color:#c9a227;font-size:26px;margin:0 0 4px;letter-spacing:-0.5px;">EliteTC</h1>
              <p style="color:#94a3b8;margin:0;font-size:13px;">Weekly Transaction Summary · ${dateStr}</p>
            </div>
            <p style="color:#475569;font-size:14px;margin-bottom:20px;">
              Hi ${agentName}, here is your weekly snapshot of <strong>${agentTxs.length} active deal${agentTxs.length !== 1 ? "s" : ""}</strong>, sorted by closing date.
            </p>
            ${sections}
            <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">Weekly summary for <strong>${agentEmail}</strong>.</p>
              <p style="color:#94a3b8;font-size:11px;margin:4px 0 0;">To stop receiving these, ask your TC to disable weekly updates for your account.</p>
            </div>
          </div>
        `,
      });
      sent++;
    } catch (err) {
      errors.push({ email: agentEmail, error: err.message });
    }
  }

  return Response.json({
    success: true,
    sent,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    message: `Sent ${sent} weekly update email(s), skipped ${skipped} opted-out agent(s).`,
  });
});