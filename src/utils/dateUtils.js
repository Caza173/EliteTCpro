/**
 * CENTRAL DEADLINE ENGINE — EliteTC
 * Single source of truth for ALL deadline logic.
 *
 * Rules (non-negotiable):
 *  - All deadlines are date-based, NEVER time-based
 *  - System timezone: America/New_York (hardcoded)
 *  - ONLY compare using calendar days
 *  - Store deadlines as YYYY-MM-DD in DB, normalize only in app layer
 */
import { format, isValid } from "date-fns";

const TZ = "America/New_York";

// ─── Core primitives ─────────────────────────────────────────────────────────

/**
 * Returns today's date as YYYY-MM-DD string in America/New_York.
 */
export function getTodayLocal() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

/**
 * Normalize any date input to YYYY-MM-DD string in America/New_York.
 * Returns null if invalid.
 */
export function normalizeDeadline(dateStr) {
  if (!dateStr) return null;
  try {
    // Force noon to avoid any UTC-midnight shift before normalization
    const d = typeof dateStr === "string" ? new Date(dateStr + "T12:00:00") : new Date(dateStr);
    if (!isValid(d)) return null;
    return d.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
  } catch {
    return null;
  }
}

/**
 * Calculate calendar days from today (NY time) until a deadline.
 * Returns: negative = overdue, 0 = today, positive = future.
 * Returns null if date is invalid.
 */
export function getDaysUntil(dateStr) {
  const deadline = normalizeDeadline(dateStr);
  if (!deadline) return null;
  const today = getTodayLocal();
  const msPerDay = 86_400_000;
  return Math.round((new Date(deadline) - new Date(today)) / msPerDay);
}

// ─── Classification ───────────────────────────────────────────────────────────

/**
 * Classify deadline status.
 * Returns: "overdue" | "today" | "tomorrow" | "soon" | "upcoming" | "safe" | null
 */
export function getDeadlineStatus(dateStr) {
  const days = getDaysUntil(dateStr);
  if (days === null) return null;
  if (days < 0)  return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 3)  return "soon";
  if (days <= 7)  return "upcoming";
  return "safe";
}

/**
 * Get alert severity level for a deadline.
 * Returns: "critical" | "warning" | "info" | "none"
 */
export function getAlertLevel(dateStr) {
  const days = getDaysUntil(dateStr);
  if (days === null) return "none";
  if (days < 0 || days === 0) return "critical";
  if (days === 1)              return "warning";
  if (days <= 3)               return "info";
  return "none";
}

/**
 * Human-readable label for a deadline.
 * Test cases:
 *   today+1 → "Due Tomorrow" (Warning)
 *   today   → "Due Today" (Critical)
 *   today-1 → "1 day overdue" (Critical)
 */
export function getDeadlineLabel(dateStr) {
  const days = getDaysUntil(dateStr);
  if (days === null) return null;
  if (days < 0)  return `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`;
  if (days === 0) return "Due Today";
  if (days === 1) return "Due Tomorrow";
  return `Due in ${days} days`;
}

// ─── Email trigger logic ──────────────────────────────────────────────────────

/**
 * Returns true when a reminder email should fire.
 * Triggers at: 7d, 3d, 1d, 0d (today), and every day overdue.
 */
export function shouldSendReminder(dateStr) {
  const days = getDaysUntil(dateStr);
  if (days === null) return false;
  return days === 7 || days === 3 || days === 1 || days === 0 || days < 0;
}

// ─── Legacy aliases (for backwards compat with existing imports) ──────────────

/**
 * @deprecated Use getDeadlineStatus()
 */
export function categorizeDeadline(dateStr) {
  return getDeadlineStatus(dateStr);
}

/**
 * Format a deadline date for display: "Apr 21, 2026"
 */
export function formatDeadlineDisplay(dateStr) {
  const d = normalizeDeadline(dateStr);
  if (!d) return "";
  try { return format(new Date(d + "T12:00:00"), "MMM d, yyyy"); } catch { return d; }
}

// ─── Transaction-level evaluation ────────────────────────────────────────────

const ALERTABLE_DEADLINE_FIELDS = [
  { key: "inspection_deadline",    label: "Inspection",          type: "inspection",    completedKey: "inspection_completed" },
  { key: "appraisal_deadline",     label: "Appraisal",           type: "appraisal" },
  { key: "financing_deadline",     label: "Financing",           type: "financing" },
  { key: "due_diligence_deadline", label: "Due Diligence",       type: "due_diligence" },
  { key: "earnest_money_deadline", label: "Earnest Money",       type: "earnest_money", completedKey: "earnest_money_received" },
  { key: "closing_date",           label: "Closing",             type: "closing" },
];

/**
 * Evaluate all alertable deadlines for a transaction.
 * Used by TransactionDetail, dashboard, and backend engine.
 */
export function getAlertableDeadlines(transaction = {}) {
  if (!transaction) return [];
  return ALERTABLE_DEADLINE_FIELDS
    .filter(f => transaction[f.key])
    .map(f => {
      const isCompleted = f.completedKey ? !!transaction[f.completedKey] : false;
      const days = getDaysUntil(transaction[f.key]);
      return {
        label: f.label,
        type: f.type,
        date: transaction[f.key],
        isCompleted,
        evaluation: {
          isOverdue: !isCompleted && days !== null && days < 0,
          isDueSoon: !isCompleted && days !== null && days >= 0 && days <= 1,
          daysRemaining: days,
          alertLevel: isCompleted ? "none" : getAlertLevel(transaction[f.key]),
          status: isCompleted ? "completed" : getDeadlineStatus(transaction[f.key]),
          label: isCompleted ? "Completed" : getDeadlineLabel(transaction[f.key]),
        },
      };
    });
}

/**
 * Full deadline evaluation object (used by legacy deadlineUtils callers).
 */
export function evaluateDeadline(deadline = {}) {
  const { date, completed, waived } = deadline;
  if (!date) return { state: "none", isOverdue: false, isDueSoon: false, daysRemaining: null };
  if (waived) return { state: "waived", isOverdue: false, isDueSoon: false, daysRemaining: null };
  if (completed) return { state: "completed", isOverdue: false, isDueSoon: false, daysRemaining: null };

  const days = getDaysUntil(date);
  const status = getDeadlineStatus(date);
  const alertLevel = getAlertLevel(date);

  return {
    state: status,
    alertLevel,
    isOverdue: days !== null && days < 0,
    isDueSoon: days !== null && days >= 0 && days <= 1,
    daysRemaining: days,
    label: getDeadlineLabel(date),
    // Legacy fields
    shouldAlert: alertLevel !== "none",
    suggestAddendum: alertLevel === "critical" || alertLevel === "warning",
  };
}