/**
 * getTeamTransactions — Ownership-based transaction query.
 *
 * Access rules:
 *   super_admin (owner/admin/master email) → sees ALL transactions
 *   everyone else → only deals where:
 *     - created_by === user.id
 *     - OR assigned_tc_id === user.id
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPER_ADMIN_EMAIL = 'nhcazateam@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const { status, sort = '-created_date', limit = 200 } = body;

    console.log('[getTeamTransactions] user:', user.email, 'role:', user.role, 'id:', user.id);
    const isSuper = user.email === SUPER_ADMIN_EMAIL || user.role === 'admin' || user.role === 'owner';

    // ── SUPER ADMIN: sees everything ──────────────────────────────────────────
    if (isSuper) {
      const transactions = status
        ? await base44.entities.Transaction.filter({ status }, sort, limit)
        : await base44.entities.Transaction.list(sort, limit);
      console.log('[getTeamTransactions] super admin fetched:', transactions.length);
      return Response.json({ transactions });
    }

    // ── EVERYONE ELSE: ownership-based — created_by OR assigned_tc_id ─────────
    const filterBase = status ? { status } : {};

    const [created, assigned] = await Promise.all([
      base44.asServiceRole.entities.Transaction.filter(
        { ...filterBase, created_by: user.id }, sort, limit
      ),
      base44.asServiceRole.entities.Transaction.filter(
        { ...filterBase, assigned_tc_id: user.id }, sort, limit
      ),
    ]);

    // Merge and deduplicate
    const seen = new Set();
    const transactions = [];
    for (const tx of [...created, ...assigned]) {
      if (!seen.has(tx.id)) {
        seen.add(tx.id);
        transactions.push(tx);
      }
    }
    transactions.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

    console.log('[getTeamTransactions] ownership fetch:', transactions.length, 'for', user.email);
    return Response.json({ transactions });

  } catch (error) {
    console.error('getTeamTransactions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});