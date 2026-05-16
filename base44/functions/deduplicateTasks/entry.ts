import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * One-time deduplication utility.
 * For each transaction_id + phase combination, keeps only the FIRST task
 * per unique title and deletes all subsequent duplicates.
 * Admin-only.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin" && user.role !== "owner") {
    return Response.json({ error: "Forbidden: admin only" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { transaction_id, dry_run = false } = body;

  if (!transaction_id) {
    return Response.json({ error: "transaction_id required" }, { status: 400 });
  }

  console.log(`[deduplicateTasks] start tx=${transaction_id} dry_run=${dry_run}`);

  // Fetch all tasks for this transaction using service role
  const allTasks = await base44.asServiceRole.entities.TransactionTask.filter({ transaction_id });
  console.log(`[deduplicateTasks] total tasks found: ${allTasks.length}`);

  // Group by phase, then by title — keep earliest created_date, delete the rest
  const toDelete = [];
  const toKeep = [];

  // Sort by created_date ascending so we always keep the oldest
  const sorted = [...allTasks].sort((a, b) =>
    new Date(a.created_date) - new Date(b.created_date)
  );

  const seen = new Map(); // key: `${phase}::${title}` → first task id

  for (const task of sorted) {
    const key = `${task.phase}::${task.title?.trim().toLowerCase()}`;
    if (seen.has(key)) {
      toDelete.push(task);
    } else {
      seen.set(key, task.id);
      toKeep.push(task);
    }
  }

  console.log(`[deduplicateTasks] keeping: ${toKeep.length}, deleting: ${toDelete.length}`);
  console.log(`[deduplicateTasks] duplicates:`, toDelete.map(t => ({ id: t.id, title: t.title, phase: t.phase })));

  if (!dry_run && toDelete.length > 0) {
    // Delete sequentially to avoid timeouts, skip 404s
    let deletedCount = 0;
    const BATCH = 5;
    for (let i = 0; i < toDelete.length; i += BATCH) {
      const batch = toDelete.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(t => base44.asServiceRole.entities.TransactionTask.delete(t.id))
      );
      deletedCount += results.filter(r => r.status === 'fulfilled').length;
    }
    console.log(`[deduplicateTasks] done — deleted ${deletedCount} duplicates`);
  }

  return Response.json({
    success: true,
    dry_run,
    total_before: allTasks.length,
    kept: toKeep.length,
    deleted: toDelete.length,
    deleted_tasks: toDelete.map(t => ({ id: t.id, title: t.title, phase: t.phase })),
    kept_tasks: toKeep.map(t => ({ id: t.id, title: t.title, phase: t.phase, is_completed: t.is_completed })),
  });
});