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

  const buildEventBody = (title, dateStr, timeStr, allDay) => {
    if (allDay === false && timeStr) {
      const startDateTime = buildDateTime(dateStr, timeStr);
      const endDateTime = buildDateTime(dateStr, timeStr.replace(/(\d+):(\d+)/, (h, m) => `${parseInt(h) + 1}:${m}`));
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

  if (contingencyId && contingencyDate && contingencyTitle) {
    const mapKey = fieldKey || `contingency_${contingencyId}`;
    await syncOne(mapKey, contingencyTitle, contingencyDate, dueTime, isAllDay ?? true);
  } else if (fieldKey) {
    const fieldDef = DEADLINE_FIELDS.find(f => f.field === fieldKey);
    const dateStr = transaction[fieldKey];
    if (fieldDef && dateStr) await syncOne(fieldKey, fieldDef.title, dateStr, dueTime || null, isAllDay ?? !dueTime);
  } else {
    for (const { field, title } of DEADLINE_FIELDS) {
      const dateStr = transaction[field];
      if (dateStr) await syncOne(field, title, dateStr, null, true);
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