/**
 * sendDeadlineAlerts — Scheduled email reminders for upcoming deadlines.
 *
 * Uses calendar-day logic only (NO hours/minutes).
 * Timezone: America/New_York
 * Alert windows: 7d, 3d, 1d, today (0d), overdue (<0)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TZ = 'America/New_York';

const DEADLINE_FIELDS = [
  { key: "earnest_money_deadline", label: "Earnest Money Deposit",       completedKey: "earnest_money_received" },
  { key: "inspection_deadline",    label: "Inspection Deadline",         completedKey: "inspection_completed" },
  { key: "due_diligence_deadline", label: "Due Diligence Deadline" },
  { key: "financing_deadline",     label: "Financing Commitment" },
  { key: "appraisal_deadline",     label: "Appraisal Deadline" },
  { key: "closing_date",           label: "Closing / Transfer of Title" },
];

// Days at which to send email reminders
const ALERT_DAYS = new Set([7, 3, 1, 0]);

function getTodayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  try {
    const deadline = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr)
      .toLocaleDateString('en-CA', { timeZone: TZ });
    const today = getTodayStr();
    return Math.round((new Date(deadline) - new Date(today)) / 86_400_000);
  } catch { return null; }
}

function getSeverity(days) {
  if (days === null) return 'info';
  if (days < 0 || days === 0) return 'critical';
  if (days === 1) return 'warning';
  return 'info';
}

function buildEmailBody(label, dateStr, days, tx) {
  const daysLabel = days < 0
    ? `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} OVERDUE`
    : days === 0 ? 'TODAY'
    : days === 1 ? 'Tomorrow'
    : `in ${days} days`;

  return `
<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
  <h2 style="color:#0f172a;margin:0 0 8px;">⚠️ Deadline Alert</h2>
  <p style="color:#475569;font-size:14px;margin:0 0 20px;">
    <strong>${label}</strong> for <strong>${tx.address}</strong> is due <strong>${daysLabel}</strong>.
  </p>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 20px;">
    <table style="width:100%;font-size:13px;border-collapse:collapse;">
      <tr><td style="color:#64748b;padding:4px 0;width:40%;">Deadline</td><td style="color:#0f172a;font-weight:600;">${dateStr}</td></tr>
      <tr><td style="color:#64748b;padding:4px 0;">Property</td><td style="color:#0f172a;">${tx.address}</td></tr>
      <tr><td style="color:#64748b;padding:4px 0;">Agent</td><td style="color:#0f172a;">${tx.agent || '—'}</td></tr>
    </table>
  </div>
  <p style="color:#94a3b8;font-size:12px;">Log in to EliteTC to take action on this deadline.</p>
</div>`.trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const allTransactions = await base44.asServiceRole.entities.Transaction.filter({ status: 'active' });

    console.log(`[sendDeadlineAlerts] Running for ${allTransactions.length} transactions — today: ${getTodayStr()}`);
    let totalSent = 0;

    for (const tx of allTransactions) {
      for (const field of DEADLINE_FIELDS) {
        const dateStr = tx[field.key];
        if (!dateStr) continue;

        // Skip if already completed
        const isCompleted = field.completedKey ? !!tx[field.completedKey] : false;
        if (isCompleted) continue;

        const days = getDaysUntil(dateStr);
        if (days === null) continue;

        // Only fire at defined alert days OR when overdue
        const isAlertDay = ALERT_DAYS.has(days) || days < 0;
        if (!isAlertDay) continue;

        // Dedup: only 1 email per (tx + field) per calendar day
        const todayStr = getTodayStr();
        const existingAlerts = await base44.asServiceRole.entities.InAppNotification.filter({
          transaction_id: tx.id,
          deadline_field: field.key,
        });

        const alreadySentToday = existingAlerts.some(a => {
          if (!a.created_date) return false;
          const createdDay = new Date(a.created_date).toLocaleDateString('en-CA', { timeZone: TZ });
          return createdDay === todayStr;
        });
        if (alreadySentToday) continue;
        if (existingAlerts.some(a => a.dismissed)) continue;

        const severity = getSeverity(days);
        const daysLabel = days < 0
          ? `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`
          : days === 0 ? 'Due Today' : days === 1 ? 'Due Tomorrow' : `Due in ${days} days`;
        const title = `${field.label} — ${daysLabel}`;

        const recipient = tx.agent_email;
        if (!recipient || !tx.brokerage_id) continue;

        // In-app notification
        try {
          await base44.asServiceRole.entities.InAppNotification.create({
            brokerage_id: tx.brokerage_id,
            transaction_id: tx.id,
            user_email: recipient,
            title,
            body: `${tx.address} — ${field.label} due: ${dateStr}`,
            type: 'deadline',
            deadline_field: field.key,
            severity,
            addendum_status: 'suggested',
            addendum_response: 'pending',
            dismissed: false,
          });
        } catch (e) {
          console.warn(`[sendDeadlineAlerts] InAppNotification failed for tx ${tx.id}:`, e.message);
        }

        // Email
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: recipient,
            from_name: 'EliteTC',
            subject: `⚠️ ${title} — ${tx.address}`,
            body: buildEmailBody(field.label, dateStr, days, tx),
          });
          totalSent++;
        } catch (e) {
          console.warn(`[sendDeadlineAlerts] Email to ${recipient} failed:`, e.message);
        }
      }
    }

    console.log(`[sendDeadlineAlerts] Done — ${totalSent} emails sent`);
    return Response.json({ success: true, emails_sent: totalSent, today: getTodayStr() });
  } catch (error) {
    console.error('[sendDeadlineAlerts] Fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});