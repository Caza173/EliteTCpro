import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPER_ADMIN_EMAIL = 'nhcazateam@gmail.com';
const ADMIN_ROLES = ['admin', 'owner', 'tc_lead', 'tc'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const { status, sort = '-created_date', limit = 200, transaction_id } = body;

    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL || ADMIN_ROLES.includes(user.role);

    console.log(`[getTeamTransactions] user.id=${user.id} user.email=${user.email} role=${user.role} isAdmin=${isSuperAdmin}`);

    // Use service role since RLS is now open — we do app-level filtering here
    const svc = base44.asServiceRole;

    // ── SINGLE TRANSACTION LOOKUP ─────────────────────────────────────────────
    if (transaction_id) {
      const results = await svc.entities.Transaction.filter({ id: transaction_id });
      const tx = results[0] || null;
      // Access check: admins see all, others must match agent_email or created_by
      const canView = !tx || isSuperAdmin
        || tx.agent_email === user.email
        || tx.created_by === user.id
        || tx.created_by === user.email;
      console.log(`[getTeamTransactions] single lookup tx=${transaction_id} found=${!!tx} canView=${canView}`);
      if (!canView) return Response.json({ transactions: [], transaction: null });
      return Response.json({ transactions: tx ? [tx] : [], transaction: tx });
    }

    // ── LIST ──────────────────────────────────────────────────────────────────
    let transactions;
    if (isSuperAdmin) {
      // Admins/owners see all transactions
      transactions = status
        ? await svc.entities.Transaction.filter({ status }, sort, limit)
        : await svc.entities.Transaction.list(sort, limit);
    } else {
      // Regular users: fetch all and filter to their own deals
      // Match by agent_email OR created_by (handles both old email-stamped and new UUID-stamped records)
      const all = status
        ? await svc.entities.Transaction.filter({ status }, sort, limit)
        : await svc.entities.Transaction.list(sort, limit);
      transactions = all.filter(tx =>
        tx.agent_email === user.email ||
        tx.created_by === user.id ||
        tx.created_by === user.email
      );
    }

    console.log(`[getTeamTransactions] returning ${transactions.length} transactions for user=${user.email}`);
    return Response.json({ transactions });

  } catch (error) {
    console.error('[getTeamTransactions] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});