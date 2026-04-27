/**
 * getTeamTransactions — Server-enforced team-scoped transaction query.
 *
 * Access rules:
 *   Super admin (nhcazateam@gmail.com | admin | owner) → sees ALL transactions
 *   Team admin → sees all transactions in their teams
 *   TC → sees transactions assigned to them OR pending deals in their teams
 *   Viewer → sees all transactions in their teams (read-only)
 *   Agent/Client → sees only their own transactions (by agent_email or client_email)
 *
 * Body params (all optional filters):
 *   status          — filter by status (e.g. "pending", "active")
 *   team_id         — filter to a specific team (must be a team user belongs to)
 *   sort            — sort field (default: "-created_date")
 *   limit           — max results (default: 100)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPER_ADMIN_EMAIL = 'nhcazateam@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { status, team_id: filterTeamId, sort = '-created_date', limit = 200 } = body;

    const isSuper = user.email === SUPER_ADMIN_EMAIL || user.role === 'admin' || user.role === 'owner';
    const isTC = user.role === 'tc' || user.role === 'tc_lead';
    const isAgent = user.role === 'agent';
    const isClient = user.role === 'client';

    let transactions = [];

    // ── SUPER ADMIN: sees everything ───────────────────────────────────────────
    if (isSuper) {
      const filter = {};
      if (status) filter.status = status;
      if (filterTeamId) filter.team_id = filterTeamId;
      transactions = await base44.asServiceRole.entities.Transaction.filter(filter, sort, limit);
      return Response.json({ transactions });
    }

    // ── AGENT: only their own deals ────────────────────────────────────────────
    if (isAgent) {
      const filter = { agent_email: user.email };
      if (status) filter.status = status;
      transactions = await base44.asServiceRole.entities.Transaction.filter(filter, sort, limit);
      return Response.json({ transactions });
    }

    // ── CLIENT: only their deal ────────────────────────────────────────────────
    if (isClient) {
      const filter = { client_email: user.email };
      if (status) filter.status = status;
      transactions = await base44.asServiceRole.entities.Transaction.filter(filter, sort, limit);
      return Response.json({ transactions });
    }

    // ── TC / VIEWER: team-scoped ───────────────────────────────────────────────
    // Get the user's team memberships
    const memberships = await base44.asServiceRole.entities.TeamMember.filter({ user_id: user.id });
    const myTeamIds = memberships.map(m => m.team_id);

    if (!myTeamIds.length) {
      // No teams assigned — TC can only see their own assigned deals
      if (isTC) {
        const filter = { assigned_tc_id: user.id };
        if (status) filter.status = status;
        transactions = await base44.asServiceRole.entities.Transaction.filter(filter, sort, limit);
        return Response.json({ transactions, warning: 'No team assigned — showing only your assigned deals.' });
      }
      return Response.json({ transactions: [] });
    }

    // Filter to specified team if provided (and user is a member of it)
    const teamIds = filterTeamId && myTeamIds.includes(filterTeamId)
      ? [filterTeamId]
      : myTeamIds;

    // Fetch all transactions in user's teams — strictly team-scoped, no fallback to teamless records
    const allTx = await base44.asServiceRole.entities.Transaction.filter({}, sort, limit);
    let teamTx = allTx.filter(tx => teamIds.includes(tx.team_id));

    // For TC (not team_admin): show assigned deals + unassigned pending + all closed team deals
    if (isTC) {
      const myMembership = memberships.find(m => m.role === 'team_admin');
      if (!myMembership) {
        teamTx = teamTx.filter(tx =>
          tx.assigned_tc_id === user.id ||
          tx.created_by === user.id ||
          tx.status === 'closed' ||
          (!tx.assigned_tc_id && tx.status === 'pending')
        );
      }
    }

    if (status) {
      teamTx = teamTx.filter(tx => tx.status === status);
    }

    return Response.json({ transactions: teamTx });
  } catch (error) {
    console.error('getTeamTransactions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});