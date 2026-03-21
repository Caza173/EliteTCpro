import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const APP_URL = 'https://app.elitetc.pro';

const TOKEN_SECRET = () => Deno.env.get('BASE44_APP_ID') || 'elitetc-deadline-hmac-v1';

function b64urlEncode(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signDeadlineToken(payload) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(TOKEN_SECRET()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const payloadStr = b64urlEncode(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payloadStr));
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${payloadStr}.${sigStr}`;
}

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

function buildEmailHtml(agentName, label, address, deadline, bucket, health, yesLink, noLink) {
  const deadlineDate = new Date(deadline).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
  const urgency = bucket === 'overdue'
    ? `has passed (${deadlineDate})`
    : `is approaching on ${deadlineDate} (in ${bucket})`;

  const healthColor = health.status === "Critical" ? "#ef4444" : health.status === "Needs Attention" ? "#f59e0b" : "#22c55e";

  const responseSection = (bucket === '24h' && yesLink && noLink) ? `
    <div style="margin:20px 0;padding:18px;border:1px solid #e2e8f0;border-radius:12px;background:#fafafa;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.05em;">Action Required</p>
      <p style="margin:0 0 16px;color:#475569;font-size:14px;">Does this deadline need an extension?</p>
      <table style="border-collapse:collapse;">
        <tr>
          <td style="padding-right:12px;">
            <a href="${yesLink}" style="display:inline-block;background:#dc2626;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.01em;">
              YES — Request Extension
            </a>
          </td>
          <td>
            <a href="${noLink}" style="display:inline-block;background:#16a34a;color:white;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:0.01em;">
              NO — On Track
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;color:#94a3b8;font-size:11px;">Links expire in 24 hours. If no response is received, your TC will be notified.</p>
    </div>` : '';

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;">
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
      ${responseSection}
      <p style="color:#64748b;font-size:13px;">Your TC is monitoring this transaction and is available to prepare any needed documents.</p>
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

        // Generate YES/NO response links for 24h bucket
        let yesLink = null;
        let noLink = null;
        if (bucket === '24h' && isRegistered) {
          const tokenPayload = {
            transaction_id: tx.id,
            deadline_type: field,
            agent_email: tx.agent_email,
            expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          };
          const signedToken = await signDeadlineToken(tokenPayload);
          yesLink = `${APP_URL}/#/DeadlineResponse?action=yes&token=${encodeURIComponent(signedToken)}`;
          noLink  = `${APP_URL}/#/DeadlineResponse?action=no&token=${encodeURIComponent(signedToken)}`;
        }

        // Only send email if agent is a registered user
        if (isRegistered) {
          const emailHtml = buildEmailHtml(agentName, label, tx.address, deadline, bucket, health, yesLink, noLink);
          // Use Gmail connector for 24h (with response buttons), fallback to Core for other buckets
          if (bucket === '24h') {
            try {
              const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
              const mime = [
                `From: EliteTC Superagent <me>`,
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
            } catch (gmailErr) {
              console.warn('Gmail send failed, falling back to Core:', gmailErr.message);
              await base44.asServiceRole.integrations.Core.SendEmail({ to: tx.agent_email, from_name: 'EliteTC Superagent', subject, body: emailHtml });
            }
          } else {
            await base44.asServiceRole.integrations.Core.SendEmail({ to: tx.agent_email, from_name: 'EliteTC Superagent', subject, body: emailHtml });
          }
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

    // ── FAIL-SAFE: Escalate unresponded 24h alerts that are now 4h+ old ──
    const activityLogs = await base44.asServiceRole.entities.AIActivityLog.filter({ interval_label: '24h' });
    let escalations = 0;

    for (const log of activityLogs) {
      if (log.response_status !== 'sent') continue; // already responded
      const sentAt = new Date(log.created_date);
      const hoursSince = (now - sentAt) / (1000 * 60 * 60);
      if (hoursSince < 4) continue;

      // Check if already escalated
      const escalated = await base44.asServiceRole.entities.AIActivityLog.filter({
        transaction_id: log.transaction_id,
        deadline_type: `escalation_${log.deadline_type}`,
      });
      if (escalated.length > 0) continue;

      // Check if they responded via the link (response_<field>)
      const responded = await base44.asServiceRole.entities.AIActivityLog.filter({
        transaction_id: log.transaction_id,
        deadline_type: `response_${log.deadline_type}`,
      });
      if (responded.length > 0) continue;

      // Send reminder email to agent
      if (log.recipient_email) {
        const reminderSubject = `Reminder — Deadline Action Required – ${log.deadline_label || log.deadline_type} – ${log.transaction_address}`;
        const reminderHtml = `
<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:14px;border-radius:8px;margin-bottom:16px;">
    <strong style="color:#dc2626;">⏰ Reminder — No Response Received</strong>
  </div>
  <p style="color:#475569;font-size:14px;">We sent you a deadline alert for <strong>${log.transaction_address}</strong> regarding the <strong>${log.deadline_label || log.deadline_type}</strong> deadline and haven't received a response yet.</p>
  <p style="color:#475569;font-size:14px;">Please check the original email and respond, or contact your TC directly.</p>
  <p style="margin-top:20px;color:#94a3b8;font-size:11px;">EliteTC Superagent — Automated Follow-up</p>
</div>`;
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({ to: log.recipient_email, from_name: 'EliteTC Superagent', subject: reminderSubject, body: reminderHtml });
        } catch (e) { console.warn('Escalation email failed:', e.message); }
      }

      // Notify TC via InAppNotification
      const txList = await base44.asServiceRole.entities.Transaction.filter({ id: log.transaction_id });
      const escalTx = txList[0];
      if (escalTx?.agent_email) {
        await base44.asServiceRole.entities.InAppNotification.create({
          brokerage_id: escalTx.brokerage_id,
          transaction_id: log.transaction_id,
          user_email: escalTx.agent_email,
          title: `No Response — ${log.deadline_label || log.deadline_type} – ${log.transaction_address}`,
          body: `Agent ${log.recipient_email} did not respond to the 24h deadline alert. Please follow up directly.`,
          type: 'deadline',
        });
      }

      // Log escalation
      await base44.asServiceRole.entities.AIActivityLog.create({
        brokerage_id: log.brokerage_id,
        transaction_id: log.transaction_id,
        transaction_address: log.transaction_address,
        deadline_type: `escalation_${log.deadline_type}`,
        deadline_label: log.deadline_label,
        interval_label: '4h',
        recipient_email: log.recipient_email,
        subject: `Escalation: No response to ${log.deadline_label}`,
        message: `No response after 4 hours. Reminder sent to agent and TC notified.`,
        response_status: 'sent',
      });

      escalations++;
    }

    return Response.json({ success: true, notificationsSent, escalations, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});