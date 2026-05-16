/**
 * useTransactionInsights — React hook
 *
 * The ONLY approved way for UI components to get transaction intelligence.
 * Runs the deterministic engine and returns structured insights.
 *
 * Usage:
 *   const { insights, isLoading } = useTransactionInsights(tx, { tasks, checklist, documents, complianceReports })
 */
import { useMemo } from "react";
import { buildTransactionInsights } from "@/lib/engine/index.js";

export function useTransactionInsights(tx, {
  tasks             = [],
  checklist         = [],
  documents         = [],
  complianceReports = [],
} = {}) {
  const insights = useMemo(() => {
    if (!tx?.id) return null;
    try {
      return buildTransactionInsights(tx, { tasks, checklist, documents, complianceReports });
    } catch (err) {
      console.error("[useTransactionInsights] Engine error:", err.message);
      return null;
    }
  }, [
    tx?.id,
    tx?.status,
    tx?.transaction_phase,
    tx?.phase,
    tx?.closing_date,
    tx?.inspection_deadline,
    tx?.financing_deadline,
    tx?.earnest_money_deadline,
    tx?.appraisal_deadline,
    tx?.due_diligence_deadline,
    tx?.ctc_target,
    tx?.earnest_money_received,
    tx?.inspection_completed,
    tx?.is_cash_transaction,
    tx?.year_built,
    tx?.property_type,
    tx?.transaction_type,
    tx?.contract_date,
    JSON.stringify(tx?.completed_deadlines),
    JSON.stringify(tx?.phases_completed),
    tasks.length,
    checklist.length,
    documents.length,
    complianceReports.length,
  ]);

  return {
    insights,
    isLoading: !tx?.id,
    hasInsights: !!insights,
  };
}