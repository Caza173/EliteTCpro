import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle, ShieldX, Clock, ClipboardList,
  Mail, CheckCircle2, RefreshCw, Filter,
} from "lucide-react";
import { detectIssues, ISSUE_TYPE_LABELS, SEVERITY_STYLES } from "@/lib/issueDetector";
import EmailGeneratorModal from "@/components/compliance/EmailGeneratorModal";

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

function IssueRow({ issue, transaction, autoSendEnabled }) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const styles = SEVERITY_STYLES[issue.severity];

  return (
    <>
      {emailModalOpen && (
        <EmailGeneratorModal
          issue={adaptIssueForEmail(issue)}
          transaction={transaction}
          onClose={() => setEmailModalOpen(false)}
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

        <Button
          size="sm"
          variant="outline"
          onClick={() => setEmailModalOpen(true)}
          className="flex-shrink-0 h-8 text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          <Mail className="w-3.5 h-3.5" />
          Email
        </Button>
      </div>
    </>
  );
}

export default function IssueDetectionPanel({ transaction }) {
  const [autoSend, setAutoSend] = useState(false);
  const [filter, setFilter] = useState("all");

  const { data: checklistItems = [], isLoading: loadingChecklist } = useQuery({
    queryKey: ["checklist", transaction.id],
    queryFn: () => base44.entities.DocumentChecklistItem.filter({ transaction_id: transaction.id }),
    enabled: !!transaction.id,
    staleTime: 30_000,
  });

  const { data: complianceReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ["compliance-reports", transaction.id],
    queryFn: () => base44.entities.ComplianceReport.filter({ transaction_id: transaction.id }, "-created_date"),
    enabled: !!transaction.id,
    staleTime: 30_000,
  });

  const { data: txTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["txTasks", transaction.id],
    queryFn: () => base44.entities.TransactionTask.filter({ transaction_id: transaction.id }),
    enabled: !!transaction.id,
    staleTime: 30_000,
  });

  const isLoading = loadingChecklist || loadingReports || loadingTasks;

  const allIssues = useMemo(
    () => detectIssues(transaction, checklistItems, complianceReports, txTasks),
    [transaction, checklistItems, complianceReports, txTasks]
  );

  const filteredIssues = filter === "all"
    ? allIssues
    : allIssues.filter(i => i.issue_type === filter || i.severity === filter);

  const highCount   = allIssues.filter(i => i.severity === "high").length;
  const mediumCount = allIssues.filter(i => i.severity === "medium").length;
  const lowCount    = allIssues.filter(i => i.severity === "low").length;

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
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
          {allIssues.length === 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> No issues detected
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-send toggle */}
          <div className="flex items-center gap-2">
            <Switch id="autosend" checked={autoSend} onCheckedChange={setAutoSend} />
            <Label htmlFor="autosend" className="text-xs text-gray-500 cursor-pointer">Auto-send emails</Label>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      {allIssues.length > 0 && (
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
              {tab.id === "all" && allIssues.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px]">{allIssues.length}</span>
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
            />
          ))}
        </div>
      )}

      {autoSend && allIssues.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          ⚡ Auto-send is <strong>ON</strong> — emails will be generated and sent automatically when new critical issues are detected. Manual review is recommended before enabling this in production.
        </div>
      )}
    </div>
  );
}