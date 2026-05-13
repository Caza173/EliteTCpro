/**
 * EliteTC — Centralized Notification Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * The single entry point for all automated notification processing.
 * 
 * Flow:
 *   1. Load all active transactions
 *   2. Evaluate deadlines via deadline thresholds
 *   3. Evaluate compliance issues (open blockers)
 *   4. Deduplicate against existing InAppNotification records
 *   5. Create internal InAppNotification records
 *   6. Publish SNS alerts for new notifications
 *   7. Write AuditLog entries
 *
 * Runs hourly via scheduled automation.
 * Can also be triggered manually by admin.
 *
 * DUPLICATE SUPPRESSION:
 *   - One active InAppNotification per (transaction_id + deadline_field)
 *   - SNS published only when a NEW notification is created (not updates)
 *   - Severity upgrades update existing notification without re-publishing SNS
 *
 * THRESHOLDS (calendar-day based, America/New_York):
 *   notice   → 72h (3 days)
 *   warning  → 48h (2 days)
 *   critical → 24h (1 day or same day)
 *   overdue  → past deadline
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { SNSClient, PublishCommand } from 'npm:@aws-sdk/client-sns@3';

const TZ = 'America/New_York';

// ─── Centralized transaction status helper ──────────────────────────────────
function isTransactionClosed(status) {
  if (!status) return false;
  const normalized = status.trim().toLowerCase();
  return ["closed", "closed successfully", "closed & funded", "archived"].includes(normalized);
}

// ─── Deadline definitions ─────────────────────────────────────────────────────

const DEADLINE_FIELDS = [
  { key: 'earnest_money_deadline',    label: 'Earnest Money Deposit',       type: 'earnest_money',  completedKey: 'earnest_money_received' },
  { key: 'inspection_deadline',       label: 'Home Inspection',             type: 'inspection',     completedKey: 'inspection_completed' },
  { key: 'due_diligence_deadline',    label: 'Due Diligence',               type: 'due_diligence' },
  { key: 'financing_deadline',        label: 'Financing Contingency',       type: 'financing' },
  { key: 'appraisal_deadline',        label: 'Appraisal',                   type: 'appraisal' },
  { key: 'closing_date',              label: 'Closing Date',                type: 'closing' },
  { key: 'agreement_expiration_deadline', label: 'Agreement Expiration',    type: 'agreement_expiration' },
  { key: 'ctc_target',                label: 'Clear to Close Target',       type: 'ctc' },
];

const DEADLINE_TASK_KEYWORDS = {
  earnest_money_deadline: ['earnest money received', 'emd received', 'deposit received'],
  inspection_deadline:    ['inspection completed', 'inspection report received', 'inspection done'],
  due_diligence_deadline: ['due diligence completed', 'due diligence done', 'contingency removal'],
  financing_deadline:     ['clear to close', 'financing commitment received', 'loan commitment', 'ctc received'],
  appraisal_deadline:     ['appraisal received', 'appraisal completed', 'appraisal done'],
  closing_date:           ['closing completed', 'closed', 'keys delivered', 'title transferred'],
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getTodayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-CA', { timeZone: TZ });
}

function getDaysUntil(dateStr) {
  const deadline = normalizeDate(dateStr);
  if (!deadline) return null;
  const today = getTodayStr();
  return Math.round((new Date(deadline) - new Date(today)) / 86_400_000);
}

// ─── Severity logic (matches 72h/48h/24h/overdue spec) ───────────────────────

function getSeverity(days) {
  if (days === null) return null;
  if (days < 0)  return 'critical';  // overdue
  if (days === 0) return 'critical'; // today
  if (days === 1) return 'critical'; // 24h
  if (days === 2) return 'warning';  // 48h
  if (days === 3) return 'notice';   // 72h
  if (days === 7) return 'notice';   // 7-day heads-up
  return null; // no alert outside these windows
}

function shouldAlert(days) {
  if (days === null) return false;
  return days < 0 || days === 0 || days === 1 || days === 2 || days === 3 || days === 7;
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
  return txTasks
    .filter(t => keywords.some(kw => t.title?.toLowerCase().includes(kw.toLowerCase())))
    .some(t => t.is_completed);
}

// ─── SNS helpers ──────────────────────────────────────────────────────────────

function createSNSClient() {
  const required = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'SNS_TOPIC_ARN'];
  const missing = required.filter(k => !Deno.env.get(k));
  if (missing.length > 0) {
    console.warn(`[notificationEngine] SNS disabled — missing env: ${missing.join(', ')}`);
    return null;
  }
  return new SNSClient({
    region: Deno.env.get('AWS_REGION'),
    credentials: {
      accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
    },
  });
}

async function publishSNS(snsClient, subject, payload) {
  if (!snsClient) return { success: false, error: 'SNS not configured' };
  try {
    const cmd = new PublishCommand({
      TopicArn: Deno.env.get('SNS_TOPIC_ARN'),
      Subject: subject.slice(0, 100),
      Message: JSON.stringify({ ...payload, _publishedAt: new Date().toISOString() }),
    });
    const result = await snsClient.send(cmd);
    console.log(`[notificationEngine] SNS published: ${subject} → MessageId: ${result.MessageId}`);
    return { success: true, messageId: result.MessageId };
  } catch (err) {
    console.error(`[notificationEngine] SNS publish failed:`, err.message);
    return { success: false, error: err.message };
  }
}

async function publishDeadlineAlert(snsClient, payload) {
  const subject = `EliteTC Deadline Alert — ${payload.deadlineType} [${payload.severity}]`;
  return publishSNS(snsClient, subject, { alertType: 'deadline', ...payload });
}

async function publishComplianceAlert(snsClient, payload) {
  const subject = `EliteTC Compliance Alert — ${payload.issueType} [${payload.severity}]`;
  return publishSNS(snsClient, subject, { alertType: 'compliance', ...payload });
}

// ─── Audit log helper ─────────────────────────────────────────────────────────

async function writeAuditLog(base44, brokerageId, transactionId, description, meta = {}) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      brokerage_id: brokerageId,
      transaction_id: transactionId,
      actor_email: 'system:notificationEngine',
      action: 'notification_sent',
      entity_type: 'transaction',
      entity_id: transactionId,
      description,
      after: meta,
    });
  } catch (e) {
    console.warn('[notificationEngine] AuditLog write failed:', e.message);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled (no user) or admin-triggered
    let user = null;
    try { user = await base44.auth.me(); } catch {}
    if (user && !['admin', 'owner'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let payload = {};
    try { payload = await req.json(); } catch {}
    const { transaction_id: filterTxId, dry_run = false } = payload;

    const snsClient = createSNSClient();
    const today = getTodayStr();

    console.log(`[notificationEngine] Starting run — today: ${today}, dry_run: ${dry_run}`);

    // Load transactions — exclude closed/cancelled deals
    let allTx;
    if (filterTxId) {
      allTx = await base44.asServiceRole.entities.Transaction.filter({ id: filterTxId });
    } else {
      allTx = await base44.asServiceRole.entities.Transaction.filter({});
    }
    
    // SINGLE SOURCE OF TRUTH: closed transactions do not generate notifications
    const transactions = allTx.filter(tx => !isTransactionClosed(tx.status));
    console.log(`[notificationEngine] Evaluating ${transactions.length} transaction(s)`);

    if (transactions.length === 0) {
      return Response.json({ success: true, message: 'No active transactions', today });
    }

    // Bulk-load contingencies once
    const allContingencies = await base44.asServiceRole.entities.Contingency.filter({ is_active: true }).catch(() => []);

    let stats = {
      transactions_evaluated: transactions.length,
      notifications_created: 0,
      notifications_updated: 0,
      sns_published: 0,
      sns_failed: 0,
      compliance_alerts: 0,
      today,
    };

    for (const tx of transactions) {
      if (!tx.brokerage_id) continue;

      // Load per-transaction data in parallel
      const [existingNotifs, txTasks, complianceIssues] = await Promise.all([
        base44.asServiceRole.entities.InAppNotification.filter({ transaction_id: tx.id }),
        base44.asServiceRole.entities.TransactionTask.filter({ transaction_id: tx.id }),
        base44.asServiceRole.entities.ComplianceIssue.filter({ transaction_id: tx.id, status: 'open' }).catch(() => []),
      ]);

      const txContingencies = allContingencies.filter(c => c.transaction_id === tx.id);

      // ── 1. DEADLINE EVALUATION ─────────────────────────────────────────────

      for (const field of DEADLINE_FIELDS) {
        const originalDate = tx[field.key];
        if (!originalDate) continue;

        // Skip if completed
        const completedByFlag = field.completedKey ? !!tx[field.completedKey] : false;
        const completedByTask = isDeadlineCompletedByTask(field.key, txTasks);
        if (completedByFlag || completedByTask) {
          // Resolve any active notifications for this deadline
          const active = existingNotifs.filter(n => n.deadline_field === field.key && !n.dismissed);
          for (const n of active) {
            if (!dry_run) {
              await base44.asServiceRole.entities.InAppNotification.update(n.id, {
                dismissed: true,
                dismissed_at: new Date().toISOString(),
              }).catch(() => {});
            }
          }
          continue;
        }

        // Check contingency status
        const contingency = txContingencies.find(c =>
          c.contingency_type?.toLowerCase().includes(field.type.replace(/_/g, ' ')) ||
          c.sub_type?.toLowerCase().includes(field.type.replace(/_/g, ' '))
        );
        if (contingency?.status === 'Completed' || contingency?.status === 'Waived') continue;
        if (contingency && contingency.is_active === false) continue;

        // Use extended date if contingency has one
        const effectiveDate = (contingency?.due_date && contingency.due_date !== originalDate)
          ? contingency.due_date
          : originalDate;

        const days = getDaysUntil(effectiveDate);
        const severity = getSeverity(days);
        const needsAlert = shouldAlert(days);

        if (!needsAlert || !severity) continue;

        const message = buildMessage(field.label, days);
        const fieldNotifs = existingNotifs.filter(n => n.deadline_field === field.key);

        // Skip if user already resolved or dismissed
        const userResolved = fieldNotifs.some(n =>
          n.addendum_response === 'completed' || n.addendum_response === 'not_needed' ||
          n.addendum_status === 'completed' || n.addendum_status === 'not_needed'
        );
        if (userResolved) continue;
        const userDismissed = fieldNotifs.some(n => n.dismissed);
        if (userDismissed) continue;

        const activeNotifs = fieldNotifs.filter(n => !n.dismissed);
        const recipient = tx.agent_email;
        if (!recipient) continue;

        if (activeNotifs.length >= 1) {
          // Update existing — severity may have escalated
          const existing = activeNotifs[0];
          const needsUpdate = existing.severity !== severity || existing.title !== message;
          if (needsUpdate && !dry_run) {
            await base44.asServiceRole.entities.InAppNotification.update(existing.id, { title: message, severity }).catch(() => {});
            stats.notifications_updated++;
          }
          // Clean up dupes
          for (const dupe of activeNotifs.slice(1)) {
            if (!dry_run) await base44.asServiceRole.entities.InAppNotification.delete(dupe.id).catch(() => {});
          }
          continue;
        }

        // Create NEW notification
        if (!dry_run) {
          try {
            const notif = await base44.asServiceRole.entities.InAppNotification.create({
              brokerage_id: tx.brokerage_id,
              transaction_id: tx.id,
              user_email: recipient,
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
            stats.notifications_created++;

            // Publish SNS for new notification
            const snsResult = await publishDeadlineAlert(snsClient, {
              notificationId: notif.id,
              transactionId: tx.id,
              propertyAddress: tx.address,
              deadlineType: field.type,
              deadlineLabel: field.label,
              dueDate: effectiveDate,
              daysUntil: days,
              severity,
              assignedUser: recipient,
              createdAt: new Date().toISOString(),
            });

            if (snsResult.success) stats.sns_published++;
            else stats.sns_failed++;

            await writeAuditLog(base44, tx.brokerage_id, tx.id,
              `Deadline alert: ${message} (${severity})`,
              { deadline_type: field.type, days_until: days, severity, sns_message_id: snsResult.messageId || null }
            );

            console.log(`[notificationEngine] Created ${severity} alert: ${field.key} on tx ${tx.id} (${days}d away)`);
          } catch (e) {
            console.error(`[notificationEngine] Failed to create notification for ${field.key} on ${tx.id}:`, e.message);
          }
        }
      }

      // ── 2. COMPLIANCE ALERT EVALUATION ────────────────────────────────────

      const criticalIssues = complianceIssues.filter(i =>
        i.severity === 'critical' || i.severity === 'blocker'
      );

      if (criticalIssues.length > 0) {
        // Check if we already have a compliance notification for this transaction today
        const todayStr = getTodayStr();
        const existingComplianceNotif = existingNotifs.find(n =>
          n.type === 'compliance' && !n.dismissed &&
          n.created_date && new Date(n.created_date).toLocaleDateString('en-CA', { timeZone: TZ }) === todayStr
        );

        if (!existingComplianceNotif && !dry_run) {
          const issuesSummary = criticalIssues.slice(0, 3).map(i => i.message).join('; ');
          const recipient = tx.agent_email;
          if (recipient) {
            try {
              const notif = await base44.asServiceRole.entities.InAppNotification.create({
                brokerage_id: tx.brokerage_id,
                transaction_id: tx.id,
                user_email: recipient,
                title: `Compliance Alert — ${criticalIssues.length} blocker${criticalIssues.length !== 1 ? 's' : ''} require attention`,
                body: `${tx.address}: ${issuesSummary}`,
                type: 'document',
                severity: 'critical',
                dismissed: false,
              });
              stats.compliance_alerts++;

              const snsResult = await publishComplianceAlert(snsClient, {
                notificationId: notif.id,
                transactionId: tx.id,
                propertyAddress: tx.address,
                issueType: 'compliance_blockers',
                issueCount: criticalIssues.length,
                severity: 'critical',
                summary: issuesSummary,
                assignedUser: recipient,
                createdAt: new Date().toISOString(),
              });

              if (snsResult.success) stats.sns_published++;
              else stats.sns_failed++;

              await writeAuditLog(base44, tx.brokerage_id, tx.id,
                `Compliance blockers detected: ${criticalIssues.length} issue(s)`,
                { issue_count: criticalIssues.length, sns_message_id: snsResult.messageId || null }
              );
            } catch (e) {
              console.error(`[notificationEngine] Compliance alert failed for tx ${tx.id}:`, e.message);
            }
          }
        }
      }
    }

    console.log(`[notificationEngine] Run complete:`, JSON.stringify(stats));
    return Response.json({ success: true, ...stats });

  } catch (error) {
    console.error('[notificationEngine] Fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});