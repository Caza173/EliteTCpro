import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const DEADLINE_FIELDS = {
  inspection_deadline: "Inspection",
  financing_deadline: "Financing",
  earnest_money_deadline: "Earnest Money",
  appraisal_deadline: "Appraisal",
  closing_date: "Closing",
  due_diligence_deadline: "Due Diligence",
};

const STATUS_LABELS = {
  active: "Under Contract",
  pending: "Pending",
  closed: "Closed",
  cancelled: "Cancelled",
};

function getNextDeadline(tx, now) {
  const upcoming = [];
  for (const [field, label] of Object.entries(DEADLINE_FIELDS)) {
    if (tx[field]) {
      const d = new Date(tx[field]);
      if (d >= now) upcoming.push({ label, date: d, raw: tx[field] });
    }
  }
  upcoming.sort((a, b) => a.date - b.date);
  return upcoming[0] || null;
}

function getOpenTasks(tx) {
  return (tx.tasks || []).filter(t => !t.completed);
}

function getHealthStatus(tx, now) {
  let minHours = Infinity;
  for (const field of Object.keys(DEADLINE_FIELDS)) {
    if (tx[field]) {
      const h = (new Date(tx[field]) - now) / (1000 * 60 * 60);
      if (h < minHours) minHours = h;
    }
  }
  const hasOpenTasks = getOpenTasks(tx).length > 0;

  if (minHours <= 0) return { status: "Critical", reason: "Overdue deadline", color: "#ef4444" };
  if (minHours <= 72) return { status: "Critical", reason: `Deadline in ${Math.ceil(minHours)}h`, color: "#ef4444" };
  if (minHours <= 168 || hasOpenTasks) return { status: "Needs Attention", reason: minHours <= 168 ? "Deadline within 7 days" : "Outstanding tasks", color: "#f59e0b" };
  return { status: "Healthy", reason: "No immediate concerns", color: "#22c55e" };
}

function buildTransactionCard(tx, now) {
  const nextDeadline = getNextDeadline(tx, now);
  const openTasks = getOpenTasks(tx).slice(0, 3);
  const health = getHealthStatus(tx, now);

  const deadlineStr = nextDeadline
    ? `${nextDeadline.label} – ${nextDeadline.date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
    : "No upcoming deadlines";

  const tasksHtml = openTasks.length > 0
    ? openTasks.map(t => `<li style="color:#64748b;font-size:13px;margin:2px 0;">${t.name}</li>`).join("")
    : `<li style="color:#22c55e;font-size:13px;">All tasks complete ✓</li>`;

  return `
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-bottom:16px;background:#ffffff;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <h3 style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${tx.address}</h3>
        <span style="background:${health.color}18;color:${health.color};font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;white-space:nowrap;">${health.status}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:3px 0;width:130px;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Status</td>
          <td style="padding:3px 0;color:#475569;font-size:13px;">${STATUS_LABELS[tx.status] || tx.status}</td>
        </tr>
        <tr>
          <td style="padding:3px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Next Deadline</td>
          <td style="padding:3px 0;color:#475569;font-size:13px;">${deadlineStr}</td>
        </tr>
        ${health.status !== "Healthy" ? `
        <tr>
          <td style="padding:3px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Health Note</td>
          <td style="padding:3px 0;color:${health.color};font-size:13px;">${health.reason}</td>
        </tr>` : ""}
      </table>
      ${openTasks.length > 0 ? `
      <div style="margin-top:10px;">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Outstanding Tasks</p>
        <ul style="margin:0;padding-left:16px;">${tasksHtml}</ul>
      </div>` : ""}
    </div>
  `;
}

function buildWeeklyEmail(agentEmail, transactions, now) {
  const cards = transactions.map(tx => buildTransactionCard(tx, now)).join("");
  const critical = transactions.filter(tx => getHealthStatus(tx, now).status === "Critical").length;
  const attention = transactions.filter(tx => getHealthStatus(tx, now).status === "Needs Attention").length;

  const summaryBadges = [
    critical > 0 ? `<span style="background:#ef444418;color:#ef4444;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600;margin-right:6px;">${critical} Critical</span>` : "",
    attention > 0 ? `<span style="background:#f59e0b18;color:#f59e0b;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600;margin-right:6px;">${attention} Needs Attention</span>` : "",
  ].filter(Boolean).join("");

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;">
      <div style="text-align:center;margin-bottom:24px;padding:20px;background:#0f172a;border-radius:12px;">
        <h1 style="color:#c9a227;font-size:22px;margin:0 0 4px;">EliteTC</h1>
        <p style="color:#94a3b8;font-size:13px;margin:0;">Weekly Transaction Update</p>
      </div>

      <div style="background:#ffffff;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 8px;color:#475569;font-size:14px;">
          Here is your weekly summary for <strong>${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>.
        </p>
        <p style="margin:0;color:#64748b;font-size:13px;">
          ${transactions.length} active deal${transactions.length !== 1 ? "s" : ""}
          ${summaryBadges ? " — " + summaryBadges : ""}
        </p>
      </div>

      ${cards}

      <div style="text-align:center;margin-top:20px;padding:16px;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">Log into the Agent Portal for full details and documents.</p>
        <p style="color:#cbd5e1;font-size:11px;margin:6px 0 0;">EliteTC Superagent — Weekly Monitoring Report</p>
      </div>
    </div>
  `;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    // Get all registered users — only send to registered agents
    const allUsers = await base44.asServiceRole.entities.User.list();
    const registeredEmails = new Set(allUsers.map(u => u.email?.toLowerCase()).filter(Boolean));

    // Get all active transactions
    const allTransactions = await base44.asServiceRole.entities.Transaction.list();
    const active = allTransactions.filter(tx =>
      tx.status !== "closed" && tx.status !== "cancelled"
    );

    // Group by agent_email
    const byAgent = new Map();
    for (const tx of active) {
      if (!tx.agent_email) continue;
      const key = tx.agent_email.toLowerCase();
      if (!byAgent.has(key)) byAgent.set(key, []);
      byAgent.get(key).push(tx);
    }

    const results = [];

    for (const [agentEmail, txList] of byAgent.entries()) {
      if (!registeredEmails.has(agentEmail)) continue; // skip unregistered

      const emailBody = buildWeeklyEmail(agentEmail, txList, now);

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: agentEmail,
        from_name: "EliteTC Superagent",
        subject: "EliteTC Weekly Transaction Update",
        body: emailBody,
      });

      // Log the send in AuditLog
      await base44.asServiceRole.entities.AuditLog.create({
        actor_email: "superagent@elitetc.com",
        action: "weekly_summary_sent",
        entity_type: "transaction",
        description: `Weekly summary sent to ${agentEmail} — ${txList.length} transaction(s) included`,
        after: {
          agent_email: agentEmail,
          transactions_included: txList.map(t => t.id),
          timestamp: now.toISOString(),
        },
      });

      results.push({ agentEmail, count: txList.length });
    }

    return Response.json({ success: true, agentsSummaries: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});