import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Patch flat fields on the user record directly
    await base44.asServiceRole.entities.User.update(user.id, {
        role: "owner",
        brokerage_id: "69af731d6de2faa420d7aace"
    });

    return Response.json({
        success: true,
        message: "User role and brokerage_id set. Please refresh the app."
    });
});