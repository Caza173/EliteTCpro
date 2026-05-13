/**
 * SINGLE SOURCE OF TRUTH for closed transaction status.
 * 
 * Closed transactions should NOT generate:
 * - Compliance warnings, alerts, or issues
 * - Deadline alerts or reminders
 * - Missing document warnings
 * - SMS/email notifications
 * - "Deals needing attention" flags
 * - At-risk status updates
 * 
 * Allowed: Historical viewing, audit trails, read-only access, financial reports
 * 
 * @param {string} status - The transaction status
 * @returns {boolean} True if the transaction is closed
 */
export function isTransactionClosed(status) {
  if (!status) return false;
  
  const normalized = status.trim().toLowerCase();
  
  return [
    "closed",
    "closed successfully",
    "closed & funded",
    "archived"
  ].includes(normalized);
}

/**
 * Determines if a transaction is active and should be evaluated for compliance.
 * @param {string} status - The transaction status
 * @returns {boolean} True if the transaction is active
 */
export function isTransactionActive(status) {
  return !isTransactionClosed(status);
}