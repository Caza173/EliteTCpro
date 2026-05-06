import multer from 'multer';
import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { documents, transactions } from '../db/schema.js';
import { serializeDocument } from '../lib/serializers.js';
import { requireAuth } from '../middleware/auth.js';
import { requireDocumentOwnership } from '../middleware/ownership.js';
import { deleteStoredObject, storeUploadedFile } from '../services/storage/index.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const documentPayloadSchema = z.object({
  transaction_id: z.string().uuid(),
  file_name: z.string().min(1),
  file_url: z.string().min(1),
  doc_type: z.string().default('other'),
}).catchall(z.unknown());

const uploadPayloadSchema = z.object({
  transaction_id: z.string().uuid(),
  doc_type: z.string().default('other'),
  file_name: z.string().optional(),
  uploaded_by: z.string().optional(),
  uploaded_by_role: z.string().optional(),
}).catchall(z.unknown());

router.use(requireAuth);

router.post('/upload', upload.single('file'), async (request, response) => {
  const payload = uploadPayloadSchema.parse(request.body ?? {});
  const file = request.file;

  if (!file) {
    return response.status(400).json({ error: 'File upload is required' });
  }

  const [transaction] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.id, payload.transaction_id), eq(transactions.ownerId, request.user.id)))
    .limit(1);

  if (!transaction) {
    return response.status(404).json({ error: 'Transaction not found' });
  }

  const stored = await storeUploadedFile({
    ownerId: request.user.id,
    transactionId: payload.transaction_id,
    originalFileName: payload.file_name ?? file.originalname,
    mimeType: file.mimetype,
    buffer: file.buffer,
  });

  const [documentRecord] = await db
    .insert(documents)
    .values({
      ownerId: request.user.id,
      transactionId: payload.transaction_id,
      fileName: payload.file_name ?? file.originalname,
      fileUrl: stored.url,
      docType: payload.doc_type,
      data: {
        ...payload,
        content_type: file.mimetype,
        size_bytes: file.size,
        storage_key: stored.key,
      },
    })
    .returning();

  return response.status(201).json({ document: serializeDocument(documentRecord) });
});

router.get('/', async (request, response) => {
  const transactionId = typeof request.query.transaction_id === 'string' ? request.query.transaction_id : null;
  const rows = await db
    .select()
    .from(documents)
    .where(
      transactionId
        ? and(eq(documents.ownerId, request.user.id), eq(documents.transactionId, transactionId))
        : eq(documents.ownerId, request.user.id)
    )
    .orderBy(desc(documents.createdAt));

  return response.json({ documents: rows.map(serializeDocument) });
});

router.post('/', async (request, response) => {
  const payload = documentPayloadSchema.parse(request.body ?? {});
  const [transaction] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.id, payload.transaction_id), eq(transactions.ownerId, request.user.id)))
    .limit(1);

  if (!transaction) {
    return response.status(404).json({ error: 'Transaction not found' });
  }

  const [documentRecord] = await db
    .insert(documents)
    .values({
      ownerId: request.user.id,
      transactionId: payload.transaction_id,
      fileName: payload.file_name,
      fileUrl: payload.file_url,
      docType: payload.doc_type,
      data: payload,
    })
    .returning();

  return response.status(201).json({ document: serializeDocument(documentRecord) });
});

router.get('/:id', requireDocumentOwnership, async (request, response) => {
  return response.json({ document: serializeDocument(request.documentRecord!) });
});

router.patch('/:id', requireDocumentOwnership, async (request, response) => {
  const payload = documentPayloadSchema.partial().parse(request.body ?? {});
  const current = request.documentRecord!;

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

  const [documentRecord] = await db
    .update(documents)
    .set({
      transactionId: payload.transaction_id ?? current.transactionId,
      fileName: payload.file_name ?? current.fileName,
      fileUrl: payload.file_url ?? current.fileUrl,
      docType: payload.doc_type ?? current.docType,
      data: {
        ...current.data,
        ...payload,
      },
    })
    .where(and(eq(documents.id, current.id), eq(documents.ownerId, request.user.id)))
    .returning();

  return response.json({ document: serializeDocument(documentRecord) });
});

router.delete('/:id', requireDocumentOwnership, async (request, response) => {
  const storageKey = typeof request.documentRecord!.data.storage_key === 'string' ? request.documentRecord!.data.storage_key : null;
  if (storageKey) {
    await deleteStoredObject(storageKey);
  }

  await db
    .delete(documents)
    .where(and(eq(documents.id, request.documentRecord!.id), eq(documents.ownerId, request.user.id)));

  return response.status(204).send();
});

export default router;