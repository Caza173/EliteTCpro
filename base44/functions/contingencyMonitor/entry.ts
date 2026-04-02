import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();

    const allUsers = await base44.asServiceRole.entities.User.list();
    const registeredEmails = new Set(allUsers.map(u => u.email?.toLowerCase()).filter(Boolean));

    const transactions = await base44.asServiceRole.entities.Transaction.list();
    const active = transactions.filter(tx => tx.status !== "closed" && tx.status !== "cancelled");

    // Fetch all contingencies in one go
    const allContingencies = await base44.asServiceRole.entities.Contingency.list();

    let updated = 0;
    let notified = 0;

    for (const tx of active) {
      const txContingencies = allContingencies.filter(c =>
        c.transaction_id === tx.id && c.is_active !== false && c.status !== "Completed" && c.status !== "Waived"
      );

      for (const c of txContingencies) {
        if (!c.due_date) continue;

        const dueDate = new Date(c.due_date + "T23:59:59Z");
        const hoursUntil = (dueDate - now) / (1000 * 60 * 60);

        // Auto-mark overdue
        if (hoursUntil < 0 && c.status !== "Overdue") {
          await base44.asServiceRole.entities.Contingency.update(c.id, { status: "Overdue" });
          updated++;
        }

        // Reminder buckets
        let bucket = null;
        if (hoursUntil > 0 && hoursUntil <= 24) bucket = "24h";
        else if (hoursUntil > 24 && hoursUntil <= 48) bucket = "48h";
        else if (hoursUntil <= 0) bucket = "overdue";

        if (!bucket || !tx.agent_email) continue;

        // Dedup check
        const dedupKey = `contingency_${c.id}_${bucket}`;
        const existing = await base44.asServiceRole.entities.AIActivityLog.filter({
          transaction_id: tx.id,
          deadline_type: dedupKey,
        });
        if (existing.length > 0) continue;

        const label = [c.contingency_type, c.sub_type].filter(Boolean).join(" – ");
        const dueDateFormatted = new Date(c.due_date).toLocaleDateString("en-US", {
          weekday: "long", month: "long", day: "numeric", year: "numeric"
        });

        const subject = bucket === "overdue"
          ? `[OVERDUE] ${label} – ${tx.address}`
          : `Upcoming: ${label} in ${bucket} – ${tx.address}`;

        const emailHtml = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <div style="text-align:center;margin-bottom:20px;">
    <h1 style="color:#c9a227;font-size:22px;margin:0;">EliteTC</h1>
    <p style="color:#64748b;font-size:13px;margin:4px 0;">Contingency Reminder</p>
  </div>
  <div style="border:1px solid ${bucket === 'overdue' ? '#fca5a5' : '#e2e8f0'};border-radius:12px;padding:20px;background:${bucket === 'overdue' ? '#fef2f2' : '#fff'};">
    <h2 style="margin:0 0 8px;color:#0f172a;font-size:17px;">${tx.address}</h2>
    <p style="margin:0 0 12px;color:#475569;font-size:15px;">
      <strong>${label}</strong> ${bucket === 'overdue' ? `was due on <strong>${dueDateFormatted}</strong>` : `is due on <strong>${dueDateFormatted}</strong>`}
    </p>
    <div style="padding:10px 14px;border-radius:8px;background:${bucket === 'overdue' ? '#fee2e2' : '#eff6ff'};border-left:3px solid ${bucket === 'overdue' ? '#ef4444' : '#3b82f6'};">
      <strong style="color:${bucket === 'overdue' ? '#dc2626' : '#1d4ed8'};font-size:13px;">
        ${bucket === 'overdue' ? '⚠️ This contingency is now overdue' : `⏰ Due in ${bucket}`}
      </strong>
    </div>
    ${c.notes ? `<p style="margin:12px 0 0;color:#64748b;font-size:13px;"><em>Notes: ${c.notes}</em></p>` : ""}
  </div>
  <p style="color:#64748b;font-size:13px;margin-top:16px;">Please take action or contact the relevant parties immediately.</p>
  <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;">
    <p style="color:#94a3b8;font-size:11px;">EliteTC Contingency Engine — Automated Alert</p>
  </div>
</div>`;

        const isRegistered = registeredEmails.has(tx.agent_email.toLowerCase());

        if (isRegistered) {
          try {
            const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
            const mime = [
              `From: EliteTC <me>`,
              `To: ${tx.agent_email}`,
              `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
              `MIME-Version: 1.0`,
              `Content-Type: text/html; charset=utf-8`,
              ``,
              emailHtml,
            ].join('\r\n');
            const encoded = btoa(unescape(encodeURIComponent(mime)))
              .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ raw: encoded }),
            });
          } catch {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: tx.agent_email, from_name: 'EliteTC', subject, body: emailHtml
            });
          }
        }

        // In-app notification
        if (tx.brokerage_id) {
          try {
            await base44.asServiceRole.entities.InAppNotification.create({
              brokerage_id: tx.brokerage_id,
              transaction_id: tx.id,
              user_email: tx.agent_email,
              title: `${label} ${bucket === 'overdue' ? 'Overdue' : `in ${bucket}`} – ${tx.address}`,
              body: `The ${label} contingency is ${bucket === 'overdue' ? 'past due' : `due in ${bucket}`}.`,
              type: 'deadline',
              deadline_field: `contingency_${c.id}`,
            });
          } catch (notifyErr) {
            console.warn(`[contingencyMonitor] InAppNotification failed for ${tx.id}:`, notifyErr.message);
          }
        }

        // Log for dedup
        await base44.asServiceRole.entities.AIActivityLog.create({
          brokerage_id: tx.brokerage_id,
          transaction_id: tx.id,
          transaction_address: tx.address,
          deadline_type: dedupKey,
          deadline_label: label,
          interval_label: bucket === 'overdue' ? 'overdue' : bucket,
          recipient_email: tx.agent_email,
          subject,
          response_status: 'sent',
        });

        notified++;
      }
    }

    return Response.json({ success: true, updated, notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});