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

    const filterBase = status ? { status } : {};

    // ── SINGLE TRANSACTION LOOKUP ─────────────────────────────────────────────
    if (transaction_id) {
      const results = await Promise.all([
        base44.asServiceRole.entities.Transaction.filter({ id: transaction_id, created_by: user.id }),
        base44.asServiceRole.entities.Transaction.filter({ id: transaction_id, created_by: user.email }),
      ]);
      const tx = results.flat().find(t => t.id === transaction_id) || null;
      console.log('[getTeamTransactions] single lookup', transaction_id, '→', tx ? 'found' : 'not found');
      return Response.json({ transactions: tx ? [tx] : [], transaction: tx });
    }

    console.log('[getTeamTransactions] user:', user.email, 'role:', user.role, 'id:', user.id);

    // ── SUPER ADMIN: sees everything ──────────────────────────────────────────
    const isSuper = user.email === SUPER_ADMIN_EMAIL || user.role === 'admin' || user.role === 'owner';
    if (isSuper) {
      const transactions = status
        ? await base44.asServiceRole.entities.Transaction.filter({ status }, sort, limit)
        : await base44.asServiceRole.entities.Transaction.list(sort, limit);
      console.log('[getTeamTransactions] super admin fetched:', transactions.length);
      return Response.json({ transactions });
    }

    // ── REGULAR USER: only their own transactions ─────────────────────────────
    // created_by may be stamped as user.id (UUID) or user.email depending on how it was created
    const [byId, byEmail] = await Promise.all([
      base44.asServiceRole.entities.Transaction.filter({ ...filterBase, created_by: user.id }, sort, limit),
      base44.asServiceRole.entities.Transaction.filter({ ...filterBase, created_by: user.email }, sort, limit),
    ]);

    // Deduplicate
    const seen = new Set();
    const transactions = [];
    for (const tx of [...byId, ...byEmail]) {
      if (!seen.has(tx.id)) {
        seen.add(tx.id);
        transactions.push(tx);
      }
    }
    transactions.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

    console.log('[getTeamTransactions] fetched:', transactions.length, '| byId:', byId.length, '| byEmail:', byEmail.length);

    return Response.json({ transactions });

  } catch (error) {
    console.error('[getTeamTransactions] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});