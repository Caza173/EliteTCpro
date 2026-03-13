import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { transaction_id, task_id } = await req.json();
        if (!transaction_id || !task_id) {
            return Response.json({ error: 'Missing transaction_id or task_id' }, { status: 400 });
        }

        // Fetch transaction via service role to bypass RLS read restrictions
        const transaction = await base44.asServiceRole.entities.Transaction.get(transaction_id);
        if (!transaction) {
            return Response.json({ error: 'Transaction not found' }, { status: 404 });
        }

        const updatedTasks = (transaction.tasks || []).map((task) =>
            task.id === task_id ? { ...task, completed: !task.completed } : task
        );

        await base44.asServiceRole.entities.Transaction.update(transaction_id, {
            tasks: updatedTasks,
            last_activity_at: new Date().toISOString(),
        });

        return Response.json({ success: true, tasks: updatedTasks });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});