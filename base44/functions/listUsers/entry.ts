import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_ROLES = ['admin', 'owner'];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!ADMIN_ROLES.includes(user.role)) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const users = await base44.asServiceRole.entities.User.list();

        return Response.json({ users });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});