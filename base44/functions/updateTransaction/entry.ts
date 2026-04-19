import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowedRoles = ['admin', 'owner', 'tc_lead', 'tc', 'agent'];
    const isMaster = user.email === 'nhcazateam@gmail.com';
    if (!isMaster && !allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { transaction_id, data } = await req.json();
    if (!transaction_id) return Response.json({ error: 'transaction_id required' }, { status: 400 });
    if (!data || typeof data !== 'object') return Response.json({ error: 'data required' }, { status: 400 });

    // Use service role to bypass RLS — auth check above already enforces access control
    const updated = await base44.asServiceRole.entities.Transaction.update(transaction_id, data);
    return Response.json({ success: true, data: updated });
  } catch (error) {
    console.error('updateTransaction error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});