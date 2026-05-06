import { and, asc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { deadlines, transactions } from '../db/schema.js';
import { serializeDeadline } from '../lib/serializers.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDeadlineOwnership } from '../middleware/ownership.js';

const router = Router();

const deadlinePayloadSchema = z.object({
  transaction_id: z.string().uuid(),
  name: z.string().min(1),
  status: z.string().default('open'),
  due_date: z.string().optional(),
}).catchall(z.unknown());

router.use(requireAuth);

router.get('/', async (request, response) => {
  const transactionId = typeof request.query.transaction_id === 'string' ? request.query.transaction_id : null;
  const rows = await db
    .select()
    .from(deadlines)
    .where(
      transactionId
        ? and(eq(deadlines.ownerId, request.user.id), eq(deadlines.transactionId, transactionId))
        : eq(deadlines.ownerId, request.user.id)
    )
    .orderBy(asc(deadlines.dueDate));

  return response.json({ deadlines: rows.map(serializeDeadline) });
});

router.post('/', async (request, response) => {
  const payload = deadlinePayloadSchema.parse(request.body ?? {});
  const [transaction] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.id, payload.transaction_id), eq(transactions.ownerId, request.user.id)))
    .limit(1);

  if (!transaction) {
    return response.status(404).json({ error: 'Transaction not found' });
  }

  const [deadline] = await db
    .insert(deadlines)
    .values({
      ownerId: request.user.id,
      transactionId: payload.transaction_id,
      name: payload.name,
      status: payload.status,
      dueDate: payload.due_date ?? null,
      data: payload,
    })
    .returning();

  return response.status(201).json({ deadline: serializeDeadline(deadline) });
});

router.get('/:id', requireDeadlineOwnership, async (request, response) => {
  return response.json({ deadline: serializeDeadline(request.deadlineRecord!) });
});

router.patch('/:id', requireDeadlineOwnership, async (request, response) => {
  const payload = deadlinePayloadSchema.partial().parse(request.body ?? {});
  const current = request.deadlineRecord!;

  if (payload.transaction_id) {
    const [transaction] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.id, payload.transaction_id), eq(transactions.ownerId, request.user.id)))
      .limit(1);

    if (!transaction) {
      return response.status(404).json({ error: 'Transaction not found' });
    }
  }

  const [deadline] = await db
    .update(deadlines)
    .set({
      transactionId: payload.transaction_id ?? current.transactionId,
      name: payload.name ?? current.name,
      status: payload.status ?? current.status,
      dueDate: payload.due_date ?? current.dueDate,
      data: {
        ...current.data,
        ...payload,
      },
    })
    .where(and(eq(deadlines.id, current.id), eq(deadlines.ownerId, request.user.id)))
    .returning();

  return response.json({ deadline: serializeDeadline(deadline) });
});

router.delete('/:id', requireDeadlineOwnership, async (request, response) => {
  await db
    .delete(deadlines)
    .where(and(eq(deadlines.id, request.deadlineRecord!.id), eq(deadlines.ownerId, request.user.id)));

  return response.status(204).send();
});

export default router;