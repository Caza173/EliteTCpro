import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allowedRoles = ['admin', 'owner', 'tc_lead', 'tc'];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { transaction_id } = await req.json();
    if (!transaction_id) return Response.json({ error: 'transaction_id required' }, { status: 400 });

    try {
      await base44.asServiceRole.entities.Transaction.delete(transaction_id);
    } catch (deleteErr) {
      // 404 = already deleted or not found — treat as success
      const msg = deleteErr?.message || '';
      if (!msg.includes('404') && !msg.toLowerCase().includes('not found')) {
        throw deleteErr;
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});