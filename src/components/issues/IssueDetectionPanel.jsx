/**
 * IssueDetectionPanel
 * Displays alerts and issues sourced 100% from the Transaction Intelligence Engine.
 * NO direct transaction logic — all computed by buildTransactionInsights().
 */
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, ShieldX, Clock, ClipboardList,
  Mail, CheckCircle2, X, FileText, Zap,
} from "lucide-react";
import { buildTransactionInsights } from "@/lib/engine/index.js";
import EmailGeneratorModal from "@/components/compliance/EmailGeneratorModal";
import DocumentViewerModal from "@/components/transactions/DocumentViewerModal";

const TYPE_ICONS = {
  compliance_issue:    <ShieldX className="w-4 h-4 text-red-500" />,
  deadline_warning:    <Clock className="w-4 h-4 text-amber-400" />,
  deadline_critical:   <AlertTriangle className="w-4 h-4 text-red-500" />,
  workflow_incomplete: <ClipboardList className="w-4 h-4" style={{ color: "#d2a35f" }} />,
  risk_alert:          <Zap className="w-4 h-4 text-red-500" />,
};

const TYPE_LABELS = {
  compliance_issue:    "Compliance",
  deadline_warning:    "Deadline Warning",
  deadline_critical:   "Deadline Critical",
  workflow_incomplete: "Workflow",
  risk_alert:          "Risk Alert",
};

function adaptAlertForEmail(alert, transaction) {
  return {
    message: alert.message,
    category: alert.type,
    severity: alert.severity,
    suggested_email_subject: null,
    suggested_email_body: null,
  };
}

function AlertRow({ alert, transaction, currentUser, onDismiss, documents }) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc]         = useState(false);

  const matchedDoc = alert.documentRef
    ? documents.find(d => d.file_name?.toLowerCase().includes(alert.documentRef.toLowerCase()))
    : null;

  const isDocIssue = alert.type === "compliance_issue" && !!matchedDoc;

  return (
    <>
      {emailModalOpen && (
        <EmailGeneratorModal
          issue={adaptAlertForEmail(alert, transaction)}
          transaction={transaction}
          currentUser={currentUser}
          onClose={() => setEmailModalOpen(false)}
        />
      )}
      {viewingDoc && matchedDoc && (
        <DocumentViewerModal doc={matchedDoc} onClose={() => setViewingDoc(false)} />
      )}

      <div
        className="flex items-start gap-3 p-3 rounded-xl border transition-colors elite-card"
      >
        <div className="mt-0.5 flex-shrink-0">
          {TYPE_ICONS[alert.type] || <AlertTriangle className="w-4 h-4 text-red-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge
              className="text-xs border"
              style={
                alert.severity === "high"
                  ? { background: "rgba(239,68,68,0.12)", color: "#ef4444", borderColor: "rgba(239,68,68,0.25)" }
                  : alert.severity === "medium"
                    ? { background: "rgba(210,163,95,0.12)", color: "#d2a35f", borderColor: "rgba(210,163,95,0.25)" }
                    : { background: "rgba(29,140,255,0.1)", color: "#1d8cff", borderColor: "rgba(29,140,255,0.22)" }
              }
            >
              {TYPE_LABELS[alert.type] || alert.type}
            </Badge>
            <Badge
              variant="outline"
              className="text-xs capitalize opacity-70"
              style={{ borderColor: "rgba(255,255,255,0.15)", color: "var(--text-secondary, #a7adba)" }}
            >
              {alert.severity}
            </Badge>
          </div>
          <p className="text-sm" style={{ color: "var(--text-primary, #f7f3ea)" }}>{alert.message}</p>
          {alert.deadline && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted, #6f7683)" }}>
              Date: {new Date(alert.deadline).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
          )}
          {alert.source && (
            <p className="text-[10px] mt-0.5 font-mono" style={{ color: "rgba(210,163,95,0.5)" }}>
              source: {alert.source}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isDocIssue && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewingDoc(true)}
              className="h-8 text-xs gap-1.5"
              style={{ borderColor: "rgba(168,85,247,0.35)", color: "#a855f7", background: "rgba(168,85,247,0.08)" }}
            >
              <FileText className="w-3.5 h-3.5" />
              View Doc
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEmailModalOpen(true)}
            className="h-8 text-xs gap-1.5"
            style={{ borderColor: "rgba(210,163,95,0.35)", color: "#d2a35f", background: "rgba(210,163,95,0.08)" }}
          >
            <Mail className="w-3.5 h-3.5" />
            Email
          </Button>
          <button
            onClick={() => onDismiss(alert.id)}
            className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-muted, #6f7683)" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#f7f3ea"; e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted, #6f7683)"; e.currentTarget.style.background = ""; }}
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

const FILTER_TABS = [
  { id: "all",              label: "All" },
  { id: "compliance_issue", label: "Compliance" },
  { id: "deadline_critical",label: "Critical Deadlines" },
  { id: "deadline_warning", label: "Warnings" },
  { id: "workflow_incomplete", label: "Workflow" },
];

export default function IssueDetectionPanel({ transaction, currentUser }) {
  const [filter,    setFilter]    = useState("all");
  const [autoSend,  setAutoSend]  = useState(false);

  const storageKey = `dismissed_alerts_${transaction.id}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(storageKey) || "[]")); }
    catch { return new Set(); }
  });

  // ── Fetch supporting data ────────────────────────────────────────────────
  const { data: checklist = [],         isLoading: l1 } = useQuery({
    queryKey: ["checklist", transaction.id],
    queryFn:  () => base44.entities.DocumentChecklistItem.filter({ transaction_id: transaction.id }),
    enabled:  !!transaction.id,
    staleTime: 30_000,
  });
  const { data: complianceReports = [], isLoading: l2 } = useQuery({
    queryKey: ["compliance-reports", transaction.id],
    queryFn:  () => base44.entities.ComplianceReport.filter({ transaction_id: transaction.id }, "-created_date"),
    enabled:  !!transaction.id,
    staleTime: 30_000,
  });
  const { data: tasks = [],             isLoading: l3 } = useQuery({
    queryKey: ["txTasks", transaction.id],
    queryFn:  () => base44.entities.TransactionTask.filter({ transaction_id: transaction.id }),
    enabled:  !!transaction.id,
    staleTime: 30_000,
  });
  const { data: documents = [] } = useQuery({
    queryKey: ["tx-documents", transaction.id],
    queryFn:  () => base44.entities.Document.filter({ transaction_id: transaction.id }, "-created_date"),
    enabled:  !!transaction.id,
    staleTime: 30_000,
  });

  const isLoading = l1 || l2 || l3;

  // ── Engine call ──────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (!transaction?.id) return null;
    try {
      return buildTransactionInsights(transaction, { tasks, checklist, documents, complianceReports });
    } catch (err) {
      console.error("[IssueDetectionPanel] Engine error:", err.message);
      return null;
    }
  }, [
    transaction?.id, transaction?.status, transaction?.transaction_phase,
    transaction?.closing_date, transaction?.inspection_deadline, transaction?.financing_deadline,
    transaction?.earnest_money_deadline, transaction?.is_cash_transaction, transaction?.transaction_type,
    tasks.length, checklist.length, documents.length, complianceReports.length,
  ]);

  const allAlerts    = insights?.alerts || [];
  const visible      = allAlerts.filter(a => !dismissed.has(a.id));
  const filtered     = filter === "all" ? visible : visible.filter(a => a.type === filter);

  const highCount   = visible.filter(a => a.severity === "high").length;
  const mediumCount = visible.filter(a => a.severity === "medium").length;

  const dismiss = (id) => setDismissed(prev => {
    const next = new Set([...prev, id]);
    try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
    return next;
  });

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-4">

      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {highCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full badge-danger">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {highCount} Critical
            </span>
          )}
          {mediumCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full badge-gold">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#d2a35f" }} />
              {mediumCount} Warning
            </span>
          )}
          {visible.length === 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full badge-success">
              <CheckCircle2 className="w-3.5 h-3.5" /> No issues detected
            </span>
          )}
        </div>

        <button
          onClick={() => setAutoSend(v => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
          style={autoSend
            ? { background: "rgba(210,163,95,0.08)", borderColor: "rgba(210,163,95,0.4)", color: "#d2a35f" }
            : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "#6f7683" }
          }
        >
          <span className="w-2 h-2 rounded-full" style={{ background: autoSend ? "#d2a35f" : "#6f7683" }} />
          Auto-send emails
        </button>
      </div>

      {/* Filter tabs */}
       {visible.length > 0 && (
         <div
           className="flex gap-1 p-1 rounded-lg overflow-x-auto scrollbar-none"
           style={{ background: "var(--bg-hover)" }}
         >
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all"
              style={filter === tab.id
                ? { background: "rgba(210,163,95,0.12)", color: "#d2a35f" }
                : { color: "var(--text-muted, #6f7683)" }
              }
            >
              {tab.label}
              {tab.id === "all" && visible.length > 0 && (
                <span
                  className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                  style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-secondary, #a7adba)" }}
                >
                  {visible.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Alert list */}
      {filtered.length === 0 && allAlerts.length > 0 ? (
        <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>No issues in this category.</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-emerald-500">This transaction looks clean!</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            No missing documents, overdue deadlines, or compliance issues detected.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => (
            <AlertRow
              key={alert.id}
              alert={alert}
              transaction={transaction}
              currentUser={currentUser}
              documents={documents}
              onDismiss={dismiss}
            />
          ))}
        </div>
      )}

      {autoSend && visible.length > 0 && (
        <div className="rounded-xl px-4 py-3 text-xs badge-gold">
          ⚡ Auto-send is <strong>ON</strong> — emails will be generated when new critical issues are detected.
          Manual review is recommended before enabling in production.
        </div>
      )}
    </div>
  );
}