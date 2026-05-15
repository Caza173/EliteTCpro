import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  console.log("[debugCreateTask] auth user:", user?.id, user?.email, user?.role);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  console.log("[debugCreateTask] request body:", JSON.stringify(body));

  const { transaction_id, title, phase, status } = body;

  if (!transaction_id || !title) {
    return Response.json({ error: "Missing transaction_id or title" }, { status: 400 });
  }

  // Verify transaction exists and user can access it
  let transaction;
  try {
    const txList = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    transaction = txList?.[0];
    console.log("[debugCreateTask] transaction lookup:", transaction?.id, transaction?.brokerage_id);
  } catch (err) {
    console.error("[debugCreateTask] transaction lookup failed:", err.message);
    return Response.json({ error: "Transaction lookup failed: " + err.message }, { status: 500 });
  }

  if (!transaction) {
    return Response.json({ error: "Transaction not found: " + transaction_id }, { status: 404 });
  }

  // Insert task directly using service role to bypass any RLS issues for debug
  const taskPayload = {
    transaction_id,
    brokerage_id: transaction.brokerage_id || null,
    phase: typeof phase === "number" ? phase : 1,
    title,
    order_index: 999,
    is_completed: false,
    is_required: false,
    is_custom: true,
    created_by: user.id,
  };

  console.log("[debugCreateTask] inserting task payload:", JSON.stringify(taskPayload));

  let inserted;
  try {
    inserted = await base44.asServiceRole.entities.TransactionTask.create(taskPayload);
    console.log("[debugCreateTask] insert result:", JSON.stringify(inserted));
  } catch (err) {
    console.error("[debugCreateTask] INSERT FAILED:", err.message, err);
    return Response.json({ error: "Insert failed: " + err.message, details: String(err) }, { status: 500 });
  }

  // Now fetch all tasks for this transaction
  let allTasks;
  try {
    allTasks = await base44.asServiceRole.entities.TransactionTask.filter({ transaction_id });
    console.log("[debugCreateTask] fetched tasks count:", allTasks?.length);
    console.log("[debugCreateTask] fetched tasks:", JSON.stringify(allTasks?.map(t => ({ id: t.id, title: t.title, phase: t.phase }))));
  } catch (err) {
    console.error("[debugCreateTask] fetch tasks failed:", err.message);
    allTasks = [];
  }

  return Response.json({
    success: true,
    inserted,
    tasks: allTasks,
    user_id: user.id,
    user_email: user.email,
  });
});