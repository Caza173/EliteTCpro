import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const DEADLINE_LABELS = {
  inspection_deadline: 'Inspection Contingency',
  financing_deadline: 'Financing Commitment',
  earnest_money_deadline: 'Earnest Money Deposit',
  appraisal_deadline: 'Appraisal',
  closing_date: 'Closing Date',
  due_diligence_deadline: 'Due Diligence',
};

const TOKEN_SECRET = () => Deno.env.get('BASE44_APP_ID') || 'elitetc-deadline-hmac-v1';

// ── HMAC Token Helpers ─────────────────────────────────────────────────────────

function b64urlEncode(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - padded.length % 4) % 4;
  return decodeURIComponent(escape(atob(padded + '='.repeat(pad))));
}

export async function signDeadlineToken(payload) {
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

async function verifyAndDecodeToken(token) {
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Invalid token format');
  const [payloadB64, sigB64] = parts;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(TOKEN_SECRET()), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const sigBytes = Uint8Array.from(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payloadB64));
  if (!valid) throw new Error('Invalid token signature');

  const payload = JSON.parse(b64urlDecode(payloadB64));
  if (new Date(payload.expires_at) < new Date()) throw new Error('Token has expired');
  return payload;
}

// ── Gmail Helper ───────────────────────────────────────────────────────────────

async function sendGmail(base44, to, subject, html) {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
  const mime = [
    `From: EliteTC <me>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    html,
  ].join('\r\n');
  const encoded = btoa(unescape(encodeURIComponent(mime)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encoded }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.warn('Gmail send failed:', err.error?.message);
  }
}

// ── Main Handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, token } = body;

    if (!action || !token) {
      return Response.json({ error: 'Missing action or token' }, { status: 400 });
    }
    if (action !== 'yes' && action !== 'no') {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Verify token
    let payload;
    try {
      payload = await verifyAndDecodeToken(token);
    } catch (err) {
      return Response.json({ error: err.message, code: 'INVALID_TOKEN' }, { status: 400 });
    }

    const { transaction_id, deadline_type, agent_email } = payload;
    const responseType = `response_${deadline_type}`;

    // Single-use check
    const existing = await base44.asServiceRole.entities.AIActivityLog.filter({
      transaction_id,
      deadline_type: responseType,
    });
    if (existing.length > 0) {
      return Response.json({ success: false, code: 'ALREADY_RESPONDED', message: 'This response has already been recorded.' });
    }

    // Fetch transaction
    const txList = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    const tx = txList[0];
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    const label = DEADLINE_LABELS[deadline_type] || deadline_type;
    const deadlineDateStr = tx[deadline_type]
      ? new Date(tx[deadline_type]).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : 'Unknown';
    const tokenKey = token.substring(0, 80);

    if (action === 'yes') {
      // 1. Add TC task to transaction
      const newTask = {
        id: `task_ext_${deadline_type}_${Date.now()}`,
        name: `Prepare and send extension addendum — ${label}`,
        completed: false,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assigned_to: tx.agent || tx.agent_email || 'TC',
        required: true,
        phase: tx.phase || 1,
      };
      await base44.asServiceRole.entities.Transaction.update(transaction_id, {
        tasks: [...(tx.tasks || []), newTask],
      });

      // 2. Create InAppNotification for TC
      if (tx.agent_email) {
        await base44.asServiceRole.entities.InAppNotification.create({
          brokerage_id: tx.brokerage_id,
          transaction_id,
          user_email: tx.agent_email,
          title: `Extension Requested — ${label} – ${tx.address}`,
          body: `Agent ${agent_email} requested an extension for the ${label} deadline (${deadlineDateStr}). Please prepare an extension addendum.`,
          type: 'deadline',
          deadline_field: deadline_type,
          addendum_response: 'yes',
        });
      }

      // 3. Send TC email via Gmail
      if (tx.agent_email) {
        const tcHtml = `
<div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b;">
  <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:14px 16px;border-radius:8px;margin-bottom:20px;">
    <strong style="color:#dc2626;font-size:14px;">⚠️ Action Required — Extension Requested</strong>
  </div>
  <h2 style="margin:0 0 16px;font-size:18px;color:#0f172a;">${tx.address}</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:8px 0;color:#64748b;width:120px;">Deadline</td>
      <td style="padding:8px 0;font-weight:600;">${label}</td>
    </tr>
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:8px 0;color:#64748b;">Due</td>
      <td style="padding:8px 0;">${deadlineDateStr}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#64748b;">Agent</td>
      <td style="padding:8px 0;">${agent_email}</td>
    </tr>
  </table>
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px;">
    <p style="margin:0;color:#92400e;font-size:13px;">The agent has requested a deadline extension via email link. Please prepare and send an extension addendum at your earliest convenience. A task has been added to the transaction.</p>
  </div>
  <p style="margin-top:24px;color:#94a3b8;font-size:11px;">EliteTC — Automated Deadline Response System</p>
</div>`;
        try {
          await sendGmail(base44, tx.agent_email, `Action Required: Extension Requested — ${label} – ${tx.address}`, tcHtml);
        } catch (e) {
          console.warn('TC notification email failed:', e.message);
        }
      }

      // 4. Log (also serves as single-use dedup key)
      await base44.asServiceRole.entities.AIActivityLog.create({
        brokerage_id: tx.brokerage_id,
        transaction_id,
        transaction_address: tx.address,
        deadline_type: responseType,
        deadline_label: label,
        interval_label: '24h',
        recipient_email: agent_email,
        subject: `Agent YES — ${label} extension requested`,
        message: `Agent ${agent_email} requested extension via email link. TC task created and TC notified.`,
        response_status: 'responded_yes',
        notification_id: tokenKey,
      });

      return Response.json({
        success: true,
        action: 'yes',
        message: `Extension request submitted. Your TC has been notified and will prepare an addendum for the ${label} deadline.`,
      });

    } else {
      // NO — log confirmation
      await base44.asServiceRole.entities.AIActivityLog.create({
        brokerage_id: tx.brokerage_id,
        transaction_id,
        transaction_address: tx.address,
        deadline_type: responseType,
        deadline_label: label,
        interval_label: '24h',
        recipient_email: agent_email,
        subject: `Agent NO — ${label} on track`,
        message: `Agent ${agent_email} confirmed no extension needed for ${label} deadline.`,
        response_status: 'responded_no',
        notification_id: tokenKey,
      });

      return Response.json({
        success: true,
        action: 'no',
        message: `Confirmed — no extension needed for the ${label} deadline. We'll continue monitoring your transaction.`,
      });
    }

  } catch (error) {
    console.error('deadlineResponse error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});