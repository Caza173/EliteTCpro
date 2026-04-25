import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (!authUser) {
      return Response.json({ exists: false, user: null }, { status: 401 });
    }

    // Use service role to definitively check if this user record exists in the app DB
    const users = await base44.asServiceRole.entities.User.filter({ id: authUser.id });

    if (!users || users.length === 0) {
      return Response.json({ exists: false, user: null });
    }

    return Response.json({
      exists: true,
      profile_completed: users[0].profile_completed === true,
      user: users[0],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});