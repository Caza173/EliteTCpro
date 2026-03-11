import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight, AlertTriangle, CheckCircle2, FileWarning, CalendarDays, List, ClipboardList } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

import DashboardStats from "../components/dashboard/DashboardStats";
import TransactionTable from "../components/transactions/TransactionTable";
import DeadlineCalendarView from "../components/dashboard/DeadlineCalendarView";
import DeadlineSummaryPanel from "../components/dashboard/DeadlineSummaryPanel";
import { useCurrentUser, isOwnerOrAdmin } from "../components/auth/useCurrentUser";
import { computeHealthScore, RISK_STYLES } from "../components/utils/tenantUtils";
import AddendumAlertChecker from "../components/dashboard/AddendumAlertChecker";
import TCAnalyticsDashboard from "../components/dashboard/TCAnalyticsDashboard";
import FinanceDashboardMetrics from "../components/finance/FinanceDashboardMetrics";
import DeadlineRiskPanel from "../components/transactions/DeadlineRiskPanel";
import TasksDueToday from "../components/dashboard/TasksDueToday";
import GlobalAIAssistant from "../components/ai/GlobalAIAssistant";

export default function Dashboard() {
  const [deadlineView, setDeadlineView] = useState("list"); // "list" | "calendar"
  const { data: currentUser } = useCurrentUser();
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", currentUser?.email, currentUser?.role],
    queryFn: () => {
      if (isOwnerOrAdmin(currentUser)) return base44.entities.Transaction.list("-created_date");
      return base44.entities.Transaction.filter({ agent_email: currentUser.email }, "-created_date");
    },
    enabled: !!currentUser,
    staleTime: 30_000,
  });

  const { data: checklistItems = [] } = useQuery({
    queryKey: ["allChecklist"],
    queryFn: () => base44.entities.DocumentChecklistItem.list(),
    enabled: !!currentUser,
    staleTime: 30_000,
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

      {/* AI Command Center */}
      {!isLoading && (
        <GlobalAIAssistant transactions={transactions} checklistItems={checklistItems} />
      )}

      {/* Tasks Due Today — top of dashboard */}
      {!isLoading && (
        <Card className="shadow-sm border-amber-100 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-amber-500" /> Tasks Due Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TasksDueToday transactions={transactions} />
          </CardContent>
        </Card>
      )}

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

      {/* 24-hour addendum alert checker — silent, runs once per session */}
      {!isLoading && <AddendumAlertChecker transactions={transactions} currentUser={currentUser} />}



      {/* TC Analytics — owner/admin only */}
      {(currentUser?.role === "owner" || currentUser?.role === "admin") && !isLoading && (
        <TCAnalyticsDashboard transactions={transactions} />
      )}

      {/* Finance Metrics */}
      {!isLoading && transactions.length > 0 && (
        <FinanceDashboardMetrics transactions={transactions} />
      )}

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

        {/* Right column */}
        <div className="space-y-5">
          {/* Deadline Risk Alerts */}
          {!isLoading && (
            <Card className="shadow-sm border-gray-100">
              <CardContent className="pt-4">
                <DeadlineRiskPanel transactions={transactions} checklistItems={checklistItems} />
              </CardContent>
            </Card>
          )}

          {/* Deadlines */}
          <Card className="shadow-sm border-gray-100">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Deadlines</CardTitle>
              <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
                <button
                  onClick={() => setDeadlineView("list")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${deadlineView === "list" ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <List className="w-3 h-3" /> List
                </button>
                <button
                  onClick={() => setDeadlineView("calendar")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${deadlineView === "calendar" ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <CalendarDays className="w-3 h-3" /> Calendar
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 rounded" />
                  ))}
                </div>
              ) : deadlineView === "calendar" ? (
                <DeadlineCalendarView transactions={transactions} />
              ) : (
                <DeadlineSummaryPanel transactions={transactions} compact={true} />
              )}
            </CardContent>
          </Card>


        </div>
      </div>
    </div>
  );
}