import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight, AlertTriangle, CheckCircle2, FileWarning,
  CalendarDays, TrendingUp, DollarSign, Activity, Clock,
  ChevronRight, MapPin, List,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

import { useCurrentUser, isOwnerOrAdmin } from "../components/auth/useCurrentUser";
import { computeHealthScore } from "../components/utils/tenantUtils";
import AddendumAlertChecker from "../components/dashboard/AddendumAlertChecker";
import TCAnalyticsDashboard from "../components/dashboard/TCAnalyticsDashboard";
import TransactionAlertsPanel from "../components/dashboard/TransactionAlertsPanel";
import AIActivityLogPanel from "../components/dashboard/AIActivityLogPanel";
import DeadlineSummaryPanel from "../components/dashboard/DeadlineSummaryPanel";
import DeadlineCalendarView from "../components/dashboard/DeadlineCalendarView";
import GlobalAIAssistant from "../components/ai/GlobalAIAssistant";
import TasksDueToday from "../components/dashboard/TasksDueToday";
import FinanceDashboardMetrics from "../components/finance/FinanceDashboardMetrics";

const STATUS_STYLES = {
  active:    { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  pending:   { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  closed:    { bg: "bg-slate-100",  text: "text-slate-500",   dot: "bg-slate-400" },
  cancelled: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500" },
};

function StatCard({ label, value, sub, icon: Icon, accent }) {
  const colors = {
    blue:   { bg: "bg-blue-50",   icon: "text-blue-600",   border: "border-blue-100" },
    green:  { bg: "bg-emerald-50",icon: "text-emerald-600",border: "border-emerald-100" },
    amber:  { bg: "bg-amber-50",  icon: "text-amber-600",  border: "border-amber-100" },
    red:    { bg: "bg-red-50",    icon: "text-red-600",    border: "border-red-100" },
  }[accent] || {};

  return (
    <div className="theme-card p-4 flex items-start gap-3 hover:shadow-md transition-shadow">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg} ${colors.border} border`}>
        <Icon className={`w-4 h-4 ${colors.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{label}</p>
        <p className="text-xl font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{sub}</p>}
      </div>
    </div>
  );
}

function TransactionRow({ tx }) {
  const status = STATUS_STYLES[tx.status] || STATUS_STYLES.active;
  const daysToClose = tx.closing_date
    ? differenceInDays(parseISO(tx.closing_date), new Date())
    : null;

  return (
    <Link
      to={`${createPageUrl("TransactionDetail")}?id=${tx.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 group border-b last:border-0"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
        <MapPin className="w-3.5 h-3.5 text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{tx.address}</p>
        <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
          {tx.buyer || tx.buyers?.[0] || "—"} · {tx.agent || "—"}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {daysToClose !== null && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            daysToClose < 7 ? "bg-red-50 text-red-600" :
            daysToClose < 21 ? "bg-amber-50 text-amber-600" :
            "bg-slate-100 text-slate-500"
          }`}>
            {daysToClose < 0 ? "Past" : `${daysToClose}d`}
          </span>
        )}
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {tx.status || "active"}
        </span>
        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: "var(--text-muted)" }} />
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [deadlineView, setDeadlineView] = useState("list");
  const [activeTab, setActiveTab] = useState("overview");
  const { data: currentUser } = useCurrentUser();

  const { data: transactionsRaw = [], isLoading } = useQuery({
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

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", currentUser?.email],
    queryFn: () => base44.entities.InAppNotification.filter({ user_email: currentUser.email }),
    enabled: !!currentUser,
    staleTime: 30_000,
  });

  // Deduplicate by address — keep the oldest record per address
  const transactions = React.useMemo ? 
    React.useMemo(() => {
      const seen = new Map();
      [...(Array.isArray(transactionsRaw) ? transactionsRaw : [])].sort((a, b) => new Date(a.created_date) - new Date(b.created_date)).forEach(tx => {
        if (!seen.has(tx.address)) seen.set(tx.address, tx);
      });
      return Array.from(seen.values());
    }, [transactionsRaw]) : transactionsRaw;

  const active = transactions.filter(t => t.status === "active");
  const pending = transactions.filter(t => t.status === "pending");
  const closed = transactions.filter(t => t.status === "closed");
  const atRiskCount = active.filter(tx => computeHealthScore(tx, checklistItems).risk_level === "at_risk").length;
  const pendingApprovalCount = checklistItems.filter(ci => ci.status === "uploaded").length;
  const missingDocsCount = checklistItems.filter(ci =>
    ci.required && ci.status === "missing" &&
    active.some(tx => tx.id === ci.transaction_id && (tx.phase || 1) >= ci.required_by_phase)
  ).length;

  const totalVolume = transactions
    .filter(t => t.status === "closed" && t.sale_price)
    .reduce((sum, t) => sum + (t.sale_price || 0), 0);

  const closingSoon = active
    .filter(t => t.closing_date)
    .sort((a, b) => new Date(a.closing_date) - new Date(b.closing_date))
    .slice(0, 5);

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto">

      {/* Silent checkers */}
      {!isLoading && <AddendumAlertChecker transactions={transactions} currentUser={currentUser} />}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Overview
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link to={createPageUrl("AgentIntake")}>
          <Button size="sm" style={{ background: "var(--accent)", color: "var(--accent-text)" }}
            className="gap-1.5 shadow-sm hover:opacity-90 transition-opacity">
            + New Transaction
          </Button>
        </Link>
      </div>

      {/* Alert strip */}
      {!isLoading && (atRiskCount > 0 || missingDocsCount > 0 || pendingApprovalCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {atRiskCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium bg-red-50 border-red-200 text-red-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              {atRiskCount} at-risk transaction{atRiskCount > 1 ? "s" : ""}
            </div>
          )}
          {missingDocsCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium bg-amber-50 border-amber-200 text-amber-700">
              <FileWarning className="w-3.5 h-3.5" />
              {missingDocsCount} missing document{missingDocsCount > 1 ? "s" : ""}
            </div>
          )}
          {pendingApprovalCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium bg-blue-50 border-blue-200 text-blue-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {pendingApprovalCount} pending approval{pendingApprovalCount > 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Active" value={active.length} sub={`${pending.length} pending`} icon={Activity} accent="blue" />
          <StatCard label="Closing Soon" value={closingSoon.length} sub="within 30 days" icon={Clock} accent="amber" />
          <StatCard label="Closed" value={closed.length} sub="all time" icon={CheckCircle2} accent="green" />
          <StatCard
            label="Total Volume"
            value={totalVolume > 0 ? `$${(totalVolume / 1_000_000).toFixed(1)}M` : "—"}
            sub="closed deals"
            icon={DollarSign}
            accent="green"
          />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto scrollbar-none" style={{ background: "var(--bg-tertiary)" }}>
        {[
          { id: "overview", label: "Overview" },
          { id: "transactions", label: "Transactions" },
          { id: "tasks", label: "Tasks" },
          { id: "deadlines", label: "Deadlines" },
          { id: "alerts", label: "Alerts" },
          { id: "ai", label: "AI Assistant" },
          ...((currentUser?.role === "owner" || currentUser?.role === "admin") ? [{ id: "analytics", label: "Analytics" }] : []),
          { id: "finance", label: "Finance" },
          { id: "activity", label: "AI Activity" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id ? "bg-white shadow-sm" : "hover:opacity-70"
            }`}
            style={{ color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 space-y-5">
            {!isLoading && (
              <div className="theme-card overflow-hidden">
                <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Tasks Due Today</h3>
                </div>
                <div className="p-4">
                  <TasksDueToday transactions={transactions} notifications={notifications} />
                </div>
              </div>
            )}
            <div className="theme-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Recent Transactions</h3>
                <Link to={createPageUrl("Transactions")} className="flex items-center gap-1 text-xs font-medium hover:opacity-70" style={{ color: "var(--accent)" }}>
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {isLoading ? (
                <div className="space-y-2 p-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 rounded" />)}</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>No transactions yet.</p>
                  <Link to={createPageUrl("AgentIntake")}><Button size="sm" className="mt-3" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>Create your first</Button></Link>
                </div>
              ) : (
                <div>{transactions.slice(0, 8).map(tx => <TransactionRow key={tx.id} tx={tx} />)}</div>
              )}
            </div>
          </div>
          <div className="space-y-5">
            <div className="theme-card overflow-hidden">
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Alerts</h3>
              </div>
              <div className="p-4"><TransactionAlertsPanel /></div>
            </div>
            <div className="theme-card overflow-hidden">
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Upcoming Deadlines</h3>
              </div>
              <div className="p-4">
                {isLoading ? <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded" />)}</div>
                  : <DeadlineSummaryPanel transactions={transactions} compact={true} />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Transactions */}
      {activeTab === "transactions" && (
        <div className="theme-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>All Transactions</h3>
            <Link to={createPageUrl("Transactions")} className="flex items-center gap-1 text-xs font-medium hover:opacity-70" style={{ color: "var(--accent)" }}>
              Full view <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-2 p-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 rounded" />)}</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No transactions yet.</p>
              <Link to={createPageUrl("AgentIntake")}><Button size="sm" className="mt-3" style={{ background: "var(--accent)", color: "var(--accent-text)" }}>Create your first</Button></Link>
            </div>
          ) : (
            <div>{transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)}</div>
          )}
        </div>
      )}

      {/* Tab: Tasks */}
      {activeTab === "tasks" && !isLoading && (
        <div className="theme-card overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Tasks Due Today</h3>
          </div>
          <div className="p-4">
            <TasksDueToday transactions={transactions} notifications={notifications} />
          </div>
        </div>
      )}

      {/* Tab: Deadlines */}
      {activeTab === "deadlines" && (
        <div className="theme-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Deadlines</h3>
            <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: "var(--bg-tertiary)" }}>
              <button onClick={() => setDeadlineView("list")}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${deadlineView === "list" ? "bg-white shadow-sm" : ""}`}
                style={{ color: deadlineView === "list" ? "var(--text-primary)" : "var(--text-muted)" }}>
                <List className="w-3 h-3" /> List
              </button>
              <button onClick={() => setDeadlineView("calendar")}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${deadlineView === "calendar" ? "bg-white shadow-sm" : ""}`}
                style={{ color: deadlineView === "calendar" ? "var(--text-primary)" : "var(--text-muted)" }}>
                <CalendarDays className="w-3 h-3" /> Calendar
              </button>
            </div>
          </div>
          <div className="p-4">
            {isLoading ? <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded" />)}</div>
              : deadlineView === "calendar" ? <DeadlineCalendarView transactions={transactions} />
              : <DeadlineSummaryPanel transactions={transactions} compact={false} />}
          </div>
        </div>
      )}

      {/* Tab: Alerts */}
      {activeTab === "alerts" && (
        <div className="theme-card overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Transaction Alerts</h3>
          </div>
          <div className="p-4"><TransactionAlertsPanel /></div>
        </div>
      )}

      {/* Tab: AI Assistant */}
      {activeTab === "ai" && !isLoading && (
        <GlobalAIAssistant transactions={transactions} checklistItems={checklistItems} />
      )}

      {/* Tab: Analytics (owner/admin only) */}
      {activeTab === "analytics" && !isLoading && (
        <TCAnalyticsDashboard transactions={transactions} />
      )}

      {/* Tab: Finance */}
      {activeTab === "finance" && !isLoading && transactions.length > 0 && (
        <FinanceDashboardMetrics transactions={transactions} />
      )}
      {activeTab === "finance" && !isLoading && transactions.length === 0 && (
        <div className="theme-card p-12 text-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No transaction data available yet.</p>
        </div>
      )}

      {/* Tab: AI Activity */}
      {activeTab === "activity" && (
        <div className="theme-card overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>AI Activity Log</h3>
          </div>
          <div className="p-4"><AIActivityLogPanel /></div>
        </div>
      )}
    </div>
  );
}