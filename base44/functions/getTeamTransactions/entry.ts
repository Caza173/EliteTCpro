import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const { status, sort = '-created_date', limit = 200, transaction_id } = body;

    console.log(`[getTeamTransactions] user.id=${user.id} user.email=${user.email}`);

    // ── SINGLE TRANSACTION LOOKUP ─────────────────────────────────────────────
    // Use user-scoped client — RLS enforces created_by = user.id automatically
    if (transaction_id) {
      const results = await base44.entities.Transaction.filter({ id: transaction_id });
      const tx = results[0] || null;
      console.log(`[getTeamTransactions] single lookup tx=${transaction_id} found=${!!tx} created_by=${tx?.created_by}`);
      return Response.json({ transactions: tx ? [tx] : [], transaction: tx });
    }

    // ── LIST: user-scoped via RLS (no explicit created_by filter needed — RLS enforces it) ──
    const transactions = status
      ? await base44.entities.Transaction.filter({ status }, sort, limit)
      : await base44.entities.Transaction.list(sort, limit);

    console.log(`[getTeamTransactions] fetched ${transactions.length} transactions for user.id=${user.id}`);
    return Response.json({ transactions });

  } catch (error) {
    console.error('[getTeamTransactions] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});