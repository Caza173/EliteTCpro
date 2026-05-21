import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_ROLES = new Set(['admin', 'owner', 'super_admin']);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const { status, sort = '-created_date', limit = 200, transaction_id } = body;

    const isAdmin = ADMIN_ROLES.has(user.role) || ADMIN_ROLES.has(user.data?.role);
    const svc = base44.asServiceRole;

    console.log(`[getTeamTransactions] user.id=${user.id} user.email=${user.email} role=${user.role} isAdmin=${isAdmin}`);

    // ── SINGLE TRANSACTION LOOKUP ──────────────────────────────────────────
    if (transaction_id) {
      let results = [];
      try { results = await svc.entities.Transaction.filter({ id: transaction_id }); } catch (_) {}
      const tx = results[0] || null;

      if (!tx) return Response.json({ transactions: [], transaction: null });

      if (!isAdmin && !_userOwnsTx(tx, user)) {
        // Log denied access
        await _logAccessDenied(svc, user, transaction_id, 'single_lookup');
        return Response.json({ transactions: [], transaction: null });
      }

      return Response.json({ transactions: [tx], transaction: tx });
    }

    // ── LIST ───────────────────────────────────────────────────────────────
    // Admins can see all; regular users filtered server-side
    const all = status
      ? await svc.entities.Transaction.filter({ status }, sort, limit)
      : await svc.entities.Transaction.list(sort, limit);

    console.log(`[getTeamTransactions] total records in DB: ${all.length}`);

    if (isAdmin) {
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
 * Checks all ownership fields in priority order.
 */
function _userOwnsTx(tx, user) {
  if (!tx || !user) return false;
  const uid = user.id;
  const email = user.email;
  if (tx.owner_user_id && tx.owner_user_id === uid) return true;
  if (tx.owner_id && tx.owner_id === uid) return true;
  if (tx.created_by === uid) return true;
  if (tx.created_by === email) return true;
  if (tx.created_by_email && tx.created_by_email === email) return true;
  if (tx.agent_email && tx.agent_email === email) return true;
  if (tx.assigned_tc_id && tx.assigned_tc_id === uid) return true;
  return false;
}

async function _logAccessDenied(svc, user, entityId, reason) {
  try {
    await svc.entities.AuditLog.create({
      action: 'ACCESS_DENIED',
      entity_type: 'transaction',
      entity_id: entityId,
      actor_user_id: user.id,
      actor_email: user.email,
      description: `Access denied: user ${user.email} attempted to access transaction ${entityId} (reason: ${reason})`,
    });
  } catch (_) { /* never throw on audit log failure */ }
}