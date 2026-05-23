/**
 * manageTeam — DISABLED
 * Team management is disabled in owner-only isolation mode.
 * This endpoint will be re-enabled when team features are intentionally rebuilt.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return Response.json(
      { error: 'Team management is disabled in owner-only mode' },
      { status: 410 }
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});