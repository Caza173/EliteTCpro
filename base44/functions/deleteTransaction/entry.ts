import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transaction_id } = await req.json();
    if (!transaction_id) return Response.json({ error: 'transaction_id required' }, { status: 400 });

    console.log(`[deleteTransaction] user.id=${user.id} tx=${transaction_id}`);

    // Verify ownership via user-scoped read — RLS blocks access to other users' records
    const existing = await base44.entities.Transaction.filter({ id: transaction_id });
    if (!existing.length) {
      console.warn(`[deleteTransaction] FORBIDDEN user.id=${user.id} attempted tx=${transaction_id}`);
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log(`[deleteTransaction] confirmed ownership created_by=${existing[0].created_by} deleting...`);

    // Delete via user-scoped client — RLS enforces ownership on delete too
    await base44.entities.Transaction.delete(transaction_id);
    return Response.json({ success: true });
  } catch (error) {
    const msg = error?.message || '';
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      return Response.json({ success: true });
    }
    return Response.json({ error: msg }, { status: 500 });
  }
});