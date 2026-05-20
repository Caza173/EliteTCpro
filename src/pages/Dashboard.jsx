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

import { useCurrentUser } from "../components/auth/useCurrentUser";
import { useDealAccess } from "../lib/useDealAccess";
import { computeHealthScore } from "../components/utils/tenantUtils";
import AddendumAlertChecker from "../components/dashboard/AddendumAlertChecker";
import TCAnalyticsDashboard from "../components/dashboard/TCAnalyticsDashboard";
import TransactionAlertsPanel from "../components/dashboard/TransactionAlertsPanel";
import AIActivityLogPanel from "../components/dashboard/AIActivityLogPanel";
import DeadlineSummaryPanel from "../components/dashboard/DeadlineSummaryPanel";
import DeadlineCalendarView from "../components/dashboard/DeadlineCalendarView";

import FinanceDashboardMetrics from "../components/finance/FinanceDashboardMetrics";
import NotesTab from "../components/dashboard/NotesTab";
import GetStartedChecklist from "../components/onboarding/GetStartedChecklist";

const STATUS_STYLES = {
  active:    { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  pending:   { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  closed:    { bg: "bg-slate-100",  text: "text-slate-500",   dot: "bg-slate-400" },
  cancelled: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500" },
};

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="theme-card rounded-xl p-5 flex items-start gap-4 cursor-default">
      <div style={{
        width: 36, height: 36,
        borderRadius: 8,
        border: "1px solid rgba(210,163,95,0.2)",
        background: "rgba(210,163,95,0.08)",
        color: "var(--accent)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon style={{ width: 16, height: 16 }} />
      </div>
      <div className="min-w-0 flex-1">
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          {label}
        </p>
        <p style={{ fontSize: 26, fontWeight: 700, color: "var(--accent)", fontFamily: "'Playfair Display', serif", lineHeight: 1.2, marginTop: 4 }}>
          {value}
        </p>
        {sub && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{sub}</p>}
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
      to={`/transactions/${tx.id}`}
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

  const dealAccess = useDealAccess();
  const transactions = dealAccess?.transactions ?? [];
  const isLoading = dealAccess?.isLoading ?? true;
  const currentUser = dealAccess?.currentUser ?? null;

  const txIds = transactions.map(t => t.id);
  const { data: checklistItems = [] } = useQuery({
    queryKey: ["allChecklist", currentUser?.id],
    queryFn: async () => {
      if (!txIds.length) return [];
      return await base44.entities.DocumentChecklistItem.filter({ created_by: currentUser.id });
    },
    enabled: !!currentUser && transactions.length > 0,
    staleTime: 30_000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["deadlineNotifications", currentUser?.email],
    queryFn: () => base44.entities.InAppNotification.filter({ user_email: currentUser.email, type: "deadline" }),
    enabled: !!currentUser,
    staleTime: 30_000,
  });

  const active = transactions.filter(t => t.status === "active" && t.transaction_phase !== "closed");
  const pending = transactions.filter(t => t.status === "pending");
  const closed = transactions.filter(t => t.status === "closed" || t.transaction_phase === "closed");
  const atRiskCount = active.filter(tx => computeHealthScore(tx, checklistItems).risk_level === "at_risk").length;
  const pendingApprovalCount = checklistItems.filter(ci => ci.status === "uploaded").length;
  const missingDocsCount = checklistItems.filter(ci =>
    ci.required && ci.status === "missing" &&
    active.some(tx => tx.id === ci.transaction_id && (tx.phase || 1) >= ci.required_by_phase)
  ).length;

  const totalVolume = transactions
    .filter(t => t.status === "closed" && t.sale_price)
    .reduce((sum, t) => sum + (t.sale_price || 0), 0);

  const closingSoon = transactions
    .filter(t => {
      if (!t.closing_date) return false;
      if (t.status === "closed" || t.status === "cancelled") return false;
      const days = (new Date(t.closing_date) - new Date()) / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 30;
    })
    .sort((a, b) => new Date(a.closing_date) - new Date(b.closing_date))
    .slice(0, 5);

  return (
    <div className="space-y-6 w-full">

      {!isLoading && <AddendumAlertChecker transactions={transactions} currentUser={currentUser} />}

      {!isLoading && currentUser && !currentUser.onboarding_complete && (
        <GetStartedChecklist user={currentUser} />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Overview
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {!isLoading && (missingDocsCount > 0 || pendingApprovalCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {missingDocsCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
              style={{ background: "rgba(210,163,95,0.08)", border: "1px solid rgba(210,163,95,0.22)", color: "#d2a35f" }}>
              <FileWarning className="w-3.5 h-3.5" />
              {missingDocsCount} missing document{missingDocsCount > 1 ? "s" : ""}
            </div>
          )}
          {pendingApprovalCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#a7adba" }}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              {pendingApprovalCount} pending approval{pendingApprovalCount > 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active" value={active.length} sub={`${pending.length} pending`} icon={Activity} />
          <StatCard label="Closing Soon" value={closingSoon.length} sub="within 30 days" icon={Clock} />
          <StatCard label="Closed" value={closed.length} sub="all time" icon={CheckCircle2} />
          <StatCard
            label="Total Volume"
            value={totalVolume > 0 ? `$${totalVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : "—"}
            sub="closed deals"
            icon={DollarSign}
          />
        </div>
      )}

      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto scrollbar-none theme-card"
        style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
        {[
          { id: "overview", label: "Overview" },
          { id: "finance", label: "Finance" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all"
            style={activeTab === tab.id
              ? { background: "var(--accent-subtle)", color: "var(--accent)", border: "1px solid rgba(210,163,95,0.2)" }
              : { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="theme-card overflow-hidden w-full">
            <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Deadline Calendar</h3>
            </div>
            <div className="p-4">
              {isLoading ? <Skeleton className="h-64 rounded-xl" /> : <DeadlineCalendarView transactions={transactions} />}
            </div>
          </div>

          {!isLoading && (
            <div className="theme-card overflow-hidden w-full">
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Alerts & Tasks</h3>
              </div>
              <div className="p-4 space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase mb-3" style={{ color: "var(--text-muted)" }}>Transaction Alerts</h4>
                  <TransactionAlertsPanel />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "finance" && !isLoading && transactions.length > 0 && (
        <FinanceDashboardMetrics transactions={transactions} />
      )}
      {activeTab === "finance" && !isLoading && transactions.length === 0 && (
        <div className="theme-card p-12 text-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No transaction data available yet.</p>
        </div>
      )}

    </div>
  );
}