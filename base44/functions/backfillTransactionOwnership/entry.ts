import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const OWNER_ID = '69a9cd0677a8832ab0cc59bd';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'owner' && user.email !== 'nhcazateam@gmail.com')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const all = await base44.asServiceRole.entities.Transaction.list('-created_date', 500);
    let updated = 0;

    for (const tx of all) {
      const needsUpdate = !tx.created_by || !tx.assigned_tc_id;
      if (needsUpdate) {
        await base44.asServiceRole.entities.Transaction.update(tx.id, {
          created_by: tx.created_by || OWNER_ID,
          assigned_tc_id: tx.assigned_tc_id || OWNER_ID,
        });
        updated++;
      }
    }

    return Response.json({ ok: true, total: all.length, updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});