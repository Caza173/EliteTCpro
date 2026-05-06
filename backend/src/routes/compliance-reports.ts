import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client.js';
import { complianceReports, documents, signatureRequests } from '../db/schema.js';
import { serializeComplianceReport } from '../lib/serializers.js';
import { requireAuth } from '../middleware/auth.js';
import { getOwnedTransaction, requireComplianceReportOwnership } from '../middleware/ownership.js';
import { analyzeDocumentCompliance, getComplianceScanStatus, setComplianceScanStatus } from '../services/compliance/index.js';

const router = Router();

const compliancePayloadSchema = z.object({
  transaction_id: z.string().uuid(),
  document_id: z.string().uuid().nullable().optional(),
  document_name: z.string().default(''),
  status: z.string().default('pending'),
  blockers_count: z.coerce.number().int().default(0),
}).catchall(z.unknown());

const scanPayloadSchema = z.object({
  transaction_id: z.string().uuid(),
  document_id: z.string().uuid().optional(),
});

router.use(requireAuth);

router.get('/scan/status', async (request, response) => {
  const transactionId = typeof request.query.transaction_id === 'string' ? request.query.transaction_id : null;
  if (!transactionId) {
    return response.status(400).json({ error: 'transaction_id is required' });
  }

  const transaction = await getOwnedTransaction(request.user.id, transactionId);
  if (!transaction) {
    return response.status(404).json({ error: 'Transaction not found' });
  }

  return response.json(getComplianceScanStatus(transactionId));
});

router.post('/scan', async (request, response) => {
  const payload = scanPayloadSchema.parse(request.body ?? {});
  const transaction = await getOwnedTransaction(request.user.id, payload.transaction_id);

  if (!transaction) {
    return response.status(404).json({ error: 'Transaction not found' });
  }

  const transactionDocuments = await db
    .select()
    .from(documents)
    .where(
      payload.document_id
        ? and(
            eq(documents.ownerId, request.user.id),
            eq(documents.transactionId, payload.transaction_id),
            eq(documents.id, payload.document_id)
          )
        : and(eq(documents.ownerId, request.user.id), eq(documents.transactionId, payload.transaction_id))
    )
    .orderBy(desc(documents.createdAt));

  if (payload.document_id && transactionDocuments.length === 0) {
    return response.status(404).json({ error: 'Document not found' });
  }

  const transactionSignatures = await db
    .select()
    .from(signatureRequests)
    .where(and(eq(signatureRequests.ownerId, request.user.id), eq(signatureRequests.transactionId, payload.transaction_id)))
    .orderBy(desc(signatureRequests.createdAt));

  const startedAt = new Date().toISOString();
  setComplianceScanStatus(payload.transaction_id, {
    transaction_id: payload.transaction_id,
    status: 'in_progress',
    processed_docs: 0,
    total_docs: transactionDocuments.length,
    started_at: startedAt,
  });

  if (payload.document_id) {
    await db
      .delete(complianceReports)
      .where(
        and(
          eq(complianceReports.ownerId, request.user.id),
          eq(complianceReports.transactionId, payload.transaction_id),
          eq(complianceReports.documentId, payload.document_id)
        )
      );
  } else {
    await db
      .delete(complianceReports)
      .where(and(eq(complianceReports.ownerId, request.user.id), eq(complianceReports.transactionId, payload.transaction_id)));
  }

  const reportValues = transactionDocuments.map((documentRecord) => {
    const analysis = analyzeDocumentCompliance({
      transaction,
      documentRecord,
      allDocuments: transactionDocuments,
      signatureRequests: transactionSignatures,
    });

    return {
      ownerId: request.user.id,
      transactionId: payload.transaction_id,
      documentId: documentRecord.id,
      documentName: documentRecord.fileName,
      status: analysis.status,
      blockersCount: analysis.blockers_count,
      data: analysis,
    };
  });

  const inserted = reportValues.length > 0 ? await db.insert(complianceReports).values(reportValues).returning() : [];
  const completedAt = new Date().toISOString();
  const status = {
    transaction_id: payload.transaction_id,
    status: 'complete' as const,
    processed_docs: inserted.length,
    total_docs: transactionDocuments.length,
    started_at: startedAt,
    completed_at: completedAt,
  };
  setComplianceScanStatus(payload.transaction_id, status);

  return response.json({
    ...status,
    compliance_reports: inserted.map(serializeComplianceReport),
  });
});

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
    .from(complianceReports)
    .where(transactionId ? and(eq(complianceReports.ownerId, request.user.id), eq(complianceReports.transactionId, transactionId)) : eq(complianceReports.ownerId, request.user.id))
    .orderBy(desc(complianceReports.createdAt));

  return response.json({ compliance_reports: rows.map(serializeComplianceReport) });
});

router.post('/', async (request, response) => {
  const payload = compliancePayloadSchema.parse(request.body ?? {});
  const transaction = await getOwnedTransaction(request.user.id, payload.transaction_id);
  if (!transaction) {
    return response.status(404).json({ error: 'Transaction not found' });
  }

  if (payload.document_id) {
    const [documentRecord] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.id, payload.document_id), eq(documents.ownerId, request.user.id)))
      .limit(1);

    if (!documentRecord) {
      return response.status(404).json({ error: 'Document not found' });
    }
  }

  const [report] = await db
    .insert(complianceReports)
    .values({
      ownerId: request.user.id,
      transactionId: payload.transaction_id,
      documentId: payload.document_id ?? null,
      documentName: payload.document_name,
      status: payload.status,
      blockersCount: payload.blockers_count,
      data: payload,
    })
    .returning();

  return response.status(201).json({ compliance_report: serializeComplianceReport(report) });
});

router.get('/:id', requireComplianceReportOwnership, async (request, response) => {
  return response.json({ compliance_report: serializeComplianceReport(request.complianceReportRecord!) });
});

router.patch('/:id', requireComplianceReportOwnership, async (request, response) => {
  const payload = compliancePayloadSchema.partial().parse(request.body ?? {});
  const current = request.complianceReportRecord!;

  if (payload.transaction_id) {
    const transaction = await getOwnedTransaction(request.user.id, payload.transaction_id);
    if (!transaction) {
      return response.status(404).json({ error: 'Transaction not found' });
    }
  }

  if (payload.document_id) {
    const [documentRecord] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.id, payload.document_id), eq(documents.ownerId, request.user.id)))
      .limit(1);

    if (!documentRecord) {
      return response.status(404).json({ error: 'Document not found' });
    }
  }

  const [report] = await db
    .update(complianceReports)
    .set({
      transactionId: payload.transaction_id ?? current.transactionId,
      documentId: payload.document_id ?? current.documentId,
      documentName: payload.document_name ?? current.documentName,
      status: payload.status ?? current.status,
      blockersCount: payload.blockers_count ?? current.blockersCount,
      data: {
        ...current.data,
        ...payload,
      },
    })
    .where(and(eq(complianceReports.id, current.id), eq(complianceReports.ownerId, request.user.id)))
    .returning();

  return response.json({ compliance_report: serializeComplianceReport(report) });
});

router.delete('/:id', requireComplianceReportOwnership, async (request, response) => {
  await db.delete(complianceReports).where(and(eq(complianceReports.id, request.complianceReportRecord!.id), eq(complianceReports.ownerId, request.user.id)));
  return response.status(204).send();
});

export default router;