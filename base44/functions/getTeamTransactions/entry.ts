/**
 * getTeamTransactions — Ownership-based transaction query.
 *
 * Access rules:
 *   super_admin (owner/admin/master email) → sees ALL transactions
 *   everyone else → only deals where:
 *     - created_by === user.id
 *     - OR assigned_tc_id === user.id
 *     - OR agent_email === user.email
 *     - OR team_id is in user's team memberships
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

    // ── EVERYONE ELSE: ownership + team based ─────────────────────────────────
    const filterBase = status ? { status } : {};

    // Get the user's team memberships
    const teamMemberships = await base44.asServiceRole.entities.TeamMember.filter({ user_id: user.id });
    const userTeamIds = teamMemberships.map(m => m.team_id).filter(Boolean);

    const [created, assigned, byEmail, byTeam] = await Promise.all([
      base44.asServiceRole.entities.Transaction.filter(
        { ...filterBase, created_by: user.id }, sort, limit
      ),
      base44.asServiceRole.entities.Transaction.filter(
        { ...filterBase, assigned_tc_id: user.id }, sort, limit
      ),
      user.email ? base44.asServiceRole.entities.Transaction.filter(
        { ...filterBase, agent_email: user.email }, sort, limit
      ) : Promise.resolve([]),
      userTeamIds.length > 0 ? base44.asServiceRole.entities.Transaction.filter(
        { ...filterBase, team_id: { $in: userTeamIds } }, sort, limit
      ) : Promise.resolve([]),
    ]);

    // Merge and deduplicate
    const seen = new Set();
    const transactions = [];
    for (const tx of [...created, ...assigned, ...byEmail, ...byTeam]) {
      if (!seen.has(tx.id)) {
        seen.add(tx.id);
        transactions.push(tx);
      }
    }
    transactions.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

    console.log('[getTeamTransactions] ownership fetch:', transactions.length,
      '| created:', created.length,
      '| assigned:', assigned.length,
      '| byEmail:', byEmail.length,
      '| byTeam:', byTeam.length);

    return Response.json({ transactions });

  } catch (error) {
    console.error('[getTeamTransactions] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});