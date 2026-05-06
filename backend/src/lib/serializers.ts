import type {
  ChecklistItemRow,
  CommAutomationRow,
  ComplianceReportRow,
  DeadlineRow,
  DocumentRow,
  SignatureRequestRow,
  TransactionRow,
  TransactionTaskRow,
  UserRow,
} from '../db/schema.js';
import { generateSignedDownloadUrl, resolveStorageKey } from '../services/storage/index.js';

const userAssetFieldMap = [
  { storageKeyField: 'profile_photo_storage_key', urlField: 'profile_photo_url' },
  { storageKeyField: 'signature_block_storage_key', urlField: 'signature_block_url' },
  { storageKeyField: 'company_logo_storage_key', urlField: 'company_logo_url' },
] as const;

function omitStorageUrlFields(record: Record<string, unknown>, fields: readonly { storageKeyField: string; urlField: string }[]) {
  const next = { ...record };
  for (const field of fields) {
    delete next[field.urlField];
  }
  return next;
}

export async function serializeUser(user: UserRow) {
  const profile = omitStorageUrlFields((user.profile ?? {}) as Record<string, unknown>, userAssetFieldMap);
  const resolvedEntries = await Promise.all(
    userAssetFieldMap.map(async ({ storageKeyField, urlField }) => {
      const storageKey = resolveStorageKey(profile[storageKeyField] ?? null);
      return [storageKeyField, storageKey, urlField, storageKey ? await generateSignedDownloadUrl(storageKey) : null] as const;
    })
  );

  for (const [storageKeyField, storageKey, urlField, signedUrl] of resolvedEntries) {
    if (storageKey) {
      profile[storageKeyField] = storageKey;
      profile[urlField] = signedUrl;
    } else {
      delete profile[storageKeyField];
      profile[urlField] = null;
    }
  }

  return {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    is_active: user.isActive,
    ...profile,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

export function serializeTransaction(transaction: TransactionRow) {
  return {
    id: transaction.id,
    owner_id: transaction.ownerId,
    address: transaction.address,
    status: transaction.status,
    ...transaction.data,
    created_at: transaction.createdAt,
    updated_at: transaction.updatedAt,
  };
}

export async function serializeDocument(document: DocumentRow) {
  const data = (document.data ?? {}) as Record<string, unknown>;
  const mimeType = typeof data.mime_type === 'string'
    ? data.mime_type
    : typeof data.content_type === 'string'
      ? data.content_type
      : null;
  const sizeBytes = typeof data.size_bytes === 'number' ? data.size_bytes : null;
  const storageKey = resolveStorageKey(document.storageKey);
  return {
    id: document.id,
    owner_id: document.ownerId,
    transaction_id: document.transactionId,
    storage_key: storageKey,
    signed_url: storageKey ? await generateSignedDownloadUrl(storageKey) : null,
    original_filename: document.fileName,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    doc_type: document.docType,
    ...data,
    created_at: document.createdAt,
    created_date: document.createdAt,
    updated_at: document.updatedAt,
    updated_date: document.updatedAt,
  };
}

export function serializeDeadline(deadline: DeadlineRow) {
  return {
    id: deadline.id,
    owner_id: deadline.ownerId,
    transaction_id: deadline.transactionId,
    name: deadline.name,
    status: deadline.status,
    due_date: deadline.dueDate,
    ...deadline.data,
    created_at: deadline.createdAt,
    updated_at: deadline.updatedAt,
  };
}

export function serializeTransactionTask(task: TransactionTaskRow) {
  return {
    id: task.id,
    owner_id: task.ownerId,
    transaction_id: task.transactionId,
    phase: task.phase,
    title: task.title,
    order_index: task.orderIndex,
    is_completed: task.isCompleted,
    ...task.data,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

export function serializeChecklistItem(item: ChecklistItemRow) {
  return {
    id: item.id,
    owner_id: item.ownerId,
    transaction_id: item.transactionId,
    uploaded_document_id: item.uploadedDocumentId,
    doc_type: item.docType,
    label: item.label,
    status: item.status,
    required: item.required,
    visible_to_client: item.visibleToClient,
    required_by_phase: item.requiredByPhase,
    ...item.data,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export function serializeComplianceReport(report: ComplianceReportRow) {
  return {
    id: report.id,
    owner_id: report.ownerId,
    transaction_id: report.transactionId,
    document_id: report.documentId,
    document_name: report.documentName,
    blockers_count: report.blockersCount,
    status: report.status,
    ...report.data,
    created_at: report.createdAt,
    created_date: report.createdAt,
    updated_at: report.updatedAt,
    updated_date: report.updatedAt,
  };
}

export async function serializeSignatureRequest(request: SignatureRequestRow) {
  const storageKey = resolveStorageKey(request.signedDocumentStorageKey);
  return {
    id: request.id,
    owner_id: request.ownerId,
    transaction_id: request.transactionId,
    document_id: request.documentId,
    provider: request.provider,
    provider_request_id: request.providerRequestId,
    status: request.status,
    title: request.title,
    subject: request.subject,
    message: request.message,
    sent_at: request.sentAt,
    last_reminder_sent_at: request.lastReminderSentAt,
    completed_at: request.completedAt,
    declined_at: request.declinedAt,
    cancelled_at: request.cancelledAt,
    signed_document_storage_key: storageKey,
    signed_document_signed_url: storageKey ? await generateSignedDownloadUrl(storageKey) : null,
    ...request.data,
    created_at: request.createdAt,
    created_date: request.createdAt,
    updated_at: request.updatedAt,
    updated_date: request.updatedAt,
  };
}

export function serializeCommAutomation(comm: CommAutomationRow) {
  return {
    id: comm.id,
    owner_id: comm.ownerId,
    transaction_id: comm.transactionId,
    template_type: comm.templateType,
    template_status: comm.templateStatus,
    subject: comm.subject,
    generated_content: comm.generatedContent,
    sent_at: comm.sentAt,
    sent_by: comm.sentBy,
    ...comm.data,
    created_at: comm.createdAt,
    updated_at: comm.updatedAt,
  };
}