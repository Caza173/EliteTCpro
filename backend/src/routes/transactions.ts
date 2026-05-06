import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { transactions } from '../db/schema.js';
import { serializeTransaction } from '../lib/serializers.js';
import { requireAuth } from '../middleware/auth.js';
import { requireTransactionOwnership } from '../middleware/ownership.js';

const router = Router();

const transactionPayloadSchema = z.object({
  address: z.string().optional(),
  status: z.string().optional(),
}).catchall(z.unknown());

router.use(requireAuth);

router.get('/', async (request, response) => {
  const status = typeof request.query.status === 'string' ? request.query.status : null;
  const rows = await db
    .select()
    .from(transactions)
    .where(
      status
        ? and(eq(transactions.ownerId, request.user.id), eq(transactions.status, status))
        : eq(transactions.ownerId, request.user.id)
    )
    .orderBy(desc(transactions.createdAt));

  return response.json({ transactions: rows.map(serializeTransaction) });
});

router.post('/', async (request, response) => {
  const payload = transactionPayloadSchema.parse(request.body ?? {});
  const [transaction] = await db
    .insert(transactions)
    .values({
      ownerId: request.user.id,
      address: payload.address ?? '',
      status: payload.status ?? 'draft',
      data: payload,
    })
    .returning();

  return response.status(201).json({ transaction: serializeTransaction(transaction) });
});

router.get('/:id', requireTransactionOwnership, async (request, response) => {
  return response.json({ transaction: serializeTransaction(request.transaction!) });
});

router.patch('/:id', requireTransactionOwnership, async (request, response) => {
  const payload = transactionPayloadSchema.parse(request.body ?? {});
  const current = request.transaction!;
  const nextData = {
    ...current.data,
    ...payload,
  };

  const [transaction] = await db
    .update(transactions)
    .set({
      address: payload.address ?? current.address,
      status: payload.status ?? current.status,
      data: nextData,
    })
    .where(and(eq(transactions.id, current.id), eq(transactions.ownerId, request.user.id)))
    .returning();

  return response.json({ transaction: serializeTransaction(transaction) });
});

router.delete('/:id', requireTransactionOwnership, async (request, response) => {
  await db
    .delete(transactions)
    .where(and(eq(transactions.id, request.transaction!.id), eq(transactions.ownerId, request.user.id)));

  return response.status(204).send();
});

export default router;