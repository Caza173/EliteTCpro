import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const DEADLINE_FIELDS = [
  { key: "earnest_money_deadline", label: "Earnest Money Deposit" },
  { key: "inspection_deadline",    label: "Inspection Deadline" },
  { key: "due_diligence_deadline", label: "Due Diligence Deadline" },
  { key: "financing_deadline",     label: "Financing Commitment" },
  { key: "appraisal_deadline",     label: "Appraisal Deadline" },
  { key: "closing_date",           label: "Closing / Transfer of Title" },
];

const ALERT_DAYS = [7, 3, 1]; // days before deadline

function diffDays(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function is called by a scheduled automation — verify service role access
    const allTransactions = await base44.asServiceRole.entities.Transaction.filter({ status: "active" });

    let totalAlerts = 0;

    for (const tx of allTransactions) {
      for (const field of DEADLINE_FIELDS) {
        const dateStr = tx[field.key];
        if (!dateStr) continue;

        const days = diffDays(dateStr);
        if (!ALERT_DAYS.includes(days)) continue;

        // Check if an alert already exists for this deadline (any state)
        const existingAlerts = await base44.asServiceRole.entities.InAppNotification.filter({
          transaction_id: tx.id,
          deadline_field: field.key,
        });

        // Never recreate dismissed alerts
        if (existingAlerts.some(a => a.dismissed)) continue;

        // Deduplicate: only send if no alert exists created in last 23h
        const alreadySent = existingAlerts.some((a) => {
          const created = new Date(a.created_date);
          return Date.now() - created.getTime() < 23 * 60 * 60 * 1000;
        });

        if (alreadySent) continue;

        const title = `${field.label} in ${days} day${days !== 1 ? "s" : ""}`;
        const body = `${field.label} for ${tx.address} is due on ${dateStr}. ${days} day${days !== 1 ? "s" : ""} remaining.`;

        const recipients = [
          { email: tx.agent_email, role: "tc" },
        ].filter((r) => r.email);

        for (const recipient of recipients) {
          // In-app notification
          if (!tx.brokerage_id) continue;
          try {
            await base44.asServiceRole.entities.InAppNotification.create({
              brokerage_id: tx.brokerage_id,
              transaction_id: tx.id,
              user_email: recipient.email,
              title,
              body,
              type: "deadline",
              alert_interval_hours: days * 24,
              deadline_field: field.key,
            });
          } catch (notifyErr) {
            console.warn(`[sendDeadlineAlerts] InAppNotification failed for tx ${tx.id}:`, notifyErr.message);
            continue;
          }

          // Email notification (best-effort — only works for registered app users)
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: recipient.email,
              subject: `⚠️ Deadline Alert: ${title} — ${tx.address}`,
              body: `
<p>Hello,</p>
<p>This is an automated reminder from EliteTC.</p>
<p><strong>${field.label}</strong> for the transaction at <strong>${tx.address}</strong> is coming up in <strong>${days} day${days !== 1 ? "s" : ""}</strong>.</p>
<ul>
  <li><strong>Deadline:</strong> ${dateStr}</li>
  <li><strong>Buyer:</strong> ${tx.buyer || (tx.buyers || []).join(", ") || "—"}</li>
  <li><strong>Seller:</strong> ${tx.seller || (tx.sellers || []).join(", ") || "—"}</li>
</ul>
<p>Please take action before this deadline expires.</p>
<p>Best regards,<br/>EliteTC — Transaction Coordination</p>
              `.trim(),
            });
          } catch (emailErr) {
            console.warn(`Email to ${recipient.email} skipped:`, emailErr.message);
          }

          totalAlerts++;
        }
      }
    }

    console.log(`Deadline alerts sent: ${totalAlerts}`);
    return Response.json({ success: true, alerts_sent: totalAlerts });
  } catch (error) {
    console.error("sendDeadlineAlerts error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});