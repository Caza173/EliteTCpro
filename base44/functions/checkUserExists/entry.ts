import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ exists: false }, { status: 401 });
    }

    // Use service role to definitively check if this user record exists in the app
    const users = await base44.asServiceRole.entities.User.filter({ id: user.id });
    const exists = users && users.length > 0;

    return Response.json({ exists });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});