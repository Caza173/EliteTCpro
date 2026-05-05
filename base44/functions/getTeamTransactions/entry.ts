import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPER_ADMIN_EMAIL = 'nhcazateam@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const { status, sort = '-created_date', limit = 200, transaction_id } = body;

    const isSuper = user.email === SUPER_ADMIN_EMAIL;

    // ── SINGLE TRANSACTION LOOKUP ────────────────────────────────────────────
    if (transaction_id) {
      const filter = isSuper
        ? { id: transaction_id }
        : { id: transaction_id, created_by: user.id };
      const results = await base44.asServiceRole.entities.Transaction.filter(filter);
      const tx = results[0] || null;
      console.log('[getTeamTransactions] single lookup', transaction_id, '→', tx ? 'found' : 'not found');
      return Response.json({ transactions: tx ? [tx] : [], transaction: tx });
    }

    console.log('[getTeamTransactions] user:', user.email, 'id:', user.id);

    // ── SUPER ADMIN: sees all transactions ───────────────────────────────────
    if (isSuper) {
      const transactions = status
        ? await base44.asServiceRole.entities.Transaction.filter({ status }, sort, limit)
        : await base44.asServiceRole.entities.Transaction.list(sort, limit);
      console.log('[getTeamTransactions] super admin fetched:', transactions.length);
      return Response.json({ transactions });
    }

    // ── REGULAR USER: only their own transactions ────────────────────────────
    const filter = status
      ? { created_by: user.id, status }
      : { created_by: user.id };
    const transactions = await base44.asServiceRole.entities.Transaction.filter(filter, sort, limit);

    console.log('[getTeamTransactions] fetched:', transactions.length, 'for user.id:', user.id);
    return Response.json({ transactions });

  } catch (error) {
    console.error('[getTeamTransactions] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});