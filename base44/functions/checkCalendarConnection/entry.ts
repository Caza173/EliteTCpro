import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ connected: false }, { status: 401 });
    }

    try {
      const conn = await base44.asServiceRole.connectors.getConnection('googlecalendar');
      if (!conn?.accessToken) {
        return Response.json({ connected: false });
      }
      // Quick validation: fetch calendar list to confirm token works
      const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
        headers: { Authorization: `Bearer ${conn.accessToken}` },
      });
      if (!res.ok) {
        return Response.json({ connected: false });
      }
      const data = await res.json();
      // Try to get primary calendar email
      const primary = data.items?.find(c => c.primary);
      return Response.json({ connected: true, email: primary?.id || null });
    } catch {
      return Response.json({ connected: false });
    }
  } catch (error) {
    return Response.json({ connected: false, error: error.message });
  }
});