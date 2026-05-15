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

    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
    const svc = base44.asServiceRole;

    console.log(`[getTeamTransactions] user.id=${user.id} user.email=${user.email} isSuperAdmin=${isSuperAdmin}`);

    // ── SINGLE TRANSACTION LOOKUP ──────────────────────────────────────────
    if (transaction_id) {
      let results = [];
      try { results = await svc.entities.Transaction.filter({ id: transaction_id }); } catch (_) {}
      const tx = results[0] || null;
      const canView = !tx || isSuperAdmin || _userOwnsTx(tx, user);
      console.log(`[getTeamTransactions] single tx=${transaction_id} found=${!!tx} canView=${canView}`);
      if (!canView) return Response.json({ transactions: [], transaction: null });
      return Response.json({ transactions: tx ? [tx] : [], transaction: tx });
    }

    // ── LIST ───────────────────────────────────────────────────────────────
    const all = status
      ? await svc.entities.Transaction.filter({ status }, sort, limit)
      : await svc.entities.Transaction.list(sort, limit);

    console.log(`[getTeamTransactions] total records in DB: ${all.length}`);

    if (isSuperAdmin) {
      return Response.json({ transactions: all });
    }

    // Regular user: strictly their own transactions only
    const transactions = all.filter(tx => _userOwnsTx(tx, user));

    console.log(`[getTeamTransactions] user=${user.email} owns=${transactions.length} / total=${all.length}`);

    return Response.json({ transactions });

  } catch (error) {
    console.error('[getTeamTransactions] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Returns true only if the authenticated user owns this transaction.
 * Strictly user-isolated — no team, brokerage, or role-based sharing.
 */
function _userOwnsTx(tx, user) {
  if (!tx || !user) return false;
  if (tx.created_by === user.id) return true;
  if (tx.created_by === user.email) return true;
  if (tx.owner_id && tx.owner_id === user.id) return true;
  if (tx.agent_email && tx.agent_email === user.email) return true;
  return false;
}