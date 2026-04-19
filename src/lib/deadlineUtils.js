import { parseISO } from "date-fns";

/**
 * Evaluates a deadline and returns its status relative to current time.
 * 
 * @param {string|Date|null} deadline - ISO date string or Date object (date-only or with time)
 * @param {boolean} isCompleted - Whether the associated task is completed
 * @param {string} userTimezone - User's timezone (e.g., "America/New_York"), defaults to browser timezone
 * @returns {Object|null} - { status, daysRemaining, isOverdue, isDueSoon } or null if no alert
 */
export function evaluateDeadline(deadline, isCompleted = false, userTimezone = null) {
  // Rule 1: Completed tasks suppress all alerts
  if (isCompleted) return null;

  // Rule 2: Missing deadline = no alert
  if (!deadline) return null;

  // Get user timezone (fallback to Intl.DateTimeFormat)
  const tz = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Parse deadline string to Date
  let deadlineDate;
  try {
    deadlineDate = typeof deadline === "string" ? parseISO(deadline) : deadline;
  } catch {
    return null; // Invalid date format
  }

  // If deadline is date-only (no time component), default to 23:59:59
  const deadlineStr = typeof deadline === "string" ? deadline : deadline.toISOString();
  const isDateOnly = deadlineStr.match(/^\d{4}-\d{2}-\d{2}$/); // Format: YYYY-MM-DD

  if (isDateOnly) {
    // Append 23:59:59
    const dateWithTime = `${deadlineStr}T23:59:59Z`;
    deadlineDate = new Date(dateWithTime);
  }

  // Simple UTC-based comparison (browser handles timezone for display)
  const now = new Date();
  
  // Calculate hours until deadline
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const daysRemaining = Math.round((diffHours / 24) * 100) / 100; // Round to 2 decimals

  // Classify status
  let status;
  if (diffHours < 0) {
    status = "MISSED";
  } else if (diffHours <= 24) {
    status = "DUE_24H";
  } else {
    status = "UPCOMING";
  }

  return {
    status,
    daysRemaining,
    isOverdue: status === "MISSED",
    isDueSoon: status === "DUE_24H",
  };
}

/**
 * Determines if an alert should trigger for a deadline.
 * Alerts only trigger for MISSED and DUE_24H statuses.
 */
export function shouldShowDeadlineAlert(deadline, isCompleted = false, userTimezone = null) {
  const evaluation = evaluateDeadline(deadline, isCompleted, userTimezone);
  if (!evaluation) return false;
  return evaluation.status === "MISSED" || evaluation.status === "DUE_24H";
}

/**
 * Formats deadline status for display.
 */
export function formatDeadlineStatus(evaluation) {
  if (!evaluation) return null;
  const { status, daysRemaining } = evaluation;

  if (status === "MISSED") return "OVERDUE";
  if (status === "DUE_24H") return `Due in ${Math.ceil(daysRemaining * 24)}h`;
  return "On track";
}

/**
 * Gets all deadlines from a transaction that should trigger alerts.
 */
export function getAlertableDeadlines(transaction, userTimezone = null) {
  if (!transaction) return [];

  const deadlineFields = [
    { key: "earnest_money_deadline", label: "Earnest Money" },
    { key: "inspection_deadline", label: "Inspection" },
    { key: "due_diligence_deadline", label: "Due Diligence" },
    { key: "appraisal_deadline", label: "Appraisal" },
    { key: "financing_deadline", label: "Financing" },
    { key: "closing_date", label: "Closing" },
  ];

  return deadlineFields
    .filter(({ key }) => transaction[key])
    .filter(({ key }) => shouldShowDeadlineAlert(transaction[key], false, userTimezone))
    .map(({ key, label }) => ({
      key,
      label,
      deadline: transaction[key],
      evaluation: evaluateDeadline(transaction[key], false, userTimezone),
    }));
}