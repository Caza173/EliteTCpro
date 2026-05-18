/**
 * seedPhaseTasks — Idempotent server-side task seeding.
 * Atomically checks for existing tasks before inserting.
 * Safe against React StrictMode double-invocation, concurrent calls, and page refreshes.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { transaction_id, phase, tasks: taskDefs, brokerage_id } = body;

  if (!transaction_id || !phase || !Array.isArray(taskDefs) || taskDefs.length === 0) {
    return Response.json({ error: "transaction_id, phase, and tasks[] required" }, { status: 400 });
  }

  console.log(`[seedPhaseTasks] tx=${transaction_id} phase=${phase} taskCount=${taskDefs.length}`);

  // Fetch ALL existing tasks for this transaction + phase using service role
  const existing = await base44.asServiceRole.entities.TransactionTask.filter({
    transaction_id,
    phase,
  });

  // Build a set of normalized existing titles for O(1) lookup
  const existingTitles = new Set(
    existing.map(t => t.title?.trim().toLowerCase())
  );

  console.log(`[seedPhaseTasks] existing tasks: ${existing.length}`, [...existingTitles]);

  if (existing.length >= taskDefs.length) {
    // All (or more) tasks already exist — skip seeding entirely
    console.log(`[seedPhaseTasks] already seeded (${existing.length} tasks exist), skipping`);
    return Response.json({ seeded: 0, skipped: taskDefs.length, already_exists: true });
  }

  // Only insert tasks whose title doesn't already exist
  const toInsert = taskDefs.filter(t => {
    const normalized = t.title?.trim().toLowerCase();
    const exists = existingTitles.has(normalized);
    console.log(`[seedPhaseTasks] "${t.title}" exists=${exists}`);
    return !exists;
  });

  if (toInsert.length === 0) {
    console.log(`[seedPhaseTasks] all tasks already exist, skipping`);
    return Response.json({ seeded: 0, skipped: taskDefs.length, already_exists: true });
  }

  // Insert only missing tasks
  const created = [];
  for (const t of toInsert) {
    const record = await base44.asServiceRole.entities.TransactionTask.create({
      transaction_id,
      brokerage_id: brokerage_id || undefined,
      phase,
      title: t.title,
      order_index: t.order_index ?? 0,
      is_completed: false,
      is_required: t.is_required ?? true,
      is_custom: false,
      created_by: user.id || undefined,
    });
    created.push(record);
    console.log(`[seedPhaseTasks] created task "${t.title}" id=${record.id}`);
  }

  console.log(`[seedPhaseTasks] done — seeded ${created.length}, skipped ${taskDefs.length - toInsert.length}`);

  return Response.json({
    seeded: created.length,
    skipped: taskDefs.length - toInsert.length,
    already_exists: false,
    created_ids: created.map(t => t.id),
  });
});