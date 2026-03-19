import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.email !== 'nhcazateam@gmail.com') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Try listing transactions
    const transactions = await base44.asServiceRole.entities.Transaction.list('-created_date', 10);
    let deleted = 0;
    for (const tx of transactions) {
      try {
        await base44.asServiceRole.entities.Transaction.delete(tx.id);
        deleted++;
      } catch (e) { console.log('delete err', tx.id, e.message); }
    }

    return Response.json({ success: true, deleted, found: transactions.length, ids: transactions.map(t => t.id) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});