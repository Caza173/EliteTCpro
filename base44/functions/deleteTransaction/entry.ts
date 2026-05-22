import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transaction_id } = await req.json();
    if (!transaction_id) return Response.json({ error: 'transaction_id required' }, { status: 400 });

    const isAdmin = ['admin', 'owner', 'super_admin'].includes(user.role);

    console.log(`[deleteTransaction] user.id=${user.id} tx=${transaction_id}`);

    // Fetch via service role to get the raw record
    const results = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    const tx = results[0];

    if (!tx) {
      // Already gone — treat as success
      return Response.json({ success: true });
    }

    // Ownership check: admins bypass; everyone else must own the record
    const isOwner = tx.owner_user_id === user.id || tx.created_by === user.id || tx.agent_email === user.email;
    if (!isAdmin && !isOwner) {
      console.warn(`[deleteTransaction] FORBIDDEN user.id=${user.id} attempted tx=${transaction_id}`);
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log(`[deleteTransaction] confirmed authorization, deleting tx=${transaction_id}`);
    await base44.asServiceRole.entities.Transaction.delete(transaction_id);
    return Response.json({ success: true });

  } catch (error) {
    const msg = error?.message || '';
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      return Response.json({ success: true });
    }
    return Response.json({ error: msg }, { status: 500 });
  }
});