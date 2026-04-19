/**
 * Unified Date Utility — EliteTC
 * All deadline comparisons, normalization, and labeling must route through here.
 * Uses America/New_York locale normalization to prevent timezone-shift bugs.
 */
import { format, isValid, parseISO } from "date-fns";

const TZ = "America/New_York";

/**
 * Returns today's date as a YYYY-MM-DD string in America/New_York timezone.
 * Use this everywhere instead of `new Date()` for deadline comparisons.
 */
export function getTodayLocal() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

/**
 * Normalize any date string or Date object to YYYY-MM-DD in America/New_York.
 * Returns null if invalid.
 */
export function normalizeDeadline(dateStr) {
  if (!dateStr) return null;
  try {
    const d = typeof dateStr === "string" ? new Date(dateStr + "T12:00:00") : dateStr;
    if (!isValid(d)) return null;
    return d.toLocaleDateString("en-CA", { timeZone: TZ });
  } catch {
    return null;
  }
}

/**
 * Calculate calendar days from today (NY time) until a deadline date string.
 * Negative = overdue, 0 = today, positive = future.
 */
export function getDaysUntil(dateStr) {
  const deadline = normalizeDeadline(dateStr);
  if (!deadline) return null;
  const today = getTodayLocal();
  const msPerDay = 86400000;
  const diff = (new Date(deadline) - new Date(today)) / msPerDay;
  return Math.round(diff);
}

/**
 * Returns a human-readable urgency label for a deadline.
 */
export function getDeadlineLabel(dateStr) {
  const days = getDaysUntil(dateStr);
  if (days === null) return null;
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due Today";
  if (days === 1) return "Due Tomorrow";
  return `Due in ${days}d`;
}

/**
 * Categorize a deadline for badge/alert purposes.
 * Returns: "overdue" | "today" | "tomorrow" | "soon" | "upcoming" | null
 */
export function categorizeDeadline(dateStr, windowDays = 14) {
  const days = getDaysUntil(dateStr);
  if (days === null) return null;
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 3) return "soon";
  if (days <= windowDays) return "upcoming";
  return null;
}

/**
 * Format a date string to a human-readable display format.
 * e.g. "Mar 30, 2026"
 */
export function formatDeadlineDisplay(dateStr) {
  const d = normalizeDeadline(dateStr);
  if (!d) return "";
  return format(d, "MMM d, yyyy");
}

/**
 * Debug helper — logs normalized deadline info to console.
 * Use during development to trace date issues.
 */
export function debugDeadline(label, dateStr) {
  const today = getTodayLocal();
  const deadline = normalizeDeadline(dateStr);
  const days = deadline !== null ? Math.round((deadline - today) / (1000 * 60 * 60 * 24)) : null;
  console.debug(`[DateDebug] ${label}`, {
    raw: dateStr,
    normalized: deadline ? format(deadline, "yyyy-MM-dd") : null,
    today: format(today, "yyyy-MM-dd"),
    daysUntil: days,
  });
}