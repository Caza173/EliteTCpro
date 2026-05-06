import type { UserRow } from '../db/schema.js';

declare global {
  namespace Express {
    interface Request {
      user: Pick<UserRow, 'id' | 'email' | 'fullName' | 'isActive' | 'profile'>;
      transaction?: import('../db/schema.js').TransactionRow;
      documentRecord?: import('../db/schema.js').DocumentRow;
      deadlineRecord?: import('../db/schema.js').DeadlineRow;
      transactionTaskRecord?: import('../db/schema.js').TransactionTaskRow;
      checklistItemRecord?: import('../db/schema.js').ChecklistItemRow;
      complianceReportRecord?: import('../db/schema.js').ComplianceReportRow;
      signatureRequestRecord?: import('../db/schema.js').SignatureRequestRow;
      commAutomationRecord?: import('../db/schema.js').CommAutomationRow;
    }
  }
}

export {};