import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PHASE_NAMES = {
  1: "Under Contract",
  2: "Due Diligence & Inspections",
  3: "Financing & Underwriting",
  4: "Closing",
  5: "Post-Close"
};

const NEXT_PHASE = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: null
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transaction_id, phase_number } = await req.json();
    if (!transaction_id || !phase_number) {
      return Response.json({ error: 'Missing transaction_id or phase_number' }, { status: 400 });
    }

    // Fetch transaction and tasks
    const tx = await base44.entities.Transaction.filter({ id: transaction_id });
    if (!tx.length) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    const transaction = tx[0];

    const tasks = await base44.entities.TransactionTask.filter({ 
      transaction_id, 
      phase: phase_number 
    });

    // Check if all required tasks are complete
    const requiredTasks = tasks.filter(t => t.is_required);
    const allRequiredComplete = requiredTasks.length > 0 && requiredTasks.every(t => t.is_completed);
    
    if (!allRequiredComplete) {
      return Response.json({ completed: false, reason: 'Not all required tasks complete' });
    }

    // Phase is complete — collect completed tasks
    const completedTasks = tasks.filter(t => t.is_completed).map(t => t.title);

    // Check if summary already sent (duplicate prevention)
    const phaseEmailKey = `phase_${phase_number}_email_sent`;
    if (transaction[phaseEmailKey]) {
      return Response.json({ completed: true, alreadySent: true, summary: "Email already sent for this phase" });
    }

    // Generate summary via AI
    const summaryRes = await base44.integrations.Core.InvokeLLM({
      prompt: `Convert this list of completed real estate transaction tasks into a short, client-facing summary (2-3 sentences, plain English, no checklist formatting):

Completed tasks:
${completedTasks.map(t => `- ${t}`).join('\n')}

Write only the summary, nothing else.`,
      response_json_schema: {
        type: "object",
        properties: { summary: { type: "string" } }
      }
    });

    const phaseSummary = summaryRes?.summary || completedTasks.join(", ");
    const phaseName = PHASE_NAMES[phase_number] || `Phase ${phase_number}`;
    const nextPhase = NEXT_PHASE[phase_number];
    const nextPhaseName = nextPhase ? PHASE_NAMES[nextPhase] : "Final Steps";

    // Prepare emails
    const buyerName = transaction.buyers?.[0] || transaction.buyer || "Valued Client";
    const sellerName = transaction.sellers?.[0] || transaction.seller || "Valued Seller";
    const buyerAgent = transaction.buyers_agent_name || transaction.agent || "Your Agent";
    const sellerAgent = transaction.sellers_agent_name || transaction.agent || "Your Agent";
    const address = transaction.address || "Property";

    const buyerEmailBody = `<p>Hi ${buyerName},</p>
<p>We've completed the <strong>${phaseName}</strong> phase.</p>
<p>${phaseSummary}</p>
<p><strong>Next step:</strong> ${nextPhaseName}</p>
<p>I'll continue coordinating everything and keep you updated as we move forward.</p>
<p>Best regards,<br/>${buyerAgent}</p>`;

    const sellerEmailBody = `<p>Hi ${sellerName},</p>
<p>The <strong>${phaseName}</strong> phase has been completed.</p>
<p>${phaseSummary}</p>
<p>We are now moving into: <strong>${nextPhaseName}</strong></p>
<p>I'll keep you updated as we progress.</p>
<p>Best regards,<br/>${sellerAgent}</p>`;

    // Send emails
    const buyerEmails = transaction.client_emails?.length ? transaction.client_emails : (transaction.client_email ? [transaction.client_email] : []);
    const sellerEmails = transaction.sellers_agent_email ? [transaction.sellers_agent_email] : [];

    const emailPromises = [];
    
    if (buyerEmails.length > 0) {
      buyerEmails.forEach(email => {
        emailPromises.push(
          base44.integrations.Core.SendEmail({
            to: email,
            subject: `Update – ${phaseName} Complete for ${address}`,
            body: buyerEmailBody
          }).catch(() => {})
        );
      });
    }

    if (sellerEmails.length > 0) {
      sellerEmails.forEach(email => {
        emailPromises.push(
          base44.integrations.Core.SendEmail({
            to: email,
            subject: `Update – ${phaseName} Complete for ${address}`,
            body: sellerEmailBody
          }).catch(() => {})
        );
      });
    }

    await Promise.all(emailPromises);

    // Log activity
    await base44.entities.AuditLog.create({
      brokerage_id: transaction.brokerage_id,
      transaction_id,
      actor_email: user.email,
      action: "phase_completed",
      entity_type: "transaction",
      entity_id: transaction_id,
      description: `Phase ${phase_number} (${phaseName}) completed. ${completedTasks.length} tasks completed. Summary: ${phaseSummary}`,
      before: { [phaseEmailKey]: false },
      after: { [phaseEmailKey]: true }
    }).catch(() => {});

    // Mark phase email as sent
    await base44.entities.Transaction.update(transaction_id, {
      [phaseEmailKey]: true,
      last_activity_at: new Date().toISOString()
    });

    return Response.json({
      completed: true,
      phase: phaseName,
      summary: phaseSummary,
      nextPhase: nextPhaseName,
      taskCount: completedTasks.length,
      emailsSent: buyerEmails.length + sellerEmails.length
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});