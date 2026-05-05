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
      if (isSuper) {
        const results = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
        const tx = results[0] || null;
        return Response.json({ transactions: tx ? [tx] : [], transaction: tx });
      }
      // Try by UUID first, then by email (legacy records)
      let results = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id, created_by: user.id });
      if (!results.length) {
        results = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id, created_by: user.email });
      }
      const tx = results[0] || null;
      return Response.json({ transactions: tx ? [tx] : [], transaction: tx });
    }

    // ── SUPER ADMIN: sees all transactions ───────────────────────────────────
    if (isSuper) {
      const transactions = status
        ? await base44.asServiceRole.entities.Transaction.filter({ status }, sort, limit)
        : await base44.asServiceRole.entities.Transaction.list(sort, limit);
      return Response.json({ transactions });
    }

    // ── REGULAR USER: fetch by UUID (new) + by email (legacy) and merge ──────
    const baseFilter = status ? { status } : {};

    const [byId, byEmail] = await Promise.all([
      base44.asServiceRole.entities.Transaction.filter({ ...baseFilter, created_by: user.id }, sort, limit),
      base44.asServiceRole.entities.Transaction.filter({ ...baseFilter, created_by: user.email }, sort, limit),
    ]);

    // Deduplicate by id
    const seen = new Set();
    const transactions = [];
    for (const tx of [...byId, ...byEmail]) {
      if (!seen.has(tx.id)) {
        seen.add(tx.id);
        transactions.push(tx);
      }
    }

    // Sort merged results
    transactions.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    console.log('[getTeamTransactions] fetched:', transactions.length, '(byId:', byId.length, 'byEmail:', byEmail.length, ') for user.id:', user.id);
    return Response.json({ transactions });

  } catch (error) {
    console.error('[getTeamTransactions] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});