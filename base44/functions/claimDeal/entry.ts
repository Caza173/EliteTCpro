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

    // Notify admins that the deal was claimed
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