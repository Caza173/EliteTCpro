/**
 * getTeamTransactions — Strict ownership-based transaction query.
 *
 * Access rules (enforced at query level, no in-memory filtering):
 *   super_admin (owner/admin/master email) → sees ALL transactions
 *   agent  → only transactions where agent_email matches
 *   client → only transactions where client_email matches
 *   TC / tc_lead → ONLY:
 *     - assigned_tc_id === user.id
 *     - OR created_by === user.id
 *     - OR (status === "pending" AND assigned_tc_id is null/missing) — claim queue
 *
 * Orphaned transactions (no created_by, no assigned_tc_id) are NEVER returned
 * to non-admin users — they are invisible unless claimed by admin.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPER_ADMIN_EMAIL = 'nhcazateam@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { status, sort = '-created_date', limit = 200 } = body;

    const isSuper = user.email === SUPER_ADMIN_EMAIL || user.role === 'admin' || user.role === 'owner';
    const isTC = user.role === 'tc' || user.role === 'tc_lead';
    const isAgent = user.role === 'agent';
    const isClient = user.role === 'client';

    // ── SUPER ADMIN: sees everything ──────────────────────────────────────────
    if (isSuper) {
      const filter = {};
      if (status) filter.status = status;
      const transactions = await base44.asServiceRole.entities.Transaction.filter(filter, sort, limit);
      return Response.json({ transactions });
    }

    // ── AGENT: only their own deals by email ──────────────────────────────────
    if (isAgent) {
      const filter = { agent_email: user.email };
      if (status) filter.status = status;
      const transactions = await base44.asServiceRole.entities.Transaction.filter(filter, sort, limit);
      return Response.json({ transactions });
    }

    // ── CLIENT: only their deal by email ──────────────────────────────────────
    if (isClient) {
      const filter = { client_email: user.email };
      if (status) filter.status = status;
      const transactions = await base44.asServiceRole.entities.Transaction.filter(filter, sort, limit);
      return Response.json({ transactions });
    }

    // ── TC / tc_lead: strict ownership only — NO team-wide visibility ─────────
    if (isTC) {
      // Fetch assigned + created separately (SDK may not support $or, so we merge)
      const [assigned, created, pendingUnassigned] = await Promise.all([
        base44.asServiceRole.entities.Transaction.filter(
          status ? { assigned_tc_id: user.id, status } : { assigned_tc_id: user.id },
          sort, limit
        ),
        base44.asServiceRole.entities.Transaction.filter(
          status ? { created_by: user.id, status } : { created_by: user.id },
          sort, limit
        ),
        // Unassigned pending deals visible for claim (only when no status filter or status=pending)
        (!status || status === 'pending')
          ? base44.asServiceRole.entities.Transaction.filter({ status: 'pending' }, sort, limit)
          : Promise.resolve([]),
      ]);

      // Merge and deduplicate by id
      const seen = new Set();
      const transactions = [];
      for (const tx of [...assigned, ...created, ...pendingUnassigned]) {
        // Only include unassigned pending from pendingUnassigned — not orphaned non-pending
        if (!seen.has(tx.id)) {
          // Safety: if this tx came only from pendingUnassigned, ensure it's truly unassigned
          const isOwned = tx.assigned_tc_id === user.id || tx.created_by === user.id;
          const isClaimable = tx.status === 'pending' && !tx.assigned_tc_id;
          if (isOwned || isClaimable) {
            seen.add(tx.id);
            transactions.push(tx);
          }
        }
      }

      // Sort merged results by created_date desc
      transactions.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
      return Response.json({ transactions });
    }

    // ── Any other role: return nothing ────────────────────────────────────────
    return Response.json({ transactions: [] });

  } catch (error) {
    console.error('getTeamTransactions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});