import { and, asc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { transactionTasks } from '../db/schema.js';
import { serializeTransactionTask } from '../lib/serializers.js';
import { requireAuth } from '../middleware/auth.js';
import { getOwnedTransaction, requireTransactionTaskOwnership } from '../middleware/ownership.js';

const router = Router();

const taskPayloadSchema = z.object({
  transaction_id: z.string().uuid(),
  phase: z.coerce.number().int(),
  title: z.string().min(1),
  order_index: z.coerce.number().int().default(0),
  is_completed: z.boolean().default(false),
}).catchall(z.unknown());

router.use(requireAuth);

router.get('/', async (request, response) => {
  const transactionId = typeof request.query.transaction_id === 'string' ? request.query.transaction_id : null;
  const phase = typeof request.query.phase === 'string' ? Number.parseInt(request.query.phase, 10) : null;

  if (transactionId) {
    const transaction = await getOwnedTransaction(request.user.id, transactionId);
    if (!transaction) {
      return response.status(404).json({ error: 'Transaction not found' });
    }
  }

  const filters = [eq(transactionTasks.ownerId, request.user.id)];
  if (transactionId) filters.push(eq(transactionTasks.transactionId, transactionId));
  if (Number.isInteger(phase)) filters.push(eq(transactionTasks.phase, phase!));

  const rows = await db
    .select()
    .from(transactionTasks)
    .where(and(...filters))
    .orderBy(asc(transactionTasks.phase), asc(transactionTasks.orderIndex), asc(transactionTasks.createdAt));

  return response.json({ tasks: rows.map(serializeTransactionTask) });
});

router.post('/', async (request, response) => {
  const payload = taskPayloadSchema.parse(request.body ?? {});
  const transaction = await getOwnedTransaction(request.user.id, payload.transaction_id);
  if (!transaction) {
    return response.status(404).json({ error: 'Transaction not found' });
  }

  const [task] = await db
    .insert(transactionTasks)
    .values({
      ownerId: request.user.id,
      transactionId: payload.transaction_id,
      phase: payload.phase,
      title: payload.title,
      orderIndex: payload.order_index,
      isCompleted: payload.is_completed,
      data: payload,
    })
    .returning();

  return response.status(201).json({ task: serializeTransactionTask(task) });
});

router.get('/:id', requireTransactionTaskOwnership, async (request, response) => {
  return response.json({ task: serializeTransactionTask(request.transactionTaskRecord!) });
});

router.patch('/:id', requireTransactionTaskOwnership, async (request, response) => {
  const payload = taskPayloadSchema.partial().parse(request.body ?? {});
  const current = request.transactionTaskRecord!;

  if (payload.transaction_id) {
    const transaction = await getOwnedTransaction(request.user.id, payload.transaction_id);
    if (!transaction) {
      return response.status(404).json({ error: 'Transaction not found' });
    }
  }

  const [task] = await db
    .update(transactionTasks)
    .set({
      transactionId: payload.transaction_id ?? current.transactionId,
      phase: payload.phase ?? current.phase,
      title: payload.title ?? current.title,
      orderIndex: payload.order_index ?? current.orderIndex,
      isCompleted: payload.is_completed ?? current.isCompleted,
      data: {
        ...current.data,
        ...payload,
      },
    })
    .where(and(eq(transactionTasks.id, current.id), eq(transactionTasks.ownerId, request.user.id)))
    .returning();

  return response.json({ task: serializeTransactionTask(task) });
});

router.delete('/:id', requireTransactionTaskOwnership, async (request, response) => {
  await db.delete(transactionTasks).where(and(eq(transactionTasks.id, request.transactionTaskRecord!.id), eq(transactionTasks.ownerId, request.user.id)));
  return response.status(204).send();
});

export default router;