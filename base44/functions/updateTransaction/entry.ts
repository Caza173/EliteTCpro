import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPER_ADMIN_EMAIL = 'nhcazateam@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transaction_id, data } = await req.json();
    if (!transaction_id) return Response.json({ error: 'transaction_id required' }, { status: 400 });
    if (!data || typeof data !== 'object') return Response.json({ error: 'data required' }, { status: 400 });

    const isSuper = user.email === SUPER_ADMIN_EMAIL;

    if (!isSuper) {
      // Verify ownership with user-scoped client (UUID or legacy email)
      let existing = await base44.entities.Transaction.filter({ id: transaction_id, created_by: user.id });
      if (!existing.length) {
        existing = await base44.entities.Transaction.filter({ id: transaction_id, created_by: user.email });
      }
      if (!existing.length) {
        console.warn('[updateTransaction] ownership check failed for user:', user.id, 'tx:', transaction_id);
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Use service role only for the actual write (user-scoped update isn't always reliable for partial updates)
    const updated = await base44.asServiceRole.entities.Transaction.update(transaction_id, data);
    return Response.json({ success: true, data: updated });
  } catch (error) {
    console.error('[updateTransaction] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});