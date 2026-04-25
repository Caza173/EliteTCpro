import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * sendApprovalRequest
 * Creates or updates an Approval record, generates a secure token,
 * sends the approval email, and logs the event on the transaction.
 *
 * Payload: { type, transaction_id, sent_to_email, data_json? }
 */

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ALLOWED_ROLES = ['owner', 'team_lead', 'tc', 'admin', 'tc_lead'];
    if (!ALLOWED_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { type, transaction_id, sent_to_email, data_json } = await req.json();

    if (!type || !transaction_id || !sent_to_email) {
      return Response.json({ error: 'Missing required fields: type, transaction_id, sent_to_email' }, { status: 400 });
    }

    // Fetch transaction (service role so we bypass any RLS for the read)
    const txList = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    if (!txList || txList.length === 0) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }
    const transaction = txList[0];

    const team_id = user.data?.team_id || transaction.team_id;
    const token = generateToken();
    const now = new Date();
    const tokenExpiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();

    // Check for existing draft/sent approval of same type to version-bump
    const existing = await base44.asServiceRole.entities.Approval.filter({
      transaction_id,
      type,
      status: { $in: ['draft', 'sent'] },
    });

    let approval;
    if (existing && existing.length > 0) {
      const prev = existing[0];
      const newVersion = (prev.version || 1) + 1;
      approval = await base44.asServiceRole.entities.Approval.update(prev.id, {
        status: 'sent',
        sent_to_email,
        sent_at: now.toISOString(),
        token,
        token_expires_at: tokenExpiresAt,
        version: newVersion,
        approved_at: null,
        approved_by: null,
        data_json: data_json || prev.data_json || {},
        reminder_count: 0,
        last_reminder_at: null,
      });
    } else {
      approval = await base44.asServiceRole.entities.Approval.create({
        transaction_id,
        team_id,
        type,
        status: 'sent',
        sent_to_email,
        sent_at: now.toISOString(),
        token,
        token_expires_at: tokenExpiresAt,
        version: 1,
        data_json: data_json || {},
        reminder_count: 0,
        created_by: user.id,
      });
    }

    // Build approval URL
    const appBase = req.headers.get('origin') || 'https://app.elitetc.io';
    const approveUrl = `${appBase}/#/ApprovalAction?token=${token}&action=approve`;
    const rejectUrl = `${appBase}/#/ApprovalAction?token=${token}&action=reject`;

    const typeLabel = type === 'fuel_proration' ? 'Fuel Proration' : 'Commission Statement';
    const summary = buildSummary(type, data_json || {}, transaction);

    const emailBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#0F172A;">Approval Request: ${typeLabel}</h2>
  <p><strong>Property:</strong> ${transaction.address}</p>
  <p><strong>Request Type:</strong> ${typeLabel}</p>
  ${summary}
  <p style="margin-top:24px;">Please review and respond:</p>
  <div style="margin:24px 0;display:flex;gap:16px;">
    <a href="${approveUrl}" style="background:#16A34A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">✓ Approve</a>
    &nbsp;&nbsp;
    <a href="${rejectUrl}" style="background:#DC2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">✗ Reject</a>
  </div>
  <p style="color:#64748B;font-size:13px;">This link expires in 72 hours. If you did not expect this email, please ignore it.</p>
</div>`;

    await base44.integrations.Core.SendEmail({
      to: sent_to_email,
      subject: `Approval Required: ${typeLabel} — ${transaction.address}`,
      body: emailBody,
    });

    // Log to audit trail
    await base44.asServiceRole.entities.AuditLog.create({
      transaction_id,
      brokerage_id: transaction.brokerage_id || null,
      actor_email: user.email,
      action: 'approval_sent',
      entity_type: 'transaction',
      entity_id: transaction_id,
      description: `${typeLabel} sent for approval to ${sent_to_email} (v${approval.version || 1})`,
    });

    return Response.json({ success: true, approval_id: approval.id, token, expires_at: tokenExpiresAt });
  } catch (error) {
    console.error('sendApprovalRequest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildSummary(type, data, transaction) {
  if (!data || Object.keys(data).length === 0) return '';
  const rows = Object.entries(data)
    .map(([k, v]) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#64748B;">${k.replace(/_/g, ' ')}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;">${v}</td></tr>`)
    .join('');
  return `<table style="border-collapse:collapse;width:100%;margin:16px 0;">${rows}</table>`;
}