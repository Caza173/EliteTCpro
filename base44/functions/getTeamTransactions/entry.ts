import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPER_ADMIN_EMAIL = 'nhcazateam@gmail.com';
const ADMIN_ROLES = ['admin', 'owner'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const { status, sort = '-created_date', limit = 200, transaction_id } = body;

    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL || ADMIN_ROLES.includes(user.role);
    const svc = base44.asServiceRole;

    console.log(`[getTeamTransactions] user.id=${user.id} user.email=${user.email} role=${user.role} isSuperAdmin=${isSuperAdmin}`);

    // ── SINGLE TRANSACTION LOOKUP ──────────────────────────────────────────
    if (transaction_id) {
      const results = await svc.entities.Transaction.filter({ id: transaction_id });
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
      console.log(`[getTeamTransactions] admin path — returning all ${all.length} transactions`);
      return Response.json({ transactions: all });
    }

    // Regular user: filter to only their own transactions.
    // Match any of: created_by (UUID or email), agent_email, owner_id, brokerage_id
    const userBrokerageId = user.data?.brokerage_id;

    const transactions = all.filter(tx => _userOwnsTx(tx, user, userBrokerageId));

    // Debug: log why records were excluded
    const excluded = all.filter(tx => !_userOwnsTx(tx, user, userBrokerageId));
    if (excluded.length > 0 && excluded.length <= 10) {
      excluded.forEach(tx => {
        console.log(`[getTeamTransactions] EXCLUDED tx=${tx.id} address="${tx.address}" created_by=${tx.created_by} agent_email=${tx.agent_email} owner_id=${tx.owner_id} brokerage_id=${tx.brokerage_id}`);
      });
    }

    console.log(`[getTeamTransactions] user=${user.email} owns=${transactions.length} / total=${all.length} (excluded=${excluded.length})`);

    return Response.json({
      transactions,
      _debug: {
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        brokerageId: userBrokerageId || null,
        totalInDb: all.length,
        returned: transactions.length,
        excluded: excluded.length,
      }
    });

  } catch (error) {
    console.error('[getTeamTransactions] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Returns true if the authenticated user should see this transaction.
 * Checks all possible ownership fields to handle legacy + new records.
 */
function _userOwnsTx(tx, user, userBrokerageId) {
  if (!tx || !user) return false;

  // Primary: created_by matches user UUID or email (handles both old + new records)
  if (tx.created_by === user.id) return true;
  if (tx.created_by === user.email) return true;

  // Secondary: explicit owner_id field
  if (tx.owner_id && tx.owner_id === user.id) return true;

  // Tertiary: agent_email on the transaction matches user's email
  if (tx.agent_email && tx.agent_email === user.email) return true;

  // Quaternary: brokerage_id scoping (for TC/TC_LEAD roles within a brokerage)
  if (userBrokerageId && tx.brokerage_id && tx.brokerage_id === userBrokerageId) {
    if (user.role === 'tc' || user.role === 'tc_lead') return true;
  }

  return false;
}