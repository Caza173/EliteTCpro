import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight, AlertTriangle, CheckCircle2, FileWarning } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import DashboardStats from "../components/dashboard/DashboardStats";
import TransactionTable from "../components/transactions/TransactionTable";
import DeadlinePanel from "../components/transactions/DeadlinePanel";
import DeadlineAlerts from "../components/transactions/DeadlineAlerts";
import { useCurrentUser } from "../components/auth/useCurrentUser";
import { computeHealthScore, RISK_STYLES } from "../components/utils/tenantUtils";

export default function Dashboard() {
  const { data: currentUser } = useCurrentUser();
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-created_date"),
  });

  const { data: checklistItems = [] } = useQuery({
    queryKey: ["allChecklist"],
    queryFn: () => base44.entities.DocumentChecklistItem.list(),
  });

  const activeTransactions = transactions.filter((t) => t.status === "active");
  const atRiskCount = activeTransactions.filter((tx) => {
    const { risk_level } = computeHealthScore(tx, checklistItems);
    return risk_level === "at_risk";
  }).length;
  const missingDocsCount = checklistItems.filter((ci) =>
    ci.required && ci.status === "missing" &&
    activeTransactions.some((tx) => tx.id === ci.transaction_id && (tx.phase || 1) >= ci.required_by_phase)
  ).length;
  const pendingApprovalCount = checklistItems.filter((ci) => ci.status === "uploaded").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your real estate transactions</p>
        </div>
        <Link to={createPageUrl("AddTransaction")}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Transaction
          </Button>
        </Link>
      </div>

      {/* Compliance quick stats */}
      {!isLoading && (atRiskCount > 0 || missingDocsCount > 0 || pendingApprovalCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {atRiskCount > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm text-red-700">{atRiskCount} At-Risk Transaction{atRiskCount > 1 ? "s" : ""}</p>
                <p className="text-xs text-red-400">Health score below 60</p>
              </div>
            </div>
          )}
          {missingDocsCount > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <FileWarning className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm text-amber-700">{missingDocsCount} Missing Required Doc{missingDocsCount > 1 ? "s" : ""}</p>
                <p className="text-xs text-amber-400">Past required phase</p>
              </div>
            </div>
          )}
          {pendingApprovalCount > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm text-blue-700">{pendingApprovalCount} Doc{pendingApprovalCount > 1 ? "s" : ""} Pending Approval</p>
                <p className="text-xs text-blue-400">Awaiting TC review</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      {!isLoading && <DeadlineAlerts transactions={transactions} />}

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <DashboardStats transactions={transactions} />
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card className="xl:col-span-2 shadow-sm border-gray-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
            <Link to={createPageUrl("Transactions")}>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 text-xs">
                View All <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {isLoading ? (
              <div className="space-y-3 px-6 pb-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 rounded" />
                ))}
              </div>
            ) : (
              <TransactionTable transactions={transactions.slice(0, 5)} />
            )}
          </CardContent>
        </Card>

        {/* Deadlines */}
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded" />
                ))}
              </div>
            ) : (
              <DeadlinePanel transactions={transactions} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}