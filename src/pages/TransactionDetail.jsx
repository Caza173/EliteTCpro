import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { useDealAccess } from "../lib/useDealAccess";
import { evaluateDeadline, getAlertableDeadlines } from "../lib/deadlineUtils";
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

import EmailComposerModal from "../components/email/EmailComposerModal";
import UnderContractEmailButton from "../components/email/UnderContractEmailButton";
import MarkUnderContractButton from "../components/transactions/MarkUnderContractButton";
import ListingIntakeTab from "../components/transactions/ListingIntakeTab";
import UnifiedDeadlinesPanel from "../components/transactions/UnifiedDeadlinesPanel";
import ContactsSection from "../components/transactions/ContactsSection";
import PortalAccessCell from "../components/user/PortalAccessCell";
import IssueDetectionPanel from "../components/issues/IssueDetectionPanel";
import { detectIssues } from "../lib/issueDetector";
import QuickFeedbackButton from "../components/feedback/QuickFeedbackButton";
import NotesPanel from "../components/transactions/NotesPanel";
import UnderContractCommsPanel from "../components/comms/UnderContractCommsPanel";
import CollaboratorsPanel from "../components/collaborators/CollaboratorsPanel";
import SendTimelineModal from "../components/transactions/SendTimelineModal";
import InspectionPanel from "../components/transactions/InspectionPanel";
import InviteClientModal from "../components/transactions/InviteClientModal";

const TX_TABS = [
  { id: "overview",      label: "Overview",      icon: LayoutDashboard, info: "Phase checklist, tasks, and compliance summary" },
  { id: "issues",        label: "Issues",        icon: AlertTriangle,   info: "Auto-detected issues: missing docs, signatures, deadlines" },
  { id: "deadlines",     label: "Deadlines",     icon: Clock,           info: "All key dates — edit inline or sync to Google Calendar" },
  { id: "documents",     label: "Documents",     icon: FolderOpen,      info: "Upload, classify, and manage transaction documents" },
  { id: "compliance",    label: "Compliance",    icon: ShieldCheck,     info: "AI-powered scan for missing signatures and blockers" },
  { id: "communications", label: "Communications", icon: Send,          info: "Atlas under-contract communications and status" },
  { id: "financial_tools", label: "Financial Tools", icon: Receipt,     info: "Commission statements, fuel prorations, and deal expenses" },
  { id: "team",          label: "Team",          icon: Users,           info: "Manage TC collaborators, roles, and task assignments" },
];

const LISTING_TABS = [
  { id: "listing_intake", label: "Listing Intake", icon: ClipboardCheck, info: "Property details, pricing, photos, and listing checklist" },
  { id: "overview",       label: "Overview",       icon: LayoutDashboard, info: "Phase checklist, tasks, and compliance summary" },
  { id: "issues",         label: "Issues",         icon: AlertTriangle,   info: "Auto-detected issues: missing docs, signatures, deadlines" },
  { id: "deadlines",      label: "Deadlines",      icon: Clock,           info: "All key dates — edit inline or sync to Google Calendar" },
  { id: "documents",      label: "Documents",      icon: FolderOpen,      info: "Upload, classify, and manage transaction documents" },
  { id: "compliance",     label: "Compliance",     icon: ShieldCheck,     info: "AI-powered scan for missing signatures and blockers" },
  { id: "communications", label: "Communications", icon: Send,            info: "Atlas under-contract communications and status" },
  { id: "financial_tools", label: "Financial Tools", icon: Receipt,       info: "Commission statements, fuel prorations, and deal expenses" },
  { id: "team",           label: "Team",           icon: Users,           info: "Manage TC collaborators, roles, and task assignments" },
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
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { canAccess, isLoading: accessLoading } = useDealAccess();

  const urlSearch = new URLSearchParams(window.location.search);
  const urlTab = urlSearch.get("tab");
  const [activeTab, setActiveTab] = useState(urlTab || "overview");
  
  // Debug logging
  useEffect(() => {
    console.log("TransactionDetail - Route ID:", id);
  }, [id]);
  const [selectedPhase, setSelectedPhase] = useState(1);
  const [mobileAIOpen, setMobileAIOpen] = useState(false);
  const [sendingTimeline, setSendingTimeline] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [invitingClient, setInvitingClient] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [alertDialog, setAlertDialog] = useState({ open: false, title: "", message: "" });
  const [contactsExpanded, setContactsExpanded] = useState(false);

  // Resizable notes panel
  const NOTES_MIN = 320;
  const NOTES_MAX = 600;
  const NOTES_DEFAULT = 420;
  const [notesWidth, setNotesWidth] = useState(() => {
    const saved = localStorage.getItem("notesPanelWidth");
    return saved ? Math.min(NOTES_MAX, Math.max(NOTES_MIN, parseInt(saved))) : NOTES_DEFAULT;
  });
  const [notesCollapsed, setNotesCollapsed] = useState(false);
  const isResizingNotes = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  const onNotesResizeMouseDown = (e) => {
    isResizingNotes.current = true;
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = notesWidth;
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isResizingNotes.current) return;
      // dragging left increases notes width (handle is on left edge of notes panel)
      const delta = resizeStartX.current - e.clientX;
      const newWidth = Math.min(NOTES_MAX, Math.max(NOTES_MIN, resizeStartWidth.current + delta));
      setNotesWidth(newWidth);
    };
    const onMouseUp = () => {
      if (isResizingNotes.current) {
        isResizingNotes.current = false;
        setNotesWidth(w => { localStorage.setItem("notesPanelWidth", String(w)); return w; });
      }
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const { data: transactions = [], isLoading: isLoadingList } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list(),
  });

  const [transactionFromId, setTransactionFromId] = useState(null);
  const [isLoadingById, setIsLoadingById] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Try to find in list first, fallback to fetch by ID
  const transaction = transactions.find((t) => t.id === id) || transactionFromId;

  // Fallback fetch if not found in list
  useEffect(() => {
    if (!id || isLoadingList) return;
    if (transaction) return; // Already found
    if (notFound) return; // Already tried and failed
    
    const fetchById = async () => {
      setIsLoadingById(true);
      try {
        const result = await base44.entities.Transaction.filter({ id });
        if (result && result.length > 0) {
          setTransactionFromId(result[0]);
          console.log("TransactionDetail - Fetched from DB:", result[0].id);
        } else {
          setNotFound(true);
          console.log("TransactionDetail - Transaction not found:", id);
        }
      } catch (e) {
        console.error("TransactionDetail - Fetch error:", e);
        setNotFound(true);
      }
      setIsLoadingById(false);
    };

    fetchById();
  }, [id, isLoadingList, transaction, notFound]);

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

  // Fetch compliance reports for badge count (must be before early returns)
  const { data: complianceReports = [] } = useQuery({
    queryKey: ["compliance-reports", id],
    queryFn: () => base44.entities.ComplianceReport.filter({ transaction_id: id }, "-created_date"),
    enabled: !!id,
    staleTime: 60_000,
  });

  // Fetch comms for badge count (must be before early returns)
  const { data: commAutomations = [] } = useQuery({
    queryKey: ["comm-automations", id],
    queryFn: () => base44.entities.CommAutomation.filter({ transaction_id: id }),
    enabled: !!id,
    staleTime: 30_000,
  });

  // Auto-switch to listing_intake tab for seller transactions
  useEffect(() => {
    if (transaction?.transaction_type === "seller" && !urlTab) {
      setActiveTab("listing_intake");
    }
  }, [transaction?.transaction_type, urlTab]);

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

  // ── Deadline → task resolution mapping ───────────────────────────────────────


  const handleToggleTxTask = async (taskId) => {
    const task = txTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const isCompleting = !task.is_completed;
    
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
    
    // Invalidate notifications so deadlineEngine can re-evaluate resolved tasks
    if (isCompleting) {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    
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

  const handleInviteClient = async (selectedEmails) => {
    if (!selectedEmails?.length) return;
    setInvitingClient(true);
    setInviteModalOpen(false);

    // Generate / retrieve both codes
    const codesRes = await base44.functions.invoke("portalLookup", {
      action: "generate_codes",
      transaction_id: transaction.id,
    });
    const clientCode = codesRes.data?.client_code || transaction.client_code || transaction.client_access_code;
    const agentCode  = codesRes.data?.agent_code  || transaction.agent_code;

    queryClient.invalidateQueries({ queryKey: ["transactions"] });

    const appUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, "") + "/#/ClientLookup";

    const clientEmailBody = `<p>Hello,</p>
<p>Your transaction coordinator has set up a status portal for your transaction at <strong>${transaction.address}</strong>.</p>
<p>Use the button and code below to check your transaction progress and key dates at any time — no account needed:</p>
<p style="margin:20px 0;">
  <a href="${appUrl}" style="background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Transaction Status</a>
</p>
<p><strong>Your Access Code: <span style="font-size:20px;letter-spacing:2px;color:#2563EB;">${clientCode}</span></strong></p>
<p style="color:#666;font-size:13px;">Keep this code handy — you'll use it each time you check your status.</p>
<p>Best regards,<br/>TC Manager</p>`;

    await Promise.allSettled(selectedEmails.map(to =>
      base44.functions.invoke("sendGmailEmail", {
        to: [to],
        subject: `Your Transaction Portal Access — ${transaction.address}`,
        body: clientEmailBody,
        transaction_id: transaction.id,
        brokerage_id: transaction.brokerage_id,
      })
    ));

    // Also send agent code if agent email is set
    const agentEmail = transaction.agent_email || transaction.buyers_agent_email;
    if (agentCode && agentEmail) {
      const agentEmailBody = `<p>Hello,</p>
<p>You have been given agent portal access for the transaction at <strong>${transaction.address}</strong>.</p>
<p>Use the button and code below to view status, deadlines, timeline, and add notes — no account needed:</p>
<p style="margin:20px 0;">
  <a href="${appUrl}" style="background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Transaction Portal</a>
</p>
<p><strong>Your Agent Code: <span style="font-size:20px;letter-spacing:2px;color:#2563EB;">${agentCode}</span></strong></p>
<p style="color:#666;font-size:13px;">This code gives you agent-level access including timeline, shared notes, and the ability to leave notes for your TC.</p>
<p>Best regards,<br/>TC Manager</p>`;

      await base44.functions.invoke("sendGmailEmail", {
        to: [agentEmail],
        subject: `Agent Portal Access — ${transaction.address}`,
        body: agentEmailBody,
        transaction_id: transaction.id,
        brokerage_id: transaction.brokerage_id,
      }).catch(() => {});
    }

    const sentTo = [...selectedEmails, ...(agentCode && agentEmail && !selectedEmails.includes(agentEmail) ? [agentEmail] : [])];
    setAlertDialog({
      open: true,
      title: "Portal Invites Sent!",
      message: `Access codes sent to ${sentTo.join(", ")}. Client code: ${clientCode}${agentCode ? ` · Agent code: ${agentCode}` : ""}`,
    });
    setInvitingClient(false);
  };

  const handleSendTimeline = async (recipients) => {
    if (!transaction || !recipients?.length) return;
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
    const results = await Promise.allSettled(recipients.map((to) => base44.integrations.Core.SendEmail({ to, subject: `Key Deadlines — ${transaction.address}`, body })));
    setSendingTimeline(false);
    const sent = recipients.filter((_, i) => results[i].status === "fulfilled");
    setAlertDialog({
      open: true,
      title: sent.length > 0 ? "Timeline Sent" : "No Emails Sent",
      message: sent.length > 0 ? `Timeline sent to: ${sent.join(", ")}.` : "Failed to send to any recipients.",
    });
  };

  // ── Lead-based paint notification (one-time, idempotent) ─────────────────────
  const leadPaintTriggeredRef = useRef(false);
  useEffect(() => {
    if (!transaction || !currentUser) return;
    const propType = (transaction.property_type || "").toLowerCase();
    const yearBuilt = transaction.year_built ? Number(transaction.year_built) : null;
    const isLand = propType === "land";
    const shouldFlag = !isLand && yearBuilt && yearBuilt <= 1978;

    if (!shouldFlag) {
      // If it was previously flagged and year changed to non-triggering, clear the flag
      if (transaction.lead_paint_flag && yearBuilt && yearBuilt > 1978) {
        updateMutation.mutate({ id: transaction.id, data: { lead_paint_flag: false, lead_paint_notified_year: null } });
      }
      return;
    }

    // Only fire if the notification year hasn't been set for this exact year_built value
    if (transaction.lead_paint_notified_year === yearBuilt) return;
    if (leadPaintTriggeredRef.current) return;
    leadPaintTriggeredRef.current = true;

    (async () => {
      try {
        // Create the in-app notification
        await base44.entities.InAppNotification.create({
          brokerage_id: transaction.brokerage_id || null,
          user_id: currentUser.id || null,
          user_email: currentUser.email,
          transaction_id: transaction.id,
          title: "Lead Based Paint Disclosure Required",
          body: `Lead Based Paint Disclosure required. Property was built in ${yearBuilt} (1978 or earlier).`,
          type: "system",
          severity: "warning",
        });
        // Mark the transaction so we don't re-notify for the same year
        updateMutation.mutate({
          id: transaction.id,
          data: { lead_paint_flag: true, lead_paint_notified_year: yearBuilt },
        });
      } catch (e) {
        leadPaintTriggeredRef.current = false; // allow retry on next render
        console.error("Lead paint notification failed:", e);
      }
    })();
  }, [transaction?.year_built, transaction?.property_type, transaction?.lead_paint_notified_year]);



  // Read dismissed issues from localStorage to accurately compute the Issues badge
  // (must be before early returns to satisfy Rules of Hooks)
  const dismissedIssueIds = useMemo(() => {
    try {
      const saved = localStorage.getItem(`dismissed_issues_${id}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  }, [id, activeTab]);

  const allDetectedIssues = useMemo(
    () => detectIssues(transaction || {}, checklistItems, complianceReports, txTasks),
    [transaction, checklistItems, complianceReports, txTasks]
  );

  const isLoading = isLoadingList || isLoadingById;

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
        <p className="text-gray-500 mb-4">Transaction not found (ID: {id}).</p>
        <Link to={createPageUrl("Transactions")}>
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Transactions</Button>
        </Link>
      </div>
    );
  }

  // Access control gate — deny if user is not authorized for this deal
  if (!accessLoading && transaction && !canAccess(transaction.id)) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20 w-full min-w-0">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 mb-6">You do not have permission to view this transaction.</p>
        <Link to={createPageUrl("Transactions")}>
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Transactions</Button>
        </Link>
      </div>
    );
  }

  // Compute attention items — use centralized deadline evaluation
  const attentionItems = [];
  const alertableDeadlines = getAlertableDeadlines(transaction, currentUser?.timezone);
  alertableDeadlines.forEach(({ label, evaluation }) => {
    if (evaluation.isOverdue) {
      attentionItems.push({ type: "deadline", label: `${label} OVERDUE`, tab: "deadlines", urgent: true });
    } else if (evaluation.isDueSoon) {
      attentionItems.push({ type: "deadline", label: `${label} in ${Math.ceil(evaluation.daysRemaining * 24)}h`, tab: "deadlines", urgent: true });
    }
  });
  const overdueTasks = txTasks.filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < new Date());
  if (overdueTasks.length > 0) attentionItems.push({ type: "task", label: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`, tab: "overview", urgent: true });

  const commsReadyCount = commAutomations.filter(c => c.template_status === "ready").length;
  const commsBlockedCount = commAutomations.filter(c => c.template_status === "blocked").length;

  const tabs = transaction.transaction_type === "seller" ? LISTING_TABS : TX_TABS;

  // ── Tab badge counts ──────────────────────────────────────────────────────
  const overdueDeadlineCount = attentionItems.filter(i => i.type === "deadline" && i.urgent).length;
  const approachingDeadlineCount = attentionItems.filter(i => i.type === "deadline" && !i.urgent).length;
  const totalDeadlineBadge = overdueDeadlineCount + approachingDeadlineCount;
  const overdueTaskCount = overdueTasks.length;
  const missingDocCount = checklistItems.filter(i => i.required && i.status === "missing").length;
  const complianceBlockerCount = complianceReports.reduce((sum, r) => sum + (r.blockers?.length || 0), 0);
  const issuesBadgeCount = allDetectedIssues.filter(i => !dismissedIssueIds.has(i.id)).length;

  const TAB_BADGES = {
    issues:          issuesBadgeCount,
    deadlines:       totalDeadlineBadge,
    documents:       missingDocCount,
    compliance:      complianceBlockerCount,
    overview:        overdueTaskCount,
    communications:  commsReadyCount + commsBlockedCount,
  };

  return (
    <div className="flex flex-col -mx-4 -mb-4 lg:-mx-5 lg:-mb-5" style={{ height: "calc(100vh - 48px)", overflow: "hidden" }}>

      {timelineModalOpen && (
        <SendTimelineModal
          transaction={transaction}
          onClose={() => setTimelineModalOpen(false)}
          onSend={handleSendTimeline}
        />
      )}
      {inviteModalOpen && (
        <InviteClientModal
          transaction={transaction}
          sending={invitingClient}
          onConfirm={handleInviteClient}
          onCancel={() => setInviteModalOpen(false)}
        />
      )}
      <EmailComposerModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        transaction={transaction}
        currentUser={currentUser}
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

      {/* ── TOP HEADER BAR — sticky ── */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b" style={{ borderColor: "var(--card-border)", background: "var(--bg-secondary)", position: "sticky", top: 0, zIndex: 20 }}>
        {/* Row 1: Back + address + badges */}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <Link to={createPageUrl(
            currentUser?.role === "agent" || currentUser?.role === "user" ? "AgentPortal"
            : currentUser?.role === "client" ? "ClientPortal"
            : "Transactions"
          )}>
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-800 -ml-2 h-8">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
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
            {/* Deal origin / type badge */}
            {(() => {
              const isBuyer = transaction.deal_origin === "buyer" || (transaction.transaction_type === "buyer" && transaction.deal_origin !== "listing");
              const isListingUC = (transaction.deal_origin === "listing" || transaction.transaction_type === "seller") && transaction.transaction_phase === "under_contract";
              const isListing = (transaction.deal_origin === "listing" || transaction.transaction_type === "seller") && !isListingUC;
              if (isBuyer) return (
                <Badge variant="outline" className="text-xs font-semibold flex-shrink-0 bg-blue-50 text-blue-700 border-blue-300">
                  🔵 Buyer Transaction
                </Badge>
              );
              if (isListingUC) return (
                <Badge variant="outline" className="text-xs font-semibold flex-shrink-0 bg-purple-50 text-purple-700 border-purple-300">
                  🟣 Listing → Under Contract
                </Badge>
              );
              return (
                <Badge variant="outline" className="text-xs font-semibold flex-shrink-0 bg-emerald-50 text-emerald-700 border-emerald-300">
                  🟢 Listing
                </Badge>
              );
            })()}
            <HealthScoreBadge
              healthScore={transaction.health_score ?? computeHealthScore(transaction, checklistItems).health_score}
              riskLevel={transaction.risk_level ?? computeHealthScore(transaction, checklistItems).risk_level}
            />

          </div>
        </div>

        {/* Row 2: Actions */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <Select value={transaction.transaction_phase || "intake"}
              onValueChange={(v) => updateMutation.mutate({ id: transaction.id, data: { transaction_phase: v, last_activity_at: new Date().toISOString() } })}>
              <SelectTrigger className="h-8 w-38 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="under_contract">Under Contract</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="withdrawn">Withdraw</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 text-blue-600 hover:bg-blue-50 border-blue-200" onClick={() => setEmailModalOpen(true)}>
              <MailIcon className="w-3.5 h-3.5 mr-1" /> Email
            </Button>
            <UnderContractEmailButton transaction={transaction} currentUser={currentUser} documents={documents} />
            <Button variant="outline" size="sm" className="h-8 text-indigo-600 hover:bg-indigo-50 border-indigo-200" onClick={() => setInviteModalOpen(true)} disabled={invitingClient}>
              <UserPlus className="w-3.5 h-3.5 mr-1" />{invitingClient ? "Sending…" : "Invite"}
            </Button>
            <MarkUnderContractButton transaction={transaction} onConverted={() => queryClient.invalidateQueries({ queryKey: ["transactions"] })} />
            <Button variant="outline" size="sm" className="h-8 text-red-600 hover:bg-red-50 border-red-200" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <QuickFeedbackButton defaultType="bug" label="Report" variant="badge"
              className="border-orange-300 text-orange-500 hover:border-orange-400 hover:bg-orange-50 h-8"
              context={{ transaction_id: transaction?.id, transaction_address: transaction?.address, route_name: "Transaction Page" }} />
            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1.5 ml-auto" onClick={() => setMobileAIOpen(true)}>
              <Bot className="w-3.5 h-3.5" /> Ask AI
            </Button>
          </div>

        {/* Row 3: Meta strip + attention items */}
        <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
          {transaction.contract_date && <span><span className="font-medium" style={{ color: "var(--text-secondary)" }}>Contract:</span> {transaction.contract_date}</span>}
          {transaction.closing_date && <span><span className="font-medium" style={{ color: "var(--text-secondary)" }}>Closing:</span> {transaction.closing_date}</span>}
          {transaction.sale_price && <span><span className="font-medium" style={{ color: "var(--text-secondary)" }}>Price:</span> ${transaction.sale_price?.toLocaleString()}</span>}
          {transaction.is_cash_transaction && <span className="text-emerald-600 font-semibold">Cash</span>}
          {(transaction.property_type || "residential") !== "land" && (
            <YearBuiltBadge
              value={transaction.year_built}
              onSave={v => updateMutation.mutate({ id: transaction.id, data: { year_built: v, last_activity_at: new Date().toISOString() } })}
            />
          )}
        </div>

        </div>
      </div>

      {/* ── MAIN 2-COLUMN BODY ── */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">

        {/* LEFT COLUMN — full on mobile, 70% on desktop */}
        <div className="flex-1 min-w-0 p-4 lg:p-5 space-y-4 overflow-y-auto">

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
              <div className="px-4 pb-4 border-t space-y-4" style={{ borderColor: "var(--card-border)" }}>
                <ContactsSection
                  transaction={transaction}
                  currentUser={currentUser}
                  onUpdate={(data) => updateMutation.mutate({ id: transaction.id, data })}
                />
                
                {/* Portal Access Section */}
                <div className="pt-4 border-t" style={{ borderColor: "var(--card-border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Client Portal Access</span>
                    <PortalAccessCell transaction={transaction} currentUser={currentUser} onRefresh={() => queryClient.invalidateQueries({ queryKey: ["transactions"] })} />
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Generate and manage secure portal codes for clients to view this transaction</p>
                </div>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 rounded-xl overflow-x-auto scrollbar-none" style={{ background: "var(--bg-tertiary)" }}>
            {tabs.map(({ id: tabId, label, icon: TabIcon, info }) => {
              const badgeCount = TAB_BADGES[tabId] || 0;
              return (
                <button key={tabId} onClick={() => setActiveTab(tabId)}
                  className={`group relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    activeTab === tabId ? "shadow-sm" : ""
                  }`}
                  style={activeTab === tabId
                    ? { background: "var(--card-bg)", color: "var(--text-primary)" }
                    : { color: "var(--text-muted)" }}>
                  <TabIcon className="w-3.5 h-3.5" />
                  {label}
                  {badgeCount > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full leading-none ${
                      tabId === "issues" || tabId === "compliance"
                        ? "bg-red-500 text-white"
                        : tabId === "deadlines"
                        ? "bg-amber-500 text-white"
                        : tabId === "communications"
                        ? (commsBlockedCount > 0 ? "bg-red-500 text-white" : "bg-blue-500 text-white")
                        : "bg-orange-400 text-white"
                    }`}>
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
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
                currentUser={currentUser}
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
              <IssueDetectionPanel transaction={transaction} currentUser={currentUser} />
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
            <div className="space-y-4">
              <Card className="shadow-sm border-gray-100">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Deadlines</CardTitle>
                    <Button size="sm" variant="outline" className="text-blue-600 hover:bg-blue-50 border-blue-200"
                      onClick={() => setTimelineModalOpen(true)} disabled={sendingTimeline}>
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
              <InspectionPanel
                transaction={transaction}
                onSave={(changes) => updateMutation.mutate({ id: transaction.id, data: { ...changes, last_activity_at: new Date().toISOString() } })}
              />
            </div>
          )}

          {activeTab === "documents" && <TransactionDocumentsTab transaction={transaction} currentUser={currentUser} />}
          {activeTab === "compliance" && <ComplianceScanPanel transaction={transaction} currentUser={currentUser} />}
          {activeTab === "financial_tools" && <TransactionFinancialTools transaction={transaction} currentUser={currentUser} />}
          {/* ── Tab: Communications ── */}
          {activeTab === "communications" && (
            <UnderContractCommsPanel transaction={transaction} currentUser={currentUser} />
          )}

          {activeTab === "listing_intake" && (
            <ListingIntakeTab
              transaction={transaction}
              onSave={(changes) => updateMutation.mutate({ id: transaction.id, data: { ...changes, last_activity_at: new Date().toISOString() } })}
            />
          )}

          {activeTab === "team" && (
            <div className="theme-card p-5">
              <CollaboratorsPanel
                transaction={transaction}
                currentUser={currentUser}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ["transactions"] })}
              />
            </div>
          )}
        </div>

        {/* RESIZE HANDLE + RIGHT COLUMN — desktop only */}
        <div className="hidden lg:flex flex-shrink-0" style={{ width: notesCollapsed ? "0px" : `${notesWidth}px`, transition: notesCollapsed ? "width 0.2s ease" : "none" }}>

          {/* Drag-to-resize handle */}
          {!notesCollapsed && (
            <div
              className="w-1.5 flex-shrink-0 cursor-col-resize group relative"
              style={{ background: "var(--card-border)" }}
              onMouseDown={onNotesResizeMouseDown}
            >
              <div className="absolute inset-0 group-hover:bg-blue-400 transition-colors opacity-0 group-hover:opacity-100" />
            </div>
          )}

          {/* Right panel */}
          {!notesCollapsed && (
            <div className="flex flex-col flex-1 min-w-0 lg:overflow-hidden" style={{ background: "var(--bg-secondary)", borderLeft: "1px solid var(--card-border)" }}>

              {/* Panel header with focus toggle buttons */}
              <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0" style={{ borderColor: "var(--card-border)", background: "var(--bg-tertiary)" }}>
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Notes & Compliance</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { const w = NOTES_MIN; setNotesWidth(w); localStorage.setItem("notesPanelWidth", String(w)); }}
                    className="text-[10px] px-2 py-0.5 rounded border transition-colors"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-muted)" }}
                    title="Focus Tasks"
                  >Focus Tasks</button>
                  <button
                    onClick={() => { const w = NOTES_MAX; setNotesWidth(w); localStorage.setItem("notesPanelWidth", String(w)); }}
                    className="text-[10px] px-2 py-0.5 rounded border transition-colors"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-muted)" }}
                    title="Focus Notes"
                  >Focus Notes</button>
                  <button
                    onClick={() => setNotesCollapsed(true)}
                    className="p-1 rounded hover:bg-gray-200 ml-1"
                    style={{ color: "var(--text-muted)" }}
                    title="Collapse panel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Notes — fills remaining height */}
              <div className="flex-1 min-h-0 flex flex-col lg:overflow-hidden">
                <NotesPanel transaction={transaction} currentUser={currentUser} />
              </div>
            </div>
          )}
        </div>

        {/* Re-open collapsed panel button */}
        {notesCollapsed && (
          <button
            onClick={() => setNotesCollapsed(false)}
            className="hidden lg:flex flex-col items-center justify-center w-8 flex-shrink-0 border-l hover:bg-blue-50 transition-colors gap-1"
            style={{ borderColor: "var(--card-border)", background: "var(--bg-secondary)", color: "var(--text-muted)" }}
            title="Expand Notes panel"
          >
            <PanelLeftOpen className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>Notes</span>
          </button>
        )}
      </div>


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

function YearBuiltBadge({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const yr = value ? Number(value) : null;
  const isPreLead = yr && yr <= 1978;

  const handleSave = () => {
    setEditing(false);
    const num = draft ? parseInt(draft, 10) : null;
    if (num !== value) onSave(num);
  };

  if (editing) {
    return (
      <span className="flex items-center gap-1">
        <span className="font-medium" style={{ color: "var(--text-secondary)" }}>Year Built:</span>
        <input
          type="number"
          min="1600"
          max={new Date().getFullYear()}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          className="w-20 h-5 text-xs border border-blue-300 rounded px-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          autoFocus
        />
      </span>
    );
  }

  return (
    <span
      className={`flex items-center gap-1 cursor-pointer group ${isPreLead ? "text-amber-600 font-semibold" : ""}`}
      onClick={() => { setDraft(value || ""); setEditing(true); }}
      title="Click to edit Year Built"
    >
      <span className="font-medium" style={{ color: "var(--text-secondary)" }}>Year Built:</span>
      {yr ? (
        <>
          {yr}
          {isPreLead && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-700 font-bold ml-1">⚠ Lead Paint</span>}
        </>
      ) : (
        <span className="italic opacity-60">Add year</span>
      )}
      <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity ml-0.5" />
    </span>
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