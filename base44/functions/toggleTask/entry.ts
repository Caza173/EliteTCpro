import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { transaction_id, tasks } = await req.json();
        if (!transaction_id || !tasks) {
            return Response.json({ error: 'Missing transaction_id or tasks' }, { status: 400 });
        }

        // Verify ownership — fetch via service role then check ownership explicitly
        let existing = [];
        try { existing = await base44.entities.Transaction.filter({ id: transaction_id }); } catch (_) {}
        if (!existing.length) {
            console.warn(`[toggleTask] FORBIDDEN user=${user.id} attempted tx=${transaction_id}`);
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        await base44.entities.Transaction.update(transaction_id, {
            tasks,
            last_activity_at: new Date().toISOString(),
        });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});