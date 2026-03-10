import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update brokerage_id in user's data field (keeping existing role)
    await base44.auth.updateMe({
        brokerage_id: "69af731d6de2faa420d7aace"
    });

    return Response.json({
        success: true,
        user_id: user.id,
        message: "brokerage_id set on user. Please refresh the app."
    });
});