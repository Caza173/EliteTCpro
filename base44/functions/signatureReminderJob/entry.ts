/**
 * signatureReminderJob — Scheduled hourly job.
 * Sends reminder emails to pending signers who haven't signed in 24+ hours.
 * Updates last_reminder_sent_at to prevent spam.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = "https://api.hellosign.com/v3";

function getAuthHeader() {
  return "Basic " + btoa(Deno.env.get("DROPBOX_SIGN_API_KEY") + ":");
}

const REMINDER_INTERVAL_HOURS = 24;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled invocation (no user auth needed for scheduled jobs)
    // But block direct calls from non-admin users
    let isScheduled = false;
    try {
      const payload = await req.clone().json();
      isScheduled = payload?._scheduled === true;
    } catch {}

    if (!isScheduled) {
      const user = await base44.auth.me();
      if (user?.role !== 'admin' && user?.email !== 'nhcazateam@gmail.com') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const now = new Date();
    const cutoffHours = REMINDER_INTERVAL_HOURS;
    const cutoffMs = cutoffHours * 60 * 60 * 1000;

    // Get all active (non-completed) signature requests
    const activeRequests = await base44.asServiceRole.entities.SignatureRequest.filter({
      status: { $in: ["sent", "viewed", "partially_signed"] }
    });

    console.log(`[signatureReminderJob] Found ${activeRequests.length} active signature requests`);

    let remindersAttempted = 0;
    let remindersSucceeded = 0;
    let remindersSkipped = 0;

    for (const sig of activeRequests) {
      // Check if sent_at > REMINDER_INTERVAL_HOURS ago
      if (!sig.sent_at) { remindersSkipped++; continue; }

      const sentAt = new Date(sig.sent_at);
      const hoursSinceSent = (now - sentAt) / (1000 * 60 * 60);

      if (hoursSinceSent < cutoffHours) {
        remindersSkipped++;
        continue; // Not yet time to remind
      }

      // Check last_reminder_sent_at — don't spam more than once per 24h
      if (sig.last_reminder_sent_at) {
        const lastReminder = new Date(sig.last_reminder_sent_at);
        const hoursSinceLastReminder = (now - lastReminder) / (1000 * 60 * 60);
        if (hoursSinceLastReminder < cutoffHours) {
          remindersSkipped++;
          continue;
        }
      }

      // Get pending recipients
      const recipients = await base44.asServiceRole.entities.SignatureRecipient.filter({
        signature_id: sig.id
      });
      const pendingRecipients = recipients.filter(r => r.status === "pending" || r.status === "viewed");

      if (pendingRecipients.length === 0) {
        remindersSkipped++;
        continue;
      }

      remindersAttempted++;

      // Send reminder via Dropbox Sign API for each pending signer
      let anySucceeded = false;
      for (const recipient of pendingRecipients) {
        if (!recipient.provider_signer_id) continue;
        try {
          const formData = new FormData();
          formData.append("signature_id", recipient.provider_signer_id);

          const dsRes = await fetch(
            `${BASE_URL}/signature_request/remind/${sig.provider_signature_request_id}`,
            { method: "POST", headers: { Authorization: getAuthHeader() }, body: formData }
          );

          if (dsRes.ok) {
            anySucceeded = true;
            console.log(`[signatureReminderJob] Reminder sent to ${recipient.email} for sig ${sig.id}`);
          } else {
            const errText = await dsRes.text();
            console.warn(`[signatureReminderJob] Reminder failed for ${recipient.email}: ${errText}`);
          }
        } catch (e) {
          console.warn(`[signatureReminderJob] Error sending reminder to ${recipient.email}:`, e.message);
        }
      }

      if (anySucceeded) {
        // Update last_reminder_sent_at on the signature record
        await base44.asServiceRole.entities.SignatureRequest.update(sig.id, {
          last_reminder_sent_at: now.toISOString(),
        });

        // Log to audit trail
        await base44.asServiceRole.entities.AuditLog.create({
          transaction_id: sig.transaction_id,
          action: "signature_reminder_sent",
          entity_type: "document",
          entity_id: sig.document_id,
          description: `Signature reminder sent for "${sig.title}" (${pendingRecipients.length} pending signer(s))`,
          actor_email: "system",
        });

        // Log to AIActivityLog for visibility
        await base44.asServiceRole.entities.AIActivityLog.create({
          transaction_id: sig.transaction_id,
          deadline_type: "signature",
          deadline_label: sig.title,
          interval_label: hoursSinceSent >= 48 ? "48h" : "24h",
          recipient_email: pendingRecipients.map(r => r.email).join(", "),
          recipient_name: pendingRecipients.map(r => r.name).join(", "),
          subject: `Reminder: Signature Needed — ${sig.title}`,
          message: `Reminder sent to ${pendingRecipients.length} pending signer(s)`,
          response_status: "sent",
        });

        remindersSucceeded++;
      }
    }

    console.log(`[signatureReminderJob] Done — attempted: ${remindersAttempted}, succeeded: ${remindersSucceeded}, skipped: ${remindersSkipped}`);

    return Response.json({
      success: true,
      active_requests: activeRequests.length,
      reminders_attempted: remindersAttempted,
      reminders_succeeded: remindersSucceeded,
      reminders_skipped: remindersSkipped,
    });

  } catch (error) {
    console.error('[signatureReminderJob] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});