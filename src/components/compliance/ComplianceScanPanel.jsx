import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, ShieldAlert, ShieldX, AlertTriangle,
  Info, Plus, Mail, RefreshCw, Loader2,
  ChevronDown, ChevronUp, FileText, Scan,
  CheckCircle2, XCircle, MinusCircle, Wand2, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import EmailGeneratorModal from "./EmailGeneratorModal";
import DocumentViewerModal from "../transactions/DocumentViewerModal";

const SEVERITY_CONFIG = {
  blocker: {
    icon: ShieldX,
    bg: "bg-red-50 border-red-100",
    iconCls: "text-red-500",
    badgeCls: "bg-red-100 text-red-700",
    titleCls: "text-red-900",
    label: "Blocker",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50 border-amber-100",
    iconCls: "text-amber-500",
    badgeCls: "bg-amber-100 text-amber-700",
    titleCls: "text-amber-900",
    label: "Warning",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50 border-blue-100",
    iconCls: "text-blue-500",
    badgeCls: "bg-blue-100 text-blue-700",
    titleCls: "text-blue-900",
    label: "Info",
  },
};

const SIG_ICONS = {
  present: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  missing: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  not_found: <MinusCircle className="w-3.5 h-3.5 text-gray-400" />,
};

const SIG_LABELS = {
  buyer_signature: "Buyer",
  seller_signature: "Seller",
  buyer_agent_signature: "Buyer's Agent",
  seller_agent_signature: "Seller's Agent",
};

function ScoreRing({ score }) {
  const color = score >= 90 ? "#10b981" : score >= 70 ? "#f59e0b" : "#ef4444";
  const label = score >= 90 ? "Compliant" : score >= 70 ? "Needs Attention" : "At Risk";
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center border-4 text-2xl font-bold"
        style={{ borderColor: color, color }}
      >
        {score}
      </div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
    </div>
  );
}

function IssueCard({ issue, onAddTask, transaction }) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [taskAdded, setTaskAdded] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info;
  const Icon = cfg.icon;

  const handleAddTask = () => {
    onAddTask(issue);
    setTaskAdded(true);
  };

  return (
    <div className={`rounded-xl border p-4 ${cfg.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.iconCls}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${cfg.titleCls}`}>{issue.message}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge className={`text-[11px] capitalize ${cfg.badgeCls}`}>{cfg.label}</Badge>
              {issue.category && (
                <Badge variant="outline" className="text-[11px] capitalize border-current opacity-60">{issue.category.replace(/_/g, " ")}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {issue.suggested_task && (
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs"
              onClick={handleAddTask}
              disabled={taskAdded}
            >
              {taskAdded ? <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> : <Plus className="w-3 h-3 mr-1" />}
              {taskAdded ? "Added" : "Task"}
            </Button>
          )}
          <Button
            size="sm" variant="outline"
            className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => setShowEmailModal(true)}
          >
            <Wand2 className="w-3 h-3 mr-1" />
            Generate Email
          </Button>
          {issue.suggested_email_body && (
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs"
              onClick={() => setEmailOpen(!emailOpen)}
            >
              <Mail className="w-3 h-3 mr-1" />
              Draft
              {emailOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
            </Button>
          )}
        </div>
        {showEmailModal && (
          <EmailGeneratorModal
            issue={issue}
            transaction={transaction}
            onClose={() => setShowEmailModal(false)}
          />
        )}
      </div>

      {emailOpen && issue.suggested_email_body && (
        <div className="mt-3 ml-7 p-3 bg-white rounded-lg border border-white/80 text-xs text-gray-700">
          <p className="font-semibold text-gray-900 mb-1">Subject: {issue.suggested_email_subject}</p>
          <p className="whitespace-pre-wrap text-gray-600">{issue.suggested_email_body}</p>
          <Button
            size="sm" className="mt-2 h-7 text-xs bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              navigator.clipboard.writeText(`Subject: ${issue.suggested_email_subject}\n\n${issue.suggested_email_body}`);
            }}
          >
            Copy to Clipboard
          </Button>
        </div>
      )}
    </div>
  );
}

function ReportCard({ report, onRescan, onAddTask, scanning, transaction, linkedDoc, onViewDoc }) {
  const [expanded, setExpanded] = useState(true);
  const [showFields, setShowFields] = useState(false);

  const sigs = report.signatures || {};
  const fields = report.extracted_fields || {};
  const filledFields = Object.entries(fields).filter(([, v]) => v !== null && v !== undefined);

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 truncate">{report.document_name}</p>
                {linkedDoc && onViewDoc && (
                  <button onClick={() => onViewDoc(linkedDoc)}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-0.5 flex-shrink-0">
                    <ExternalLink className="w-3 h-3" /> View
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge variant="outline" className="text-[11px] text-gray-500">{report.document_type || "Unknown"}</Badge>
                {report.status === 'compliant' && <span className="text-xs text-emerald-600 font-medium flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" /> Compliant</span>}
                {report.status === 'warnings' && <span className="text-xs text-amber-500 font-medium flex items-center gap-0.5"><ShieldAlert className="w-3 h-3" /> {report.warnings?.length} Warning{report.warnings?.length !== 1 ? 's' : ''}</span>}
                {report.status === 'blockers' && <span className="text-xs text-red-500 font-medium flex items-center gap-0.5"><ShieldX className="w-3 h-3" /> {report.blockers?.length} Blocker{report.blockers?.length !== 1 ? 's' : ''}</span>}
                {report.created_date && <span className="text-[11px] text-gray-400">Scanned {format(new Date(report.created_date), "MMM d")}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ScoreRing score={report.compliance_score || 100} />
            <div className="flex flex-col gap-1">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onRescan(report)} disabled={scanning}>
                {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-gray-400" />}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {report.summary && (
            <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-3">{report.summary}</p>
          )}

          {/* Signature Status */}
          {Object.keys(sigs).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Signature Status</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(sigs).map(([key, status]) => (
                  <div key={key} className="flex items-center gap-2 text-xs text-gray-600">
                    {SIG_ICONS[status] || SIG_ICONS.not_found}
                    <span>{SIG_LABELS[key] || key.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issues */}
          {(report.all_issues || []).length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Issues ({report.all_issues.length})</p>
              {(report.all_issues || []).map((issue, i) => (
                <IssueCard key={issue.id || i} issue={issue} onAddTask={onAddTask} transaction={transaction} />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-3 text-sm text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
              No compliance issues found.
            </div>
          )}

          {/* Missing Docs */}
          {(report.missing_docs || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Companion Documents Needed</p>
              <div className="space-y-1">
                {report.missing_docs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2 border border-orange-100">
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {doc}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Fields (collapsible) */}
          {filledFields.length > 0 && (
            <div>
              <button
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 uppercase tracking-wide"
                onClick={() => setShowFields(!showFields)}
              >
                {showFields ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Extracted Data ({filledFields.length} fields)
              </button>
              {showFields && (
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {filledFields.map(([key, val]) => (
                    <div key={key}>
                      <p className="text-[11px] text-gray-400 capitalize">{key.replace(/_/g, " ")}</p>
                      <p className="text-xs font-medium text-gray-700">
                        {typeof val === "number" && key.includes("price")
                          ? `$${val.toLocaleString()}`
                          : String(val)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function ComplianceScanPanel({ transaction, currentUser }) {
  const queryClient = useQueryClient();
  const [scanningId, setScanningId] = useState(null);
  const [runningAll, setRunningAll] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["compliance-reports", transaction.id],
    queryFn: () => base44.entities.ComplianceReport.filter({ transaction_id: transaction.id }, "-created_date"),
    enabled: !!transaction.id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["tx-documents", transaction.id],
    queryFn: () => base44.entities.Document.filter({ transaction_id: transaction.id }, "-created_date"),
    enabled: !!transaction.id,
  });

  const updateTxMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("updateTransaction", { transaction_id: transaction.id, data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const allBlockers = reports.flatMap(r => r.blockers || []);
  const allWarnings = reports.flatMap(r => r.warnings || []);
  const avgScore = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => sum + (r.compliance_score || 100), 0) / reports.length)
    : null;
  const overallStatus = allBlockers.length > 0 ? 'blockers' : allWarnings.length > 0 ? 'warnings' : reports.length > 0 ? 'compliant' : 'unscanned';

  const runScan = async (doc, existingReport) => {
    const docId = existingReport?.document_id || doc?.id;
    setScanningId(docId);
    try {
      await base44.functions.invoke('complianceEngine', {
        document_url: doc.file_url,
        file_name: doc.file_name || "Document",
        document_id: doc.id,
        transaction_id: transaction.id,
        brokerage_id: transaction.brokerage_id,
        transaction_data: {
          address: transaction.address,
          transaction_type: transaction.transaction_type,
          is_cash_transaction: transaction.is_cash_transaction,
        }
      });
      queryClient.invalidateQueries({ queryKey: ["compliance-reports", transaction.id] });
    } catch (e) {
      console.error("Compliance scan failed:", e);
    }
    setScanningId(null);
  };

  const handleRescan = async (report) => {
    const doc = documents.find(d => d.id === report.document_id);
    if (!doc) return;
    await runScan(doc, report);
  };

  const handleScanAll = async () => {
    setRunningAll(true);
    for (const doc of documents) {
      await runScan(doc, null);
    }
    setRunningAll(false);
  };

  const handleAddTask = async (issue) => {
    const newTask = {
      id: `compliance_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: issue.suggested_task || issue.message,
      completed: false,
      phase: transaction.phase || 1,
      required: issue.severity === 'blocker',
      due_date: null,
      assigned_to: "tc",
    };
    const updatedTasks = [...(transaction.tasks || []), newTask];
    updateTxMutation.mutate({ tasks: updatedTasks, last_activity_at: new Date().toISOString() });
  };

  const unscannedDocs = documents.filter(d => !reports.find(r => r.document_id === d.id));

  return (
    <div className="space-y-5">
      {viewingDoc && (
        <DocumentViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />
      )}
      {/* Overall Compliance Summary */}
      <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {avgScore !== null ? (
            <ScoreRing score={avgScore} />
          ) : (
            <div className="w-20 h-20 rounded-full border-4 border-gray-200 flex items-center justify-center text-gray-300 text-sm font-medium">
              N/A
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Transaction Compliance</h3>
            {overallStatus === 'unscanned' && (
              <p className="text-sm text-gray-500">No documents have been scanned yet. Upload documents and run a compliance check.</p>
            )}
            {overallStatus === 'compliant' && (
              <p className="text-sm text-emerald-600 font-medium">✓ All scanned documents are compliant</p>
            )}
            {overallStatus === 'warnings' && (
              <p className="text-sm text-amber-600 font-medium">⚠ {allWarnings.length} warning{allWarnings.length !== 1 ? 's' : ''} across {reports.length} document{reports.length !== 1 ? 's' : ''}</p>
            )}
            {overallStatus === 'blockers' && (
              <p className="text-sm text-red-600 font-medium">🔴 {allBlockers.length} blocker{allBlockers.length !== 1 ? 's' : ''} — action required</p>
            )}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="text-xs text-gray-400">{reports.length} document{reports.length !== 1 ? 's' : ''} scanned · {unscannedDocs.length} unscanned</span>
              <Button
                size="sm"
                onClick={handleScanAll}
                disabled={runningAll || documents.length === 0}
                className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
              >
                {runningAll ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Scan className="w-3.5 h-3.5 mr-1.5" />}
                {runningAll ? "Scanning…" : `Scan All Documents (${documents.length})`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Unscanned documents */}
      {unscannedDocs.length > 0 && !runningAll && (
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700 font-medium">
            {unscannedDocs.length} document{unscannedDocs.length !== 1 ? 's' : ''} not yet scanned:
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {unscannedDocs.map(d => (
              <div key={d.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-amber-100">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-gray-600">{d.file_name}</span>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-amber-600" onClick={() => runScan(d, null)} disabled={scanningId === d.id}>
                  {scanningId === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Scan"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No documents */}
      {documents.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Scan className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No documents to scan</p>
          <p className="text-xs mt-1">Upload documents in the Documents tab to run a compliance check.</p>
        </div>
      )}

      {/* Reports */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading compliance reports…
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onRescan={handleRescan}
              onAddTask={handleAddTask}
              scanning={scanningId === report.document_id}
              transaction={transaction}
              linkedDoc={documents.find(d => d.id === report.document_id)}
              onViewDoc={setViewingDoc}
            />
          ))}
        </div>
      )}
    </div>
  );
}