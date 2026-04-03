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
      const key = `${a.transaction_id}|${a.alert_type}|${a.detail_key || ""}`;
      // Keep the most recent record per key
      if (!existingAlertMap.has(key)) {
        existingAlertMap.set(key, a);
      }
    }

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

      const tasks = tx.tasks || [];
      const overdueTasks = tasks.filter(t =>
        !t.completed && t.due_date && new Date(t.due_date) < today
      );
      const incompleteTasks = tasks.filter(t => !t.completed);

      const txChecklist = checklistItems.filter(ci => ci.transaction_id === txId);
      const txCompliance = complianceIssues.filter(ci => ci.transaction_id === txId);

      // ---- 1. Deadline Monitoring ----
      for (const { field, label } of DEADLINE_FIELDS) {
        if (!tx[field]) continue;
        const deadlineDate = new Date(tx[field]);
        const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0 && field !== "closing_date") {
          // Overdue deadline
          const key = `${txId}|deadline_overdue|${field}`;
          const existing = existingAlertMap.get(key);

          // If dismissed/resolved AND deadline hasn't changed, skip permanently
          if (existing && (existing.status === "dismissed" || existing.status === "resolved")) {
            const deadlineChanged = existing.deadline_value && existing.deadline_value !== tx[field];
            if (!deadlineChanged) continue;
            // Deadline changed (extension) — delete old alert so we can recreate it as active
            await base44.asServiceRole.entities.MonitorAlert.delete(existing.id);
          } else if (existing && existing.status === "open") {
            continue; // already an open alert, no duplicate needed
          }

          alertsToCreate.push({
            transaction_id: txId,
            brokerage_id: txBrokerageId,
            transaction_address: tx.address,
            alert_type: "deadline_overdue",
            priority: "critical",
            detail_key: field,
            deadline_value: tx[field],
            message: `${label} was ${Math.abs(daysLeft)} day(s) ago (${tx[field]}) and may be overdue.`,
            suggested_action: `Confirm ${label} status with all parties immediately.`,
            status: "open",
          });
        } else if (daysLeft >= 0 && daysLeft <= 7) {
          // Approaching deadline
          const key = `${txId}|deadline_approaching|${field}`;
          const existing = existingAlertMap.get(key);

          if (existing && (existing.status === "dismissed" || existing.status === "resolved")) {
            const deadlineChanged = existing.deadline_value && existing.deadline_value !== tx[field];
            if (!deadlineChanged) continue;
            await base44.asServiceRole.entities.MonitorAlert.delete(existing.id);
          } else if (existing && existing.status === "open") {
            continue;
          }

          const priority = daysLeft <= 2 ? "critical" : daysLeft <= 4 ? "warning" : "info";
          alertsToCreate.push({
            transaction_id: txId,
            brokerage_id: txBrokerageId,
            transaction_address: tx.address,
            alert_type: "deadline_approaching",
            priority,
            detail_key: field,
            deadline_value: tx[field],
            message: daysLeft === 0
              ? `${label} is TODAY.`
              : `${label} is approaching in ${daysLeft} day(s) (${tx[field]}).`,
            suggested_action: `Follow up on ${label}.`,
            status: "open",
          });
        }
      }

      // ---- 2. Overdue Tasks ----
      if (overdueTasks.length > 0) {
        const key = `${txId}|tasks_overdue|tasks`;
        const existing = existingAlertMap.get(key);
        if (!existing || existing.status === "open") {
          if (!existing) {
            alertsToCreate.push({
              transaction_id: txId,
              brokerage_id: txBrokerageId,
              transaction_address: tx.address,
              alert_type: "tasks_overdue",
              priority: "warning",
              detail_key: "tasks",
              message: `${overdueTasks.length} task${overdueTasks.length > 1 ? "s are" : " is"} overdue: ${overdueTasks.slice(0, 3).map(t => t.name).join(", ")}${overdueTasks.length > 3 ? "..." : ""}`,
              suggested_action: "Review and complete or reassign overdue tasks.",
              status: "open",
            });
          }
          // If open already, update message in place
          else if (existing.status === "open") {
            await base44.asServiceRole.entities.MonitorAlert.update(existing.id, {
              message: `${overdueTasks.length} task${overdueTasks.length > 1 ? "s are" : " is"} overdue: ${overdueTasks.slice(0, 3).map(t => t.name).join(", ")}${overdueTasks.length > 3 ? "..." : ""}`,
            });
          }
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
        const key = `${txId}|missing_documents|phase_${currentPhase}`;
        const existing = existingAlertMap.get(key);
        if (!existing) {
          alertsToCreate.push({
            transaction_id: txId,
            brokerage_id: txBrokerageId,
            transaction_address: tx.address,
            alert_type: "missing_documents",
            priority: "warning",
            detail_key: `phase_${currentPhase}`,
            message: `${missingRequired.length} required document${missingRequired.length > 1 ? "s are" : " is"} missing for Phase ${currentPhase}: ${docNames}${missingRequired.length > 3 ? "..." : ""}`,
            suggested_action: "Upload or request missing documents.",
            status: "open",
          });
        }
        // dismissed/resolved — do not recreate
      }

      // ---- 4. Compliance Issues (surface, don't duplicate) ----
      const blockers = txCompliance.filter(ci => ci.severity === "blocker");
      if (blockers.length > 0) {
        const key = `${txId}|compliance_blockers|blockers`;
        const existing = existingAlertMap.get(key);
        if (!existing) {
          alertsToCreate.push({
            transaction_id: txId,
            brokerage_id: txBrokerageId,
            transaction_address: tx.address,
            alert_type: "compliance_blockers",
            priority: "critical",
            detail_key: "blockers",
            message: `${blockers.length} compliance blocker${blockers.length > 1 ? "s" : ""}: ${blockers.slice(0, 2).map(b => b.message).join("; ")}`,
            suggested_action: "Review and resolve compliance blockers immediately.",
            status: "open",
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
            const key = `${txId}|closing_risk|closing`;
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
                alert_type: "closing_risk",
                priority: "critical",
                detail_key: "closing",
                deadline_value: tx.closing_date,
                message: daysToClose === 0
                  ? `Closing is TODAY with unresolved issues: ${riskDetails}.`
                  : `Closing in ${daysToClose} day(s) with unresolved issues: ${riskDetails}.`,
                suggested_action: "Resolve all outstanding items before closing.",
                status: "open",
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