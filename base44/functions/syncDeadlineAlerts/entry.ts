import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALERT_SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
  NONE: 'none',
};

const DO_NOT_ALERT_STATUSES = ['completed', 'waived', 'not_applicable'];

/**
 * Calculate days until deadline in user's timezone
 * Uses simple date comparison (end-of-day = 23:59:59)
 */
function calculateDaysUntilDeadline(deadlineDate, userTimezone = 'UTC') {
  if (!deadlineDate) return null;
  try {
    // Parse deadline as end-of-day (23:59:59)
    const deadline = new Date(deadlineDate + 'T23:59:59');
    
    // Get today at start of day
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate days
    const ms = deadline - today;
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  } catch (e) {
    console.error('calculateDaysUntilDeadline error:', e);
    return null;
  }
}

/**
 * Classify alert severity based on days remaining
 */
function classifyAlertSeverity(daysRemaining) {
  if (daysRemaining === null || daysRemaining === undefined) return ALERT_SEVERITY.NONE;
  if (daysRemaining < 0 || daysRemaining <= 1) return ALERT_SEVERITY.CRITICAL;
  if (daysRemaining <= 2) return ALERT_SEVERITY.WARNING;
  if (daysRemaining <= 7) return ALERT_SEVERITY.INFO;
  return ALERT_SEVERITY.NONE;
}

/**
 * Determine if alert should be generated
 */
function shouldGenerateAlert(deadline) {
  const { status, severity } = deadline;
  if (DO_NOT_ALERT_STATUSES.includes(status)) return false;
  if (severity === ALERT_SEVERITY.NONE) return false;
  return true;
}

/**
 * Evaluate single deadline
 */
function evaluateDeadline(deadline, userTimezone) {
  const { id, date, status = 'active', label } = deadline;
  const daysRemaining = calculateDaysUntilDeadline(date, userTimezone);
  const severity = classifyAlertSeverity(daysRemaining);
  const shouldAlert = shouldGenerateAlert({ status, severity });

  return {
    id,
    date,
    label,
    status,
    daysRemaining,
    severity,
    shouldAlert,
    isOverdue: daysRemaining !== null && daysRemaining < 0,
  };
}

/**
 * Evaluate all deadlines
 */
function evaluateAllDeadlines(transaction, userTimezone = 'UTC') {
  if (!transaction) return [];

  const deadlines = [
    {
      id: 'inspection',
      date: transaction.inspection_deadline,
      label: 'Inspection',
      status: transaction.inspection_completed ? 'completed' : 'active',
    },
    {
      id: 'appraisal',
      date: transaction.appraisal_deadline,
      label: 'Appraisal',
      status: 'active',
    },
    {
      id: 'financing',
      date: transaction.financing_deadline,
      label: 'Financing',
      status: 'active',
    },
    {
      id: 'due_diligence',
      date: transaction.due_diligence_deadline,
      label: 'Due Diligence',
      status: 'active',
    },
    {
      id: 'earnest_money',
      date: transaction.earnest_money_deadline,
      label: 'Earnest Money',
      status: transaction.earnest_money_received ? 'completed' : 'active',
    },
    {
      id: 'ctc',
      date: transaction.ctc_target,
      label: 'Clear to Close',
      status: 'active',
    },
  ].filter(d => d.date);

  return deadlines.map(d => evaluateDeadline(d, userTimezone));
}

/**
 * Filter active alerts
 */
function getActiveAlerts(evaluatedDeadlines = [], dismissedIds = []) {
  return evaluatedDeadlines.filter(d => {
    if (!d.shouldAlert) return false;
    if (dismissedIds.includes(d.id)) return false;
    return true;
  });
}

/**
 * Filter resolved alerts
 */
function getResolvedAlerts(evaluatedDeadlines = []) {
  return evaluatedDeadlines.filter(d => {
    return DO_NOT_ALERT_STATUSES.includes(d.status);
  });
}

/**
 * Deduplicate alerts
 */
function deduplicateAlerts(alerts = []) {
  const seen = new Map();
  return alerts.filter(alert => {
    const key = alert.id;
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { transaction_id, user_timezone = 'America/New_York', include_dismissed = false } = await req.json();

    if (!transaction_id) {
      return Response.json({ error: 'Missing transaction_id' }, { status: 400 });
    }

    // Fetch transaction
    const txs = await base44.entities.Transaction.filter({ id: transaction_id });
    if (!txs || txs.length === 0) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }
    const transaction = txs[0];

    // Evaluate all deadlines
    const evaluatedDeadlines = evaluateAllDeadlines(transaction, user_timezone);

    // Get current alerts
    const existingAlerts = await base44.entities.MonitorAlert.filter({ transaction_id });
    const dismissedIds = existingAlerts.filter(a => a.alert_state === 'dismissed').map(a => a.deadline_id);

    // Get active and resolved
    const activeAlerts = getActiveAlerts(evaluatedDeadlines, include_dismissed ? [] : dismissedIds);
    const resolvedEvaluations = getResolvedAlerts(evaluatedDeadlines);

    // Sync alerts
    let upsertedCount = 0;
    const processed = new Set();

    for (const alert of deduplicateAlerts(activeAlerts)) {
      const key = `${transaction_id}-${alert.id}`;
      processed.add(key);

      const existing = existingAlerts.find(a => a.deadline_id === alert.id && a.alert_state === 'active');

      if (existing) {
        if (existing.days_remaining !== alert.daysRemaining || existing.severity !== alert.severity) {
          await base44.entities.MonitorAlert.update(existing.id, {
            days_remaining: alert.daysRemaining,
            severity: alert.severity,
            deadline_date: alert.date,
            generated_at: new Date().toISOString(),
          });
          upsertedCount++;
        }
      } else {
        await base44.entities.MonitorAlert.create({
          transaction_id,
          brokerage_id: transaction.brokerage_id,
          transaction_address: transaction.address,
          deadline_id: alert.id,
          deadline_label: alert.label,
          deadline_date: alert.date,
          severity: alert.severity,
          days_remaining: alert.daysRemaining,
          alert_state: 'active',
          deadline_state: alert.status,
          generated_at: new Date().toISOString(),
        });
        upsertedCount++;
      }
    }

    // Resolve completed/waived
    for (const resolved of resolvedEvaluations) {
      const key = `${transaction_id}-${resolved.id}`;
      processed.add(key);

      const existing = existingAlerts.find(a => a.deadline_id === resolved.id && a.alert_state !== 'resolved');
      if (existing) {
        await base44.entities.MonitorAlert.update(existing.id, {
          alert_state: 'resolved',
          deadline_state: resolved.status,
          resolved_at: new Date().toISOString(),
        });
      }
    }

    // Clean up removed deadlines
    for (const existing of existingAlerts) {
      const key = `${transaction_id}-${existing.deadline_id}`;
      if (!processed.has(key) && existing.alert_state === 'active') {
        await base44.entities.MonitorAlert.delete(existing.id);
      }
    }

    // Audit
    await base44.entities.AuditLog.create({
      brokerage_id: transaction.brokerage_id,
      transaction_id,
      actor_email: 'system',
      action: 'alerts_synced',
      entity_type: 'alerts',
      entity_id: transaction_id,
      description: `Synced ${upsertedCount} deadline alerts`,
    }).catch(() => {});

    return Response.json({
      success: true,
      transaction_id,
      alerts_upserted: upsertedCount,
      active_alerts: activeAlerts.length,
    });
  } catch (error) {
    console.error('syncDeadlineAlerts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});