/**
 * notifyTCsOfNewDeal — Notifies all TCs and admins when a new pending deal is created.
 * Called by the entity automation on Transaction create (status=pending).
 * Can also be invoked manually from the frontend.
 *
 * Body (from entity automation payload):
 *   event: { type, entity_name, entity_id }
 *   data: current transaction data
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = 'https://app.base44.com'; // fallback; actual URL derived from request

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}

    // Support both direct invocation and entity automation payload
    const transactionId = body.transaction_id || body.event?.entity_id || body.data?.id;
    let transaction = body.data || body.transaction || null;

    // Fetch if not provided or incomplete
    if (!transaction || !transaction.address) {
      if (!transactionId) return Response.json({ error: 'transaction_id required' }, { status: 400 });
      const results = await base44.asServiceRole.entities.Transaction.filter({ id: transactionId });
      transaction = results[0];
      if (!transaction) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Only notify for pending, unassigned deals
    if (transaction.status !== 'pending' || transaction.assigned_tc_id) {
      return Response.json({ skipped: true, reason: 'Not a pending/unassigned deal' });
    }

    const allUsers = await base44.asServiceRole.entities.User.list();
    const notifyUsers = allUsers.filter(u =>
      ['tc', 'tc_lead', 'admin', 'owner'].includes(u.role)
    );

    if (notifyUsers.length === 0) {
      return Response.json({ success: true, sent: 0, message: 'No TC/admin users to notify' });
    }

    const address = transaction.address || 'Unknown Property';
    const agentName = transaction.agent || transaction.agent_name || 'Unknown Agent';
    const dealType = transaction.transaction_type || transaction.deal_type || 'buyer';
    const effectiveDate = transaction.contract_date || transaction.effective_date || null;
    const inspectionDeadline = transaction.inspection_deadline || null;

    // Derive the app base URL from the request origin
    const origin = req.headers.get('origin') || req.headers.get('referer') || APP_URL;
    const baseUrl = origin.replace(/\/$/, '');

    const claimLink = `${baseUrl}/#/transactions/${transaction.id}?tab=overview`;

    const formatDate = (d) => {
      if (!d) return 'N/A';
      try { return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
      catch { return d; }
    };

    const emailBody = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
        <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <div style="background:#0f172a;padding:20px 24px;">
            <h1 style="color:#fff;margin:0;font-size:18px;font-weight:600;">New Deal Submitted</h1>
            <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">Pending assignment — first to claim gets it</p>
          </div>
          <div style="padding:24px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
              <tr><td style="padding:8px 0;color:#64748b;width:45%;border-bottom:1px solid #f1f5f9;">Property</td>
                  <td style="padding:8px 0;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;">${address}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Agent</td>
                  <td style="padding:8px 0;color:#0f172a;border-bottom:1px solid #f1f5f9;">${agentName}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Deal Type</td>
                  <td style="padding:8px 0;color:#0f172a;text-transform:capitalize;border-bottom:1px solid #f1f5f9;">${dealType}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;border-bottom:1px solid #f1f5f9;">Effective Date</td>
                  <td style="padding:8px 0;color:#0f172a;border-bottom:1px solid #f1f5f9;">${formatDate(effectiveDate)}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;">Inspection Deadline</td>
                  <td style="padding:8px 0;color:#0f172a;">${formatDate(inspectionDeadline)}</td></tr>
            </table>
            <div style="text-align:center;margin-top:24px;">
              <a href="${claimLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                Review &amp; Claim This Deal →
              </a>
            </div>
            <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
              First TC to claim this deal will be assigned. Log in to EliteTC to claim.
            </p>
          </div>
        </div>
      </div>
    `;

    const results = await Promise.allSettled(notifyUsers.map(u =>
      base44.asServiceRole.integrations.Core.SendEmail({
        to: u.email,
        from_name: 'EliteTC',
        subject: `New Deal Submitted – ${address}`,
        body: emailBody,
      })
    ));

    const sent = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[notifyTCsOfNewDeal] Notified ${sent}/${notifyUsers.length} users for deal ${transaction.id}`);

    // Create in-app notifications for each TC/admin
    await Promise.allSettled(notifyUsers.map(u =>
      base44.asServiceRole.entities.InAppNotification.create({
        brokerage_id: transaction.brokerage_id || null,
        user_id: u.id || null,
        user_email: u.email,
        transaction_id: transaction.id,
        title: 'New Deal Ready to Claim',
        body: `${address} — ${agentName} (${dealType})`,
        type: 'system',
        severity: 'notice',
      })
    ));

    return Response.json({ success: true, sent, total: notifyUsers.length });
  } catch (error) {
    console.error('[notifyTCsOfNewDeal] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});