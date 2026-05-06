import type { DocumentRow, SignatureRequestRow, TransactionRow } from '../../db/schema.js';

type ComplianceScanStatus = {
  transaction_id: string;
  status: 'none' | 'pending' | 'in_progress' | 'complete' | 'error';
  processed_docs: number;
  total_docs: number;
  started_at?: string;
  completed_at?: string;
  error?: string;
};

const REQUIRED_COMPANION_DOCS: Record<string, string[]> = {
  purchase_and_sale: ['disclosure'],
  closing: ['title'],
};

const scanStatuses = new Map<string, ComplianceScanStatus>();

function getPartyCount(transaction: TransactionRow, singularKey: string, pluralKey: string) {
  const plural = Array.isArray(transaction.data[pluralKey]) ? (transaction.data[pluralKey] as unknown[]) : [];
  if (plural.length > 0) {
    return plural.length;
  }

  return transaction.data[singularKey] ? 1 : 0;
}

function buildIssue(params: {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'blocker' | 'warning' | 'info';
  description: string;
  action_required?: string;
  impact?: string;
}) {
  return {
    id: `${params.type}:${params.description}`,
    type: params.type,
    severity: params.severity,
    description: params.description,
    action_required: params.action_required ?? null,
    impact: params.impact ?? null,
    confidence: 0.92,
  };
}

export function analyzeDocumentCompliance(params: {
  transaction: TransactionRow;
  documentRecord: DocumentRow;
  allDocuments: DocumentRow[];
  signatureRequests: SignatureRequestRow[];
}) {
  const { transaction, documentRecord, allDocuments, signatureRequests } = params;
  const issues: Array<Record<string, unknown>> = [];
  const blockerIssues: Array<Record<string, unknown>> = [];
  const docType = documentRecord.docType || 'other';

  const completedSignature = signatureRequests.find(
    (request) => request.documentId === documentRecord.id && request.status === 'completed'
  );

  const latestSignatureRequest = signatureRequests.find((request) => request.documentId === documentRecord.id);
  const buyerCount = Math.max(getPartyCount(transaction, 'buyer', 'buyers'), 1);
  const sellerCount = Math.max(getPartyCount(transaction, 'seller', 'sellers'), 1);
  const recipients = Array.isArray(latestSignatureRequest?.data.recipients)
    ? (latestSignatureRequest?.data.recipients as Array<Record<string, unknown>>)
    : [];
  const signedRecipients = recipients.filter((recipient) => recipient.status === 'signed');
  const detectedBuyer = signedRecipients.filter((recipient) => recipient.role === 'buyer').length;
  const detectedSeller = signedRecipients.filter((recipient) => recipient.role === 'seller').length;

  const signatureRequired = ['purchase_and_sale', 'listing_agreement', 'addendum', 'buyer_agency_agreement', 'disclosure', 'inspection', 'closing'].includes(docType);
  if (signatureRequired && !completedSignature) {
    const issue = buildIssue({
      type: 'missing_signature',
      severity: ['purchase_and_sale', 'listing_agreement', 'closing'].includes(docType) ? 'blocker' : 'warning',
      description: `${documentRecord.fileName} still needs a completed signature request.`,
      action_required: latestSignatureRequest ? 'Follow up with signers or complete the request externally.' : 'Send this document for signature.',
      impact: 'Phase progression may stay blocked until the document is fully signed.',
    });
    issues.push(issue);
    if (issue.severity === 'blocker') {
      blockerIssues.push(issue);
    }
  }

  const companionTypes = REQUIRED_COMPANION_DOCS[docType] ?? [];
  const missingDocs = companionTypes.filter(
    (requiredType) => !allDocuments.some((document) => document.docType === requiredType)
  );
  if (missingDocs.length > 0) {
    const issue = buildIssue({
      type: 'missing_document',
      severity: 'warning',
      description: `Companion documents are still missing for ${documentRecord.fileName}.`,
      action_required: `Upload ${missingDocs.join(', ')} to complete the file package.`,
    });
    issues.push(issue);
  }

  const deadlinePairs = [
    ['inspection', 'inspection_deadline', 'Inspection deadline'],
    ['closing', 'closing_date', 'Closing date'],
  ] as const;

  for (const [type, fieldName, label] of deadlinePairs) {
    if (docType !== type) {
      continue;
    }

    const value = transaction.data[fieldName];
    if (!value) {
      issues.push(
        buildIssue({
          type: 'blank_field',
          severity: 'medium',
          description: `${label} is not set on the transaction record.`,
          action_required: `Update ${label.toLowerCase()} before final review.`,
        })
      );
    }
  }

  const blockersCount = issues.filter((issue) => ['critical', 'blocker'].includes(String(issue.severity))).length;
  const score = Math.max(0, 100 - blockersCount * 30 - (issues.length - blockersCount) * 10);
  const status = blockersCount > 0 || issues.length > 0 ? 'needs_attention' : 'compliant';

  return {
    transaction_id: transaction.id,
    document_id: documentRecord.id,
    document_name: documentRecord.fileName,
    document_type: docType,
    status,
    blockers_count: blockersCount,
    summary:
      issues.length === 0
        ? `${documentRecord.fileName} passed the current transaction-scoped compliance checks.`
        : `${issues.length} issue${issues.length === 1 ? '' : 's'} detected for ${documentRecord.fileName}.`,
    compliance_score: score,
    all_issues: issues,
    blockers: blockerIssues,
    warnings: issues.filter((issue) => !['critical', 'blocker'].includes(String(issue.severity))),
    missing_docs: missingDocs,
    extracted_fields: {
      address: transaction.address,
      transaction_status: transaction.status,
      phase: transaction.data.phase ?? null,
    },
    signatures: {
      required_buyers: buyerCount,
      required_sellers: sellerCount,
      detected_buyer: completedSignature ? buyerCount : detectedBuyer || null,
      detected_seller: completedSignature ? sellerCount : detectedSeller || null,
      confirmed_buyers: completedSignature ? ['Completed via signature request'] : [],
      confirmed_sellers: completedSignature ? ['Completed via signature request'] : [],
    },
    has_digital_signature: Boolean(completedSignature),
    digital_signature_platform: completedSignature?.provider ?? null,
    page_count: Number(documentRecord.data.page_count ?? 0),
  };
}

export function setComplianceScanStatus(transactionId: string, status: ComplianceScanStatus) {
  scanStatuses.set(transactionId, status);
}

export function getComplianceScanStatus(transactionId: string): ComplianceScanStatus {
  return (
    scanStatuses.get(transactionId) ?? {
      transaction_id: transactionId,
      status: 'none',
      processed_docs: 0,
      total_docs: 0,
    }
  );
}