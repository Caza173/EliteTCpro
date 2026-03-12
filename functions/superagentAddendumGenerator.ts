import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const DEADLINE_LABELS = {
  inspection_deadline: "Inspection Contingency",
  financing_deadline: "Financing Commitment",
  earnest_money_deadline: "Earnest Money Deposit",
  appraisal_deadline: "Appraisal",
  closing_date: "Closing Date",
  due_diligence_deadline: "Due Diligence",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, old_data } = payload;

    // Only trigger when addendum_response just changed to "yes" and no verbiage yet
    if (data?.addendum_response !== 'yes') return Response.json({ skipped: 'not a yes response' });
    if (old_data?.addendum_response === 'yes') return Response.json({ skipped: 'already processed' });
    if (data?.addendum_verbiage) return Response.json({ skipped: 'verbiage already exists' });
    if (!data?.transaction_id) return Response.json({ skipped: 'no transaction_id' });

    const notificationId = event?.entity_id || data?.id;

    // Get the transaction
    const txResults = await base44.asServiceRole.entities.Transaction.filter({ id: data.transaction_id });
    const tx = txResults[0];
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    const deadlineLabel = DEADLINE_LABELS[data.deadline_field] || data.deadline_field || "Deadline";
    const originalDate = tx[data.deadline_field]
      ? new Date(tx[data.deadline_field]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'the original date';

    const buyers = (tx.buyers?.length ? tx.buyers : [tx.buyer]).filter(Boolean).join(' and ') || 'Buyer';
    const sellers = (tx.sellers?.length ? tx.sellers : [tx.seller]).filter(Boolean).join(' and ') || 'Seller';
    const agentNote = data.addendum_note || '';

    // Generate addendum language via LLM
    const verbiage = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Generate one paragraph of professional addendum verbiage for an NHAR real estate addendum form.

Transaction details:
- Property Address: ${tx.address}
- Buyer(s): ${buyers}
- Seller(s): ${sellers}
- Deadline Type: ${deadlineLabel}
- Original Deadline Date: ${originalDate}
- Agent's Note: ${agentNote || 'No additional details provided'}

Requirements:
- Professional, neutral, legal-style language
- Concise (1 paragraph)
- Compatible with NHAR Addendum Forms
- If a new date is mentioned in the agent note, use it. Otherwise extend by 5 calendar days.
- Format: "Buyer and Seller agree to extend the [Deadline] outlined in the Purchase and Sales Agreement for the property located at [address] from [original date] to [new date]."

Return ONLY the addendum verbiage text with no extra commentary.`,
    });

    const verbiageText = typeof verbiage === 'string' ? verbiage.trim() : '';
    if (!verbiageText) return Response.json({ error: 'LLM returned empty verbiage' }, { status: 500 });

    // Update the notification with the generated verbiage
    if (notificationId) {
      await base44.asServiceRole.entities.InAppNotification.update(notificationId, {
        addendum_verbiage: verbiageText,
      });
    }

    // Update AIActivityLog
    const logs = await base44.asServiceRole.entities.AIActivityLog.filter({ notification_id: notificationId });
    if (logs.length > 0) {
      await base44.asServiceRole.entities.AIActivityLog.update(logs[0].id, {
        response_status: 'responded_yes',
        addendum_draft: verbiageText,
      });
    }

    // Notify all TC/admin users in the brokerage
    const allUsers = await base44.asServiceRole.entities.User.list();
    const tcUsers = allUsers.filter(u =>
      u.data?.brokerage_id === tx.brokerage_id &&
      ['tc', 'tc_lead', 'owner', 'admin'].includes(u.role)
    );

    for (const tcUser of tcUsers) {
      await base44.asServiceRole.entities.InAppNotification.create({
        brokerage_id: tx.brokerage_id,
        transaction_id: tx.id,
        user_email: tcUser.email,
        title: `Addendum Draft Ready – ${tx.address}`,
        body: `Agent has requested a ${deadlineLabel} extension for ${tx.address}. Draft addendum language has been prepared and is ready to review.`,
        type: 'document',
      });
    }

    return Response.json({ success: true, verbiage: verbiageText });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});