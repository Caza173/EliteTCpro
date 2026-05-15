import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPER_ADMIN_EMAIL = 'nhcazateam@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transaction_id } = await req.json();
    if (!transaction_id) return Response.json({ error: 'transaction_id required' }, { status: 400 });

    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL || user.role === 'admin' || user.role === 'owner';

    console.log(`[deleteTransaction] user.id=${user.id} tx=${transaction_id}`);

    // Fetch via service role to get the raw record
    const results = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    const tx = results[0];

    if (!tx) {
      // Already gone — treat as success
      return Response.json({ success: true });
    }

    // Ownership check
    const isOwner = tx.created_by === user.id || tx.created_by === user.email || tx.agent_email === user.email;
    if (!isSuperAdmin && !isOwner) {
      console.warn(`[deleteTransaction] FORBIDDEN user.id=${user.id} attempted tx=${transaction_id} (created_by=${tx.created_by})`);
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log(`[deleteTransaction] confirmed ownership, deleting tx=${transaction_id}`);
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