import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appointment_id, action } = await req.json();

    if (!appointment_id || !action) {
      return Response.json({ error: 'Missing appointment_id or action' }, { status: 400 });
    }

    // Get appointment — owner-isolated by RLS
    const appt = await base44.entities.Appointment.get(appointment_id);
    if (!appt) {
      return Response.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Verify ownership
    if (appt.owner_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get Google Calendar access token for this user (shared connector — builder's account)
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('googlecalendar');
      accessToken = conn.accessToken;
    } catch (err) {
      console.error('[CalendarSync] Failed to get Google Calendar connection:', err.message);
      return Response.json({ error: 'Google Calendar not connected', connected: false }, { status: 422 });
    }

    if (action === 'create' || action === 'update') {
      // Build event datetime — use America/Denver as default, or derive from appointment
      const dateStr = appt.event_date; // yyyy-MM-dd
      const timeStr = appt.event_time || '09:00';

      const startDateTime = `${dateStr}T${timeStr}:00`;
      const [h, m] = timeStr.split(':').map(Number);
      const endH = String(h + 1).padStart(2, '0');
      const endDateTime = `${dateStr}T${endH}:${String(m).padStart(2, '0')}:00`;

      const timeZone = 'America/Denver';

      const description = [
        appt.notes || '',
        appt.address ? `Location: ${appt.address}` : '',
        `Transaction ID: ${appt.transaction_id}`,
      ].filter(Boolean).join('\n');

      const eventBody = {
        summary: appt.title,
        description,
        location: appt.address || '',
        start: { dateTime: startDateTime, timeZone },
        end: { dateTime: endDateTime, timeZone },
      };

      let gcalEventId = appt.google_calendar_event_id;
      let response;

      if (action === 'update' && gcalEventId) {
        // PATCH existing event
        response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${gcalEventId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventBody),
          }
        );
      } else {
        // POST new event
        response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventBody),
          }
        );
      }

      if (!response.ok) {
        const errBody = await response.text();
        console.error('[CalendarSync] Google API error:', response.status, errBody);
        // Mark sync as failed
        await base44.entities.Appointment.update(appointment_id, {
          sync_status: 'failed',
          google_calendar_synced: false,
        });
        return Response.json({ error: 'Google Calendar API error', details: errBody }, { status: 502 });
      }

      const event = await response.json();
      gcalEventId = event.id;

      // Update appointment record with sync info
      await base44.entities.Appointment.update(appointment_id, {
        google_calendar_synced: true,
        google_calendar_event_id: gcalEventId,
        sync_status: 'synced',
      });

      console.log(`[CalendarSync] ${action} event ${gcalEventId} for appointment ${appointment_id}`);
      return Response.json({ success: true, event_id: gcalEventId });

    } else if (action === 'delete') {
      const gcalEventId = appt.google_calendar_event_id;
      if (!gcalEventId) {
        return Response.json({ success: true, skipped: true });
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${gcalEventId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      // 404 or 410 means already gone — treat as success
      if (!response.ok && response.status !== 404 && response.status !== 410) {
        const errBody = await response.text();
        console.error('[CalendarSync] Delete error:', response.status, errBody);
        return Response.json({ error: 'Failed to delete Google Calendar event' }, { status: 502 });
      }

      console.log(`[CalendarSync] Deleted event ${gcalEventId} for appointment ${appointment_id}`);
      return Response.json({ success: true });

    } else {
      return Response.json({ error: 'Invalid action. Use create, update, or delete.' }, { status: 400 });
    }

  } catch (error) {
    console.error('[CalendarSync] Unhandled error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});