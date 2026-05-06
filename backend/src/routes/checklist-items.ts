import { and, asc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { checklistItems, documents } from '../db/schema.js';
import { serializeChecklistItem } from '../lib/serializers.js';
import { requireAuth } from '../middleware/auth.js';
import { getOwnedTransaction, requireChecklistItemOwnership } from '../middleware/ownership.js';

const router = Router();

const checklistPayloadSchema = z.object({
  transaction_id: z.string().uuid(),
  uploaded_document_id: z.string().uuid().nullable().optional(),
  doc_type: z.string().default('other'),
  label: z.string().default(''),
  status: z.string().default('missing'),
  required: z.boolean().default(false),
  visible_to_client: z.boolean().default(false),
  required_by_phase: z.coerce.number().int().nullable().optional(),
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
    .from(checklistItems)
    .where(transactionId ? and(eq(checklistItems.ownerId, request.user.id), eq(checklistItems.transactionId, transactionId)) : eq(checklistItems.ownerId, request.user.id))
    .orderBy(asc(checklistItems.requiredByPhase), asc(checklistItems.createdAt));

  return response.json({ checklist_items: rows.map(serializeChecklistItem) });
});

router.post('/', async (request, response) => {
  const payload = checklistPayloadSchema.parse(request.body ?? {});
  const transaction = await getOwnedTransaction(request.user.id, payload.transaction_id);
  if (!transaction) {
    return response.status(404).json({ error: 'Transaction not found' });
  }

  if (payload.uploaded_document_id) {
    const [documentRecord] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.id, payload.uploaded_document_id), eq(documents.ownerId, request.user.id)))
      .limit(1);

    if (!documentRecord) {
      return response.status(404).json({ error: 'Document not found' });
    }
  }

  const [item] = await db
    .insert(checklistItems)
    .values({
      ownerId: request.user.id,
      transactionId: payload.transaction_id,
      uploadedDocumentId: payload.uploaded_document_id ?? null,
      docType: payload.doc_type,
      label: payload.label,
      status: payload.status,
      required: payload.required,
      visibleToClient: payload.visible_to_client,
      requiredByPhase: payload.required_by_phase ?? null,
      data: payload,
    })
    .returning();

  return response.status(201).json({ checklist_item: serializeChecklistItem(item) });
});

router.get('/:id', requireChecklistItemOwnership, async (request, response) => {
  return response.json({ checklist_item: serializeChecklistItem(request.checklistItemRecord!) });
});

router.patch('/:id', requireChecklistItemOwnership, async (request, response) => {
  const payload = checklistPayloadSchema.partial().parse(request.body ?? {});
  const current = request.checklistItemRecord!;

  if (payload.transaction_id) {
    const transaction = await getOwnedTransaction(request.user.id, payload.transaction_id);
    if (!transaction) {
      return response.status(404).json({ error: 'Transaction not found' });
    }
  }

  if (payload.uploaded_document_id) {
    const [documentRecord] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.id, payload.uploaded_document_id), eq(documents.ownerId, request.user.id)))
      .limit(1);

    if (!documentRecord) {
      return response.status(404).json({ error: 'Document not found' });
    }
  }

  const [item] = await db
    .update(checklistItems)
    .set({
      transactionId: payload.transaction_id ?? current.transactionId,
      uploadedDocumentId: payload.uploaded_document_id ?? current.uploadedDocumentId,
      docType: payload.doc_type ?? current.docType,
      label: payload.label ?? current.label,
      status: payload.status ?? current.status,
      required: payload.required ?? current.required,
      visibleToClient: payload.visible_to_client ?? current.visibleToClient,
      requiredByPhase: payload.required_by_phase ?? current.requiredByPhase,
      data: {
        ...current.data,
        ...payload,
      },
    })
    .where(and(eq(checklistItems.id, current.id), eq(checklistItems.ownerId, request.user.id)))
    .returning();

  return response.json({ checklist_item: serializeChecklistItem(item) });
});

router.delete('/:id', requireChecklistItemOwnership, async (request, response) => {
  await db.delete(checklistItems).where(and(eq(checklistItems.id, request.checklistItemRecord!.id), eq(checklistItems.ownerId, request.user.id)));
  return response.status(204).send();
});

export default router;