/**
 * financialCommitmentEmail
 * Sends the Financial Commitment Received email, then:
 *  - Marks financing_contingency_status = "cleared" on the transaction
 *  - Updates transaction phase to "clear_to_close" (Closing / Pre-Close)
 *  - Logs an audit entry
 *  - Reduces health score (financing risk removed)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transaction_id, body_override } = await req.json();
    if (!transaction_id) return Response.json({ error: 'transaction_id is required' }, { status: 400 });

    // Fetch transaction
    const txList = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    const tx = txList[0];
    if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });

    // Required field validation
    const buyerFirst = tx.buyers?.[0] || tx.buyer?.split(" ")[0];
    const buyerEmail = tx.client_emails?.[0] || tx.client_email;
    const missing = [];
    if (!buyerFirst) missing.push("Buyer first name");
    if (!tx.address) missing.push("Property address");
    if (!tx.closing_date) missing.push("Closing date");
    if (!buyerEmail) missing.push("Buyer email");

    if (missing.length > 0) {
      return Response.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 422 });
    }

    const closingDate = new Date(tx.closing_date).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
    const tcName = user.full_name || user.email || "Your Transaction Coordinator";
    const teamName = tx.agent_company || "EliteTC";

    const emailBody = body_override || `Hi ${buyerFirst},

Your financial commitment has been received for ${tx.address}.

This satisfies the financing contingency in your contract.

What this means:
- Financing is approved per contract terms
- We are clear to move toward closing
- No further action needed on the financing contingency

Next steps:
- Your lender will finalize any remaining conditions
- Title and closing coordination will continue
- We will schedule your final walkthrough closer to closing

Your closing is currently scheduled for ${closingDate}.

If you have any questions, feel free to reach out.

– ${tcName}
Transaction Coordinator
${teamName}`;

    // Send the email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: buyerEmail,
      from_name: teamName,
      subject: "Financial Commitment Received",
      body: emailBody,
    });

    // CC the TC
    if (user.email && user.email !== buyerEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        from_name: teamName,
        subject: `[CC] Financial Commitment Received — ${tx.address}`,
        body: emailBody,
      }).catch(() => {});
    }

    // System actions: update transaction
    const newHealthScore = Math.min(100, (tx.health_score || 75) + 15); // financing risk removed
    await base44.asServiceRole.entities.Transaction.update(transaction_id, {
      financing_contingency_status: "cleared",
      transaction_phase: "clear_to_close",
      risk_level: newHealthScore >= 80 ? "on_track" : "watch",
      health_score: newHealthScore,
      last_activity_at: new Date().toISOString(),
    });

    // Log audit entry
    await base44.asServiceRole.entities.AuditLog.create({
      brokerage_id: tx.brokerage_id || null,
      transaction_id: transaction_id,
      actor_user_id: user.id || null,
      actor_email: user.email,
      action: "financial_commitment_email_sent",
      entity_type: "transaction",
      entity_id: transaction_id,
      description: "Financial Commitment Received Email Generated and Sent",
      after: {
        financing_contingency_status: "cleared",
        transaction_phase: "clear_to_close",
        email_sent_to: buyerEmail,
      },
    });

    // Create in-app notification for TC
    await base44.asServiceRole.entities.InAppNotification.create({
      brokerage_id: tx.brokerage_id || null,
      user_id: user.id || null,
      user_email: user.email,
      transaction_id: transaction_id,
      title: "Financial Commitment Email Sent",
      body: `Financial Commitment Received email sent for ${tx.address}. Financing contingency cleared.`,
      type: "system",
      severity: "notice",
    }).catch(() => {});

    return Response.json({
      success: true,
      sent_to: buyerEmail,
      actions: ["financing_contingency_cleared", "phase_updated_to_clear_to_close", "audit_logged"],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});