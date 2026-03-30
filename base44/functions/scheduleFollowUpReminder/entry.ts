import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Map task titles to days-from-closing offset
const FOLLOWUP_OFFSETS = {
  "14 day follow-up scheduled":      14,
  "30 day follow-up scheduled":      30,
  "90 day follow-up":                90,
  "6 month follow-up":               180,
  "1 year anniversary follow-up":    365,
};

function isFollowUpTask(title) {
  const lower = (title || "").toLowerCase();
  return Object.keys(FOLLOWUP_OFFSETS).some(k => lower.includes(k));
}

function getOffsetDays(title) {
  const lower = (title || "").toLowerCase();
  for (const [k, v] of Object.entries(FOLLOWUP_OFFSETS)) {
    if (lower.includes(k)) return v;
  }
  return null;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function nextDay(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both direct calls and entity automation payloads
    const task = body.data || body.task;
    const eventType = body.event?.type;

    // Only act on task updates where is_completed just became true
    if (eventType === "update") {
      const wasCompleted = body.old_data?.is_completed;
      const isNowCompleted = body.data?.is_completed;
      if (!isNowCompleted || wasCompleted) return Response.json({ skipped: "not a completion event" });
    }

    if (!task || !task.is_completed) return Response.json({ skipped: "task not completed" });
    if (!isFollowUpTask(task.title)) return Response.json({ skipped: "not a follow-up task" });

    const offsetDays = getOffsetDays(task.title);
    if (!offsetDays) return Response.json({ skipped: "no offset found" });

    // Fetch the transaction
    const transactions = await base44.asServiceRole.entities.Transaction.filter({ id: task.transaction_id });
    const transaction = transactions[0];
    if (!transaction) return Response.json({ error: "transaction not found" }, { status: 404 });

    // Use closing_date as base; fall back to today
    const baseDate = transaction.closing_date || new Date().toISOString().split('T')[0];
    const reminderDate = addDays(baseDate, offsetDays);

    // Get Google Calendar access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    const label = task.title.replace(" Scheduled", "").trim();
    const eventBody = {
      summary: `${label} — ${transaction.address}`,
      description: `Post-close follow-up reminder.\nClient: ${transaction.buyer || transaction.seller || transaction.sellerName || ''}\nAddress: ${transaction.address}\nManaged via EliteTC.`,
      start: { date: reminderDate },
      end: { date: nextDay(reminderDate) },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 1440 },
          { method: 'popup', minutes: 120 },
        ],
      },
    };

    // Check if a calendar event already exists for this task
    const fieldKey = `followup_${task.id}`;
    const existingMaps = await base44.asServiceRole.entities.CalendarEventMap.filter({
      transaction_id: task.transaction_id,
      field_key: fieldKey,
    });

    let calendarEventId = null;

    if (existingMaps.length > 0) {
      // Update existing event
      const existingMap = existingMaps[0];
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingMap.calendar_event_id}`,
        { method: 'PUT', headers: authHeader, body: JSON.stringify(eventBody) }
      );
      if (res.ok) {
        calendarEventId = existingMap.calendar_event_id;
      } else {
        // Re-create if not found
        const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events',
          { method: 'POST', headers: authHeader, body: JSON.stringify(eventBody) });
        if (createRes.ok) {
          const newEvent = await createRes.json();
          calendarEventId = newEvent.id;
          await base44.asServiceRole.entities.CalendarEventMap.update(existingMap.id, { calendar_event_id: calendarEventId });
        }
      }
    } else {
      // Create new event
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events',
        { method: 'POST', headers: authHeader, body: JSON.stringify(eventBody) });
      if (res.ok) {
        const newEvent = await res.json();
        calendarEventId = newEvent.id;
        await base44.asServiceRole.entities.CalendarEventMap.create({
          transaction_id: task.transaction_id,
          field_key: fieldKey,
          calendar_event_id: calendarEventId,
          brokerage_id: transaction.brokerage_id || '',
        });
      } else {
        const errText = await res.text();
        console.error('Failed to create follow-up calendar event:', errText);
        return Response.json({ error: 'Failed to create calendar event', detail: errText }, { status: 500 });
      }
    }

    return Response.json({
      success: true,
      message: `Calendar reminder created for "${label}" on ${reminderDate}`,
      calendar_event_id: calendarEventId,
      reminder_date: reminderDate,
    });

  } catch (error) {
    console.error('scheduleFollowUpReminder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});