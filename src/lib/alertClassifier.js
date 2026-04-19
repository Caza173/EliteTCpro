/**
 * Standardized Alert Classification Engine
 * 
 * Classifies all deadline alerts based on:
 * - Days until deadline (timezone-aware)
 * - Deadline status (completed, waived, active)
 * - Event type (deadline vs scheduled event)
 * - Alert state (active, resolved, dismissed)
 */

import { formatISO, parseISO, differenceInDays, endOfDay } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALERT_SEVERITY = {
  CRITICAL: 'critical',   // Overdue or ≤1 day
  WARNING: 'warning',     // ≤2 days
  INFO: 'info',           // ≤7 days
  NONE: 'none',           // >7 days (no alert)
};

const ALERT_STATE = {
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
};

const EVENT_TYPE = {
  DEADLINE: 'deadline',     // Requires action, triggers alerts
  SCHEDULED: 'scheduled',   // FYI only, no alerts
};

const DO_NOT_ALERT_STATUSES = ['completed', 'waived', 'not_applicable'];

// ─── Timezone-aware date calculation ────────────────────────────────────────

/**
 * Calculate days until deadline, accounting for user's timezone
 * Treats deadline as end-of-day (23:59:59) in user's timezone
 * 
 * @param {string} deadlineDate - ISO date string (YYYY-MM-DD)
 * @param {string} userTimezone - IANA timezone (e.g., "America/New_York")
 * @returns {number} Days until deadline (negative if overdue)
 */
export function calculateDaysUntilDeadline(deadlineDate, userTimezone = 'UTC') {
  if (!deadlineDate) return null;

  try {
    // Parse the deadline date and set to end-of-day in user's timezone
    const deadlineZoned = utcToZonedTime(
      endOfDay(parseISO(deadlineDate)),
      userTimezone
    );

    // Get current time in user's timezone
    const now = utcToZonedTime(new Date(), userTimezone);

    // Calculate days (negative = overdue)
    return differenceInDays(deadlineZoned, now);
  } catch (e) {
    console.error('calculateDaysUntilDeadline error:', e);
    return null;
  }
}

// ─── Alert Classification ────────────────────────────────────────────────────

/**
 * Classify deadline alert based on days remaining
 * 
 * @param {number} daysRemaining
 * @returns {string} One of CRITICAL, WARNING, INFO, NONE
 */
export function classifyAlertSeverity(daysRemaining) {
  if (daysRemaining === null || daysRemaining === undefined) {
    return ALERT_SEVERITY.NONE;
  }

  if (daysRemaining < 0 || daysRemaining <= 1) return ALERT_SEVERITY.CRITICAL;
  if (daysRemaining <= 2) return ALERT_SEVERITY.WARNING;
  if (daysRemaining <= 7) return ALERT_SEVERITY.INFO;
  return ALERT_SEVERITY.NONE;
}

/**
 * Determine if an alert should be generated for this deadline
 * 
 * @param {object} deadline - { status, severity, type }
 * @returns {boolean}
 */
export function shouldGenerateAlert(deadline) {
  const { status, severity, type } = deadline;

  // Never alert for inactive deadlines
  if (DO_NOT_ALERT_STATUSES.includes(status)) {
    return false;
  }

  // Only deadline types generate alerts, not scheduled events
  if (type !== EVENT_TYPE.DEADLINE) {
    return false;
  }

  // Never alert if no severity (too far in future)
  if (severity === ALERT_SEVERITY.NONE) {
    return false;
  }

  return true;
}

// ─── Unified Deadline Evaluation ────────────────────────────────────────────

/**
 * Comprehensive deadline evaluation with alert classification
 * 
 * @param {object} deadline
 * @param {string} userTimezone
 * @returns {object} Evaluated deadline with alert classification
 */
export function evaluateDeadlineForAlerts(deadline, userTimezone = 'UTC') {
  const {
    id,
    type = EVENT_TYPE.DEADLINE,
    date,
    status = 'active',
    label,
  } = deadline;

  // Calculate days remaining in user's timezone
  const daysRemaining = calculateDaysUntilDeadline(date, userTimezone);

  // Classify severity
  const severity = classifyAlertSeverity(daysRemaining);

  // Determine if alert should exist
  const shouldAlert = shouldGenerateAlert({
    status,
    severity,
    type,
  });

  return {
    id,
    type,
    date,
    label,
    status,
    daysRemaining,
    severity,
    shouldAlert,
    isOverdue: daysRemaining !== null && daysRemaining < 0,
    isDueSoon: severity === ALERT_SEVERITY.CRITICAL || severity === ALERT_SEVERITY.WARNING,
  };
}

/**
 * Evaluate all deadlines for a transaction
 * 
 * @param {object} transaction
 * @param {string} userTimezone
 * @returns {array} Evaluated deadlines
 */
export function evaluateAllDeadlines(transaction, userTimezone = 'UTC') {
  if (!transaction) return [];

  const deadlines = [
    {
      id: 'inspection',
      type: EVENT_TYPE.DEADLINE,
      date: transaction.inspection_deadline,
      label: 'Inspection',
      status: transaction.inspection_completed ? 'completed' : 'active',
    },
    {
      id: 'appraisal',
      type: EVENT_TYPE.DEADLINE,
      date: transaction.appraisal_deadline,
      label: 'Appraisal',
      status: 'active',
    },
    {
      id: 'financing',
      type: EVENT_TYPE.DEADLINE,
      date: transaction.financing_deadline,
      label: 'Financing',
      status: 'active',
    },
    {
      id: 'due_diligence',
      type: EVENT_TYPE.DEADLINE,
      date: transaction.due_diligence_deadline,
      label: 'Due Diligence',
      status: 'active',
    },
    {
      id: 'earnest_money',
      type: EVENT_TYPE.DEADLINE,
      date: transaction.earnest_money_deadline,
      label: 'Earnest Money',
      status: transaction.earnest_money_received ? 'completed' : 'active',
    },
    {
      id: 'ctc',
      type: EVENT_TYPE.DEADLINE,
      date: transaction.ctc_target,
      label: 'Clear to Close',
      status: 'active',
    },
    // Scheduled events (no alerts, info only)
    {
      id: 'closing',
      type: EVENT_TYPE.SCHEDULED,
      date: transaction.closing_date,
      label: 'Closing',
      status: 'active',
    },
    {
      id: 'inspection_scheduled',
      type: EVENT_TYPE.SCHEDULED,
      date: transaction.inspection_scheduled,
      label: 'Inspection Scheduled',
      status: transaction.inspection_completed ? 'completed' : 'active',
    },
  ].filter(d => d.date); // Only include deadlines with dates

  return deadlines.map(d => evaluateDeadlineForAlerts(d, userTimezone));
}

// ─── Active vs Resolved/Dismissed ──────────────────────────────────────────

/**
 * Filter active alerts from all evaluated deadlines
 * 
 * @param {array} evaluatedDeadlines
 * @param {array} dismissedAlertIds - IDs of user-dismissed alerts
 * @returns {array} Active alerts only
 */
export function getActiveAlerts(evaluatedDeadlines = [], dismissedAlertIds = []) {
  return evaluatedDeadlines.filter(d => {
    if (!d.shouldAlert) return false;
    if (dismissedAlertIds.includes(d.id)) return false;
    return true;
  });
}

/**
 * Filter resolved alerts (completed/waived deadlines)
 * 
 * @param {array} evaluatedDeadlines
 * @returns {array} Resolved alerts
 */
export function getResolvedAlerts(evaluatedDeadlines = []) {
  return evaluatedDeadlines.filter(d => {
    return DO_NOT_ALERT_STATUSES.includes(d.status);
  });
}

/**
 * Filter dismissed alerts (user explicitly hidden)
 * 
 * @param {array} evaluatedDeadlines
 * @param {array} dismissedAlertIds
 * @returns {array} Dismissed alerts
 */
export function getDismissedAlerts(evaluatedDeadlines = [], dismissedAlertIds = []) {
  return evaluatedDeadlines.filter(d => {
    return d.shouldAlert && dismissedAlertIds.includes(d.id);
  });
}

// ─── Deduplication ────────────────────────────────────────────────────────

/**
 * Ensure no duplicate alerts per deadline per transaction
 * 
 * @param {array} alerts
 * @returns {array} Deduplicated alerts
 */
export function deduplicateAlerts(alerts = []) {
  const seen = new Map();
  return alerts.filter(alert => {
    const key = `${alert.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.set(key, true);
    return true;
  });
}

// ─── Summary/Metrics ────────────────────────────────────────────────────

/**
 * Generate alert summary for UI display
 * 
 * @param {array} activeAlerts
 * @returns {object} Summary metrics
 */
export function getAlertSummary(activeAlerts = []) {
  const critical = activeAlerts.filter(a => a.severity === ALERT_SEVERITY.CRITICAL).length;
  const warning = activeAlerts.filter(a => a.severity === ALERT_SEVERITY.WARNING).length;
  const info = activeAlerts.filter(a => a.severity === ALERT_SEVERITY.INFO).length;

  return {
    total: activeAlerts.length,
    critical,
    warning,
    info,
    hasCritical: critical > 0,
    hasWarning: warning > 0,
  };
}