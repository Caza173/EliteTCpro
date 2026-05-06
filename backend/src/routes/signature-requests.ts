import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { documents, signatureRequests } from '../db/schema.js';
import { serializeSignatureRequest } from '../lib/serializers.js';
import { requireAuth } from '../middleware/auth.js';
import { getOwnedTransaction, requireSignatureRequestOwnership } from '../middleware/ownership.js';
import { getSignatureProvider, type SignatureRecipient } from '../services/signatures/provider.js';

const router = Router();
const provider = getSignatureProvider();

const recipientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().default('other'),
  routing_order: z.coerce.number().int().min(1).default(1),
  status: z.string().optional(),
  signed_at: z.string().nullable().optional(),
  viewed_at: z.string().nullable().optional(),
});

const createSignatureRequestSchema = z.object({
  transaction_id: z.string().uuid(),
  document_id: z.string().uuid(),
  title: z.string().min(1),
  subject: z.string().min(1),
  message: z.string().min(1),
  recipients: z.array(recipientSchema).min(1),
});

const previewPlacementSchema = z.object({
  document_type: z.string().default('other'),
  recipients: z.array(recipientSchema).min(1),
});

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
    .from(signatureRequests)
    .where(
      transactionId
        ? and(eq(signatureRequests.ownerId, request.user.id), eq(signatureRequests.transactionId, transactionId))
        : eq(signatureRequests.ownerId, request.user.id)
    )
    .orderBy(desc(signatureRequests.createdAt));

  return response.json({ signature_requests: rows.map(serializeSignatureRequest) });
});

router.post('/placement-preview', async (request, response) => {
  const payload = previewPlacementSchema.parse(request.body ?? {});
  const preview = provider.previewPlacement(payload.document_type, payload.recipients as SignatureRecipient[]);
  return response.json(preview);
});

router.post('/', async (request, response) => {
  const payload = createSignatureRequestSchema.parse(request.body ?? {});
  const transaction = await getOwnedTransaction(request.user.id, payload.transaction_id);
  if (!transaction) {
    return response.status(404).json({ error: 'Transaction not found' });
  }

  const [documentRecord] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, payload.document_id), eq(documents.ownerId, request.user.id)))
    .limit(1);

  if (!documentRecord) {
    return response.status(404).json({ error: 'Document not found' });
  }

  const providerResponse = await provider.sendRequest({
    title: payload.title,
    subject: payload.subject,
    message: payload.message,
    recipients: payload.recipients as SignatureRecipient[],
    documentName: documentRecord.fileName,
  });

  const [record] = await db
    .insert(signatureRequests)
    .values({
      ownerId: request.user.id,
      transactionId: payload.transaction_id,
      documentId: payload.document_id,
      provider: providerResponse.provider,
      providerRequestId: providerResponse.providerRequestId,
      status: providerResponse.status,
      title: payload.title,
      subject: payload.subject,
      message: payload.message,
      sentAt: new Date(),
      data: {
        recipients: providerResponse.recipients,
        audit_events: providerResponse.auditEvents,
        progress_completed: 0,
        progress_total: providerResponse.recipients.length,
      },
    })
    .returning();

  return response.status(201).json({ signature_request: serializeSignatureRequest(record) });
});

router.get('/:id', requireSignatureRequestOwnership, async (request, response) => {
  return response.json({ signature_request: serializeSignatureRequest(request.signatureRequestRecord!) });
});

router.get('/:id/audit-trail', requireSignatureRequestOwnership, async (request, response) => {
  const events = Array.isArray(request.signatureRequestRecord!.data.audit_events)
    ? request.signatureRequestRecord!.data.audit_events
    : [];

  return response.json({ events });
});

router.post('/:id/refresh', requireSignatureRequestOwnership, async (request, response) => {
  const current = request.signatureRequestRecord!;
  const refreshed = await provider.refreshRequest({
    id: current.id,
    status: current.status,
    provider: current.provider,
    data: current.data,
  });

  const [record] = await db
    .update(signatureRequests)
    .set({
      status: refreshed.status ?? current.status,
      data: {
        ...current.data,
        recipients: refreshed.recipients ?? current.data.recipients,
        audit_events: refreshed.auditEvents ?? current.data.audit_events,
      },
    })
    .where(and(eq(signatureRequests.id, current.id), eq(signatureRequests.ownerId, request.user.id)))
    .returning();

  return response.json({ signature_request: serializeSignatureRequest(record) });
});

router.post('/:id/resend', requireSignatureRequestOwnership, async (request, response) => {
  const current = request.signatureRequestRecord!;
  const resent = await provider.resendRequest({
    id: current.id,
    status: current.status,
    provider: current.provider,
    data: current.data,
  });

  const auditEvents = Array.isArray(current.data.audit_events) ? current.data.audit_events : [];
  const [record] = await db
    .update(signatureRequests)
    .set({
      status: resent.status ?? current.status,
      lastReminderSentAt: new Date(),
      data: {
        ...current.data,
        recipients: resent.recipients ?? current.data.recipients,
        audit_events: [...auditEvents, ...(resent.auditEvents ?? [])],
      },
    })
    .where(and(eq(signatureRequests.id, current.id), eq(signatureRequests.ownerId, request.user.id)))
    .returning();

  return response.json({ signature_request: serializeSignatureRequest(record) });
});

router.post('/:id/cancel', requireSignatureRequestOwnership, async (request, response) => {
  const current = request.signatureRequestRecord!;
  const cancelled = await provider.cancelRequest({
    id: current.id,
    status: current.status,
    provider: current.provider,
    data: current.data,
  });
  const auditEvents = Array.isArray(current.data.audit_events) ? current.data.audit_events : [];

  const [record] = await db
    .update(signatureRequests)
    .set({
      status: cancelled.status ?? 'cancelled',
      cancelledAt: new Date(),
      data: {
        ...current.data,
        recipients: cancelled.recipients ?? current.data.recipients,
        audit_events: [...auditEvents, ...(cancelled.auditEvents ?? [])],
      },
    })
    .where(and(eq(signatureRequests.id, current.id), eq(signatureRequests.ownerId, request.user.id)))
    .returning();

  return response.json({ signature_request: serializeSignatureRequest(record) });
});

router.post('/:id/mark-completed', requireSignatureRequestOwnership, async (request, response) => {
  const current = request.signatureRequestRecord!;
  const auditEvents = Array.isArray(current.data.audit_events) ? current.data.audit_events : [];
  const recipients = Array.isArray(current.data.recipients)
    ? (current.data.recipients as SignatureRecipient[]).map((recipient) => ({
        ...recipient,
        status: 'signed',
        signed_at: new Date().toISOString(),
      }))
    : [];

  const [record] = await db
    .update(signatureRequests)
    .set({
      status: 'completed',
      completedAt: new Date(),
      data: {
        ...current.data,
        recipients,
        progress_completed: recipients.length,
        progress_total: recipients.length,
        audit_events: [...auditEvents, { event_type: 'completed', timestamp: new Date().toISOString(), notes: 'Marked completed externally.' }],
      },
    })
    .where(and(eq(signatureRequests.id, current.id), eq(signatureRequests.ownerId, request.user.id)))
    .returning();

  return response.json({ signature_request: serializeSignatureRequest(record) });
});

router.post('/mark-completed', async (request, response) => {
  const payload = z
    .object({
      transaction_id: z.string().uuid(),
      document_id: z.string().uuid(),
      title: z.string().min(1),
    })
    .parse(request.body ?? {});

  const transaction = await getOwnedTransaction(request.user.id, payload.transaction_id);
  if (!transaction) {
    return response.status(404).json({ error: 'Transaction not found' });
  }

  const [record] = await db
    .insert(signatureRequests)
    .values({
      ownerId: request.user.id,
      transactionId: payload.transaction_id,
      documentId: payload.document_id,
      provider: 'external',
      providerRequestId: null,
      status: 'completed',
      title: payload.title,
      subject: payload.title,
      message: 'Marked completed outside EliteTC.',
      sentAt: new Date(),
      completedAt: new Date(),
      data: {
        recipients: [],
        progress_completed: 1,
        progress_total: 1,
        audit_events: [{ event_type: 'completed', timestamp: new Date().toISOString(), notes: 'Marked completed externally.' }],
      },
    })
    .returning();

  return response.status(201).json({ signature_request: serializeSignatureRequest(record) });
});

export default router;