/**
 * signatureRequirementEngine.js
 * 
 * Determines which documents require signatures, who must sign,
 * and whether a transaction is blocked by pending signatures.
 * Browser-safe — no Deno dependencies.
 */

// ─── Document Signature Requirements ─────────────────────────────────────────

export const SIGNATURE_REQUIREMENTS = {
  purchase_and_sale: {
    label: "Purchase & Sale Agreement",
    required_roles: ["buyer", "seller", "agent"],
    blocks_phase_progression: true,
    deadline_link: null,
    priority: "critical",
  },
  listing_agreement: {
    label: "Listing Agreement",
    required_roles: ["seller", "agent"],
    blocks_phase_progression: true,
    deadline_link: null,
    priority: "critical",
  },
  addendum: {
    label: "Addendum",
    required_roles: ["buyer", "seller"],
    blocks_phase_progression: false,
    deadline_link: null,
    priority: "high",
  },
  buyer_agency_agreement: {
    label: "Buyer Agency Agreement",
    required_roles: ["buyer", "agent"],
    blocks_phase_progression: true,
    deadline_link: null,
    priority: "high",
  },
  disclosure: {
    label: "Disclosure",
    required_roles: ["buyer", "seller"],
    blocks_phase_progression: false,
    deadline_link: null,
    priority: "medium",
  },
  inspection: {
    label: "Inspection Report",
    required_roles: ["buyer"],
    blocks_phase_progression: false,
    deadline_link: "inspection_deadline",
    priority: "high",
  },
  closing: {
    label: "Closing Document",
    required_roles: ["buyer", "seller"],
    blocks_phase_progression: true,
    deadline_link: "closing_date",
    priority: "critical",
  },
  other: {
    label: "Document",
    required_roles: [],
    blocks_phase_progression: false,
    deadline_link: null,
    priority: "low",
  },
};

// ─── Deadline → Document Type Links ──────────────────────────────────────────

export const DEADLINE_SIGNATURE_LINKS = {
  inspection_deadline: {
    linked_doc_type: "inspection",
    linked_doc_label: "Inspection Addendum",
    alert_hours: [48, 24],
  },
  financing_deadline: {
    linked_doc_type: "addendum",
    linked_doc_label: "Financing Addendum",
    alert_hours: [48, 24],
  },
  appraisal_deadline: {
    linked_doc_type: "addendum",
    linked_doc_label: "Appraisal Addendum",
    alert_hours: [48, 24],
  },
  due_diligence_deadline: {
    linked_doc_type: "addendum",
    linked_doc_label: "Due Diligence Addendum",
    alert_hours: [48, 24],
  },
  closing_date: {
    linked_doc_type: "closing",
    linked_doc_label: "Closing Documents",
    alert_hours: [48, 24],
  },
};

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Get signature requirements for a given doc type + transaction.
 * Returns required roles with min signer counts based on actual party counts.
 */
export function getDocumentRequirements(docType, transaction) {
  const req = SIGNATURE_REQUIREMENTS[docType] || SIGNATURE_REQUIREMENTS.other;

  const buyerCount = transaction?.buyers?.length || (transaction?.buyer ? 1 : 0) || 1;
  const sellerCount = transaction?.sellers?.length || (transaction?.seller ? 1 : 0) || 1;

  const minSignersPerRole = {
    buyer: buyerCount,
    seller: sellerCount,
    agent: 1,
    attorney: 1,
    lender: 1,
    title: 1,
    other: 1,
  };

  return {
    ...req,
    min_signers_per_role: minSignersPerRole,
    total_required: req.required_roles.reduce((sum, role) => sum + (minSignersPerRole[role] || 1), 0),
  };
}

/**
 * Determine if a document requires signatures based on its type.
 */
export function documentRequiresSignature(docType) {
  const req = SIGNATURE_REQUIREMENTS[docType];
  return req && req.required_roles.length > 0;
}

/**
 * Check if a transaction is blocked by pending signatures.
 * Returns { blocked: boolean, blocking_documents: [] }
 */
export function checkTransactionBlocked(documents, signatureRequests) {
  const blockingDocs = [];

  for (const doc of documents) {
    const req = SIGNATURE_REQUIREMENTS[doc.doc_type];
    if (!req || !req.blocks_phase_progression) continue;

    // Check if there's a completed signature request for this document
    const sigRequests = signatureRequests.filter(s => s.document_id === doc.id);
    const hasCompleted = sigRequests.some(s => s.status === "completed");

    if (!hasCompleted && req.required_roles.length > 0) {
      blockingDocs.push({
        document_id: doc.id,
        document_name: doc.file_name,
        doc_type: doc.doc_type,
        required_roles: req.required_roles,
        signature_status: sigRequests[0]?.status || "not_sent",
      });
    }
  }

  return {
    blocked: blockingDocs.length > 0,
    blocking_documents: blockingDocs,
  };
}

/**
 * Calculate signature progress for a request.
 * Returns { completed: number, total: number, percent: number }
 */
export function getSignatureProgress(recipients, requirements) {
  const signed = recipients.filter(r => r.status === "signed").length;
  const total = requirements?.total_required || recipients.length || 1;
  return {
    completed: signed,
    total,
    percent: Math.round((signed / Math.max(total, 1)) * 100),
    label: `${signed} / ${total} Signed`,
  };
}

/**
 * Get "needs_attention" state — any failure conditions.
 */
export function getNeedsAttentionState(sigRequest, recipients) {
  if (sigRequest.status === "declined") {
    const decliner = recipients.find(r => r.status === "declined");
    return {
      needs_attention: true,
      reason: `Declined by ${decliner?.name || "a signer"}`,
      action: "Resend or contact the signer directly",
    };
  }
  if (sigRequest.status === "expired") {
    return {
      needs_attention: true,
      reason: "Signature request has expired",
      action: "Cancel and resend with a new expiration",
    };
  }
  if (sigRequest.status === "error") {
    return {
      needs_attention: true,
      reason: sigRequest.error_message || "An error occurred",
      action: "Review error details and resend",
    };
  }
  const invalidEmailRecipient = recipients.find(r => r.status === "declined" && r.email?.includes("@"));
  if (invalidEmailRecipient) {
    return {
      needs_attention: true,
      reason: `Possible invalid email for ${invalidEmailRecipient.name}`,
      action: "Verify email address and resend",
    };
  }
  return { needs_attention: false };
}

/**
 * Build auto-recipients list from a transaction.
 */
export function buildRecipientsFromTransaction(transaction, docType) {
  const req = SIGNATURE_REQUIREMENTS[docType] || SIGNATURE_REQUIREMENTS.other;
  const recipients = [];
  let order = 1;

  // Buyers
  if (req.required_roles.includes("buyer")) {
    const buyers = transaction.buyers?.length
      ? transaction.buyers.map((name, i) => ({ name, email: i === 0 ? (transaction.client_email || "") : "" }))
      : transaction.buyer
        ? [{ name: transaction.buyer, email: transaction.client_email || "" }]
        : [];

    for (const b of buyers) {
      if (b.name) {
        recipients.push({ name: b.name, email: b.email, role: "buyer", routing_order: order++ });
      }
    }
  }

  // Sellers
  if (req.required_roles.includes("seller")) {
    const sellers = transaction.sellers?.length
      ? transaction.sellers.map(name => ({ name, email: "" }))
      : transaction.seller
        ? [{ name: transaction.seller, email: "" }]
        : [];

    for (const s of sellers) {
      if (s.name) {
        recipients.push({ name: s.name, email: s.email || "", role: "seller", routing_order: order++ });
      }
    }
  }

  // Agent
  if (req.required_roles.includes("agent") && transaction.agent) {
    recipients.push({
      name: transaction.agent,
      email: transaction.agent_email || "",
      role: "agent",
      routing_order: order++,
    });
  }

  return recipients.filter(r => r.name && r.email);
}

/**
 * Check if a deadline has a linked signature requirement that's unmet.
 */
export function getDeadlineSignatureAlert(deadlineKey, documents, signatureRequests) {
  const link = DEADLINE_SIGNATURE_LINKS[deadlineKey];
  if (!link) return null;

  const linkedDoc = documents.find(d => d.doc_type === link.linked_doc_type);
  if (!linkedDoc) return null;

  const sig = signatureRequests.find(s => s.document_id === linkedDoc.id && s.status === "completed");
  if (sig) return null; // already signed

  return {
    deadline_key: deadlineKey,
    linked_doc_type: link.linked_doc_type,
    linked_doc_label: link.linked_doc_label,
    document_id: linkedDoc.id,
    document_name: linkedDoc.file_name,
    message: `Signature required on "${linkedDoc.file_name}" before this deadline`,
  };
}