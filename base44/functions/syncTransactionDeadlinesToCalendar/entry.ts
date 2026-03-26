import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const DEADLINE_FIELDS = [
  { field: 'contract_date',           title: 'Effective / Acceptance Date' },
  { field: 'earnest_money_deadline',  title: 'Earnest Money Due' },
  { field: 'inspection_deadline',     title: 'Inspection Deadline' },
  { field: 'appraisal_deadline',      title: 'Appraisal Deadline' },
  { field: 'financing_deadline',      title: 'Financing Commitment' },
  { field: 'due_diligence_deadline',  title: 'Due Diligence Deadline' },
  { field: 'closing_date',            title: 'Closing / Transfer of Title' },
];

// Get the next day date string (for all-day event end date)
function nextDay(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// Build ISO datetime from date and time
function buildDateTime(dateStr, timeStr) {
  if (!timeStr) return null;
  try {
    const [hours, minutes] = timeStr.split(':');
    const d = new Date(dateStr);
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return d.toISOString();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transaction_id, field_key, contingency_id, date: contingencyDate, title: contingencyTitle, due_time, is_all_day } = await req.json();
    if (!transaction_id) return Response.json({ error: 'transaction_id required' }, { status: 400 });

    const transactions = await base44.entities.Transaction.filter({ id: transaction_id });
    const transaction = transactions[0];
    if (!transaction) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // Load existing event maps for this transaction
    const existingMaps = await base44.asServiceRole.entities.CalendarEventMap.filter({ transaction_id });
    const mapByField = {};
    for (const m of existingMaps) mapByField[m.field_key] = m;

    const created = [];
    const updated = [];
    const errors = [];

    // Build attendees: agent + client
    const attendees = [];
    if (transaction.agent_email) attendees.push({ email: transaction.agent_email });
    if (transaction.client_email) attendees.push({ email: transaction.client_email });

    // KEY FIX: Proper event building based on is_all_day flag
    const buildEventBody = (title, dateStr, timeStr, allDay) => {
      if (allDay === false && timeStr) {
        // Timed event - use dateTime
        const startDateTime = buildDateTime(dateStr, timeStr);
        const endDateTime = buildDateTime(dateStr, timeStr.replace(/(\d+):(\d+)/, (h, m) => `${parseInt(h) + 1}:${m}`)); // +1 hour default
        return {
          summary: `${title} — ${transaction.address}`,
          description: `Transaction: ${transaction.address}\nTC: ${transaction.agent || ''}\nAgent: ${transaction.buyers_agent_name || transaction.sellers_agent_name || ''}\n\nManaged via EliteTC.`,
          start: { dateTime: startDateTime },
          end: { dateTime: endDateTime },
          reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 60 }, { method: 'popup', minutes: 30 }] },
          attendees,
          guestsCanSeeOtherGuests: false,
          sendUpdates: 'all',
        };
      } else {
        // All-day event - use date only
        return {
          summary: `${title} — ${transaction.address}`,
          description: `Transaction: ${transaction.address}\nTC: ${transaction.agent || ''}\nAgent: ${transaction.buyers_agent_name || transaction.sellers_agent_name || ''}\n\nManaged via EliteTC.`,
          start: { date: dateStr },
          end: { date: nextDay(dateStr) },
          reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 1440 }, { method: 'popup', minutes: 60 }] },
          attendees,
          guestsCanSeeOtherGuests: false,
          sendUpdates: 'all',
        };
      }
    };

    const syncOne = async (mapKey, title, dateStr, timeStr, allDay) => {
      const existingMap = mapByField[mapKey];
      const eventBody = buildEventBody(title, dateStr, timeStr, allDay);

      if (existingMap?.calendar_event_id) {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingMap.calendar_event_id}`,
          { method: 'PUT', headers: authHeader, body: JSON.stringify(eventBody) }
        );
        if (res.ok) {
          updated.push(title);
        } else if (res.status === 404) {
          const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events',
            { method: 'POST', headers: authHeader, body: JSON.stringify(eventBody) });
          if (createRes.ok) {
            const newEvent = await createRes.json();
            await base44.asServiceRole.entities.CalendarEventMap.update(existingMap.id, { calendar_event_id: newEvent.id });
            created.push(title);
          } else { errors.push(title); }
        } else { errors.push(title); }
      } else {
        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events',
          { method: 'POST', headers: authHeader, body: JSON.stringify(eventBody) });
        if (res.ok) {
          const newEvent = await res.json();
          await base44.asServiceRole.entities.CalendarEventMap.create({
            transaction_id, field_key: mapKey, calendar_event_id: newEvent.id,
            brokerage_id: transaction.brokerage_id || '',
          });
          created.push(title);
        } else {
          const errText = await res.text();
          console.error(`Failed to create event for ${mapKey}:`, errText);
          errors.push(title);
        }
      }
    };

    // Case 1: single contingency sync
    if (contingency_id && contingencyDate && contingencyTitle) {
      const mapKey = field_key || `contingency_${contingency_id}`;
      const allDay = is_all_day ?? true;
      await syncOne(mapKey, contingencyTitle, contingencyDate, due_time, allDay);
    }
    // Case 2: single system field sync
    else if (field_key) {
      const fieldDef = DEADLINE_FIELDS.find(f => f.field === field_key);
      const dateStr = transaction[field_key];
      if (fieldDef && dateStr) {
        // System fields are always all-day
        await syncOne(field_key, fieldDef.title, dateStr, null, true);
      }
    }
    // Case 3: sync all system fields
    else {
      for (const { field, title } of DEADLINE_FIELDS) {
        const dateStr = transaction[field];
        if (dateStr) {
          // System fields are always all-day
          await syncOne(field, title, dateStr, null, true);
        }
      }
    }

    return Response.json({
      success: true,
      created: created.length,
      updated: updated.length,
      errors,
      message: `Created ${created.length} events, updated ${updated.length} events on Google Calendar.`,
    });
  } catch (error) {
    console.error('syncTransactionDeadlinesToCalendar error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});