/**
 * backfillTransactionOwnership
 *
 * One-time migration: stamps owner_user_id and created_by_email on all existing
 * transactions that are missing these fields.
 *
 * Admin/owner only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_ROLES = new Set(['admin', 'owner', 'super_admin']);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (!ADMIN_ROLES.has(user.role) && !ADMIN_ROLES.has(user.data?.role))) {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const svc = base44.asServiceRole;

    // Load all users and build email → id and id maps
    const allUsers = await svc.entities.User.list('-created_date', 500);
    const emailToId = {};
    const idToEmail = {};
    for (const u of allUsers) {
      if (u.email) {
        emailToId[u.email.toLowerCase()] = u.id;
        idToEmail[u.id] = u.email;
      }
    }
    console.log('[backfill] loaded users:', allUsers.length);

    // Load all transactions
    const all = await svc.entities.Transaction.list('-created_date', 1000);
    console.log('[backfill] total transactions:', all.length);

    let fixed_owner_user_id = 0;
    let fixed_created_by = 0;
    let fixed_created_by_email = 0;
    let skipped = 0;
    const notFound = [];

    for (const tx of all) {
      const updates = {};

      // --- Fix created_by: if it's an email, resolve to UUID ---
      const cb = tx.created_by || '';
      if (cb.includes('@')) {
        const resolvedId = emailToId[cb.toLowerCase()] || null;
        if (resolvedId) {
          updates.created_by = resolvedId;
          fixed_created_by++;
        } else {
          notFound.push({ id: tx.id, address: tx.address, created_by: cb, issue: 'email not found in users' });
        }
      }

      // --- Stamp owner_user_id if missing ---
      if (!tx.owner_user_id) {
        const createdById = updates.created_by || tx.created_by;
        // createdById should now be a UUID (or was already)
        if (createdById && !createdById.includes('@')) {
          updates.owner_user_id = createdById;
          fixed_owner_user_id++;
        } else if (tx.agent_email) {
          const resolvedId = emailToId[tx.agent_email.toLowerCase()] || null;
          if (resolvedId) {
            updates.owner_user_id = resolvedId;
            fixed_owner_user_id++;
          }
        }
      }

      // --- Stamp created_by_email if missing ---
      if (!tx.created_by_email) {
        const ownerId = updates.owner_user_id || tx.owner_user_id || (updates.created_by || tx.created_by);
        const resolvedEmail = ownerId ? idToEmail[ownerId] : null;
        if (resolvedEmail) {
          updates.created_by_email = resolvedEmail;
          fixed_created_by_email++;
        } else if (tx.agent_email) {
          updates.created_by_email = tx.agent_email;
          fixed_created_by_email++;
        }
      }

      if (Object.keys(updates).length === 0) {
        skipped++;
        continue;
      }

      await svc.entities.Transaction.update(tx.id, updates);
      console.log('[backfill] updated tx', tx.id, JSON.stringify(updates));
    }

    // Also backfill child entities (Contingency, ComplianceReport, ComplianceIssue, Note)
    let childFixed = 0;
    const txOwnerMap = {};
    const freshTxList = await svc.entities.Transaction.list('-created_date', 1000);
    for (const tx of freshTxList) {
      if (tx.owner_user_id) txOwnerMap[tx.id] = tx.owner_user_id;
    }

    const childEntities = ['Contingency', 'ComplianceReport', 'ComplianceIssue', 'Note', 'CalendarEventMap'];
    for (const entityName of childEntities) {
      try {
        const records = await svc.entities[entityName].list('-created_date', 2000);
        for (const rec of records) {
          if (!rec.owner_user_id && rec.transaction_id && txOwnerMap[rec.transaction_id]) {
            await svc.entities[entityName].update(rec.id, { owner_user_id: txOwnerMap[rec.transaction_id] });
            childFixed++;
          }
        }
      } catch (e) {
        console.warn(`[backfill] ${entityName} failed:`, e.message);
      }
    }

    return Response.json({
      ok: true,
      total_transactions: all.length,
      fixed_created_by,
      fixed_owner_user_id,
      fixed_created_by_email,
      skipped,
      child_records_fixed: childFixed,
      notFound,
    });
  } catch (error) {
    console.error('[backfill] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});