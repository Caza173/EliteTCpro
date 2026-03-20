import React, { useState, useRef, useEffect } from "react";
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
  MessageSquare, X, Pencil, Mail as MailIcon, Receipt,
} from "lucide-react";
import { format } from "date-fns";
import PhaseChecklist from "../components/transactions/PhaseChecklist";
import TransactionTimeline from "../components/transactions/TransactionTimeline";
import TaskList from "../components/transactions/TaskList";
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

const TX_TABS = [
  { id: "overview",   label: "Overview",   icon: LayoutDashboard },
  { id: "timeline",   label: "Timeline",   icon: GitBranch },
  { id: "deadlines",  label: "Deadlines",  icon: Clock },
  { id: "documents",  label: "Documents",  icon: FolderOpen },
  { id: "finance",    label: "Finance",    icon: DollarSign },
  { id: "compliance", label: "Compliance", icon: ShieldCheck },
  { id: "financial_tools", label: "Financial Tools", icon: Receipt },
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

  const [activeTab, setActiveTab] = useState("overview");
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [aiWidth, setAiWidth] = useState(380);
  const [mobileAIOpen, setMobileAIOpen] = useState(false);
  const [sendingTimeline, setSendingTimeline] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [invitingClient, setInvitingClient] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [alertDialog, setAlertDialog] = useState({ open: false, title: "", message: "" });

  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onResizeMouseDown = (e) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = aiWidth;
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      setAiWidth(Math.max(320, Math.min(560, startWidth.current + (e.clientX - startX.current))));
    };
    const onMouseUp = () => { isDragging.current = false; };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

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
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      navigate(createPageUrl("Transactions"));
    },
    onError: (err) => {
      setConfirmDelete(false);
      setAlertDialog({ open: true, title: "Delete Failed", message: err?.message || "Could not delete transaction. Check your permissions." });
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
    if (!transaction?.client_email) {
      setAlertDialog({ open: true, title: "No Client Email", message: "No client email on this transaction." });
      return;
    }
    setInvitingClient(true);
    try {
      await base44.users.inviteUser(transaction.client_email, "user");
      await base44.integrations.Core.SendEmail({
        to: transaction.client_email,
        subject: `You've been invited to track your transaction — ${transaction.address}`,
        body: `<p>Hello,</p><p>Your transaction coordinator has invited you to view the progress of your transaction at <strong>${transaction.address}</strong>.</p><p>Best regards,<br/>TC Manager</p>`,
      });
      setAlertDialog({ open: true, title: "Invite Sent", message: `Client invite sent to ${transaction.client_email}` });
    } catch (e) {
      setAlertDialog({ open: true, title: "Invite Sent", message: "Invite sent (client may already have an account)." });
    }
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

  return (
    <div className="flex -mx-4 -mb-4 lg:-mx-8 lg:-mb-8 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>

      <EmailComposerModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        transaction={transaction}
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
        <div className="lg:hidden fixed inset-0 z-50">
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

      {/* Left AI Panel (Desktop) */}
      {!aiCollapsed && (
        <aside className="hidden lg:flex flex-col border-r flex-shrink-0 overflow-hidden"
          style={{ width: aiWidth, borderColor: "var(--card-border)", background: "var(--bg-secondary)" }}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0"
            style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>AI Assistant</span>
            <button onClick={() => setAiCollapsed(true)} className="p-1.5 rounded-lg transition-colors hover:bg-gray-200" title="Collapse AI panel">
              <PanelLeftClose className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <TCAIAssistant transaction={transaction} currentUser={currentUser} />
          </div>
        </aside>
      )}

      {/* Resize Handle */}
      {!aiCollapsed && (
        <div className="hidden lg:block w-1.5 flex-shrink-0 cursor-col-resize hover:bg-blue-400 transition-colors"
          style={{ background: "var(--card-border)" }}
          onMouseDown={onResizeMouseDown} />
      )}

      {/* Right: Transaction Content */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-8 space-y-6">

        {aiCollapsed && (
          <button onClick={() => setAiCollapsed(false)}
            className="hidden lg:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-blue-50"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
            <PanelLeftOpen className="w-3.5 h-3.5" /> Show AI Assistant
          </button>
        )}

        {/* Back + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link to={createPageUrl("Transactions")}>
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={transaction.status || "active"} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={transaction.property_type || "residential"}
              onValueChange={(v) => updateMutation.mutate({ id: transaction.id, data: { property_type: v } })}
            >
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="condo">Condo</SelectItem>
                <SelectItem value="land">Land</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="multi_family">Multi-Family</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={transaction.transaction_phase || "intake"}
              onValueChange={(v) => updateMutation.mutate({ id: transaction.id, data: { transaction_phase: v, last_activity_at: new Date().toISOString() } })}
            >
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
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
            <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
              onClick={() => setEmailModalOpen(true)}>
              <MailIcon className="w-4 h-4 mr-1" /> Send Email
            </Button>
            <Button variant="outline" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200"
              onClick={handleInviteClient} disabled={invitingClient}>
              <UserPlus className="w-4 h-4 mr-1" />
              {invitingClient ? "Sending..." : "Invite Client"}
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => setConfirmDelete(true)}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-xl">{transaction.address}</CardTitle>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className={`text-xs capitalize ${statusStyles[transaction.status] || statusStyles.active}`}>
                      {transaction.status || "active"}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize bg-gray-50 text-gray-600">
                      {transaction.transaction_type || "buyer"}
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
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <EditableInfoItem icon={User} label={transaction.buyers?.length > 1 ? "Buyers" : "Buyer"}
                value={transaction.buyers?.length ? transaction.buyers.join(", ") : (transaction.buyer || "")}
                onSave={v => updateMutation.mutate({ id: transaction.id, data: { buyer: v, buyers: v ? [v] : [] } })} />
              <EditableInfoItem icon={Users} label={transaction.sellers?.length > 1 ? "Sellers" : "Seller"}
                value={transaction.sellers?.length ? transaction.sellers.join(", ") : (transaction.seller || "")}
                onSave={v => updateMutation.mutate({ id: transaction.id, data: { seller: v, sellers: v ? [v] : [] } })} />
              <EditableInfoItem icon={User} label="Buyer's Agent"
                value={transaction.buyers_agent_name || ""}
                onSave={v => updateMutation.mutate({ id: transaction.id, data: { buyers_agent_name: v } })} />
              <EditableInfoItem icon={User} label="Buyer Brokerage"
                value={transaction.buyer_brokerage || ""}
                onSave={v => updateMutation.mutate({ id: transaction.id, data: { buyer_brokerage: v } })} />
              <EditableInfoItem icon={User} label="Seller's Agent"
                value={transaction.sellers_agent_name || ""}
                onSave={v => updateMutation.mutate({ id: transaction.id, data: { sellers_agent_name: v } })} />
              <EditableInfoItem icon={User} label="Seller Brokerage"
                value={transaction.seller_brokerage || ""}
                onSave={v => updateMutation.mutate({ id: transaction.id, data: { seller_brokerage: v } })} />
              <EditableInfoItem icon={User} label="Transaction Coordinator"
                value={transaction.agent || ""}
                onSave={v => updateMutation.mutate({ id: transaction.id, data: { agent: v } })} />
              <EditableInfoItem icon={Mail} label="Client Email"
                value={transaction.client_email || ""}
                type="email"
                onSave={v => updateMutation.mutate({ id: transaction.id, data: { client_email: v } })} />
              <EditableInfoItem icon={Phone} label="Client Phone"
                value={transaction.client_phone || ""}
                type="tel"
                onSave={v => updateMutation.mutate({ id: transaction.id, data: { client_phone: v } })} />
              <EditableInfoItem icon={Calendar} label="Closing / Title Company"
                value={transaction.closing_title_company || ""}
                onSave={v => updateMutation.mutate({ id: transaction.id, data: { closing_title_company: v } })} />
              <EditableInfoItem icon={Calendar} label="Contract Date"
                value={transaction.contract_date || ""}
                type="date"
                onSave={v => updateMutation.mutate({ id: transaction.id, data: { contract_date: v } })} />
              {transaction.property_type && (
                <InfoItem label="Property Type" value={
                  { residential: "Residential", condo: "Condo", land: "Land", commercial: "Commercial", multi_family: "Multi-Family", other: "Other" }[transaction.property_type] || transaction.property_type
                } />
              )}
              {transaction.transaction_phase && (
                <InfoItem label="Transaction Phase" value={
                  { intake: "Intake", under_contract: "Under Contract", inspection: "Inspection", financing: "Financing", appraisal: "Appraisal", clear_to_close: "Clear to Close", closing: "Closing", closed: "Closed" }[transaction.transaction_phase] || transaction.transaction_phase
                } highlight />
              )}
              <InfoItem label="Workflow Phase" value={PHASES[(transaction.phase || 1) - 1]} />
              {transaction.is_cash_transaction && <InfoItem label="Financing" value="Cash Transaction" />}
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto scrollbar-none -mx-1 px-1">
          {TX_TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button key={tabId} onClick={() => setActiveTab(tabId)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tabId ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-gray-100">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Transaction Phases</CardTitle>
                <p className="text-sm text-gray-500">Check off phases as completed.</p>
              </CardHeader>
              <CardContent>
                <PhaseChecklist
                  phasesCompleted={transaction.phases_completed || []}
                  currentPhase={transaction.phase || 1}
                  onTogglePhase={handleTogglePhase}
                  tasks={transaction.tasks || []}
                />
              </CardContent>
            </Card>
            <Card className="shadow-sm border-gray-100 relative z-10">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Tasks</CardTitle>
                <p className="text-sm text-gray-500">
                  {(transaction.tasks || []).filter((t) => t.completed).length} / {(transaction.tasks || []).length} completed
                </p>
              </CardHeader>
              <CardContent className="overflow-visible">
                <TaskList
                  tasks={transaction.tasks || []}
                  onToggleTask={async (taskId) => {
                    // Optimistically update local state
                    const updatedTasks = (transaction.tasks || []).map((task) =>
                      task.id === taskId ? { ...task, completed: !task.completed } : task
                    );
                    queryClient.setQueryData(["transactions"], (old = []) =>
                      old.map((t) => t.id === transaction.id ? { ...t, tasks: updatedTasks } : t)
                    );
                    // Use backend function to bypass RLS restrictions
                    await base44.functions.invoke("toggleTask", { transaction_id: transaction.id, tasks: updatedTasks });
                    queryClient.invalidateQueries({ queryKey: ["transactions"] });
                    await writeAuditLog({
                      brokerageId: transaction.brokerage_id, transactionId: transaction.id,
                      actorEmail: currentUser?.email, action: "task_completed", entityType: "task",
                      entityId: taskId, description: `Task ${taskId} toggled by ${currentUser?.email}`,
                    });
                  }}
                />
              </CardContent>
            </Card>
            {/* Compliance Monitor Widget */}
            <div className="lg:col-span-2">
              <ComplianceMonitorWidget
                transaction={transaction}
                onNavigateToCompliance={() => setActiveTab("compliance")}
              />
            </div>

            {checklistItems.length > 0 && (
              <Card className="shadow-sm border-gray-100 lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
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

        {/* Tab: Timeline */}
        {activeTab === "timeline" && (
          <div className="space-y-5">
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Contract Timeline</CardTitle>
                <p className="text-sm text-gray-500">Deadlines and linked tasks in chronological order</p>
              </CardHeader>
              <CardContent><ContractTimeline transaction={transaction} /></CardContent>
            </Card>
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Phase Progress</CardTitle></CardHeader>
              <CardContent>
                <TransactionTimeline phasesCompleted={transaction.phases_completed || []} currentPhase={transaction.phase || 1} />
              </CardContent>
            </Card>
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Activity History</CardTitle>
                <p className="text-sm text-gray-500">All recorded events for this transaction</p>
              </CardHeader>
              <CardContent><TransactionActivityFeed transactionId={transaction.id} /></CardContent>
            </Card>
          </div>
        )}

        {/* Tab: Deadlines */}
        {activeTab === "deadlines" && (
          <Card className="shadow-sm border-gray-100">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Key Deadlines</CardTitle>
                  <p className="text-sm text-gray-500">Click the pencil to edit any date</p>
                </div>
                <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                  onClick={handleSendTimeline} disabled={sendingTimeline}>
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {sendingTimeline ? "Sending..." : "Send Timeline"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <EditableDeadlinePanel transaction={transaction}
                onSave={(changes) => updateMutation.mutate({ id: transaction.id, data: { ...changes, last_activity_at: new Date().toISOString() } })} />
            </CardContent>
          </Card>
        )}

        {activeTab === "documents" && (
          <TransactionDocumentsTab transaction={transaction} currentUser={currentUser} />
        )}

        {activeTab === "finance" && (
          <FinanceTab transaction={transaction} currentUser={currentUser} />
        )}

        {activeTab === "compliance" && (
          <ComplianceScanPanel transaction={transaction} currentUser={currentUser} />
        )}

        {activeTab === "financial_tools" && (
          <TransactionFinancialTools transaction={transaction} currentUser={currentUser} />
        )}
      </div>

      {/* Mobile floating Ask AI button */}
      <button
        className="lg:hidden fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg hover:opacity-90 transition-opacity"
        style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        onClick={() => setMobileAIOpen(true)}
      >
        <MessageSquare className="w-4 h-4" />
        <span className="text-sm font-semibold">Ask AI</span>
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

function EditableInfoItem({ icon: Icon, label, value, onSave, type = "text" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  const handleSave = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

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
            <p className="text-sm font-medium break-words text-gray-900">{value || "—"}</p>
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