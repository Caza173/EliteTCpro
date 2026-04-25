import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.email !== "nhcazateam@gmail.com") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { user_id } = await req.json();
    if (!user_id) return Response.json({ error: "user_id required" }, { status: 400 });

    // Soft-delete: mark as deleted so returning users are treated as new
    await base44.asServiceRole.entities.User.update(user_id, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      status: 'disabled',
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});