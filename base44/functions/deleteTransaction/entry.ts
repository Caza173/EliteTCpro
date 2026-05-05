import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowedRoles = ['admin', 'owner', 'tc_lead', 'tc'];
    const isMaster = user.email === 'nhcazateam@gmail.com';
    if (!isMaster && !allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { transaction_id } = await req.json();
    if (!transaction_id) return Response.json({ error: 'transaction_id required' }, { status: 400 });

    const isMasterDel = user.email === 'nhcazateam@gmail.com';
    const isSuperDel = isMasterDel || user.role === 'admin' || user.role === 'owner';

    // Verify ownership for non-super users
    if (!isSuperDel) {
      const existing = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id, created_by: user.id });
      if (!existing.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

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