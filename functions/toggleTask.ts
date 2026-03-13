import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

        await base44.asServiceRole.entities.Transaction.update(transaction_id, {
            tasks,
            last_activity_at: new Date().toISOString(),
        });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});