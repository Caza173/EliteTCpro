import { and, eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import { db } from '../db/client.js';
import {
  checklistItems,
  commAutomations,
  complianceReports,
  deadlines,
  documents,
  signatureRequests,
  transactions,
  transactionTasks,
} from '../db/schema.js';

export async function getOwnedTransaction(userId: string, transactionId: string) {
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.ownerId, userId)))
    .limit(1);

  return transaction ?? null;
}

export async function requireTransactionOwnership(request: Request, response: Response, next: NextFunction) {
  const { id } = request.params;
  if (typeof id !== 'string') {
    return response.status(400).json({ error: 'Invalid transaction id' });
  }

  const transaction = await getOwnedTransaction(request.user.id, id);

  if (!transaction) {
    return response.status(404).json({ error: 'Transaction not found' });
  }

  request.transaction = transaction;
  return next();
}

export async function requireDocumentOwnership(request: Request, response: Response, next: NextFunction) {
  const { id } = request.params;
  if (typeof id !== 'string') {
    return response.status(400).json({ error: 'Invalid document id' });
  }

  const [documentRecord] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.ownerId, request.user.id)))
    .limit(1);

  if (!documentRecord) {
    return response.status(404).json({ error: 'Document not found' });
  }

  request.documentRecord = documentRecord;
  return next();
}

export async function requireDeadlineOwnership(request: Request, response: Response, next: NextFunction) {
  const { id } = request.params;
  if (typeof id !== 'string') {
    return response.status(400).json({ error: 'Invalid deadline id' });
  }

  const [deadlineRecord] = await db
    .select()
    .from(deadlines)
    .where(and(eq(deadlines.id, id), eq(deadlines.ownerId, request.user.id)))
    .limit(1);

  if (!deadlineRecord) {
    return response.status(404).json({ error: 'Deadline not found' });
  }

  request.deadlineRecord = deadlineRecord;
  return next();
}

export async function requireTransactionTaskOwnership(request: Request, response: Response, next: NextFunction) {
  const { id } = request.params;
  if (typeof id !== 'string') {
    return response.status(400).json({ error: 'Invalid task id' });
  }

  const [taskRecord] = await db
    .select()
    .from(transactionTasks)
    .where(and(eq(transactionTasks.id, id), eq(transactionTasks.ownerId, request.user.id)))
    .limit(1);

  if (!taskRecord) {
    return response.status(404).json({ error: 'Task not found' });
  }

  request.transactionTaskRecord = taskRecord;
  return next();
}

export async function requireChecklistItemOwnership(request: Request, response: Response, next: NextFunction) {
  const { id } = request.params;
  if (typeof id !== 'string') {
    return response.status(400).json({ error: 'Invalid checklist item id' });
  }

  const [checklistItemRecord] = await db
    .select()
    .from(checklistItems)
    .where(and(eq(checklistItems.id, id), eq(checklistItems.ownerId, request.user.id)))
    .limit(1);

  if (!checklistItemRecord) {
    return response.status(404).json({ error: 'Checklist item not found' });
  }

  request.checklistItemRecord = checklistItemRecord;
  return next();
}

export async function requireComplianceReportOwnership(request: Request, response: Response, next: NextFunction) {
  const { id } = request.params;
  if (typeof id !== 'string') {
    return response.status(400).json({ error: 'Invalid compliance report id' });
  }

  const [complianceReportRecord] = await db
    .select()
    .from(complianceReports)
    .where(and(eq(complianceReports.id, id), eq(complianceReports.ownerId, request.user.id)))
    .limit(1);

  if (!complianceReportRecord) {
    return response.status(404).json({ error: 'Compliance report not found' });
  }

  request.complianceReportRecord = complianceReportRecord;
  return next();
}

export async function requireCommAutomationOwnership(request: Request, response: Response, next: NextFunction) {
  const { id } = request.params;
  if (typeof id !== 'string') {
    return response.status(400).json({ error: 'Invalid communication id' });
  }

  const [commAutomationRecord] = await db
    .select()
    .from(commAutomations)
    .where(and(eq(commAutomations.id, id), eq(commAutomations.ownerId, request.user.id)))
    .limit(1);

  if (!commAutomationRecord) {
    return response.status(404).json({ error: 'Communication not found' });
  }

  request.commAutomationRecord = commAutomationRecord;
  return next();
}

export async function requireSignatureRequestOwnership(request: Request, response: Response, next: NextFunction) {
  const { id } = request.params;
  if (typeof id !== 'string') {
    return response.status(400).json({ error: 'Invalid signature request id' });
  }

  const [signatureRequestRecord] = await db
    .select()
    .from(signatureRequests)
    .where(and(eq(signatureRequests.id, id), eq(signatureRequests.ownerId, request.user.id)))
    .limit(1);

  if (!signatureRequestRecord) {
    return response.status(404).json({ error: 'Signature request not found' });
  }

  request.signatureRequestRecord = signatureRequestRecord;
  return next();
}