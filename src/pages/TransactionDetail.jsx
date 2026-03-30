import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MapPin, User, Users, Mail, Phone, Calendar, ArrowLeft, Trash2,
  ClipboardCheck, Send, UserPlus, LayoutDashboard, GitBranch, Clock,
  DollarSign, FolderOpen, ShieldCheck, PanelLeftClose, PanelLeftOpen,
  Globe, X, Pencil, Mail as MailIcon, Receipt, CalendarDays, Info, AlertTriangle,
  ChevronDown, ChevronUp, Bot, Zap,
} from "lucide-react";
import { format } from "date-fns";
import PhaseTaskPanelV2 from "../components/transactions/PhaseTaskPanelV2";
import UnifiedPhaseBoard from "../components/transactions/UnifiedPhaseBoard";
import TransactionTimeline from "../components/transactions/TransactionTimeline";
import TaskList from "../components/transactions/TaskList";
import { generateTasksForPhase, isPhaseComplete, getPhasesForType, normalizeTransactionType, isTaskIncompatible } from "../lib/taskLibrary";
import DocChecklistPanel from "../components/transactions/DocChecklistPanel";
import HealthScoreBadge from "../components/dashboard/HealthScoreBadge";
import { useCurrentUser } from "../components/auth/useCurrentUser";
import { writeAuditLog, computeHealthScore } from "../components/utils/tenantUtils";
import FinanceTab from "../components/finance/FinanceTab";
import TransactionActivityFeed from "../components/transactions/TransactionActivityFeed";
import TransactionDocumentsTab from "../components/transactions/TransactionDocumentsTab";
import ContractTimeline from "../components/transactions/ContractTimeline";
import EditableDeadlinePanel from "../components/transactions/EditableDeadlinePanel";
import ComplianceScanPanel from "../components/compliance/ComplianceScanPanel";
import ComplianceMonitorWidget from "../components/compliance/ComplianceMonitorWidget";
import TransactionFinancialTools from "../components/transactions/TransactionFinancialTools";
import TCAIAssistant from "../components/ai/TCAIAssistant";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import SkySlopeSyncBadge from "../components/skyslope/SkySlopeSyncBadge";
import EmailComposerModal from "../components/email/EmailComposerModal";
import UnderContractEmailButton from "../components/email/UnderContractEmailButton";
import ConvertToTransactionButton from "../components/transactions/ConvertToTransactionButton";
import ListingIntakeTab from "../components/transactions/ListingIntakeTab";
import UnifiedDeadlinesPanel from "../components/transactions/UnifiedDeadlinesPanel";
import ContactsSection from "../components/transactions/ContactsSection";
import IssueDetectionPanel from "../components/issues/IssueDetectionPanel";
import QuickFeedbackButton from "../components/feedback/QuickFeedbackButton";
import NotesPanel from "../components/transactions/NotesPanel";

const TX_TABS = [
  { id: "overview",      label: "Overview",      icon: LayoutDashboard, info: "Phase checklist, tasks, and compliance summary" },
  { id: "issues",        label: "Issues",        icon: AlertTriangle,   info: "Auto-detected issues: missing docs, signatures, deadlines" },
  { id: "timeline",      label: "Timeline",      icon: GitBranch,       info: "Chronological contract events and activity history" },
  { id: "deadlines",     label: "Deadlines",     icon: Clock,           info: "All key dates — edit inline or sync to Google Calendar" },
  { id: "documents",     label: "Documents",     icon: FolderOpen,      info: "Upload, classify, and manage transaction documents" },
  { id: "compliance",    label: "Compliance",    icon: ShieldCheck,     info: "AI-powered scan for missing signatures and blockers" },
  { id: "financial_tools", label: "Financial Tools", icon: Receipt,     info: "Commission statements, fuel prorations, and deal expenses" },
];

const LISTING_TABS = [
  { id: "listing_intake", label: "Listing Intake", icon: ClipboardCheck, info: "Property details, pricing, photos, and listing checklist" },
  { id: "overview",      label: "Overview",      icon: LayoutDashboard, info: "Phase checklist, tasks, and compliance summary" },
  { id: "issues",        label: "Issues",        icon: AlertTriangle,   info: "Auto-detected issues: missing docs, signatures, deadlines" },
  { id: "timeline",      label: "Timeline",      icon: GitBranch,       info: "Chronological contract events and activity history" },
  { id: "deadlines",     label: "Deadlines",     icon: Clock,           info: "All key dates — edit inline or sync to Google Calendar" },
  { id: "documents",     label: "Documents",     icon: FolderOpen,      info: "Upload, classify, and manage transaction documents" },
  { id: "compliance",    label: "Compliance",    icon: ShieldCheck,     info: "AI-powered scan for missing signatures and blockers" },
  { id: "financial_tools", label: "Financial Tools", icon: Receipt,     info: "Commission statements, fuel prorations, and deal expenses" },
];

const PHASES = [
  "Pre-Contract", "Offer Drafting", "Offer Accepted", "Escrow Opened",
  "Inspection Period", "Repair Negotiation", "Appraisal Ordered",
  "Loan Processing", "Clear to Close", "Final Walkthrough", "Closing", "Post Closing",
];

const statusStyles = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  closed:    "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export default function TransactionDetail() {
  const hashSearch = window.location.hash.includes("?") ? window.location.hash.split("?")[1] : window.location.search;
  const urlParams = new URLSearchParams(hashSearch);
  const id = urlParams.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const urlTab = urlParams.get("tab");
  const [activeTab, setActiveTab] = useState(urlTab || "overview");
  const [selectedPhase, setSelectedPhase] = useState(1);
  const [mobileAIOpen, setMobileAIOpen] = useState(false);
  const [sendingTimeline, setSendingTimeline] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [invitingClient, setInvitingClient] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [alertDialog, setAlertDialog] = useState({ open: false, title: "", message: "" });
  const [contactsExpanded, setContactsExpanded] = useState(false);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list(),
  });

  const transaction = transactions.find((t) => t.id === id);

  const { data: checklistItems = [] } = useQuery({
    queryKey: ["checklist", id],
    queryFn: () => base44.entities.DocumentChecklistItem.filter({ transaction_id: id }),
    enabled: !!id,
  });

  const { data: txTasks = [], refetch: refetchTxTasks } = useQuery({
    queryKey: ["txTasks", id],
    queryFn: () => base44.entities.TransactionTask.filter({ transaction_id: id }),
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["tx-documents", id],
    queryFn: () => base44.entities.Document.filter({ transaction_id: id }, "-created_date"),
    enabled: !!id,
  });

  // Auto-switch to listing_intake tab for seller transactions
  useEffect(() => {
    if (transaction?.transaction_type === "seller" && !urlTab) {
      setActiveTab("listing_intake");
    }
  }, [transaction?.id]);

  // Track which phases have already been seeded this session
  const seededPhasesRef = useRef(new Set());
  const repairedRef = useRef(false);

  // ── Repair routine: archive incompatible tasks, re-seed correct ones ────────
  useEffect(() => {
    if (!transaction?.id || !txTasks || txTasks.length === 0) return;
    if (repairedRef.current) return;
    repairedRef.current = true;

    const txType = transaction.transaction_type;
    if (!txType) return; // no type set, skip repair

    const incompatible = txTasks.filter(t => isTaskIncompatible(t.title, txType));
    if (incompatible.length === 0) return;

    (async () => {
      // Log incompatible tasks to audit trail before removing
      await Promise.all(incompatible.map(t =>
        base44.entities.AuditLog.create({
          brokerage_id: transaction.brokerage_id,
          transaction_id: transaction.id,
          actor_email: "system",
          action: "incompatible_task_archived",
          entity_type: "task",
          entity_id: t.id,
          before: { title: t.title, phase: t.phase, is_completed: t.is_completed },
          after: null,
          description: `Task "${t.title}" archived — incompatible with ${txType} transaction type`,
        })
      ));
      // Delete incompatible tasks
      await Promise.all(incompatible.map(t => base44.entities.TransactionTask.delete(t.id)));
      refetchTxTasks();
    })();
  }, [transaction?.id, txTasks?.length]);

  // Auto-seed phase 1 once tasks are loaded (only once per transaction)
  useEffect(() => {
    if (!transaction?.id || !txTasks) return;
    if (seededPhasesRef.current.has(`${transaction.id}-${selectedPhase}`)) return;
    seedPhaseTasksIfNeeded(selectedPhase);
  }, [transaction?.id, txTasks]);

  // Seed TransactionTasks from library if none exist yet for a given phase
  const seedPhaseTasksIfNeeded = async (phaseNum) => {
    const key = `${id}-${phaseNum}`;
    if (seededPhasesRef.current.has(key)) return;
    seededPhasesRef.current.add(key);

    // Fetch fresh tasks to avoid stale closure issues
    const fresh = await base44.entities.TransactionTask.filter({ transaction_id: id });
    const existing = fresh.filter(t => t.phase === phaseNum);
    if (existing.length > 0) {
      // Deduplicate: keep first occurrence of each title, delete the rest
      const seen = new Map();
      const toDelete = [];
      existing.forEach(t => {
        if (seen.has(t.title)) {
          toDelete.push(t.id);
        } else {
          seen.set(t.title, t);
        }
      });
      if (toDelete.length > 0) {
        await Promise.all(toDelete.map(tid => base44.entities.TransactionTask.delete(tid)));
        refetchTxTasks();
      }
      return;
    }

    const libTasks = generateTasksForPhase(phaseNum, id, normalizeTransactionType(transaction?.transaction_type));
    await Promise.all(libTasks.map((t, i) =>
      base44.entities.TransactionTask.create({
        transaction_id: id,
        brokerage_id: transaction?.brokerage_id,
        phase: phaseNum,
        title: t.name,
        order_index: i,
        is_completed: false,
        is_required: t.required,
        is_custom: false,
        created_by: currentUser?.email,
      })
    ));
    refetchTxTasks();
  };

  const handleToggleTxTask = async (taskId) => {
    const task = txTasks.find(t => t.id === taskId);
    if (!task) return;
    // Optimistic update so PhaseChecklist re-renders immediately
    queryClient.setQueryData(["txTasks", id], (old = []) =>
      old.map(t => t.id === taskId ? { ...t, is_completed: !t.is_completed } : t)
    );
    await base44.entities.TransactionTask.update(taskId, { is_completed: !task.is_completed });
    refetchTxTasks();
    await writeAuditLog({
      brokerageId: transaction.brokerage_id, transactionId: transaction.id,
      actorEmail: currentUser?.email, action: "task_completed", entityType: "task",
      entityId: taskId, description: `Task "${task.title}" toggled`,
    });
    // Auto-complete phase if all required tasks done
    const updatedTasks = txTasks.map(t => t.id === taskId ? { ...t, is_completed: !t.is_completed } : t);
    const phaseDone = updatedTasks.filter(t => t.phase === task.phase && t.is_required).every(t => t.is_completed);
    if (phaseDone) {
      const completed = transaction.phases_completed || [];
      if (!completed.includes(task.phase)) handleTogglePhase(task.phase);
    }
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.functions.invoke("updateTransaction", { transaction_id: id, data }),
    onMutate: ({ id: txId, data }) => {
      queryClient.cancelQueries({ queryKey: ["transactions"] });
      const prev = queryClient.getQueryData(["transactions"]);
      queryClient.setQueryData(["transactions"], (old = []) =>
        old.map((t) => (t.id === txId ? { ...t, ...data } : t))
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(["transactions"], context.prev);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (txId) => base44.functions.invoke("deleteTransaction", { transaction_id: txId }),
    onSuccess: () => {
      setConfirmDelete(false);
      queryClient.removeQueries({ queryKey: ["transactions"] });
      navigate(createPageUrl("Transactions"));
    },
    onError: (err) => {
      setConfirmDelete(false);
      // If the response says success or 404, treat as success
      const msg = err?.message || "";
      if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
        queryClient.removeQueries({ queryKey: ["transactions"] });
        navigate(createPageUrl("Transactions"));
        return;
      }
      setAlertDialog({ open: true, title: "Delete Failed", message: msg || "Could not delete transaction. Check your permissions." });
    },
  });

  const handleTogglePhase = async (phaseNum) => {
    if (!transaction) return;
    const completed = transaction.phases_completed || [];
    const isCompleting = !completed.includes(phaseNum);
    const newCompleted = isCompleting
      ? [...completed, phaseNum]
      : completed.filter((n) => n !== phaseNum);
    const maxCompleted = newCompleted.length > 0 ? Math.max(...newCompleted) : 0;
    const newPhase = Math.min(maxCompleted + 1, 12);

    updateMutation.mutate({
      id: transaction.id,
      data: { phases_completed: newCompleted, phase: newPhase, last_activity_at: new Date().toISOString() },
    });

    await writeAuditLog({
      brokerageId: transaction.brokerage_id,
      transactionId: transaction.id,
      actorEmail: currentUser?.email,
      action: "phase_changed",
      entityType: "transaction",
      entityId: transaction.id,
      description: `Phase ${phaseNum} ${isCompleting ? "completed" : "unchecked"}`,
    });

    if (isCompleting) {
      const phaseName = PHASES[phaseNum - 1];
      const nextPhaseName = PHASES[phaseNum] || null;
      const subject = `Transaction Update: ${phaseName} Completed — ${transaction.address}`;
      const body = `Hello,\n\nThe <strong>${phaseName}</strong> phase has been completed for <strong>${transaction.address}</strong>.\n\n${nextPhaseName ? `Next up: <strong>${nextPhaseName}</strong>` : "This transaction is nearing its final stages."}\n\nBest regards,\nTC Manager`.trim();
      const recipients = [transaction.client_email, transaction.agent_email].filter(Boolean);
      await Promise.allSettled(recipients.map((to) => base44.integrations.Core.SendEmail({ to, subject, body })));
    }
  };

  const handleStatusChange = (newStatus) => {
    updateMutation.mutate({ id: transaction.id, data: { status: newStatus, last_activity_at: new Date().toISOString() } });
  };

  const handleInviteClient = async () => {
    const emails = transaction?.client_emails?.length
      ? transaction.client_emails
      : transaction?.client_email ? [transaction.client_email] : [];
    if (!emails.length) {
      setAlertDialog({ open: true, title: "No Client Email", message: "No client email on this transaction." });
      return;
    }
    setInvitingClient(true);

    // Generate a unique access code if one doesn't exist
    let code = transaction.client_access_code;
    if (!code) {
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
      code = `TC-${rand}`;
      await base44.functions.invoke("updateTransaction", { transaction_id: transaction.id, data: { client_access_code: code } });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    }

    const appUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "") + "/#/ClientLookup";
    const emailBody = `<p>Hello,</p>
<p>Your transaction coordinator has set up a status portal for your transaction at <strong>${transaction.address}</strong>.</p>
<p>Use the link and code below to check your transaction progress and key deadlines at any time — no account needed:</p>
<p style="margin:20px 0;">
  <a href="${appUrl}" style="background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Transaction Status</a>
</p>
<p><strong>Your Access Code: <span style="font-size:20px;letter-spacing:2px;color:#2563EB;">${code}</span></strong></p>
<p style="color:#666;font-size:13px;">Keep this code handy — you'll use it each time you check your status.</p>
<p>Best regards,<br/>TC Manager</p>`;

    await Promise.allSettled(emails.map(to =>
      base44.functions.invoke("sendGmailEmail", {
        to: [to],
        subject: `Your Transaction Access Code — ${transaction.address}`,
        body: emailBody,
        transaction_id: transaction.id,
        brokerage_id: transaction.brokerage_id,
      })
    ));

    setAlertDialog({
      open: true,
      title: "Invite Sent!",
      message: `Access code ${code} sent to ${emails.join(", ")}. They can use it at the Client Lookup page — no login required.`,
    });
    setInvitingClient(false);
  };

  const handleSendTimeline = async () => {
    if (!transaction) return;
    setSendingTimeline(true);
    const deadlines = [
      { label: "Earnest Money Deposit", date: transaction.earnest_money_deadline },
      { label: "Inspection Deadline", date: transaction.inspection_deadline },
      { label: "Due Diligence Deadline", date: transaction.due_diligence_deadline },
      { label: "Appraisal Deadline", date: transaction.appraisal_deadline },
      { label: "Financing Commitment", date: transaction.financing_deadline },
      { label: "Closing / Transfer of Title", date: transaction.closing_date },
    ].filter((d) => d.date);
    const formatSafe = (dateStr) => { const d = new Date(dateStr); return isNaN(d.getTime()) ? dateStr : format(d, "MMM d, yyyy"); };
    const deadlineRows = deadlines.length > 0
      ? deadlines.map((d) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${d.label}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;">${formatSafe(d.date)}</td></tr>`).join("")
      : "<tr><td colspan='2' style='padding:8px 12px;color:#999;'>No deadlines set.</td></tr>";
    const body = `<p>Hello,</p><p>Here is the key deadline timeline for <strong>${transaction.address}</strong>:</p><table style="border-collapse:collapse;width:100%;max-width:480px;">${deadlineRows}</table><p>Best regards,<br/>TC Manager</p>`;
    const recipients = [transaction.client_email, transaction.agent_email].filter(Boolean);
    const results = await Promise.allSettled(recipients.map((to) => base44.integrations.Core.SendEmail({ to, subject: `Key Deadlines — ${transaction.address}`, body })));
    setSendingTimeline(false);
    const sent = recipients.filter((_, i) => results[i].status === "fulfilled");
    setAlertDialog({
      open: true,
      title: sent.length > 0 ? "Timeline Sent" : "No Emails Sent",
      message: sent.length > 0 ? `Timeline sent to: ${sent.join(", ")}.` : "No recipient emails found on this transaction.",
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 w-full min-w-0">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20 w-full min-w-0">
        <p className="text-gray-500 mb-4">Transaction not found.</p>
        <Link to={createPageUrl("Transactions")}>
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Transactions</Button>
        </Link>
      </div>
    );
  }

  // Compute attention items
  const now = new Date();
  const attentionItems = [];
  const deadlineFields = [
    { key: "inspection_deadline", label: "Inspection" },
    { key: "due_diligence_deadline", label: "Due Diligence" },
    { key: "financing_deadline", label: "Financing" },
    { key: "appraisal_deadline", label: "Appraisal" },
    { key: "closing_date", label: "Closing" },
    { key: "earnest_money_deadline", label: "Earnest Money" },
  ];
  deadlineFields.forEach(({ key, label }) => {
    const d = transaction[key];
    if (!d) return;
    const date = new Date(d);
    const diffHrs = (date - now) / 36e5;
    if (diffHrs < 0) attentionItems.push({ type: "deadline", label: `${label} OVERDUE`, tab: "deadlines", urgent: true });
    else if (diffHrs < 48) attentionItems.push({ type: "deadline", label: `${label} in ${Math.round(diffHrs)}h`, tab: "deadlines", urgent: diffHrs < 24 });
  });
  const overdueTasks = txTasks.filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < now);
  if (overdueTasks.length > 0) attentionItems.push({ type: "task", label: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`, tab: "overview", urgent: true });

  const tabs = transaction.transaction_type === "seller" ? LISTING_TABS : TX_TABS;

  return (
    <div className="flex flex-col -mx-4 -mb-4 lg:-mx-5 lg:-mb-5 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>

      <EmailComposerModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        transaction={transaction}
        documents={documents}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => deleteMutation.mutate(transaction.id)}
        onCancel={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={alertDialog.open}
        title={alertDialog.title}
        message={alertDialog.message}
        confirmText="OK"
        cancelText=""
        variant="default"
        onConfirm={() => setAlertDialog({ open: false, title: "", message: "" })}
        onCancel={() => setAlertDialog({ open: false, title: "", message: "" })}
      />

      {/* Mobile AI Drawer */}
      {mobileAIOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileAIOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-hidden flex flex-col"
            style={{ height: "72vh", background: "var(--card-bg)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "var(--card-border)" }}>
              <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>AI Assistant · {transaction.address}</span>
              <button onClick={() => setMobileAIOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TCAIAssistant transaction={transaction} currentUser={currentUser} />
            </div>
          </div>
        </div>
      )}

      {/* ── TOP HEADER BAR ── */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b" style={{ borderColor: "var(--card-border)", background: "var(--bg-secondary)" }}>
        {/* Row 1: Back + address + badges + actions */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <Link to={createPageUrl("Transactions")}>
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-800 -ml-2 h-8">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-blue-500" />
            </div>
            <EditableAddress
              value={transaction.address}
              onSave={v => updateMutation.mutate({ id: transaction.id, data: { address: v } })}
            />
            <Badge variant="outline" className={`text-xs capitalize flex-shrink-0 ${statusStyles[transaction.status] || statusStyles.active}`}>
              {transaction.status || "active"}
            </Badge>
            <Badge variant="outline" className={`text-xs font-semibold capitalize flex-shrink-0 ${
              (transaction.transaction_type === "seller" || transaction.transaction_type === "listing")
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-blue-50 text-blue-700 border-blue-300"
            }`}>
              {(transaction.transaction_type === "seller" || transaction.transaction_type === "listing") ? "🟢 Listing" : "🔵 Buyer"}
            </Badge>
            <HealthScoreBadge
              healthScore={transaction.health_score ?? computeHealthScore(transaction, checklistItems).health_score}
              riskLevel={transaction.risk_level ?? computeHealthScore(transaction, checklistItems).risk_level}
            />
            <SkySlopeSyncBadge
              transaction={transaction}
              onSynced={() => queryClient.invalidateQueries({ queryKey: ["transactions"] })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
            <Select value={transaction.transaction_phase || "intake"}
              onValueChange={(v) => updateMutation.mutate({ id: transaction.id, data: { transaction_phase: v, last_activity_at: new Date().toISOString() } })}>
              <SelectTrigger className="h-8 w-38 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="intake">Intake</SelectItem>
                <SelectItem value="under_contract">Under Contract</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="financing">Financing</SelectItem>
                <SelectItem value="appraisal">Appraisal</SelectItem>
                <SelectItem value="clear_to_close">Clear to Close</SelectItem>
                <SelectItem value="closing">Closing</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 text-blue-600 hover:bg-blue-50 border-blue-200" onClick={() => setEmailModalOpen(true)}>
              <MailIcon className="w-3.5 h-3.5 mr-1" /> Email
            </Button>
            <UnderContractEmailButton transaction={transaction} currentUser={currentUser} documents={documents} />
            <Button variant="outline" size="sm" className="h-8 text-indigo-600 hover:bg-indigo-50 border-indigo-200" onClick={handleInviteClient} disabled={invitingClient}>
              <UserPlus className="w-3.5 h-3.5 mr-1" />{invitingClient ? "Sending…" : "Invite"}
            </Button>
            {(transaction.transaction_type === "seller" || transaction.phase <= 2) && (
              <ConvertToTransactionButton transaction={transaction} onConverted={() => queryClient.invalidateQueries({ queryKey: ["transactions"] })} />
            )}
            <Button variant="outline" size="sm" className="h-8 text-red-600 hover:bg-red-50 border-red-200" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <QuickFeedbackButton defaultType="bug" label="Report" variant="badge"
              className="border-gray-200 text-gray-500 hover:border-gray-300 h-8"
              context={{ transaction_id: transaction?.id, transaction_address: transaction?.address, route_name: "Transaction Page" }} />
          </div>
        </div>

        {/* Row 2: Meta strip + attention items */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
            {transaction.contract_date && <span><span className="font-medium" style={{ color: "var(--text-secondary)" }}>Contract:</span> {transaction.contract_date}</span>}
            {transaction.closing_date && <span><span className="font-medium" style={{ color: "var(--text-secondary)" }}>Closing:</span> {transaction.closing_date}</span>}
            {transaction.sale_price && <span><span className="font-medium" style={{ color: "var(--text-secondary)" }}>Price:</span> ${transaction.sale_price?.toLocaleString()}</span>}
            {transaction.is_cash_transaction && <span className="text-emerald-600 font-semibold">Cash</span>}
          </div>
          {attentionItems.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap ml-auto">
              <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              {attentionItems.map((item, i) => (
                <button key={i} onClick={() => setActiveTab(item.tab)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                    item.urgent ? "bg-red-50 border-red-300 text-red-600" : "bg-amber-50 border-amber-300 text-amber-700"
                  }`}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN 2-COLUMN BODY ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT COLUMN — 70% */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-5 space-y-4">

          {/* Contacts — collapsible */}
          <div className="rounded-xl border" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <button
              className="w-full flex items-center justify-between px-4 py-2.5 text-left"
              onClick={() => setContactsExpanded(e => !e)}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Parties</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {[transaction.agent, transaction.buyers_agent_name, transaction.sellers_agent_name, transaction.lender_name].filter(Boolean).join(" · ") || "Buyers, Sellers, Agents, Vendors"}
                </span>
              </div>
              {contactsExpanded
                ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                : <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />}
            </button>
            {contactsExpanded && (
              <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--card-border)" }}>
                <ContactsSection
                  transaction={transaction}
                  currentUser={currentUser}
                  onUpdate={(data) => updateMutation.mutate({ id: transaction.id, data })}
                />
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 rounded-xl overflow-x-auto scrollbar-none" style={{ background: "var(--bg-tertiary)" }}>
            {tabs.map(({ id: tabId, label, icon: TabIcon, info }) => (
              <button key={tabId} onClick={() => setActiveTab(tabId)}
                className={`group flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === tabId ? "shadow-sm" : ""
                }`}
                style={activeTab === tabId
                  ? { background: "var(--card-bg)", color: "var(--text-primary)" }
                  : { color: "var(--text-muted)" }}>
                <TabIcon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* ── Tab: Overview ── */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {txTasks.some(t => isTaskIncompatible(t.title, transaction.transaction_type)) && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  <span className="text-lg">⚠️</span>
                  <div>
                    <p className="font-semibold">Wrong-type tasks detected</p>
                    <p className="text-xs text-amber-700 mt-0.5">Reload to auto-repair incompatible tasks.</p>
                  </div>
                </div>
              )}
              <UnifiedPhaseBoard
                tasks={txTasks}
                onToggleTask={handleToggleTxTask}
                onTasksChanged={refetchTxTasks}
                transactionId={transaction.id}
                brokerageId={transaction.brokerage_id}
                transactionType={transaction.transaction_type}
                transaction={transaction}
              />
              {checklistItems.length > 0 && (
                <Card className="shadow-sm border-gray-100">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4 text-blue-500" /> Document Checklist
                      </CardTitle>
                      <span className="text-xs text-gray-400">
                        {checklistItems.filter((i) => i.status === "approved").length}/{checklistItems.length} approved
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DocChecklistPanel items={checklistItems} currentUser={currentUser}
                      transactionId={transaction.id} brokerageId={transaction.brokerage_id} />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── Tab: Issues ── */}
          {activeTab === "issues" && (
            <div className="theme-card p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Issue Detection</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Auto-scanned for missing documents, signatures, upcoming deadlines, and workflow gaps.</p>
              </div>
              <IssueDetectionPanel transaction={transaction} />
            </div>
          )}

          {/* ── Tab: Timeline ── */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              <Card className="shadow-sm border-gray-100">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Phase Progress</CardTitle></CardHeader>
                <CardContent>
                  <TransactionTimeline phasesCompleted={transaction.phases_completed || []} currentPhase={transaction.phase || 1} />
                </CardContent>
              </Card>
              <Card className="shadow-sm border-gray-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Activity History</CardTitle>
                </CardHeader>
                <CardContent><TransactionActivityFeed transactionId={transaction.id} /></CardContent>
              </Card>
            </div>
          )}

          {/* ── Tab: Deadlines ── */}
          {activeTab === "deadlines" && (
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Deadlines</CardTitle>
                  <Button size="sm" variant="outline" className="text-blue-600 hover:bg-blue-50 border-blue-200"
                    onClick={handleSendTimeline} disabled={sendingTimeline}>
                    <Send className="w-3.5 h-3.5 mr-1.5" />{sendingTimeline ? "Sending…" : "Send Timeline"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <UnifiedDeadlinesPanel
                  transaction={transaction}
                  onSave={(changes) => updateMutation.mutate({ id: transaction.id, data: { ...changes, last_activity_at: new Date().toISOString() } })}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === "documents" && <TransactionDocumentsTab transaction={transaction} currentUser={currentUser} />}
          {activeTab === "compliance" && <ComplianceScanPanel transaction={transaction} currentUser={currentUser} />}
          {activeTab === "financial_tools" && <TransactionFinancialTools transaction={transaction} currentUser={currentUser} />}
          {activeTab === "listing_intake" && (
            <ListingIntakeTab
              transaction={transaction}
              onSave={(changes) => updateMutation.mutate({ id: transaction.id, data: { ...changes, last_activity_at: new Date().toISOString() } })}
            />
          )}
        </div>

        {/* RIGHT COLUMN — 30% */}
        <div className="hidden lg:flex flex-col border-l flex-shrink-0" style={{ width: "30%", minWidth: "300px", maxWidth: "420px", borderColor: "var(--card-border)", background: "var(--bg-secondary)" }}>

          {/* Compliance Monitor */}
          <div className="flex-shrink-0 border-b p-3" style={{ borderColor: "var(--card-border)" }}>
            <ComplianceMonitorWidget
              transaction={transaction}
              onNavigateToCompliance={() => setActiveTab("compliance")}
            />
          </div>

          {/* Notes — fills remaining height */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <NotesPanel transaction={transaction} currentUser={currentUser} />
          </div>
        </div>
      </div>

      {/* Floating AI button */}
      <button
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-3 py-2.5 rounded-full shadow-lg transition-all hover:scale-105"
        style={{ background: "#2563eb", color: "#ffffff" }}
        onClick={() => setMobileAIOpen(true)}
        title="Ask AI Assistant"
      >
        <Bot className="w-4 h-4" />
        <span className="text-xs font-semibold hidden sm:inline">Ask AI</span>
      </button>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
      )}
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-sm font-medium break-words ${highlight ? "text-blue-600" : "text-gray-900"}`}>{value}</p>
      </div>
    </div>
  );
}

function EditableAddress({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  const handleSave = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== value) onSave(draft.trim());
  };

  return editing ? (
    <div className="flex items-center gap-1">
      <input
        className="text-xl font-semibold border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 w-72"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
        autoFocus
      />
      <button onClick={handleSave} className="text-blue-600 hover:text-blue-800 text-xs font-semibold px-1">✓</button>
      <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 text-xs px-1">✕</button>
    </div>
  ) : (
    <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => { setDraft(value || ""); setEditing(true); }}>
      <span className="text-xl font-semibold text-gray-900">{value}</span>
      <Pencil className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function ClientEmailsField({ emails, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(emails);

  const startEdit = () => { setDraft(emails.length ? [...emails] : [""]); setEditing(true); };
  const handleSave = () => { setEditing(false); onSave(draft.filter(Boolean)); };

  if (!editing) {
    return (
      <div className="flex items-start gap-2.5 group">
        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Mail className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium">Client Email(s)</p>
          <div className="flex items-start gap-1 flex-wrap">
            <div className="flex-1 min-w-0">
              {emails.length === 0
                ? <p className="text-sm font-medium text-gray-900">—</p>
                : emails.map((e, i) => <p key={i} className="text-sm font-medium break-words text-gray-900">{e}</p>)
              }
            </div>
            <button onClick={startEdit} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100 mt-0.5" title="Edit">
              <Pencil className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Mail className="w-4 h-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-xs text-gray-500 font-medium">Client Email(s)</p>
        {draft.map((e, i) => (
          <div key={i} className="flex gap-1 items-center">
            <input
              type="email"
              className="text-sm border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 flex-1"
              value={e}
              onChange={ev => { const n = [...draft]; n[i] = ev.target.value; setDraft(n); }}
              autoFocus={i === 0}
            />
            {draft.length > 1 && (
              <button onClick={() => setDraft(draft.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 p-0.5">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2 pt-0.5">
          <button onClick={() => setDraft([...draft, ""])} className="text-xs text-blue-600 hover:underline">+ Add email</button>
          <button onClick={handleSave} className="text-blue-600 hover:text-blue-800 text-xs font-semibold px-1">✓ Save</button>
          <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 text-xs px-1">✕</button>
        </div>
      </div>
    </div>
  );
}

function formatPhone(val) {
  if (!val) return val;
  const digits = val.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === "1") return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  return val;
}

function EditableInfoItem({ icon: Icon, label, value, onSave, type = "text" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  const handleSave = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  const displayValue = type === "tel" ? formatPhone(value) : value;

  return (
    <div className="flex items-start gap-2.5 group">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        {editing ? (
          <div className="flex items-center gap-1 mt-0.5">
            <input
              type={type}
              className="text-sm border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 w-full"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
              autoFocus
            />
            <button onClick={handleSave} className="text-blue-600 hover:text-blue-800 text-xs font-semibold px-1">✓</button>
            <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 text-xs px-1">✕</button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium break-words text-gray-900">{displayValue || "—"}</p>
            <button
              onClick={() => { setDraft(value || ""); setEditing(true); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-100"
              title="Edit"
            >
              <Pencil className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}