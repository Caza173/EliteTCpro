/**
 * Unified Date Utility — EliteTC
 * All deadline comparisons, normalization, and labeling must route through here.
 */
import { startOfDay, differenceInCalendarDays, parseISO, format, isValid } from "date-fns";

/**
 * Returns today as start-of-day (local timezone).
 * Use this everywhere instead of `new Date()` for deadline comparisons.
 */
export function getTodayLocal() {
  return startOfDay(new Date());
}

/**
 * Parse and normalize a deadline string to start-of-day local date.
 * Accepts YYYY-MM-DD strings or Date objects.
 * Returns null if invalid.
 */
export function normalizeDeadline(dateStr) {
  if (!dateStr) return null;
  try {
    // parseISO handles YYYY-MM-DD without timezone shifting
    const parsed = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
    if (!isValid(parsed)) return null;
    return startOfDay(parsed);
  } catch {
    return null;
  }
}

/**
 * Calculate calendar days from today until deadline.
 * Negative = overdue, 0 = today, positive = future.
 */
export function getDaysUntil(dateStr) {
  const deadline = normalizeDeadline(dateStr);
  if (!deadline) return null;
  return differenceInCalendarDays(deadline, getTodayLocal());
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
  const days = deadline !== null ? differenceInCalendarDays(deadline, today) : null;
  console.debug(`[DateDebug] ${label}`, {
    raw: dateStr,
    normalized: deadline ? format(deadline, "yyyy-MM-dd") : null,
    today: format(today, "yyyy-MM-dd"),
    daysUntil: days,
  });
}