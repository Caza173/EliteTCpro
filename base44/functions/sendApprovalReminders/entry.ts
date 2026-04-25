import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * sendApprovalReminders
 * Scheduled function — runs every 4 hours.
 * Sends reminders for all pending approvals at +4h, +12h, +24h, then every 24h.
 */

const REMINDER_SCHEDULE_HOURS = [4, 12, 24];
const REPEAT_INTERVAL_HOURS = 24;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Service role — scheduled function, no user auth needed
    const pending = await base44.asServiceRole.entities.Approval.filter({ status: 'sent' });

    if (!pending || pending.length === 0) {
      return Response.json({ success: true, reminders_sent: 0, message: 'No pending approvals.' });
    }

    let remindersSent = 0;
    const now = new Date();

    for (const approval of pending) {
      // Skip expired
      if (approval.token_expires_at && now > new Date(approval.token_expires_at)) continue;

      const sentAt = approval.sent_at ? new Date(approval.sent_at) : null;
      if (!sentAt) continue;

      const hoursSinceSent = (now - sentAt) / (1000 * 60 * 60);
      const lastReminderAt = approval.last_reminder_at ? new Date(approval.last_reminder_at) : null;
      const reminderCount = approval.reminder_count || 0;

      let shouldSend = false;

      if (reminderCount < REMINDER_SCHEDULE_HOURS.length) {
        // Fixed schedule: send at 4h, 12h, 24h marks
        const targetHour = REMINDER_SCHEDULE_HOURS[reminderCount];
        shouldSend = hoursSinceSent >= targetHour;
      } else {
        // After fixed schedule: every 24h
        const hoursSinceLastReminder = lastReminderAt
          ? (now - lastReminderAt) / (1000 * 60 * 60)
          : REPEAT_INTERVAL_HOURS + 1;
        shouldSend = hoursSinceLastReminder >= REPEAT_INTERVAL_HOURS;
      }

      if (!shouldSend) continue;

      // Fetch transaction
      const txList = await base44.asServiceRole.entities.Transaction.filter({ id: approval.transaction_id });
      const transaction = txList?.[0] || {};

      const typeLabel = approval.type === 'fuel_proration' ? 'Fuel Proration' : 'Commission Statement';
      const appBase = 'https://app.elitetc.io';
      const approveUrl = `${appBase}/#/ApprovalAction?token=${approval.token}&action=approve`;
      const rejectUrl = `${appBase}/#/ApprovalAction?token=${approval.token}&action=reject`;

      const reminderNum = reminderCount + 1;
      const emailBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#D97706;">⏰ Reminder #${reminderNum}: Action Required</h2>
  <p>This is a reminder that the following approval request is still pending:</p>
  <p><strong>Type:</strong> ${typeLabel}</p>
  <p><strong>Property:</strong> ${transaction.address || approval.transaction_id}</p>
  <p><strong>Originally sent:</strong> ${new Date(approval.sent_at).toLocaleString()}</p>
  <div style="margin:24px 0;">
    <a href="${approveUrl}" style="background:#16A34A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">✓ Approve</a>
    &nbsp;&nbsp;
    <a href="${rejectUrl}" style="background:#DC2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">✗ Reject</a>
  </div>
  <p style="color:#64748B;font-size:13px;">Link expires: ${new Date(approval.token_expires_at).toLocaleString()}</p>
</div>`;

      await base44.integrations.Core.SendEmail({
        to: approval.sent_to_email,
        subject: `Reminder #${reminderNum}: ${typeLabel} Approval Pending — ${transaction.address || ''}`,
        body: emailBody,
      });

      await base44.asServiceRole.entities.Approval.update(approval.id, {
        reminder_count: reminderCount + 1,
        last_reminder_at: now.toISOString(),
      });

      // Log reminder in audit trail
      await base44.asServiceRole.entities.AuditLog.create({
        transaction_id: approval.transaction_id,
        brokerage_id: transaction.brokerage_id || null,
        actor_email: 'system',
        action: 'approval_reminder_sent',
        entity_type: 'transaction',
        entity_id: approval.transaction_id,
        description: `Approval Reminder #${reminderNum} sent for ${typeLabel} to ${approval.sent_to_email}`,
      });

      remindersSent++;
    }

    return Response.json({ success: true, reminders_sent: remindersSent, scanned: pending.length });
  } catch (error) {
    console.error('sendApprovalReminders error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});