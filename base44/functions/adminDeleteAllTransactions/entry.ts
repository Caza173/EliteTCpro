import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.email !== 'nhcazateam@gmail.com') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all transactions via service role
    const transactions = await base44.asServiceRole.entities.Transaction.list('created_date', 200);
    let deleted = 0;
    for (const tx of transactions) {
      await base44.asServiceRole.entities.Transaction.delete(tx.id);
      deleted++;
    }

    return Response.json({ success: true, deleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});