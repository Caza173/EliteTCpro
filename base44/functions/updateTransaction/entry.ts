import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPER_ADMIN_EMAIL = 'nhcazateam@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    // Support both {transaction_id, data} and {transaction_id, updates} shapes
    const transaction_id = body.transaction_id;
    const data = body.data || body.updates;

    if (!transaction_id) return Response.json({ error: 'transaction_id required' }, { status: 400 });
    if (!data || typeof data !== 'object') return Response.json({ error: 'data/updates required' }, { status: 400 });

    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL || user.role === 'admin' || user.role === 'owner';

    console.log(`[updateTransaction] user.id=${user.id} tx=${transaction_id}`);

    // Fetch via service role to get the raw record
    let tx = null;
    try {
      const results = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
      tx = results[0] || null;
    } catch (_) {}

    if (!tx) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Ownership check: super-admins bypass; everyone else must own the record
    const isOwner = tx.created_by === user.id || tx.created_by === user.email || tx.agent_email === user.email;
    if (!isSuperAdmin && !isOwner) {
      console.warn(`[updateTransaction] FORBIDDEN user.id=${user.id} attempted tx=${transaction_id} (created_by=${tx.created_by})`);
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Strip fields users must not override
    const { created_by: _c, owner_id: _o, ...safeData } = data;

    const updated = await base44.asServiceRole.entities.Transaction.update(transaction_id, safeData);
    console.log(`[updateTransaction] success tx=${transaction_id}`);
    return Response.json({ success: true, data: updated });
  } catch (error) {
    console.error('[updateTransaction] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});