import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'owner' && user.email !== 'nhcazateam@gmail.com')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Load all users and build email → id map
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const emailToId = {};
    for (const u of allUsers) {
      if (u.email) emailToId[u.email.toLowerCase()] = u.id;
    }
    console.log('[backfill] loaded users:', allUsers.length);

    // Load all transactions
    const all = await base44.asServiceRole.entities.Transaction.list('-created_date', 1000);
    console.log('[backfill] total transactions:', all.length);

    let fixed = 0;
    let skipped = 0;
    const notFound = [];

    for (const tx of all) {
      const cb = tx.created_by || '';
      // If already a UUID (no @ sign), skip
      if (cb && !cb.includes('@')) {
        skipped++;
        continue;
      }
      // Map email to user.id
      const userId = emailToId[cb.toLowerCase()] || null;
      if (!userId) {
        notFound.push({ id: tx.id, address: tx.address, created_by: cb });
        continue;
      }
      await base44.asServiceRole.entities.Transaction.update(tx.id, { created_by: userId });
      fixed++;
      console.log('[backfill] fixed tx', tx.id, cb, '→', userId);
    }

    return Response.json({ ok: true, total: all.length, fixed, skipped, notFound });
  } catch (error) {
    console.error('[backfill] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});