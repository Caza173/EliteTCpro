/**
 * claimDeal — Atomic claim: sets assigned_tc_id only if currently null.
 * Also supports admin forced-assignment.
 *
 * Body params:
 *   transaction_id  — required
 *   force_assign_to_user_id   — optional, admin only: force-assign to a specific user
 *   force_assign_to_email     — optional, admin only
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transaction_id, force_assign_to_user_id, force_assign_to_email } = await req.json();
    if (!transaction_id) return Response.json({ error: 'transaction_id is required' }, { status: 400 });

    const isAdmin = ['admin', 'owner'].includes(user.role) || user.email === 'nhcazateam@gmail.com';
    const isTC = ['tc', 'tc_lead'].includes(user.role);

    if (!isAdmin && !isTC) {
      return Response.json({ error: 'Only TCs and admins can claim deals' }, { status: 403 });
    }

    // Fetch the current transaction (service role to bypass RLS)
    const txList = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    const tx = txList[0];
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    // Admin forced assignment
    if (isAdmin && force_assign_to_user_id) {
      await base44.asServiceRole.entities.Transaction.update(transaction_id, {
        assigned_tc_id: force_assign_to_user_id,
        assigned_tc_email: force_assign_to_email || null,
        status: 'active',
        claimed_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      });

      // Notify the assigned TC
      if (force_assign_to_email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: force_assign_to_email,
          from_name: 'EliteTC',
          subject: `Deal Assigned to You — ${tx.address}`,
          body: `<p>Hello,</p><p>The deal at <strong>${tx.address}</strong> has been assigned to you by an admin.</p><p>Log in to EliteTC to get started.</p>`,
        }).catch(() => {});
      }

      return Response.json({ success: true, action: 'admin_assigned' });
    }

    // TC self-claim: only if assigned_tc_id is null
    if (tx.assigned_tc_id) {
      return Response.json({ error: 'Deal already claimed', already_claimed: true }, { status: 409 });
    }

    if (tx.status !== 'pending') {
      return Response.json({ error: 'Deal is not in pending status' }, { status: 409 });
    }

    await base44.asServiceRole.entities.Transaction.update(transaction_id, {
      assigned_tc_id: user.id,
      assigned_tc_email: user.email,
      status: 'active',
      claimed_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    });

    // 1. Confirm to the claiming TC
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      from_name: 'EliteTC',
      subject: `You've Been Assigned a New Deal — ${tx.address}`,
      body: `
        <div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="color:#0f172a;margin:0 0 12px;">Deal Assigned to You</h2>
          <p style="color:#475569;font-size:14px;">You have successfully claimed the following deal:</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;font-size:16px;font-weight:600;color:#0f172a;">${tx.address}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#64748b;">Agent: ${tx.agent || '—'} &nbsp;|&nbsp; Type: ${tx.transaction_type || '—'}</p>
          </div>
          <p style="color:#475569;font-size:13px;">Log in to EliteTC to begin managing this transaction.</p>
        </div>
      `,
    }).catch(() => {});

    // 2. Notify admins
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u => ['admin', 'owner'].includes(u.role) || u.email === 'nhcazateam@gmail.com');
    await Promise.allSettled(admins.map(admin =>
      base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        from_name: 'EliteTC',
        subject: `Deal Claimed — ${tx.address}`,
        body: `<p>The deal at <strong>${tx.address}</strong> was claimed by <strong>${user.email}</strong>.</p>`,
      })
    ));

    return Response.json({ success: true, action: 'claimed' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});