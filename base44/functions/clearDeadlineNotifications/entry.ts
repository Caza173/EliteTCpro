import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all deadline notifications for this user
    const allNotifs = await base44.entities.InAppNotification.filter({
      user_email: user.email,
      type: "deadline",
    });

    // Find ones that should be cleared
    const toClear = allNotifs.filter(n =>
      n.dismissed ||
      n.addendum_status === "completed" ||
      n.addendum_status === "not_needed" ||
      n.addendum_response === "completed" ||
      n.addendum_response === "not_needed"
    );

    if (toClear.length === 0) {
      return Response.json({ success: true, cleared: 0 });
    }

    // Process in batches of 10 to avoid rate limits
    const BATCH_SIZE = 10;
    let cleared = 0;

    for (let i = 0; i < toClear.length; i += BATCH_SIZE) {
      const batch = toClear.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(n =>
          base44.entities.InAppNotification.update(n.id, {
            dismissed: true,
            dismissed_at: new Date().toISOString(),
          })
        )
      );
      cleared += batch.length;
      // Small delay between batches to stay within rate limits
      if (i + BATCH_SIZE < toClear.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    console.log(`[clearDeadlineNotifications] Cleared ${cleared} notifications for ${user.email}`);
    return Response.json({ success: true, cleared });
  } catch (error) {
    console.error('[clearDeadlineNotifications] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});