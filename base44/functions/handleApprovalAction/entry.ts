import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * handleApprovalAction
 * Public endpoint — no auth required.
 * Validates token, marks approval as approved/rejected, sends confirmation, logs event.
 *
 * Payload: { token, action: 'approve' | 'reject', reason? }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, action, reason } = await req.json();

    if (!token || !['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'Invalid request: token and action (approve|reject) required' }, { status: 400 });
    }

    // Find approval by token (service role — this is a public endpoint)
    const approvals = await base44.asServiceRole.entities.Approval.filter({ token });
    if (!approvals || approvals.length === 0) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    const approval = approvals[0];

    // Check already actioned
    if (['approved', 'rejected'].includes(approval.status)) {
      return Response.json({
        success: false,
        message: `This request has already been ${approval.status}.`,
        status: approval.status,
      });
    }

    // Check expiry
    if (approval.token_expires_at && new Date() > new Date(approval.token_expires_at)) {
      return Response.json({ error: 'This approval link has expired. Please request a new one.' }, { status: 410 });
    }

    const now = new Date().toISOString();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await base44.asServiceRole.entities.Approval.update(approval.id, {
      status: newStatus,
      approved_at: now,
      rejection_reason: action === 'reject' ? (reason || null) : null,
    });

    // Fetch transaction for context
    const txList = await base44.asServiceRole.entities.Transaction.filter({ id: approval.transaction_id });
    const transaction = txList?.[0] || {};

    const typeLabel = approval.type === 'fuel_proration' ? 'Fuel Proration' : 'Commission Statement';
    const actionLabel = action === 'approve' ? 'Approved' : 'Rejected';
    const actionColor = action === 'approve' ? '#16A34A' : '#DC2626';

    // Send confirmation email back to sender
    if (approval.sent_to_email) {
      const confirmBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:${actionColor};">${typeLabel} ${actionLabel}</h2>
  <p><strong>Property:</strong> ${transaction.address || approval.transaction_id}</p>
  <p><strong>Status:</strong> <span style="color:${actionColor};font-weight:600;">${actionLabel}</span></p>
  ${action === 'reject' && reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
  <p style="color:#64748B;font-size:13px;">Actioned on ${new Date(now).toLocaleString()}</p>
</div>`;

      await base44.integrations.Core.SendEmail({
        to: approval.sent_to_email,
        subject: `${typeLabel} ${actionLabel} — ${transaction.address || ''}`,
        body: confirmBody,
      });
    }

    // Log to audit trail
    await base44.asServiceRole.entities.AuditLog.create({
      transaction_id: approval.transaction_id,
      brokerage_id: transaction.brokerage_id || null,
      actor_email: approval.sent_to_email || 'external',
      action: `approval_${newStatus}`,
      entity_type: 'transaction',
      entity_id: approval.transaction_id,
      description: `${typeLabel} ${actionLabel}${reason ? ` — Reason: ${reason}` : ''}`,
    });

    return Response.json({
      success: true,
      status: newStatus,
      message: `${typeLabel} successfully ${actionLabel.toLowerCase()}.`,
    });
  } catch (error) {
    console.error('handleApprovalAction error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});