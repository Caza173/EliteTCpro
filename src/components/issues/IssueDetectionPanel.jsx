import React, { useState, useMemo } from "react";
import {
  useTransactionChecklistItems,
  useTransactionComplianceReports,
  useTransactionDocuments,
  useTransactionTasks,
} from "@/hooks/useTransactionResources";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle, ShieldX, Clock, ClipboardList,
  Mail, CheckCircle2, X, FileText,
} from "lucide-react";
import { detectIssues, ISSUE_TYPE_LABELS, SEVERITY_STYLES } from "@/lib/issueDetector";
import EmailGeneratorModal from "@/components/compliance/EmailGeneratorModal";
import DocumentViewerModal from "@/components/transactions/DocumentViewerModal";

const TYPE_ICONS = {
  compliance_issue:    <ShieldX className="w-4 h-4 text-red-500" />,
  deadline_warning:    <Clock className="w-4 h-4 text-amber-500" />,
  deadline_critical:   <AlertTriangle className="w-4 h-4 text-red-600" />,
  workflow_incomplete: <ClipboardList className="w-4 h-4 text-blue-500" />,
};

// Adapt our issue format → EmailGeneratorModal's expected format
function adaptIssueForEmail(issue) {
  return {
    message: issue.description,
    category: issue.issue_type,
    severity: issue.severity,
    suggested_email_subject: null,
    suggested_email_body: null,
  };
}

function IssueRow({ issue, transaction, autoSendEnabled, currentUser, onDismiss, matchedDoc }) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(false);
  const styles = SEVERITY_STYLES[issue.severity];

  const isSignatureIssue = issue.issue_type === "compliance_issue" &&
    (issue.description?.toLowerCase().includes("signature") || issue.description?.toLowerCase().includes("initials"));

  return (
    <>
      {emailModalOpen && (
        <EmailGeneratorModal
          issue={adaptIssueForEmail(issue)}
          transaction={transaction}
          currentUser={currentUser}
          onClose={() => setEmailModalOpen(false)}
        />
      )}
      {viewingDoc && matchedDoc && (
        <DocumentViewerModal
          doc={matchedDoc}
          onClose={() => setViewingDoc(false)}
        />
      )}
      <div className={`flex items-start gap-3 p-3 rounded-xl border ${styles.row}`}>
        <div className="mt-0.5 flex-shrink-0">{TYPE_ICONS[issue.issue_type]}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={`text-xs border ${styles.badge}`}>
              {ISSUE_TYPE_LABELS[issue.issue_type]}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize border-current opacity-70">
              {issue.severity}
            </Badge>
            {issue.document_reference && (
              <span className="text-xs text-gray-400 italic truncate max-w-[160px]" title={issue.document_reference}>
                {issue.document_reference}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-800">{issue.description}</p>
          {issue.deadline && (
            <p className="text-xs text-gray-500 mt-0.5">
              Due: {new Date(issue.deadline).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isSignatureIssue && matchedDoc && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewingDoc(true)}
              className="h-8 text-xs gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <FileText className="w-3.5 h-3.5" />
              View Doc
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEmailModalOpen(true)}
            className="h-8 text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Mail className="w-3.5 h-3.5" />
            Email
          </Button>
          <button
            onClick={() => onDismiss(issue.id)}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function IssueDetectionPanel({ transaction, currentUser }) {
  const [autoSend, setAutoSend] = useState(false);
  const [filter, setFilter] = useState("all");

  const storageKey = `dismissed_issues_${transaction.id}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const { data: checklistItems = [], isLoading: loadingChecklist, error: checklistError } = useTransactionChecklistItems(transaction.id, { enabled: !!transaction.id, staleTime: 30_000 });
  const { data: complianceReports = [], isLoading: loadingReports, error: reportsError } = useTransactionComplianceReports(transaction.id, { enabled: !!transaction.id, staleTime: 30_000 });
  const { data: txTasks = [], isLoading: loadingTasks, error: tasksError } = useTransactionTasks(transaction.id, { enabled: !!transaction.id, staleTime: 30_000 });
  const { data: documents = [], error: documentsError } = useTransactionDocuments(transaction.id, { enabled: !!transaction.id, staleTime: 30_000 });

  const isLoading = loadingChecklist || loadingReports || loadingTasks;
  const loadError = checklistError || reportsError || tasksError || documentsError;

  // Find a document matching an issue's document_reference (by report.document_name or file_name)
  const findMatchedDoc = (issue) => {
    if (!issue.document_reference || !documents.length) return null;
    const ref = issue.document_reference.toLowerCase();
    return documents.find(d =>
      (d.file_name && d.file_name.toLowerCase().includes(ref)) ||
      (d.file_name && ref.includes(d.file_name.toLowerCase().replace(/\.[^.]+$/, "")))
    ) || null;
  };

  const allIssues = useMemo(
    () => detectIssues(transaction, checklistItems, complianceReports, txTasks),
    [transaction, checklistItems, complianceReports, txTasks]
  );

  const visibleIssues = allIssues.filter(i => !dismissed.has(i.id));

  const filteredIssues = (filter === "all"
    ? visibleIssues
    : visibleIssues.filter(i => i.issue_type === filter || i.severity === filter));

  const highCount   = visibleIssues.filter(i => i.severity === "high").length;
  const mediumCount = visibleIssues.filter(i => i.severity === "medium").length;
  const lowCount    = visibleIssues.filter(i => i.severity === "low").length;

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError.message || "Unable to load issue detection data."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {highCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {highCount} Critical
            </span>
          )}
          {mediumCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {mediumCount} Warning
            </span>
          )}
          {lowCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {lowCount} Info
            </span>
          )}
          {visibleIssues.length === 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> No issues detected
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-send toggle */}
          <button
            onClick={() => setAutoSend(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              autoSend
                ? "bg-amber-50 border-amber-300 text-amber-700 shadow-sm"
                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${autoSend ? "bg-amber-500" : "bg-gray-300"}`} />
            Auto-send emails
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      {visibleIssues.length > 0 && (
        <div className="flex gap-1 p-1 rounded-lg overflow-x-auto scrollbar-none" style={{ background: "var(--bg-tertiary)" }}>
          {[
            { id: "all", label: "All" },
            { id: "compliance_issue", label: "Compliance" },
            { id: "deadline_critical", label: "Critical Deadlines" },
            { id: "deadline_warning", label: "Warnings" },
            { id: "workflow_incomplete", label: "Workflow" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                filter === tab.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.id === "all" && visibleIssues.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px]">{visibleIssues.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Issue list */}
      {filteredIssues.length === 0 && allIssues.length > 0 ? (
        <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>No issues in this category.</p>
      ) : filteredIssues.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-emerald-700">This transaction looks clean!</p>
          <p className="text-xs text-gray-400 mt-1">No missing documents, signatures, or upcoming deadlines detected.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredIssues.map(issue => (
            <IssueRow
              key={issue.id}
              issue={issue}
              transaction={transaction}
              autoSendEnabled={autoSend}
              currentUser={currentUser}
              matchedDoc={findMatchedDoc(issue)}
              onDismiss={(id) => setDismissed(prev => {
                const next = new Set([...prev, id]);
                try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
                return next;
              })}
            />
          ))}
        </div>
      )}

      {autoSend && visibleIssues.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          ⚡ Auto-send is <strong>ON</strong> — emails will be generated and sent automatically when new critical issues are detected. Manual review is recommended before enabling this in production.
        </div>
      )}
    </div>
  );
}