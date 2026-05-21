/**
 * deadlineEngine — Centralized backend deadline alert engine.
 *
 * Rules (non-negotiable):
 *  - Calendar-day comparisons ONLY (no hours/minutes)
 *  - Timezone: America/New_York
 *  - Alert windows: 7d, 3d, 1d, 0d (today), overdue (< 0)
 *  - One active notification per (transaction_id + deadline_field)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
  CloudWatchLogsClient,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand,
  PutLogEventsCommand,
} from 'npm:@aws-sdk/client-cloudwatch-logs@3.600.0';

const TZ = 'America/New_York';
const LOG_GROUP_DEADLINES = '/elitetc/deadlines';

function genReqId() {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function makeLogger(meta) {
  const buf = [];
  function log(level, message, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'deadlineEngine',
      request_id: meta.request_id,
      transaction_id: meta.transaction_id || null,
      owner_user_id: meta.owner_user_id || null,
      document_id: null,
      message,
      context,
    };
    buf.push(entry);
    const fn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
    fn(`[deadlineEngine][${level}][${meta.request_id}] ${message}`, Object.keys(context).length ? context : '');
  }
  return {
    info:  (m, c) => log('INFO',  m, c),
    warn:  (m, c) => log('WARN',  m, c),
    error: (m, c) => log('ERROR', m, c),
    flush: async () => {
      if (!buf.length) return;
      const creds = { accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'), secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') };
      const cwClient = new CloudWatchLogsClient({ region: Deno.env.get('AWS_REGION') || 'us-east-2', credentials: creds });
      const streamName = `${new Date().toISOString().slice(0,10)}-${meta.request_id}`;
      try {
        try { await cwClient.send(new CreateLogStreamCommand({ logGroupName: LOG_GROUP_DEADLINES, logStreamName: streamName })); } catch (_) {}
        let seqToken;
        try {
          const s = await cwClient.send(new DescribeLogStreamsCommand({ logGroupName: LOG_GROUP_DEADLINES, logStreamNamePrefix: streamName, limit: 1 }));
          seqToken = s.logStreams?.[0]?.uploadSequenceToken;
        } catch (_) {}
        const events = buf.map(e => ({ timestamp: new Date(e.timestamp).getTime(), message: JSON.stringify(e) })).sort((a,b) => a.timestamp - b.timestamp);
        await cwClient.send(new PutLogEventsCommand({ logGroupName: LOG_GROUP_DEADLINES, logStreamName: streamName, logEvents: events, ...(seqToken ? { sequenceToken: seqToken } : {}) }));
      } catch (err) {
        console.warn('[deadlineEngine] CW flush failed:', err.message);
      }
    },
  };
}

// ─── Centralized transaction status helper ──────────────────────────────────
function isTransactionClosed(status) {
  if (!status) return false;
  const normalized = status.trim().toLowerCase();
  return [
    "closed",
    "closed successfully",
    "closed & funded",
    "archived",
    "expired",
    "withdrawn",
    "cancelled",
    "canceled",
    "terminated"
  ].includes(normalized);
}

const DEADLINE_FIELDS = [
  { key: "earnest_money_deadline", label: "Earnest Money Deposit",       type: "earnest_money",  completedKey: "earnest_money_received" },
  { key: "inspection_deadline",    label: "Inspection Deadline",         type: "inspection",     completedKey: "inspection_completed" },
  { key: "due_diligence_deadline", label: "Due Diligence Deadline",      type: "due_diligence" },
  { key: "financing_deadline",     label: "Financing Commitment",        type: "financing" },
  { key: "appraisal_deadline",     label: "Appraisal Deadline",          type: "appraisal" },
  { key: "closing_date",           label: "Closing / Transfer of Title", type: "closing" },
];

// Task title keywords — ANY matching completed task resolves the deadline
const DEADLINE_TASK_KEYWORDS = {
  earnest_money_deadline: ["earnest money received", "emd received", "deposit received"],
  inspection_deadline:    ["inspection completed", "inspection report received", "inspection done"],
  due_diligence_deadline: ["due diligence completed", "due diligence done", "contingency removal"],
  financing_deadline:     ["clear to close", "financing commitment received", "loan commitment", "ctc received"],
  appraisal_deadline:     ["appraisal received", "appraisal completed", "appraisal done"],
  closing_date:           ["closing completed", "closed", "keys delivered", "title transferred"],
};

// ─── Calendar-day helpers ─────────────────────────────────────────────────────

function getTodayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  // Force noon to prevent UTC midnight shifts
  const d = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-CA', { timeZone: TZ });
}

function getDaysUntil(dateStr) {
  const deadline = normalizeDate(dateStr);
  if (!deadline) return null;
  const today = getTodayStr();
  return Math.round((new Date(deadline) - new Date(today)) / 86_400_000);
}

function getSeverity(days) {
  if (days === null) return null;
  if (days < 0 || days === 0) return 'critical';  // overdue or today
  if (days === 1) return 'warning';                // tomorrow
  if (days <= 3) return 'info';                    // 2-3 days
  return null; // > 3 days, no alert
}

function shouldAlert(days) {
  if (days === null) return false;
  // Alert at: 7d, 3d, 1d, 0d, and every day overdue
  return days <= 1 || days === 3 || days === 7;
}

function buildMessage(label, days) {
  if (days < 0) return `${label} — ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
  if (days === 0) return `${label} — Due Today`;
  if (days === 1) return `${label} — Due Tomorrow`;
  return `${label} — Due in ${days} days`;
}

function isDeadlineCompletedByTask(deadlineKey, txTasks = []) {
  const keywords = DEADLINE_TASK_KEYWORDS[deadlineKey];
  if (!keywords) return false;
  const linked = txTasks.filter(t =>
    keywords.some(kw => t.title?.toLowerCase().includes(kw.toLowerCase()))
  );
  return linked.some(t => t.is_completed);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let payload = {};
    try { payload = await req.json(); } catch {}

    const { transaction_id, request_id: incomingReqId } = payload;
    const request_id = incomingReqId || genReqId();
    const log = makeLogger({ request_id, transaction_id });

    let transactions;
    if (transaction_id) {
      const tx = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
      transactions = tx.filter(t => !isTransactionClosed(t.status));
    } else {
      const allTx = await base44.asServiceRole.entities.Transaction.filter({ status: 'active' });
      transactions = allTx.filter(t => !isTransactionClosed(t.status));
    }

    log.info('Evaluating transactions', { count: transactions.length, today: getTodayStr(), request_id });

    let allContingencies = [];
    if (transactions.length > 0) {
      allContingencies = await base44.asServiceRole.entities.Contingency.filter({ is_active: true });
    }

    let totalCreated = 0;
    let totalResolved = 0;

    for (const tx of transactions) {
      const txContingencies = allContingencies.filter(c => c.transaction_id === tx.id);
      const [existingForTx, txTasks] = await Promise.all([
        base44.asServiceRole.entities.InAppNotification.filter({ transaction_id: tx.id }),
        base44.asServiceRole.entities.TransactionTask.filter({ transaction_id: tx.id }),
      ]);

      for (const field of DEADLINE_FIELDS) {
        const originalDate = tx[field.key];
        if (!originalDate) continue;

        // Check if completed via transaction flag
        const completedByFlag = field.completedKey ? !!tx[field.completedKey] : false;
        // Check if completed via task
        const completedByTask = isDeadlineCompletedByTask(field.key, txTasks);
        const isCompleted = completedByFlag || completedByTask;

        // Resolve all active alerts if deadline is completed
        if (isCompleted) {
          const activeNotifs = existingForTx.filter(n => n.deadline_field === field.key && !n.dismissed);
          for (const n of activeNotifs) {
            try {
              await base44.asServiceRole.entities.InAppNotification.update(n.id, {
                dismissed: true,
                dismissed_at: new Date().toISOString(),
              });
              totalResolved++;
            } catch {}
          }
          continue;
        }

        // Check contingency overrides
        const matchingContingency = txContingencies.find(c =>
          c.contingency_type?.toLowerCase().includes(field.type.replace('_', ' ')) ||
          c.sub_type?.toLowerCase().includes(field.type.replace('_', ' '))
        );

        const contingencyStatus = matchingContingency?.status || null;
        if (contingencyStatus === 'Completed' || contingencyStatus === 'Waived') continue;
        if (matchingContingency && matchingContingency.is_active === false) continue;

        // Use contingency due_date if extended
        const effectiveDate = (matchingContingency?.due_date && matchingContingency.due_date !== originalDate)
          ? matchingContingency.due_date
          : originalDate;

        const days = getDaysUntil(effectiveDate);
        const severity = getSeverity(days);
        const needsAlert = shouldAlert(days);

        log.info('Deadline evaluated', { field: field.key, transaction_id: tx.id, days, severity, needs_alert: needsAlert });

        // Resolve existing alerts if no longer within alert window (> 3 days and not 7)
        if (!needsAlert) {
          // Don't delete — just don't create new ones. Existing ones stay until resolved.
          continue;
        }

        // Deduplication — 1 active alert per (tx + field)
        const fieldNotifs = existingForTx.filter(n => n.deadline_field === field.key);

        // Never re-alert if user already dismissed or marked resolved
        const userResolved = fieldNotifs.some(n =>
          n.addendum_status === 'completed' || n.addendum_status === 'not_needed' ||
          n.addendum_response === 'completed' || n.addendum_response === 'not_needed'
        );
        if (userResolved) continue;

        const userDismissed = fieldNotifs.some(n => n.dismissed);
        if (userDismissed) continue;

        const activeNotifs = fieldNotifs.filter(n => !n.dismissed);
        const message = buildMessage(field.label, days);

        // Delete duplicates, update survivor
        if (activeNotifs.length > 1) {
          const [keep, ...dupes] = activeNotifs;
          for (const dupe of dupes) {
            try { await base44.asServiceRole.entities.InAppNotification.delete(dupe.id); } catch {}
          }
          await base44.asServiceRole.entities.InAppNotification.update(keep.id, { title: message, severity });
          continue;
        }

        if (activeNotifs.length === 1) {
          const updates = { title: message };
          if (activeNotifs[0].severity !== severity) updates.severity = severity;
          await base44.asServiceRole.entities.InAppNotification.update(activeNotifs[0].id, updates);
          continue;
        }

        // Create new notification — send to owner, fall back to agent_email
        let ownerEmail = tx.agent_email || null;
        if (tx.created_by) {
          try {
            const ownerResults = await base44.asServiceRole.entities.User.filter({ id: tx.created_by });
            if (ownerResults[0]?.email) ownerEmail = ownerResults[0].email;
          } catch (_) {}
        }
        if (!ownerEmail) continue;

        try {
          await base44.asServiceRole.entities.InAppNotification.create({
            transaction_id: tx.id,
            user_email: ownerEmail,
            title: message,
            body: `${tx.address} — ${field.label} due: ${effectiveDate}`,
            type: 'deadline',
            deadline_field: field.key,
            deadline_type: field.type,
            severity,
            addendum_status: 'suggested',
            addendum_response: 'pending',
            dismissed: false,
          });
          totalCreated++;
          log.info('Created deadline alert', { severity, field: field.key, transaction_id: tx.id, days_away: days });
        } catch (e) {
          log.error('Failed to create notification', { error: e.message, field: field.key, transaction_id: tx.id });
        }
      }
    }

    log.info('Run complete', { notifications_created: totalCreated, notifications_resolved: totalResolved, transactions_evaluated: transactions.length });
    await log.flush();
    return Response.json({
      success: true,
      notifications_created: totalCreated,
      notifications_resolved: totalResolved,
      transactions_evaluated: transactions.length,
      today: getTodayStr(),
    });
  } catch (error) {
    console.error('[deadlineEngine] Fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});