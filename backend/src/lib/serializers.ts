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

export function serializeUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    is_active: user.isActive,
    ...user.profile,
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

export function serializeDocument(document: DocumentRow) {
  return {
    id: document.id,
    owner_id: document.ownerId,
    transaction_id: document.transactionId,
    file_name: document.fileName,
    file_url: document.fileUrl,
    doc_type: document.docType,
    ...document.data,
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

export function serializeSignatureRequest(request: SignatureRequestRow) {
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
    signed_document_url: request.signedDocumentUrl,
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