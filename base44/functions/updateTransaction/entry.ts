import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transaction_id, data } = await req.json();
    if (!transaction_id) return Response.json({ error: 'transaction_id required' }, { status: 400 });
    if (!data || typeof data !== 'object') return Response.json({ error: 'data required' }, { status: 400 });

    console.log(`[updateTransaction] user.id=${user.id} tx=${transaction_id}`);

    // Verify ownership via user-scoped read — RLS prevents reading other users' records
    const existing = await base44.entities.Transaction.filter({ id: transaction_id });
    if (!existing.length) {
      console.warn(`[updateTransaction] FORBIDDEN user.id=${user.id} attempted tx=${transaction_id}`);
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Write via user-scoped client — RLS enforces ownership on update too
    const updated = await base44.entities.Transaction.update(transaction_id, data);
    console.log(`[updateTransaction] success tx=${transaction_id} created_by=${existing[0].created_by}`);
    return Response.json({ success: true, data: updated });
  } catch (error) {
    console.error('[updateTransaction] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});