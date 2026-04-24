import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Superagent Transaction Monitor
 *
 * Orchestrates existing transaction data to surface actionable alerts.
 * Does NOT duplicate: compliance engine, document parsing, notifications, task management.
 * ONLY reads existing data and writes MonitorAlert records.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Support entity automation payload (transaction update/doc upload) or direct call
    const targetTransactionId = body?.transaction_id || body?.event?.entity_id || null;

    // Auth — service role for scheduled, user auth for direct calls
    let brokerageId = body?.brokerage_id || null;

    const today = new Date();

    // --- Fetch all needed data in parallel ---
    const [transactions, checklistItems, complianceIssues, financeRecords] = await Promise.all([
      targetTransactionId
        ? base44.asServiceRole.entities.Transaction.filter({ id: targetTransactionId })
        : base44.asServiceRole.entities.Transaction.filter({ status: "active" }),
      base44.asServiceRole.entities.DocumentChecklistItem.list(),
      base44.asServiceRole.entities.ComplianceIssue.filter({ status: "open" }),
      base44.asServiceRole.entities.TransactionFinance.list(),
    ]);

    // Filter to active transactions only (skip closed/cancelled)
    const activeTransactions = transactions.filter(tx =>
      tx.status === "active" || tx.status === "pending"
    );

    if (activeTransactions.length === 0) {
      return Response.json({ success: true, alerts_generated: 0, message: "No active transactions to monitor." });
    }

    // --- Fetch existing MonitorAlert records to avoid duplicates ---
    const existingAlerts = await base44.asServiceRole.entities.MonitorAlert.list("-created_date", 500);

    // Build a map of existing alerts by their unique key: "transaction_id|alert_type|detail_key"
    // This map persists dismissed/resolved state permanently — no time window.
    const existingAlertMap = new Map();
    for (const a of existingAlerts) {
      const key = `${a.transaction_id}|${a.deadline_id || ""}`;
      if (!existingAlertMap.has(key)) {
        existingAlertMap.set(key, a);
      }
    }

    // Back-fill deadline_value on old dismissed/resolved alerts that are missing it,
    // so they are not incorrectly recreated on subsequent runs.
    const txMap = new Map(transactions.map(tx => [tx.id, tx]));
    // No backfill needed with new schema

    // ---- Fetch TransactionTasks (separate entity) in one go ----
    const allTransactionTasks = await base44.asServiceRole.entities.TransactionTask.list();

    const alertsToCreate = [];

    for (const tx of activeTransactions) {
      const txId = tx.id;
      const txBrokerageId = tx.brokerage_id || brokerageId;

      const DEADLINE_FIELDS = [
        { field: "earnest_money_deadline", label: "Earnest Money Deposit" },
        { field: "inspection_deadline", label: "Inspection Deadline" },
        { field: "due_diligence_deadline", label: "Due Diligence Deadline" },
        { field: "appraisal_deadline", label: "Appraisal Deadline" },
        { field: "financing_deadline", label: "Financing Commitment Deadline" },
        { field: "closing_date", label: "Closing Date" },
        { field: "ctc_target", label: "Clear to Close Target" },
      ];

      // Combine inline tasks + TransactionTask entity records
      const inlineTasks = tx.tasks || [];
      const entityTasks = allTransactionTasks.filter(t => t.transaction_id === txId);

      // Deadline is "done" if earnest_money_received flag set, or all tasks for that keyword completed
      const DEADLINE_COMPLETION_KEYWORDS = {
        earnest_money_deadline: ["earnest money", "emd", "deposit"],
        inspection_deadline:    ["inspection"],
        due_diligence_deadline: ["due diligence", "contingency"],
        financing_deadline:     ["financing", "loan", "commitment"],
        appraisal_deadline:     ["appraisal"],
      };

      function isDeadlineSatisfied(field) {
        // Special flag on transaction
        if (field === "earnest_money_deadline" && tx.earnest_money_received) return true;
        const keywords = DEADLINE_COMPLETION_KEYWORDS[field];
        if (!keywords) return false;
        // Check entity tasks
        const linked = entityTasks.filter(t =>
          keywords.some(kw => t.title?.toLowerCase().includes(kw))
        );
        if (linked.length > 0 && linked.every(t => t.is_completed)) return true;
        // Check inline tasks
        const linkedInline = inlineTasks.filter(t =>
          keywords.some(kw => t.name?.toLowerCase().includes(kw))
        );
        if (linkedInline.length > 0 && linkedInline.every(t => t.completed)) return true;
        return false;
      }

      // ---- AUTO-RESOLVE stale open alerts ----
      const openAlertsForTx = existingAlerts.filter(a => a.transaction_id === txId && a.alert_state === "active");
      for (const openAlert of openAlertsForTx) {
        let shouldResolve = false;
        const deadlineId = openAlert.deadline_id || "";

        // Deadline-based alerts
        if (DEADLINE_FIELDS.some(d => d.field === deadlineId)) {
          const field = deadlineId;
          if (!tx[field] || isDeadlineSatisfied(field)) {
            shouldResolve = true;
          } else {
            const deadlineDate = new Date(tx[field]);
            const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
            if (daysLeft > 7) shouldResolve = true;
          }
        }

        if (deadlineId === "tasks_overdue") {
          const currentOverdue = [
            ...inlineTasks.filter(t => !t.completed && t.due_date && new Date(t.due_date) < today),
            ...entityTasks.filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < today),
          ];
          if (currentOverdue.length === 0) shouldResolve = true;
        }

        if (deadlineId.startsWith("missing_documents")) {
          const currentPhase = tx.phase || 1;
          const stillMissing = checklistItems.filter(ci =>
            ci.transaction_id === txId && ci.required && ci.status === "missing" && (ci.required_by_phase || 1) <= currentPhase
          );
          if (stillMissing.length === 0) shouldResolve = true;
        }

        if (deadlineId === "compliance_blockers") {
          const txCompliance = complianceIssues.filter(ci => ci.transaction_id === txId);
          if (txCompliance.filter(ci => ci.severity === "blocker").length === 0) shouldResolve = true;
        }

        if (shouldResolve) {
          await base44.asServiceRole.entities.MonitorAlert.update(openAlert.id, {
            alert_state: "resolved",
            resolved_at: new Date().toISOString(),
          });
          existingAlertMap.set(`${openAlert.transaction_id}|${deadlineId}`, { ...openAlert, alert_state: "resolved" });
        }
      }

      const tasks = inlineTasks;
      const overdueTasks = [
        ...inlineTasks.filter(t => !t.completed && t.due_date && new Date(t.due_date) < today),
        ...entityTasks.filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < today),
      ];
      const incompleteTasks = [
        ...inlineTasks.filter(t => !t.completed),
        ...entityTasks.filter(t => !t.is_completed),
      ];

      const txChecklist = checklistItems.filter(ci => ci.transaction_id === txId);
      const txCompliance = complianceIssues.filter(ci => ci.transaction_id === txId);

      // ---- 1. Deadline Monitoring ----
      for (const { field, label } of DEADLINE_FIELDS) {
        if (!tx[field]) continue;
        // Skip if deadline is confirmed done
        if (isDeadlineSatisfied(field)) continue;
        const deadlineDate = new Date(tx[field]);
        const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0 && field !== "closing_date") {
          // Overdue deadline
          const key = `${txId}|${field}`;
          const existing = existingAlertMap.get(key);
          if (existing && existing.alert_state === "active") continue;
          if (existing && (existing.alert_state === "resolved" || existing.alert_state === "dismissed")) {
            const deadlineChanged = existing.deadline_date && existing.deadline_date !== tx[field];
            if (!deadlineChanged) continue;
            await base44.asServiceRole.entities.MonitorAlert.delete(existing.id);
          }

          alertsToCreate.push({
            transaction_id: txId,
            brokerage_id: txBrokerageId,
            transaction_address: tx.address,
            deadline_id: field,
            deadline_label: label,
            deadline_date: tx[field],
            severity: "critical",
            days_remaining: daysLeft,
            alert_state: "active",
            generated_at: new Date().toISOString(),
          });
        } else if (daysLeft >= 0 && daysLeft <= 7) {
          // Approaching deadline
          const key = `${txId}|${field}`;
          const existing = existingAlertMap.get(key);
          if (existing && existing.alert_state === "active") continue;
          if (existing && (existing.alert_state === "resolved" || existing.alert_state === "dismissed")) {
            const deadlineChanged = existing.deadline_date && existing.deadline_date !== tx[field];
            if (!deadlineChanged) continue;
            await base44.asServiceRole.entities.MonitorAlert.delete(existing.id);
          }

          const severity = daysLeft <= 2 ? "critical" : daysLeft <= 4 ? "warning" : "info";
          alertsToCreate.push({
            transaction_id: txId,
            brokerage_id: txBrokerageId,
            transaction_address: tx.address,
            deadline_id: field,
            deadline_label: label,
            deadline_date: tx[field],
            severity,
            days_remaining: daysLeft,
            alert_state: "active",
            generated_at: new Date().toISOString(),
          });
        }
      }

      // ---- 2. Overdue Tasks ----
      if (overdueTasks.length > 0) {
        const key = `${txId}|tasks_overdue`;
        const existing = existingAlertMap.get(key);
        if (!existing || existing.alert_state === "active") {
          if (!existing) {
            alertsToCreate.push({
              transaction_id: txId,
              brokerage_id: txBrokerageId,
              transaction_address: tx.address,
              deadline_id: "tasks_overdue",
              deadline_label: "Overdue Tasks",
              severity: "warning",
              alert_state: "active",
              generated_at: new Date().toISOString(),
            });
          }
          // already active — no update needed
          
        }
        // dismissed/resolved — do not recreate
      }

      // ---- 3. Missing Critical Documents ----
      const currentPhase = tx.phase || 1;
      const missingRequired = txChecklist.filter(ci =>
        ci.required && ci.status === "missing" && (ci.required_by_phase || 1) <= currentPhase
      );
      if (missingRequired.length > 0) {
        const docNames = missingRequired.slice(0, 3).map(ci => ci.label || ci.doc_type).join(", ");
        const key = `${txId}|missing_documents_phase_${currentPhase}`;
        const existing = existingAlertMap.get(key);
        if (!existing) {
          alertsToCreate.push({
            transaction_id: txId,
            brokerage_id: txBrokerageId,
            transaction_address: tx.address,
            deadline_id: `missing_documents_phase_${currentPhase}`,
            deadline_label: `Missing Documents (Phase ${currentPhase})`,
            severity: "warning",
            alert_state: "active",
            generated_at: new Date().toISOString(),
          });
        }
        // dismissed/resolved — do not recreate
      }

      // ---- 4. Compliance Issues (surface, don't duplicate) ----
      const blockers = txCompliance.filter(ci => ci.severity === "blocker");
      if (blockers.length > 0) {
        const key = `${txId}|compliance_blockers`;
        const existing = existingAlertMap.get(key);
        if (!existing) {
          alertsToCreate.push({
            transaction_id: txId,
            brokerage_id: txBrokerageId,
            transaction_address: tx.address,
            deadline_id: "compliance_blockers",
            deadline_label: "Compliance Blockers",
            severity: "critical",
            alert_state: "active",
            generated_at: new Date().toISOString(),
          });
        }
        // dismissed/resolved — do not recreate
      }

      // ---- 5. Closing Risk ----
      if (tx.closing_date) {
        const closingDate = new Date(tx.closing_date);
        const daysToClose = Math.ceil((closingDate - today) / (1000 * 60 * 60 * 24));
        if (daysToClose >= 0 && daysToClose <= 7) {
          const hasOpenIssues = missingRequired.length > 0 || blockers.length > 0 || incompleteTasks.length > 0;
          if (hasOpenIssues) {
            const key = `${txId}|closing_risk`;
            const existing = existingAlertMap.get(key);
            if (!existing) {
              const riskDetails = [
                missingRequired.length > 0 ? `${missingRequired.length} missing docs` : null,
                incompleteTasks.length > 0 ? `${incompleteTasks.length} incomplete tasks` : null,
                blockers.length > 0 ? `${blockers.length} compliance blockers` : null,
              ].filter(Boolean).join(", ");

              alertsToCreate.push({
                transaction_id: txId,
                brokerage_id: txBrokerageId,
                transaction_address: tx.address,
                deadline_id: "closing_risk",
                deadline_label: "Closing Risk",
                deadline_date: tx.closing_date,
                severity: "critical",
                days_remaining: daysToClose,
                alert_state: "active",
                generated_at: new Date().toISOString(),
              });
            }
            // dismissed/resolved — do not recreate
          }
        }
      }
    }

    // --- Batch create alerts ---
    let created = 0;
    for (const alert of alertsToCreate) {
      await base44.asServiceRole.entities.MonitorAlert.create(alert);
      created++;
    }

    return Response.json({
      success: true,
      alerts_generated: created,
      transactions_scanned: activeTransactions.length,
      message: `Scanned ${activeTransactions.length} transaction(s), generated ${created} new alert(s).`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});