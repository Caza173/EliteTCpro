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

const USER_TIMEZONE = 'America/New_York';

// Get the next day date string (for all-day event end date)
function nextDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

// Build a local ISO datetime string (no UTC conversion) from date + HH:MM time
function buildLocalDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  try {
    // Ensure HH:MM format
    const [h, m] = timeStr.split(':').map(s => s.padStart(2, '0'));
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${year}-${month}-${day}T${h}:${m}:00`;
  } catch {
    return null;
  }
}

// Add N hours to a local datetime string like "2026-04-23T17:00:00"
function addHours(localDateTimeStr, hours) {
  try {
    const [datePart, timePart] = localDateTimeStr.split('T');
    const [h, m, s] = timePart.split(':').map(Number);
    const totalMinutes = h * 60 + m + hours * 60;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    return `${datePart}T${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:${String(s || 0).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

async function syncTransaction(base44, transaction, fieldKey, contingencyId, contingencyDate, contingencyTitle, dueTime, isAllDay) {
  const transaction_id = transaction.id;
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
  const authHeader = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const existingMaps = await base44.asServiceRole.entities.CalendarEventMap.filter({ transaction_id });
  const mapByField = {};
  for (const m of existingMaps) mapByField[m.field_key] = m;

  const created = [];
  const updated = [];
  const errors = [];

  const attendees = [];
  if (transaction.agent_email) attendees.push({ email: transaction.agent_email });
  if (transaction.client_email) attendees.push({ email: transaction.client_email });

  const tz = transaction.timezone || USER_TIMEZONE;
  const description = `Transaction: ${transaction.address}\nTC: ${transaction.agent || ''}\nAgent: ${transaction.buyers_agent_name || transaction.sellers_agent_name || ''}\n\nManaged via EliteTC.`;

  const buildEventBody = (title, dateStr, timeStr, allDay) => {
    const pureDateStr = (dateStr || '').split('T')[0]; // strip any time component from date string

    // Use timed event if: explicitly not all-day AND a time is provided
    if (!allDay && timeStr) {
      const startDT = buildLocalDateTime(pureDateStr, timeStr);
      const endDT = addHours(startDT, 1);
      return {
        summary: `${title} — ${transaction.address}`,
        description,
        start: { dateTime: startDT, timeZone: tz },
        end: { dateTime: endDT, timeZone: tz },
        reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 60 }, { method: 'popup', minutes: 30 }] },
        attendees,
        guestsCanSeeOtherGuests: false,
        sendUpdates: 'all',
      };
    } else {
      // Intentional all-day event
      return {
        summary: `${title} — ${transaction.address}`,
        description,
        start: { date: pureDateStr },
        end: { date: nextDay(pureDateStr) },
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

  // Map of system deadline fields to their corresponding time fields on the transaction
  const FIELD_TIME_MAP = {
    closing_date: 'closing_time',
    inspection_deadline: 'inspection_time',
    appraisal_deadline: 'appraisal_time',
  };

  if (contingencyId && contingencyDate && contingencyTitle) {
    const mapKey = fieldKey || `contingency_${contingencyId}`;
    // For contingencies: if is_all_day is explicitly false and dueTime exists, use timed event
    const effectiveAllDay = isAllDay !== false || !dueTime;
    await syncOne(mapKey, contingencyTitle, contingencyDate, dueTime || null, effectiveAllDay);
  } else if (fieldKey) {
    const fieldDef = DEADLINE_FIELDS.find(f => f.field === fieldKey);
    const dateStr = transaction[fieldKey];
    if (fieldDef && dateStr) {
      // Use time passed in from UI, or fall back to the transaction's time field for this deadline
      const timeField = FIELD_TIME_MAP[fieldKey];
      const resolvedTime = dueTime || (timeField ? transaction[timeField] : null) || null;
      await syncOne(fieldKey, fieldDef.title, dateStr, resolvedTime, !resolvedTime);
    }
  } else {
    // Bulk sync: use each field's associated time if available
    for (const { field, title } of DEADLINE_FIELDS) {
      const dateStr = transaction[field];
      if (dateStr) {
        const timeField = FIELD_TIME_MAP[field];
        const resolvedTime = timeField ? transaction[timeField] : null;
        await syncOne(field, title, dateStr, resolvedTime || null, !resolvedTime);
      }
    }
  }

  return { created: created.length, updated: updated.length, errors };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const { transaction_id, field_key, contingency_id, date: contingencyDate, title: contingencyTitle, due_time, is_all_day } = body;

    // Scheduled (bulk) mode — no transaction_id provided
    if (!transaction_id) {
      console.log('[CalendarSync] Bulk mode — syncing all active transactions');
      const allTransactions = await base44.asServiceRole.entities.Transaction.filter({ status: 'active' });
      let totalCreated = 0, totalUpdated = 0, totalErrors = 0;
      for (const tx of allTransactions) {
        try {
          const result = await syncTransaction(base44, tx, null, null, null, null, null, null);
          totalCreated += result.created;
          totalUpdated += result.updated;
          totalErrors += result.errors.length;
        } catch (err) {
          console.error(`[CalendarSync] Error syncing transaction ${tx.id}:`, err.message);
          totalErrors++;
        }
      }
      return Response.json({
        success: true,
        transactions_synced: allTransactions.length,
        created: totalCreated,
        updated: totalUpdated,
        errors: totalErrors,
        message: `Bulk sync complete: ${allTransactions.length} transactions, ${totalCreated} created, ${totalUpdated} updated.`,
      });
    }

    // Single transaction mode (called from UI)
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const transactions = await base44.entities.Transaction.filter({ id: transaction_id });
    const transaction = transactions[0];
    if (!transaction) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    const result = await syncTransaction(base44, transaction, field_key, contingency_id, contingencyDate, contingencyTitle, due_time, is_all_day);

    return Response.json({
      success: true,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
      message: `Created ${result.created} events, updated ${result.updated} events on Google Calendar.`,
    });
  } catch (error) {
    console.error('syncTransactionDeadlinesToCalendar error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});