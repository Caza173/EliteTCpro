/**
 * lib/deadlineUtils.js
 *
 * Thin re-export layer. All logic lives in utils/dateUtils.js.
 * Import from here OR from utils/dateUtils — both work.
 */
export {
  getTodayLocal,
  normalizeDeadline,
  getDaysUntil,
  getDeadlineStatus,
  getAlertLevel,
  getDeadlineLabel,
  shouldSendReminder,
  categorizeDeadline,
  formatDeadlineDisplay,
  getAlertableDeadlines,
  evaluateDeadline,
} from "@/utils/dateUtils";

// ─── Legacy named exports that some files import from here ────────────────────

export { evaluateDeadline as evaluateTransactionDeadline } from "@/utils/dateUtils";

/**
 * @deprecated Import evaluateDeadline from utils/dateUtils instead.
 * Kept for backward compat with TransactionDetail and other callers.
 */
export { getAlertableDeadlines as getAlertableDeadlines2 } from "@/utils/dateUtils";