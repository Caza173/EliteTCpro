import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUPER_ADMIN_EMAIL = 'nhcazateam@gmail.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transaction_id } = await req.json();
    if (!transaction_id) return Response.json({ error: 'transaction_id required' }, { status: 400 });

    const isSuper = user.email === SUPER_ADMIN_EMAIL;

    // Verify ownership — every user is fully isolated except super admin
    if (!isSuper) {
      const existing = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id, created_by: user.id });
      if (!existing.length) {
        console.warn('[deleteTransaction] ownership check failed for user:', user.id, 'tx:', transaction_id);
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await base44.asServiceRole.entities.Transaction.delete(transaction_id);
    return Response.json({ success: true });
  } catch (error) {
    const msg = error?.message || '';
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      return Response.json({ success: true });
    }
    return Response.json({ error: msg }, { status: 500 });
  }
});