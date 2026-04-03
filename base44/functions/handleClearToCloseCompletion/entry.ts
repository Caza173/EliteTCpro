import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transaction_id } = await req.json();
    if (!transaction_id) {
      return Response.json({ error: 'Missing transaction_id' }, { status: 400 });
    }

    // Fetch transaction
    const txList = await base44.entities.Transaction.filter({ id: transaction_id });
    if (!txList.length) return Response.json({ error: 'Transaction not found' }, { status: 404 });
    const transaction = txList[0];

    // Check prerequisites
    const sellerAgentEmail = transaction.sellers_agent_email;
    const hasAddress = transaction.address;

    if (!sellerAgentEmail || !hasAddress) {
      return Response.json({
        completed: true,
        draftCreated: false,
        reason: "Missing seller agent email or property address"
      });
    }

    // Check if draft already created to prevent duplicates
    const emailTracking = transaction.email_tracking || {};
    if (emailTracking.utility_request_draft_created_at) {
      return Response.json({
        completed: true,
        draftCreated: false,
        reason: "Draft already created for this milestone"
      });
    }

    // Create the utility request task (if not already created)
    const existingTasks = await base44.entities.TransactionTask.filter({
      transaction_id,
      title: { $regex: "utility" }
    }).catch(() => []);

    let utilityTaskId;
    if (existingTasks.length > 0) {
      utilityTaskId = existingTasks[0].id;
    } else {
      // Create utility request task in financing phase (phase 3)
      const newTask = await base44.entities.TransactionTask.create({
        transaction_id,
        brokerage_id: transaction.brokerage_id,
        phase: 3,
        title: "Request utility information from seller agent",
        order_index: 100,
        is_completed: false,
        is_required: false,
        is_custom: true
      });
      utilityTaskId = newTask.id;
    }

    // Mark draft as created
    await base44.entities.Transaction.update(transaction_id, {
      email_tracking: {
        ...emailTracking,
        utility_request_draft_created_at: new Date().toISOString()
      }
    });

    // Log activity
    await base44.entities.AuditLog.create({
      brokerage_id: transaction.brokerage_id,
      transaction_id,
      actor_email: "system",
      action: "clear_to_close_completed",
      entity_type: "transaction",
      entity_id: transaction_id,
      description: "Clear to Close marked complete. Utility request draft generated and task created.",
      before: null,
      after: { draft_created: true }
    }).catch(() => {});

    return Response.json({
      completed: true,
      draftCreated: true,
      taskId: utilityTaskId,
      message: "Utility request draft ready for review"
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});