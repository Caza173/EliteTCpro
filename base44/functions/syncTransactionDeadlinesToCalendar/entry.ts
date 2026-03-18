import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const DEADLINE_FIELDS = [
  { field: 'inspection_deadline', title: 'Inspection Deadline' },
  { field: 'appraisal_deadline', title: 'Appraisal Deadline' },
  { field: 'financing_deadline', title: 'Financing Deadline' },
  { field: 'due_diligence_deadline', title: 'Due Diligence Deadline' },
  { field: 'earnest_money_deadline', title: 'Earnest Money Deadline' },
  { field: 'closing_date', title: 'Closing Date' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's transactions
    const transactions = await base44.entities.Transaction.list();
    if (!transactions.length) {
      return Response.json({ synced: 0, message: 'No transactions found' });
    }

    // Get Google Calendar access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    let syncedCount = 0;

    // Process each transaction's deadlines
    for (const transaction of transactions) {
      for (const deadline of DEADLINE_FIELDS) {
        const deadlineDate = transaction[deadline.field];
        if (!deadlineDate) continue;

        const eventTitle = `${deadline.title} - ${transaction.address || 'Transaction'}`;
        const startDate = new Date(deadlineDate);
        
        // Create all-day event
        const event = {
          summary: eventTitle,
          description: `Transaction: ${transaction.address}\nAgent: ${transaction.agent_name || 'N/A'}`,
          start: { date: deadlineDate },
          end: { date: deadlineDate },
          reminders: {
            useDefault: true,
          },
        };

        // Add agent as attendee if email exists
        if (transaction.agent_email) {
          event.attendees = [
            { email: transaction.agent_email, responseStatus: 'needsAction' }
          ];
        }

        try {
          // Check if event already exists (search by title and date)
          const existingEvents = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(eventTitle)}&timeMin=${startDate.toISOString()}&timeMax=${new Date(startDate.getTime() + 86400000).toISOString()}`,
            {
              method: 'GET',
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          ).then(r => r.json());

          // Only create if doesn't exist
          if (!existingEvents.items?.length) {
            await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(event),
            });
            syncedCount++;
          }
        } catch (error) {
          console.error(`Failed to sync deadline: ${eventTitle}`, error.message);
        }
      }
    }

    return Response.json({
      success: true,
      synced: syncedCount,
      message: `Synced ${syncedCount} deadlines to Google Calendar`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});