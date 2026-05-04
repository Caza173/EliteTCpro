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
    const { status, sort = '-created_date', limit = 200, transaction_id } = body;

    // ── SINGLE TRANSACTION LOOKUP (by ID) ────────────────────────────────────
    // Used by TransactionDetail when a transaction isn't found in the list
    if (transaction_id) {
      const allByOwnership = await Promise.all([
        base44.asServiceRole.entities.Transaction.filter({ id: transaction_id, created_by: user.id }),
        base44.asServiceRole.entities.Transaction.filter({ id: transaction_id, created_by: user.email }),
        base44.asServiceRole.entities.Transaction.filter({ id: transaction_id, assigned_tc_id: user.id }),
        user.email ? base44.asServiceRole.entities.Transaction.filter({ id: transaction_id, agent_email: user.email }) : Promise.resolve([]),
      ]);
      // Super admins can access any transaction
      const isSupAdmin = user.email === SUPER_ADMIN_EMAIL || user.role === 'admin' || user.role === 'owner';
      let tx = null;
      if (isSupAdmin) {
        const all = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
        tx = all[0] || null;
      } else {
        const matches = allByOwnership.flat();
        tx = matches.find(t => t.id === transaction_id) || null;
      }
      console.log('[getTeamTransactions] single lookup', transaction_id, '→', tx ? 'found' : 'not found');
      return Response.json({ transactions: tx ? [tx] : [], transaction: tx });
    }

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

    // ── "user" role: broad scan — new users submit their own deals ───────────
    // For users with role "user", also scan by agent_email since new users
    // submit deals with their own email as the agent.
    const isNewUser = user.role === 'user';

    // ── EVERYONE ELSE: ownership + team based ─────────────────────────────────
    const filterBase = status ? { status } : {};

    // Get the user's team memberships
    const teamMemberships = await base44.asServiceRole.entities.TeamMember.filter({ user_id: user.id });
    const userTeamIds = teamMemberships.map(m => m.team_id).filter(Boolean);

    const [created, createdByEmail, assigned, byEmail, byTeam] = await Promise.all([
      base44.asServiceRole.entities.Transaction.filter(
        { ...filterBase, created_by: user.id }, sort, limit
      ),
      // Also match created_by stored as email (platform auto-stamps may use email)
      user.email ? base44.asServiceRole.entities.Transaction.filter(
        { ...filterBase, created_by: user.email }, sort, limit
      ) : Promise.resolve([]),
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
    for (const tx of [...created, ...createdByEmail, ...assigned, ...byEmail, ...byTeam]) {
      if (!seen.has(tx.id)) {
        seen.add(tx.id);
        transactions.push(tx);
      }
    }
    transactions.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

    // For new "user" role: also fetch by agent field matching their email or name
    let byAgentName = [];
    if (isNewUser && user.full_name) {
      byAgentName = await base44.asServiceRole.entities.Transaction.filter(
        { ...filterBase, agent: user.full_name }, sort, limit
      ).catch(() => []);
    }

    // Re-merge with agent name matches
    for (const tx of byAgentName) {
      if (!seen.has(tx.id)) { seen.add(tx.id); transactions.push(tx); }
    }
    transactions.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

    console.log('[getTeamTransactions] ownership fetch:', transactions.length,
      '| created (id):', created.length,
      '| created (email):', createdByEmail.length,
      '| assigned:', assigned.length,
      '| byEmail:', byEmail.length,
      '| byTeam:', byTeam.length,
      '| byAgentName:', byAgentName.length);

    return Response.json({ transactions });

  } catch (error) {
    console.error('[getTeamTransactions] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});