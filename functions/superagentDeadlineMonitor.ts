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

function buildEmailBody(agentName, label, address, deadline, bucket) {
  const deadlineDate = new Date(deadline).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
  const urgency = bucket === 'overdue'
    ? `has passed (${deadlineDate})`
    : `is approaching on ${deadlineDate} (in ${bucket})`;

  return `Hi ${agentName},

The ${label} deadline for ${address} ${urgency}.

Please let me know if you would like the TC to prepare anything such as:
• An inspection addendum or extension
• A financing deadline extension
• A contract modification
• Any other document

You can reply directly in the EliteTC platform or respond to this email.

Thanks,
EliteTC Superagent`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    const transactions = await base44.asServiceRole.entities.Transaction.filter({ status: 'active' });

    let notificationsSent = 0;
    const results = [];

    for (const tx of transactions) {
      if (!tx.agent_email) continue;

      for (const [field, label] of Object.entries(DEADLINE_FIELDS)) {
        const dateStr = tx[field];
        if (!dateStr) continue;

        const deadline = new Date(dateStr);
        const hoursUntil = (deadline - now) / (1000 * 60 * 60);
        const bucket = getIntervalBucket(hoursUntil);
        if (!bucket) continue;

        // Check if already notified at this exact interval
        const existing = await base44.asServiceRole.entities.AIActivityLog.filter({
          transaction_id: tx.id,
          deadline_type: field,
          interval_label: bucket,
        });
        if (existing.length > 0) continue;

        const agentName = tx.agent || tx.agent_email;
        const subject = `${bucket === 'overdue' ? '[OVERDUE]' : 'Upcoming Deadline'} – ${label} – ${tx.address}`;
        const emailBody = buildEmailBody(agentName, label, tx.address, deadline, bucket);

        // Send email to agent
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: tx.agent_email,
          from_name: 'EliteTC Superagent',
          subject,
          body: emailBody,
        });

        // Create in-app notification for agent (with addendum_response tracking)
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
          message: emailBody,
          response_status: 'sent',
          notification_id: notification.id,
        });

        notificationsSent++;
        results.push({ address: tx.address, field, bucket });
      }
    }

    return Response.json({ success: true, notificationsSent, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});