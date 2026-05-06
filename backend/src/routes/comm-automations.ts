import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { commAutomations } from '../db/schema.js';
import { serializeCommAutomation } from '../lib/serializers.js';
import { requireAuth } from '../middleware/auth.js';
import { getOwnedTransaction, requireCommAutomationOwnership } from '../middleware/ownership.js';
import { generateCommAutomations, runCommPreflight, sendCommAutomation } from '../services/communications.js';

const router = Router();

const commPayloadSchema = z.object({
  transaction_id: z.string().uuid(),
  template_type: z.string(),
  template_status: z.string().default('draft'),
  subject: z.string().default(''),
  generated_content: z.string().default(''),
}).catchall(z.unknown());

router.use(requireAuth);

router.get('/', async (request, response) => {
  const transactionId = typeof request.query.transaction_id === 'string' ? request.query.transaction_id : null;

  if (transactionId) {
    const transaction = await getOwnedTransaction(request.user.id, transactionId);
    if (!transaction) {
      return response.status(404).json({ error: 'Transaction not found' });
    }
  }

  const rows = await db
    .select()
    .from(commAutomations)
    .where(transactionId ? and(eq(commAutomations.ownerId, request.user.id), eq(commAutomations.transactionId, transactionId)) : eq(commAutomations.ownerId, request.user.id))
    .orderBy(desc(commAutomations.createdAt));

  return response.json({ comm_automations: rows.map(serializeCommAutomation) });
});

router.post('/', async (request, response) => {
  const payload = commPayloadSchema.parse(request.body ?? {});
  const transaction = await getOwnedTransaction(request.user.id, payload.transaction_id);
  if (!transaction) {
    return response.status(404).json({ error: 'Transaction not found' });
  }

  const [comm] = await db
    .insert(commAutomations)
    .values({
      ownerId: request.user.id,
      transactionId: payload.transaction_id,
      templateType: payload.template_type,
      templateStatus: payload.template_status,
      subject: payload.subject,
      generatedContent: payload.generated_content,
      data: payload,
    })
    .returning();

  return response.status(201).json({ comm_automation: serializeCommAutomation(comm) });
});

router.post('/generate', async (request, response) => {
  const payload = z.object({
    transaction_id: z.string().uuid(),
    action: z.enum(['generate', 'regenerate', 'preflight']).default('generate'),
  }).parse(request.body ?? {});

  const transaction = await getOwnedTransaction(request.user.id, payload.transaction_id);
  if (!transaction) {
    return response.status(404).json({ error: 'Transaction not found' });
  }

  if (payload.action === 'preflight') {
    const { extractContractData } = await import('../services/communications.js');
    const data = extractContractData({
      ...transaction.data,
      id: transaction.id,
      address: transaction.address,
      status: transaction.status,
    });
    return response.json({ preflight: runCommPreflight(data), data });
  }

  const comms = await generateCommAutomations(request.user.id, payload.transaction_id, payload.action === 'regenerate');
  return response.json({ comm_automations: comms });
});

router.get('/:id', requireCommAutomationOwnership, async (request, response) => {
  return response.json({ comm_automation: serializeCommAutomation(request.commAutomationRecord!) });
});

router.patch('/:id', requireCommAutomationOwnership, async (request, response) => {
  const payload = commPayloadSchema.partial().parse(request.body ?? {});
  const current = request.commAutomationRecord!;

  if (payload.transaction_id) {
    const transaction = await getOwnedTransaction(request.user.id, payload.transaction_id);
    if (!transaction) {
      return response.status(404).json({ error: 'Transaction not found' });
    }
  }

  const [comm] = await db
    .update(commAutomations)
    .set({
      transactionId: payload.transaction_id ?? current.transactionId,
      templateType: payload.template_type ?? current.templateType,
      templateStatus: payload.template_status ?? current.templateStatus,
      subject: payload.subject ?? current.subject,
      generatedContent: payload.generated_content ?? current.generatedContent,
      data: {
        ...current.data,
        ...payload,
      },
    })
    .where(and(eq(commAutomations.id, current.id), eq(commAutomations.ownerId, request.user.id)))
    .returning();

  return response.json({ comm_automation: serializeCommAutomation(comm) });
});

router.post('/:id/send', requireCommAutomationOwnership, async (request, response) => {
  const comm = serializeCommAutomation(request.commAutomationRecord!);
  const updated = await sendCommAutomation(comm, request.user.email);
  return response.json({ comm_automation: updated });
});

router.delete('/:id', requireCommAutomationOwnership, async (request, response) => {
  await db.delete(commAutomations).where(and(eq(commAutomations.id, request.commAutomationRecord!.id), eq(commAutomations.ownerId, request.user.id)));
  return response.status(204).send();
});

export default router;