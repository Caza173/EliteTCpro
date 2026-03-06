import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  User,
  Users,
  Mail,
  Phone,
  Calendar,
  ArrowLeft,
  Trash2,
  ClipboardCheck,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import PhaseChecklist from "../components/transactions/PhaseChecklist";
import TransactionTimeline from "../components/transactions/TransactionTimeline";
import TaskList from "../components/transactions/TaskList";
import DocChecklistPanel from "../components/transactions/DocChecklistPanel";
import DeadlineDashboard from "../components/transactions/DeadlineDashboard";
import HealthScoreBadge from "../components/dashboard/HealthScoreBadge";
import { useCurrentUser } from "../components/auth/useCurrentUser";
import { writeAuditLog, computeHealthScore } from "../components/utils/tenantUtils";

const PHASES = [
  "Pre-Contract", "Offer Drafting", "Offer Accepted", "Escrow Opened",
  "Inspection Period", "Repair Negotiation", "Appraisal Ordered",
  "Loan Processing", "Clear to Close", "Final Walkthrough", "Closing", "Post Closing"
];

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export default function TransactionDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

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
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      navigate(createPageUrl("Transactions"));
    },
  });

  const handleTogglePhase = async (phaseNum) => {
    if (!transaction) return;
    const completed = transaction.phases_completed || [];
    let newCompleted;
    const isCompleting = !completed.includes(phaseNum);
    if (!isCompleting) {
      newCompleted = completed.filter((n) => n !== phaseNum);
    } else {
      newCompleted = [...completed, phaseNum];
    }
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

    // Send email notifications when a phase is completed
    if (isCompleting) {
      const phaseName = PHASES[phaseNum - 1];
      const nextPhaseName = PHASES[phaseNum] || null;
      const subject = `Transaction Update: ${phaseName} Completed — ${transaction.address}`;
      const body = `
Hello,

We wanted to let you know that the <strong>${phaseName}</strong> phase has been completed for the transaction at:

<strong>${transaction.address}</strong>

${nextPhaseName ? `<p>Next up: <strong>${nextPhaseName}</strong></p>` : "<p>This transaction is nearing its final stages.</p>"}

<hr/>
<p><strong>Transaction Details:</strong></p>
<ul>
  <li>Buyer: ${transaction.buyer}</li>
  <li>Seller: ${transaction.seller}</li>
  ${transaction.closing_date ? `<li>Closing Date: ${transaction.closing_date}</li>` : ""}
</ul>

<p>If you have any questions, please don't hesitate to reach out to your transaction coordinator.</p>

Best regards,
TC Manager
      `.trim();

      const recipients = [
        transaction.client_email,
        transaction.agent_email,
      ].filter(Boolean);

      await Promise.all(
        recipients.map((to) =>
          base44.integrations.Core.SendEmail({ to, subject, body })
        )
      );
    }
  };

  const handleStatusChange = (newStatus) => {
    updateMutation.mutate({ id: transaction.id, data: { status: newStatus, last_activity_at: new Date().toISOString() } });
  };

  const [sendingTimeline, setSendingTimeline] = useState(false);

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

    const deadlineRows = deadlines.length > 0
      ? deadlines.map((d) => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${d.label}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;">${format(new Date(d.date), "MMM d, yyyy")}</td></tr>`).join("")
      : "<tr><td colspan='2' style='padding:8px 12px;color:#999;'>No deadlines set.</td></tr>";

    const body = `
<p>Hello,</p>
<p>Here is the key deadline timeline for the transaction at <strong>${transaction.address}</strong>:</p>
<table style="border-collapse:collapse;width:100%;max-width:480px;margin:16px 0;font-size:14px;">
  <thead>
    <tr style="background:#f8fafc;">
      <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Milestone</th>
      <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Date</th>
    </tr>
  </thead>
  <tbody>${deadlineRows}</tbody>
</table>
<p style="color:#64748b;font-size:13px;">Buyer: <strong>${transaction.buyer}</strong> &nbsp;|&nbsp; Seller: <strong>${transaction.seller}</strong></p>
<p style="color:#64748b;font-size:13px;">Please reach out to your transaction coordinator with any questions.</p>
<p>Best regards,<br/>TC Manager</p>
    `.trim();

    const recipients = [transaction.client_email, transaction.agent_email].filter(Boolean);
    await Promise.all(
      recipients.map((to) =>
        base44.integrations.Core.SendEmail({
          to,
          subject: `Key Deadlines — ${transaction.address}`,
          body,
        })
      )
    );
    setSendingTimeline(false);
    alert(`Timeline sent to ${recipients.join(", ") || "no recipients on file"}.`);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <p className="text-gray-500 mb-4">Transaction not found.</p>
        <Link to={createPageUrl("Transactions")}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Transactions
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link to={createPageUrl("Transactions")}>
          <Button variant="ghost" className="text-gray-600 hover:text-gray-900 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Select value={transaction.status || "active"} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={() => {
              if (confirm("Delete this transaction?")) {
                deleteMutation.mutate(transaction.id);
              }
            }}
          >
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
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoItem icon={User} label="Buyer" value={transaction.buyer} />
            <InfoItem icon={Users} label="Seller" value={transaction.seller} />
            {transaction.buyers_agent_name && <InfoItem icon={User} label="Buyer's Agent" value={transaction.buyers_agent_name} />}
            {transaction.buyer_brokerage && <InfoItem icon={User} label="Buyer Brokerage" value={transaction.buyer_brokerage} />}
            {transaction.sellers_agent_name && <InfoItem icon={User} label="Seller's Agent" value={transaction.sellers_agent_name} />}
            {transaction.seller_brokerage && <InfoItem icon={User} label="Seller Brokerage" value={transaction.seller_brokerage} />}
            <InfoItem icon={User} label="Transaction Coordinator" value={transaction.agent} />
            <InfoItem icon={Mail} label="Client Email" value={transaction.client_email || "—"} />
            <InfoItem icon={Phone} label="Client Phone" value={transaction.client_phone || "—"} />
            {transaction.closing_title_company && <InfoItem icon={Calendar} label="Closing / Title Company" value={transaction.closing_title_company} />}
            <InfoItem
              icon={Calendar}
              label="Contract Date"
              value={transaction.contract_date ? format(new Date(transaction.contract_date), "MMM d, yyyy") : "—"}
            />
            <InfoItem
              label="Current Phase"
              value={PHASES[(transaction.phase || 1) - 1]}
              highlight
            />
            {transaction.is_cash_transaction && (
              <InfoItem label="Financing" value="Cash Transaction" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deadline Dashboard */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Key Deadlines</CardTitle>
              <p className="text-sm text-gray-500">Contract milestones and critical dates</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
              onClick={handleSendTimeline}
              disabled={sendingTimeline}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {sendingTimeline ? "Sending..." : "Send Timeline"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DeadlineDashboard transaction={transaction} />
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Transaction Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionTimeline
            phasesCompleted={transaction.phases_completed || []}
            currentPhase={transaction.phase || 1}
          />
        </CardContent>
      </Card>

      {/* Phase Checklist + Tasks */}
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
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-100">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Tasks</CardTitle>
            <p className="text-sm text-gray-500">
              {(transaction.tasks || []).filter((t) => t.completed).length} / {(transaction.tasks || []).length} completed
            </p>
          </CardHeader>
          <CardContent>
            <TaskList
              tasks={transaction.tasks || []}
              onToggleTask={async (taskId) => {
                const updatedTasks = (transaction.tasks || []).map((task) =>
                  task.id === taskId ? { ...task, completed: !task.completed } : task
                );
                updateMutation.mutate({ id: transaction.id, data: { tasks: updatedTasks, last_activity_at: new Date().toISOString() } });
                await writeAuditLog({
                  brokerageId: transaction.brokerage_id,
                  transactionId: transaction.id,
                  actorEmail: currentUser?.email,
                  action: "task_completed",
                  entityType: "task",
                  entityId: taskId,
                  description: `Task ${taskId} toggled by ${currentUser?.email}`,
                });
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Doc Checklist */}
      {checklistItems.length > 0 && (
        <Card className="shadow-sm border-gray-100">
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
            <DocChecklistPanel
              items={checklistItems}
              currentUser={currentUser}
              transactionId={transaction.id}
              brokerageId={transaction.brokerage_id}
            />
          </CardContent>
        </Card>
      )}
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
        <p className={`text-sm font-medium ${highlight ? "text-blue-600" : "text-gray-900"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}