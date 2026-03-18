import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const DEADLINE_FIELDS = {
  inspection_deadline: "Inspection Contingency",
  financing_deadline: "Financing Commitment",
  earnest_money_deadline: "Earnest Money Deposit",
  appraisal_deadline: "Appraisal",
  closing_date: "Closing Date",
  due_diligence_deadline: "Due Diligence",
};

function getIntervalBucket(hoursUntil) {
  if (hoursUntil <= 0) return "overdue";
  if (hoursUntil <= 4) return "4h";
  if (hoursUntil <= 24) return "24h";
  if (hoursUntil <= 48) return "48h";
  if (hoursUntil <= 72) return "72h";
  return null;
}

function getHealthStatus(tx, now) {
  const deadlineFields = Object.keys(DEADLINE_FIELDS);
  let minHours = Infinity;

  for (const field of deadlineFields) {
    if (tx[field]) {
      const d = new Date(tx[field]);
      const h = (d - now) / (1000 * 60 * 60);
      if (h < minHours) minHours = h;
    }
  }

  const hasOverdueTasks = (tx.tasks || []).some(t => !t.completed);

  if (minHours <= 0) return { status: "Critical", reason: "Overdue deadline" };
  if (minHours <= 72) return { status: "Critical", reason: `Deadline in ${Math.ceil(minHours)}h` };
  if (minHours <= 168 || hasOverdueTasks) return { status: "Needs Attention", reason: minHours <= 168 ? "Deadline within 7 days" : "Outstanding tasks" };
  return { status: "Healthy", reason: "No immediate concerns" };
}

function buildEmailHtml(agentName, label, address, deadline, bucket, health) {
  const deadlineDate = new Date(deadline).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
  const urgency = bucket === 'overdue'
    ? `has passed (${deadlineDate})`
    : `is approaching on ${deadlineDate} (in ${bucket})`;

  const healthColor = health.status === "Critical" ? "#ef4444" : health.status === "Needs Attention" ? "#f59e0b" : "#22c55e";

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="text-align:center;margin-bottom:20px;">
        <h1 style="color:#c9a227;font-size:22px;margin:0;">EliteTC</h1>
        <p style="color:#64748b;font-size:13px;margin:4px 0;">Transaction Coordinator Platform</p>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;">
        <h2 style="margin:0 0 12px;color:#0f172a;font-size:17px;">${address}</h2>
        <p style="margin:4px 0;color:#475569;font-size:14px;">
          The <strong>${label}</strong> deadline ${urgency}.
        </p>
        <div style="margin-top:14px;padding:10px 14px;border-radius:8px;background:${healthColor}18;border-left:3px solid ${healthColor};">
          <strong style="color:${healthColor};font-size:13px;">Transaction Health: ${health.status}</strong>
          <p style="margin:2px 0 0;color:#64748b;font-size:12px;">${health.reason}</p>
        </div>
      </div>
      <p style="color:#475569;font-size:14px;">
        Hi ${agentName}, please let us know if you need the TC to prepare:
      </p>
      <ul style="color:#64748b;font-size:14px;line-height:1.8;">
        <li>An inspection addendum or extension</li>
        <li>A financing deadline extension</li>
        <li>A contract modification</li>
        <li>Any other document</li>
      </ul>
      <p style="color:#64748b;font-size:13px;">You can respond directly in the EliteTC platform.</p>
      <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:11px;">EliteTC Superagent — Automated Monitoring</p>
      </div>
    </div>
  `;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    // Get all registered app users so we only email registered agents
    const allUsers = await base44.asServiceRole.entities.User.list();
    const registeredEmails = new Set(allUsers.map(u => u.email?.toLowerCase()).filter(Boolean));

    const transactions = await base44.asServiceRole.entities.Transaction.list();
    const activeTransactions = transactions.filter(tx =>
      tx.status !== "closed" && tx.status !== "cancelled"
    );

    let notificationsSent = 0;
    const results = [];

    for (const tx of activeTransactions) {
      if (!tx.agent_email) continue;
      const agentEmailLower = tx.agent_email.toLowerCase();
      const isRegistered = registeredEmails.has(agentEmailLower);
      const health = getHealthStatus(tx, now);

      for (const [field, label] of Object.entries(DEADLINE_FIELDS)) {
        const dateStr = tx[field];
        if (!dateStr) continue;

        const deadline = new Date(dateStr);
        const hoursUntil = (deadline - now) / (1000 * 60 * 60);
        const bucket = getIntervalBucket(hoursUntil);
        if (!bucket) continue;

        // Deduplicate: skip if already notified at this interval
        const existing = await base44.asServiceRole.entities.AIActivityLog.filter({
          transaction_id: tx.id,
          deadline_type: field,
          interval_label: bucket,
        });
        if (existing.length > 0) continue;

        const agentName = tx.agent || tx.agent_email;
        const subject = `${bucket === 'overdue' ? '[OVERDUE]' : 'Upcoming Deadline'} – ${label} – ${tx.address}`;

        // Only send email if agent is a registered user
        if (isRegistered) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: tx.agent_email,
            from_name: 'EliteTC Superagent',
            subject,
            body: buildEmailHtml(agentName, label, tx.address, deadline, bucket, health),
          });
        }

        // Always create in-app notification (for TC visibility even if agent not registered)
        const notification = await base44.asServiceRole.entities.InAppNotification.create({
          brokerage_id: tx.brokerage_id,
          transaction_id: tx.id,
          user_email: tx.agent_email,
          title: `${label} ${bucket === 'overdue' ? 'Overdue' : `in ${bucket}`} – ${tx.address}`,
          body: `The ${label} deadline is ${bucket === 'overdue' ? 'overdue' : `in ${bucket}`}. Do you need the TC to prepare anything?`,
          type: 'deadline',
          deadline_field: field,
          addendum_response: 'pending',
          alert_interval_hours: bucket === 'overdue' ? 0 : parseInt(bucket),
        });

        // Log to AIActivityLog
        await base44.asServiceRole.entities.AIActivityLog.create({
          brokerage_id: tx.brokerage_id,
          transaction_id: tx.id,
          transaction_address: tx.address,
          deadline_type: field,
          deadline_label: label,
          interval_label: bucket,
          recipient_email: tx.agent_email,
          recipient_name: agentName,
          subject,
          response_status: 'sent',
          notification_id: notification.id,
        });

        notificationsSent++;
        results.push({ address: tx.address, field, bucket, emailSent: isRegistered });
      }
    }

    return Response.json({ success: true, notificationsSent, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});