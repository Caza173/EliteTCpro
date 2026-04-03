import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DeadlinePanel from "../components/transactions/DeadlinePanel";
import DeadlineAlerts from "../components/transactions/DeadlineAlerts";
import { useCurrentUser, isOwnerOrAdmin } from "../components/auth/useCurrentUser";

const DEADLINE_TASK_KEYWORDS = {
  earnest_money_deadline: ["earnest money", "deposit received", "emd"],
  inspection_deadline:    ["inspection scheduled", "inspection completed", "inspection report", "inspection"],
  due_diligence_deadline: ["due diligence", "contingency removal", "review contingency"],
  appraisal_deadline:     ["appraisal", "appraisal ordered", "appraisal received"],
  financing_deadline:     ["financing", "loan commitment", "mortgage commitment", "clear to close"],
  closing_date:           ["closing", "transfer of title"],
};

export default function Deadlines() {
  const { data: currentUser } = useCurrentUser();

  const { data: rawTransactions = [], isLoading } = useQuery({
    queryKey: ["transactions", currentUser?.email, currentUser?.role],
    queryFn: () => {
      if (!currentUser) return [];
      if (isOwnerOrAdmin(currentUser)) return base44.entities.Transaction.list("-created_date");
      return base44.entities.Transaction.filter({ agent_email: currentUser.email }, "-created_date");
    },
    enabled: !!currentUser,
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ["allTransactionTasks"],
    queryFn: () => base44.entities.TransactionTask.list(),
    enabled: !!currentUser,
    staleTime: 60_000,
  });

  // Build a map of tasksByTransactionId for quick lookup
  const tasksByTxId = useMemo(() => {
    const map = new Map();
    allTasks.forEach(t => {
      if (!map.has(t.transaction_id)) map.set(t.transaction_id, []);
      map.get(t.transaction_id).push(t);
    });
    return map;
  }, [allTasks]);

  // Returns true if deadline is resolved by completed tasks
  const isDeadlineResolvedByTasks = (txId, deadlineKey, tx) => {
    if (deadlineKey === "earnest_money_deadline" && tx.earnest_money_received) return true;
    const keywords = DEADLINE_TASK_KEYWORDS[deadlineKey] || [];
    if (keywords.length === 0) return false;
    const tasks = tasksByTxId.get(txId) || [];
    const linked = tasks.filter(t => keywords.some(kw => t.title?.toLowerCase().includes(kw.toLowerCase())));
    if (linked.length === 0) return false;
    return linked.every(t => t.is_completed);
  };

  const transactions = useMemo(() => {
    const seen = new Map();
    [...rawTransactions].sort((a, b) => new Date(a.created_date) - new Date(b.created_date)).forEach(tx => {
      if (!seen.has(tx.address)) seen.set(tx.address, tx);
    });
    return Array.from(seen.values());
  }, [rawTransactions]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Upcoming Deadlines</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Track inspection, appraisal, and closing deadlines across all active transactions.
        </p>
      </div>

      {/* Alerts */}
      {!isLoading && <DeadlineAlerts transactions={transactions} isDeadlineResolved={isDeadlineResolvedByTasks} />}

      <Card className="shadow-sm border-gray-100">
        <CardHeader>
          <CardTitle className="text-base font-semibold">All Deadlines</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded" />
              ))}
            </div>
          ) : (
            <DeadlinePanel transactions={transactions} isDeadlineResolved={isDeadlineResolvedByTasks} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}