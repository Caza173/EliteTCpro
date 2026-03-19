import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.email !== 'nhcazateam@gmail.com') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch batch of transactions via service role and delete them
    const { offset = 0 } = await req.json().catch(() => ({}));
    const transactions = await base44.asServiceRole.entities.Transaction.list('created_date', 10, offset);
    let deleted = 0;
    await Promise.all(transactions.map(async (tx) => {
      await base44.asServiceRole.entities.Transaction.delete(tx.id);
      deleted++;
    }));

    return Response.json({ success: true, deleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});