import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Maps Google Calendar event summary prefixes back to transaction fields
const TITLE_TO_FIELD = {
  'Effective / Acceptance Date': 'contract_date',
  'Earnest Money Due': 'earnest_money_deadline',
  'Inspection Deadline': 'inspection_deadline',
  'Appraisal Deadline': 'appraisal_deadline',
  'Financing Commitment': 'financing_deadline',
  'Due Diligence Deadline': 'due_diligence_deadline',
  'Closing / Transfer of Title': 'closing_date',
};

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const state = body?.data?._provider_meta?.['x-goog-resource-state'];
    if (state === 'sync') return Response.json({ status: 'sync_ack' });
    if (!state) return Response.json({ status: 'no_state' });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Load sync token
    const syncStates = await base44.asServiceRole.entities.SyncState.filter({ key: 'googlecalendar' });
    const syncRecord = syncStates[0] || null;

    let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100';
    if (syncRecord?.sync_token) {
      url += `&syncToken=${syncRecord.sync_token}`;
    } else {
      url += '&timeMin=' + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    let res = await fetch(url, { headers: authHeader });
    if (res.status === 410) {
      // Sync token expired — full resync
      url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=100'
        + '&timeMin=' + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      res = await fetch(url, { headers: authHeader });
    }
    if (!res.ok) return Response.json({ status: 'api_error' });

    // Drain pages
    const allItems = [];
    let pageData = await res.json();
    let newSyncToken = pageData.nextSyncToken || null;
    while (true) {
      allItems.push(...(pageData.items || []));
      if (pageData.nextSyncToken) newSyncToken = pageData.nextSyncToken;
      if (!pageData.nextPageToken) break;
      const nextRes = await fetch(url + `&pageToken=${pageData.nextPageToken}`, { headers: authHeader });
      if (!nextRes.ok) break;
      pageData = await nextRes.json();
    }

    let updatedCount = 0;

    for (const event of allItems) {
      if (!event.start?.date) continue; // skip non-all-day events
      if (event.status === 'cancelled') continue; // skip deleted events

      // Find matching CalendarEventMap record
      const maps = await base44.asServiceRole.entities.CalendarEventMap.filter({ calendar_event_id: event.id });
      if (!maps.length) continue;

      const map = maps[0];
      const newDate = event.start.date; // YYYY-MM-DD

      // Load the transaction
      const transactions = await base44.asServiceRole.entities.Transaction.filter({ id: map.transaction_id });
      if (!transactions.length) continue;

      const tx = transactions[0];
      if (tx[map.field_key] === newDate) continue; // no change

      // Update the transaction deadline
      await base44.asServiceRole.entities.Transaction.update(map.transaction_id, {
        [map.field_key]: newDate,
        last_activity_at: new Date().toISOString(),
      });

      updatedCount++;
      console.log(`Updated ${map.field_key} on transaction ${map.transaction_id} to ${newDate} from Google Calendar`);
    }

    // Save new sync token
    if (newSyncToken) {
      if (syncRecord) {
        await base44.asServiceRole.entities.SyncState.update(syncRecord.id, { sync_token: newSyncToken });
      } else {
        await base44.asServiceRole.entities.SyncState.create({ key: 'googlecalendar', sync_token: newSyncToken });
      }
    }

    return Response.json({ status: 'ok', updatedTransactions: updatedCount });
  } catch (error) {
    console.error('calendarWebhook error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});