import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, ShieldAlert, ShieldX, AlertTriangle,
  Info, Plus, Mail, RefreshCw, Loader2, X,
  ChevronDown, ChevronUp, FileText, Scan,
  CheckCircle2, XCircle, MinusCircle, ExternalLink,
  FileSignature, Hash, BookOpen, Fingerprint, Users, User
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import EmailGeneratorModal from "./EmailGeneratorModal";
import DocumentViewerModal from "../transactions/DocumentViewerModal";

const SEVERITY_CONFIG = {
  critical: { icon: ShieldX,      bg: "bg-red-50 border-red-200",       iconCls: "text-red-500",    badgeCls: "bg-red-100 text-red-700",       titleCls: "text-red-900",    label: "Critical" },
  high:     { icon: AlertTriangle, bg: "bg-orange-50 border-orange-200", iconCls: "text-orange-500", badgeCls: "bg-orange-100 text-orange-700", titleCls: "text-orange-900", label: "High" },
  medium:   { icon: AlertTriangle, bg: "bg-amber-50 border-amber-100",   iconCls: "text-amber-500",  badgeCls: "bg-amber-100 text-amber-700",   titleCls: "text-amber-900",  label: "Medium" },
  low:      { icon: Info,          bg: "bg-blue-50 border-blue-100",     iconCls: "text-blue-400",   badgeCls: "bg-blue-100 text-blue-600",     titleCls: "text-blue-900",   label: "Low" },
  blocker:  { icon: ShieldX,      bg: "bg-red-50 border-red-200",       iconCls: "text-red-500",    badgeCls: "bg-red-100 text-red-700",       titleCls: "text-red-900",    label: "Critical" },
  warning:  { icon: AlertTriangle, bg: "bg-amber-50 border-amber-100",   iconCls: "text-amber-500",  badgeCls: "bg-amber-100 text-amber-700",   titleCls: "text-amber-900",  label: "Warning" },
  info:     { icon: Info,          bg: "bg-blue-50 border-blue-100",     iconCls: "text-blue-500",   badgeCls: "bg-blue-100 text-blue-700",     titleCls: "text-blue-900",   label: "Info" },
};

const TYPE_ICONS = {
  missing_signature: <FileSignature className="w-3.5 h-3.5" />,
  missing_initial:   <Hash className="w-3.5 h-3.5" />,
  blank_field:       <BookOpen className="w-3.5 h-3.5" />,
  invalid_date:      <AlertTriangle className="w-3.5 h-3.5" />,
  missing_document:  <FileText className="w-3.5 h-3.5" />,
};
const TYPE_LABELS = {
  missing_signature: "Missing Signature",
  missing_initial:   "Missing Initial",
  blank_field:       "Blank Field",
  invalid_date:      "Invalid Date",
  missing_document:  "Missing Document",
};

const ISSUE_TYPE_ORDER = ["missing_signature", "missing_initial", "blank_field", "invalid_date", "missing_document"];

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

// Signature summary showing detected vs required counts
function SignatureSummary({ signatures, hasDigitalSig, digitalPlatform }) {
  if (!signatures) return null;
  const { required_buyers = 1, required_sellers = 1, detected_buyer, detected_seller,
          confirmed_buyers = [], confirmed_sellers = [] } = signatures;

  const buyerOk = detected_buyer !== null && detected_buyer >= required_buyers;
  const sellerOk = detected_seller !== null && detected_seller >= required_sellers;

  return (
    <div className="rounded-xl border p-3 bg-slate-50 border-slate-200 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <FileSignature className="w-4 h-4 text-slate-500" />
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Signature Validation</p>
        {hasDigitalSig && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <Fingerprint className="w-3 h-3" /> {digitalPlatform || "Digital"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {/* Buyers */}
        <div className={`rounded-lg px-3 py-2 border ${buyerOk ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center gap-1.5 mb-1">
            {buyerOk ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
            <span className="text-[11px] font-semibold text-gray-700">Buyer Signatures</span>
          </div>
          <p className="text-xs text-gray-600">
            {detected_buyer !== null ? detected_buyer : "?"} of {required_buyers} signed
          </p>
          {confirmed_buyers.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{confirmed_buyers.join(", ")}</p>
          )}
        </div>
        {/* Sellers */}
        <div className={`rounded-lg px-3 py-2 border ${sellerOk ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center gap-1.5 mb-1">
            {sellerOk ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
            <span className="text-[11px] font-semibold text-gray-700">Seller Signatures</span>
          </div>
          <p className="text-xs text-gray-600">
            {detected_seller !== null ? detected_seller : "?"} of {required_sellers} signed
          </p>
          {confirmed_sellers.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{confirmed_sellers.join(", ")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function IssueCard({ issue, onAddTask, transaction, allIssues, linkedDoc, onViewDoc, onDismiss }) {
  const [taskAdded, setTaskAdded] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.medium;
  const Icon = cfg.icon;
  const issueType = issue.type || issue.category || "blank_field";
  const description = issue.description || issue.message || "Compliance issue";
  const actionRequired = issue.action_required || issue.suggested_task || "";
  const location = issue.location || (issue.page ? `Page ${issue.page}` : null);
  const party = issue.party_name || issue.party;

  return (
    <>
      {viewingDoc && linkedDoc && (
        <DocumentViewerModal doc={linkedDoc} onClose={() => setViewingDoc(false)} />
      )}
      <div className={`rounded-xl border p-3.5 ${cfg.bg}`}>
        <div className="flex items-start gap-3">
          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.iconCls}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={`text-sm font-semibold leading-snug ${cfg.titleCls}`}>{description}</p>
              <div className="flex gap-1.5 flex-shrink-0 items-center">
                {linkedDoc && (
                  <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                    onClick={() => setViewingDoc(true)}>
                    <FileText className="w-3 h-3 mr-0.5" /> View Doc
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-6 text-[11px] px-2"
                  onClick={() => { onAddTask(issue); setTaskAdded(true); }} disabled={taskAdded}>
                  {taskAdded ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Plus className="w-3 h-3" />}
                  {taskAdded ? "Added" : "Task"}
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => setShowEmailModal(true)}>
                  <Mail className="w-3 h-3 mr-0.5" /> Email
                </Button>
                <button
                  onClick={() => onDismiss(issue)}
                  className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-black/10 transition-colors"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badgeCls}`}>{cfg.label}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/70 border border-gray-200 text-gray-500 flex items-center gap-1">
                {TYPE_ICONS[issueType]}
                {TYPE_LABELS[issueType] || issueType.replace(/_/g, " ")}
              </span>
              {party && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/70 border border-gray-200 text-gray-500 capitalize flex items-center gap-1">
                  <User className="w-2.5 h-2.5" /> {party}
                </span>
              )}
              {location && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 border border-gray-200 text-gray-500 font-mono">{location}</span>
              )}
            </div>

            {actionRequired && (
              <p className="text-[11px] mt-1.5 font-medium" style={{ color: "var(--text-secondary)" }}>
                → {actionRequired}
              </p>
            )}
          </div>
        </div>

        {showEmailModal && (
          <EmailGeneratorModal
            issue={issue}
            allIssues={allIssues}
            transaction={transaction}
            onClose={() => setShowEmailModal(false)}
          />
        )}
      </div>
    </>
  );
}

// Issues grouped by type with counts
function GroupedIssueList({ issues, onAddTask, transaction, linkedDoc, onViewDoc, dismissedIds, onDismiss }) {
  const [activeGroup, setActiveGroup] = useState(null);

  const groups = {};
  for (const type of ISSUE_TYPE_ORDER) {
    const typeIssues = issues.filter(i => (i.type || i.category || "blank_field") === type);
    if (typeIssues.length > 0) groups[type] = typeIssues;
  }
  // Catch any uncategorized
  const otherIssues = issues.filter(i => !ISSUE_TYPE_ORDER.includes(i.type || i.category || "blank_field"));
  if (otherIssues.length > 0) groups["other"] = otherIssues;

  if (Object.keys(groups).length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-emerald-600">
        <ShieldCheck className="w-4 h-4" /> No compliance issues found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Group header chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveGroup(null)}
          className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-colors ${!activeGroup ? "bg-slate-800 text-white border-slate-800" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"}`}
        >
          All ({issues.length})
        </button>
        {Object.entries(groups).map(([type, groupIssues]) => {
          const label = TYPE_LABELS[type] || type.replace(/_/g, " ");
          const hasCritical = groupIssues.some(i => i.severity === "critical" || i.severity === "blocker");
          return (
            <button
              key={type}
              onClick={() => setActiveGroup(activeGroup === type ? null : type)}
              className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${
                activeGroup === type
                  ? "bg-slate-800 text-white border-slate-800"
                  : hasCritical
                  ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
              }`}
            >
              {TYPE_ICONS[type]}
              {label} ({groupIssues.length})
            </button>
          );
        })}
      </div>

      {/* Issue cards */}
      {Object.entries(groups).map(([type, groupIssues]) => {
        if (activeGroup && activeGroup !== type) return null;
        const criticals = groupIssues.filter(i => i.severity === "critical" || i.severity === "blocker");
        const highs     = groupIssues.filter(i => i.severity === "high");
        const rest      = groupIssues.filter(i => i.severity !== "critical" && i.severity !== "blocker" && i.severity !== "high");
        const sorted    = [...criticals, ...highs, ...rest];

        return (
          <div key={type}>
            {!activeGroup && (
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                {TYPE_ICONS[type]} {TYPE_LABELS[type] || type.replace(/_/g, " ")}
                <span className="ml-1 font-bold text-gray-600">({groupIssues.length})</span>
              </p>
            )}
            <div className="space-y-2">
              {sorted.map((issue, i) => (
                <IssueCard
                  key={issue.id || i}
                  issue={issue}
                  onAddTask={onAddTask}
                  transaction={transaction}
                  allIssues={issues}
                  linkedDoc={linkedDoc}
                  onViewDoc={onViewDoc}
                  onDismiss={(iss) => onDismiss(iss.id || iss.description || JSON.stringify(iss))}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportCard({ report, onRescan, onAddTask, scanning, transaction, linkedDoc, onViewDoc, dismissedIds = new Set(), onDismiss }) {
  const [expanded, setExpanded] = useState(true);
  const [showFields, setShowFields] = useState(false);

  const all = report.all_issues || [];
  const visible = all.filter(i => !dismissedIds.has(i.id || i.description || JSON.stringify(i)));
  const fields = report.extracted_fields || {};
  const filledFields = Object.entries(fields).filter(([, v]) => v !== null && v !== undefined);

  const visibleBlockers = visible.filter(i => i.severity === "critical" || i.severity === "blocker");
  const visibleWarnings = visible.filter(i => i.severity === "high" || i.severity === "medium" || i.severity === "warning");

  const statusEl = visible.length === 0
    ? <span className="text-xs text-emerald-600 font-medium flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" /> Compliant</span>
    : visibleBlockers.length > 0
    ? <span className="text-xs text-red-500 font-medium flex items-center gap-0.5"><ShieldX className="w-3 h-3" /> {visibleBlockers.length} Blocker{visibleBlockers.length !== 1 ? "s" : ""}</span>
    : <span className="text-xs text-amber-500 font-medium flex items-center gap-0.5"><ShieldAlert className="w-3 h-3" /> {visibleWarnings.length} Warning{visibleWarnings.length !== 1 ? "s" : ""}</span>;

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
                {report.page_count > 0 && <Badge variant="outline" className="text-[11px] text-gray-400">{report.page_count}p</Badge>}
                {statusEl}
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

          {/* Signature Summary Panel */}
          {report.signatures && (
            <SignatureSummary
              signatures={report.signatures}
              hasDigitalSig={report.has_digital_signature}
              digitalPlatform={report.digital_signature_platform}
            />
          )}

          {/* Digital sig banner (no signature summary) */}
          {report.has_digital_signature && !report.signatures && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-700">
              <Fingerprint className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Digital signatures detected via <span className="font-semibold capitalize">{report.digital_signature_platform || "e-sign platform"}</span></span>
            </div>
          )}

          {/* Issues grouped by type */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Issues ({visible.length}{dismissedIds.size > 0 ? ` · ${dismissedIds.size} dismissed` : ""})
            </p>
            <GroupedIssueList
              issues={visible}
              onAddTask={onAddTask}
              transaction={transaction}
              linkedDoc={linkedDoc}
              onViewDoc={onViewDoc}
              dismissedIds={dismissedIds}
              onDismiss={onDismiss}
            />
          </div>

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
                        {typeof val === "number" && key.includes("price") ? `$${val.toLocaleString()}` : String(val)}
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
  const [viewingDoc, setViewingDoc] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [scanning, setScanning] = useState(false);
  const pollRef = useRef(null);

  const storageKey = `dismissed_issues_${transaction.id}`;
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });

  const handleDismissIssue = (key) => {
    setDismissedIds(prev => {
      const next = new Set([...prev, key]);
      try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

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

  useEffect(() => {
    checkJobStatus(true);
    return () => stopPolling();
  }, [transaction.id]);

  useEffect(() => { return () => stopPolling(); }, []);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startPolling = () => {
    stopPolling();
    pollRef.current = setInterval(() => checkJobStatus(false), 4000);
  };

  const checkJobStatus = async (silent = false) => {
    try {
      const res = await base44.functions.invoke("scanDocuments", { transaction_id: transaction.id, action: "status" });
      const s = res.data;
      if (!s || s.status === "none") { setJobStatus(null); setScanning(false); stopPolling(); return; }
      setJobStatus(s);
      if (s.status === "in_progress" || s.status === "pending") {
        setScanning(true);
        if (!pollRef.current) startPolling();
      } else if (s.status === "complete" || s.status === "error") {
        setScanning(false);
        stopPolling();
        if (!silent) {
          queryClient.invalidateQueries({ queryKey: ["compliance-reports", transaction.id] });
          if (s.status === "complete") {
            toast.success(`Scan complete — ${s.processed_docs} document${s.processed_docs !== 1 ? "s" : ""} processed`);
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Compliance Scan Complete", {
                body: `${transaction.address} — ${s.processed_docs} document${s.processed_docs !== 1 ? "s" : ""} scanned`,
              });
            }
          } else {
            toast.error("Scan encountered errors — partial results may be available");
          }
        }
      }
    } catch {}
  };

  const handleScanAll = async () => {
    if (documents.length === 0) return;
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    setScanning(true);
    setJobStatus({ status: "in_progress", processed_docs: 0, total_docs: documents.length });
    base44.functions.invoke("scanDocuments", { transaction_id: transaction.id, action: "start" })
      .then(res => { if (res.data?.error) { toast.error(res.data.error); setScanning(false); stopPolling(); } })
      .catch(() => {});
    startPolling();
  };

  const handleRescanDoc = async () => {
    setScanning(true);
    setJobStatus({ status: "in_progress", processed_docs: 0, total_docs: 1 });
    base44.functions.invoke("scanDocuments", { transaction_id: transaction.id, action: "start" }).catch(() => {});
    startPolling();
  };

  const handleAddTask = async (issue) => {
    const newTask = {
      id: `compliance_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: issue.action_required || issue.suggested_task || issue.message,
      completed: false,
      phase: transaction.phase || 1,
      required: issue.severity === "critical" || issue.severity === "blocker",
      due_date: null,
      assigned_to: "tc",
    };
    const updatedTasks = [...(transaction.tasks || []), newTask];
    updateTxMutation.mutate({ tasks: updatedTasks, last_activity_at: new Date().toISOString() });
  };

  const isDismissed = (issue) => dismissedIds.has(issue.id || issue.description || JSON.stringify(issue));
  const allBlockers = reports.flatMap(r =>
    (r.all_issues || r.blockers || []).filter(i => (i.severity === "critical" || i.severity === "blocker") && !isDismissed(i))
  );
  const allWarnings = reports.flatMap(r =>
    (r.all_issues || r.warnings || []).filter(i => (i.severity === "high" || i.severity === "medium" || i.severity === "warning") && !isDismissed(i))
  );
  const avgScore = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => sum + (r.compliance_score || 100), 0) / reports.length)
    : null;
  const overallStatus = allBlockers.length > 0 ? "blockers" : allWarnings.length > 0 ? "warnings" : reports.length > 0 ? "compliant" : "unscanned";
  const unscannedDocs = documents.filter(d => !reports.find(r => r.document_id === d.id));
  const progress = jobStatus && jobStatus.total_docs > 0
    ? Math.round((jobStatus.processed_docs / jobStatus.total_docs) * 100)
    : 0;

  // Party count display
  const buyerCount = (transaction.buyers?.length) || (transaction.buyer ? 1 : 1);
  const sellerCount = (transaction.sellers?.length) || (transaction.seller ? 1 : 1);

  return (
    <div className="space-y-5">
      {viewingDoc && <DocumentViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />}

      {/* Party summary */}
      <div className="rounded-xl border px-4 py-3 flex items-center gap-4 flex-wrap" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Parties for Signature Validation:</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-medium">
            {buyerCount} Buyer{buyerCount !== 1 ? "s" : ""}: {(transaction.buyers || [transaction.buyer]).filter(Boolean).join(", ") || "Unknown"}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-medium">
            {sellerCount} Seller{sellerCount !== 1 ? "s" : ""}: {(transaction.sellers || [transaction.seller]).filter(Boolean).join(", ") || "Unknown"}
          </span>
        </div>
      </div>

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
            <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Transaction Compliance</h3>
            {overallStatus === "unscanned" && !scanning && <p className="text-sm text-gray-500">No documents have been scanned yet.</p>}
            {overallStatus === "compliant" && !scanning && <p className="text-sm text-emerald-600 font-medium">✓ All scanned documents are compliant</p>}
            {overallStatus === "warnings" && !scanning && <p className="text-sm text-amber-600 font-medium">⚠ {allWarnings.length} warning{allWarnings.length !== 1 ? "s" : ""} across {reports.length} document{reports.length !== 1 ? "s" : ""}</p>}
            {overallStatus === "blockers" && !scanning && <p className="text-sm text-red-600 font-medium">🔴 {allBlockers.length} critical issue{allBlockers.length !== 1 ? "s" : ""} — action required</p>}

            {scanning && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
                  <p className="text-sm text-blue-600 font-medium">
                    Scanning in background… {jobStatus?.processed_docs || 0}/{jobStatus?.total_docs || documents.length} documents
                  </p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.max(5, progress)}%` }} />
                </div>
                <p className="text-[11px] text-gray-400">You can switch tabs — scanning continues in the background.</p>
              </div>
            )}

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {!scanning && (
                <span className="text-xs text-gray-400">
                  {reports.length} document{reports.length !== 1 ? "s" : ""} scanned · {unscannedDocs.length} unscanned
                </span>
              )}
              <Button size="sm" onClick={handleScanAll} disabled={scanning || documents.length === 0} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
                {scanning ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Scan className="w-3.5 h-3.5 mr-1.5" />}
                {scanning ? "Scanning…" : `Scan All Documents (${documents.length})`}
              </Button>
              {!scanning && (
                <Button size="sm" variant="ghost" className="h-8 text-xs text-gray-400" onClick={() => checkJobStatus(false)}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Unscanned documents */}
      {unscannedDocs.length > 0 && !scanning && (
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700 font-medium">{unscannedDocs.length} document{unscannedDocs.length !== 1 ? "s" : ""} not yet scanned</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {unscannedDocs.map(d => (
              <div key={d.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-amber-100">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs text-gray-600">{d.file_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {documents.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Scan className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No documents to scan</p>
          <p className="text-xs mt-1">Upload documents in the Documents tab to run a compliance check.</p>
        </div>
      )}

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
              onRescan={handleRescanDoc}
              onAddTask={handleAddTask}
              scanning={scanning}
              transaction={transaction}
              linkedDoc={documents.find(d => d.id === report.document_id)}
              onViewDoc={setViewingDoc}
              dismissedIds={dismissedIds}
              onDismiss={handleDismissIssue}
            />
          ))}
        </div>
      )}
    </div>
  );
}