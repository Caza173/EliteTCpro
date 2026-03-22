import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const allowedRoles = ['admin', 'owner'];
        const isMaster = user.email === 'nhcazateam@gmail.com';

        if (!isMaster && !allowedRoles.includes(user.role)) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { user_id, role } = await req.json();

        if (!user_id || !role) {
            return Response.json({ error: 'Missing user_id or role' }, { status: 400 });
        }

        await base44.asServiceRole.entities.User.update(user_id, { role });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});