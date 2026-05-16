/**
 * EliteTC Deadline Engine
 * Deterministic deadline evaluation — NO AI involvement.
 * Single source of truth for all deadline state.
 */

import { DEADLINE_FIELDS, CLOSED_STATUSES, TIMEZONE } from "./constants.js";

// ─── Date Utilities ───────────────────────────────────────────────────────────

export function getTodayNY() {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

export function normalizeDateStr(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr + "T12:00:00");
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
  } catch { return null; }
}

export function getDaysUntil(dateStr) {
  const deadline = normalizeDateStr(dateStr);
  if (!deadline) return null;
  const today = getTodayNY();
  return Math.round((new Date(deadline) - new Date(today)) / 86_400_000);
}

// ─── Completion Check ─────────────────────────────────────────────────────────

function isDeadlineCompleted(field, tx) {
  const completedDeadlines = tx.completed_deadlines || [];

  // Direct completion flag on transaction
  if (field.completedKey && tx[field.completedKey]) return true;

  // completed_deadlines array
  if (completedDeadlines.includes(field.key)) return true;

  // Phase-based suppression
  if (field.type === "ctc") {
    const phase = (tx.transaction_phase || "").toLowerCase();
    if (["clear_to_close", "closing", "closed"].includes(phase)) return true;
  }
  if (field.type === "closing") {
    if ((tx.transaction_phase || "").toLowerCase() === "closed") return true;
    if (CLOSED_STATUSES.has((tx.status || "").toLowerCase())) return true;
  }

  return false;
}

// ─── Build Deadline Item ──────────────────────────────────────────────────────

function buildDeadlineItem(field, tx) {
  const dateStr = tx[field.key];
  if (!dateStr) return null;

  const completed = isDeadlineCompleted(field, tx);
  const days = getDaysUntil(dateStr);

  let status = "safe";
  if (completed) {
    status = "completed";
  } else if (days === null) {
    status = "unknown";
  } else if (days < 0) {
    status = "overdue";
  } else if (days === 0) {
    status = "today";
  } else if (days <= field.criticalDays) {
    status = "critical";
  } else if (days <= field.warningDays) {
    status = "warning";
  } else if (days <= 7) {
    status = "upcoming";
  }

  let alertLevel = "none";
  if (!completed) {
    if (status === "overdue" || status === "today" || status === "critical") alertLevel = "critical";
    else if (status === "warning") alertLevel = "warning";
    else if (status === "upcoming") alertLevel = "info";
  }

  return {
    key:        field.key,
    label:      field.label,
    type:       field.type,
    date:       dateStr,
    days,
    status,
    completed,
    alertLevel,
    displayLabel: formatDaysLabel(days, completed),
  };
}

function formatDaysLabel(days, completed) {
  if (completed) return "Completed";
  if (days === null) return "Unknown";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`;
  if (days === 0) return "Due Today";
  if (days === 1) return "Due Tomorrow";
  return `Due in ${days} days`;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Build full deadline state for a transaction.
 * Suppresses all alerts for closed transactions.
 */
export function buildDeadlines(tx) {
  const isClosed = CLOSED_STATUSES.has((tx.status || "").toLowerCase());

  const all = DEADLINE_FIELDS
    .map(f => buildDeadlineItem(f, tx))
    .filter(Boolean);

  // If closed, mark everything completed / suppress alerts
  if (isClosed) {
    return {
      all: all.map(d => ({ ...d, alertLevel: "none", status: d.completed ? "completed" : "closed" })),
      overdueDeadlines: [],
      upcomingDeadlines: [],
      criticalDeadlines: [],
      nextCriticalDeadline: null,
      daysUntilClosing: null,
      isClosingSoon: false,
      isClosed: true,
    };
  }

  const overdueDeadlines  = all.filter(d => !d.completed && d.status === "overdue");
  const criticalDeadlines = all.filter(d => !d.completed && (d.status === "critical" || d.status === "today"));
  const upcomingDeadlines = all.filter(d => !d.completed && ["warning", "upcoming"].includes(d.status));

  const closing = all.find(d => d.type === "closing");
  const daysUntilClosing = closing ? closing.days : null;
  const isClosingSoon = daysUntilClosing !== null && daysUntilClosing >= 0 && daysUntilClosing <= 30;

  // Next critical = soonest non-completed deadline with alert
  const alertable = all
    .filter(d => !d.completed && d.alertLevel !== "none" && d.days !== null && d.days >= 0)
    .sort((a, b) => a.days - b.days);

  return {
    all,
    overdueDeadlines,
    criticalDeadlines,
    upcomingDeadlines,
    nextCriticalDeadline: alertable[0] || null,
    daysUntilClosing,
    isClosingSoon,
    isClosed: false,
  };
}