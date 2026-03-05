import React from "react";
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
} from "lucide-react";
import { format } from "date-fns";
import PhaseChecklist from "../components/transactions/PhaseChecklist";

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

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list(),
  });

  const transaction = transactions.find((t) => t.id === id);

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

  const handleTogglePhase = (phaseNum) => {
    if (!transaction) return;
    const completed = transaction.phases_completed || [];
    let newCompleted;
    if (completed.includes(phaseNum)) {
      newCompleted = completed.filter((n) => n !== phaseNum);
    } else {
      newCompleted = [...completed, phaseNum];
    }
    // Current phase = highest completed + 1, or 1 if none
    const maxCompleted = newCompleted.length > 0 ? Math.max(...newCompleted) : 0;
    const newPhase = Math.min(maxCompleted + 1, 12);
    updateMutation.mutate({
      id: transaction.id,
      data: { phases_completed: newCompleted, phase: newPhase },
    });
  };

  const handleStatusChange = (newStatus) => {
    updateMutation.mutate({ id: transaction.id, data: { status: newStatus } });
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
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-xs capitalize ${statusStyles[transaction.status] || statusStyles.active}`}>
                    {transaction.status || "active"}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize bg-gray-50 text-gray-600">
                    {transaction.transaction_type || "buyer"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoItem icon={User} label="Buyer" value={transaction.buyer} />
            <InfoItem icon={Users} label="Seller" value={transaction.seller} />
            <InfoItem icon={User} label="Agent" value={transaction.agent} />
            <InfoItem icon={Mail} label="Email" value={transaction.client_email || "—"} />
            <InfoItem icon={Phone} label="Phone" value={transaction.client_phone || "—"} />
            <InfoItem
              icon={Calendar}
              label="Contract Date"
              value={transaction.contract_date ? format(new Date(transaction.contract_date), "MMM d, yyyy") : "—"}
            />
            <InfoItem
              icon={Calendar}
              label="Closing Date"
              value={transaction.closing_date ? format(new Date(transaction.closing_date), "MMM d, yyyy") : "—"}
            />
            <InfoItem
              label="Current Phase"
              value={PHASES[(transaction.phase || 1) - 1]}
              highlight
            />
          </div>
        </CardContent>
      </Card>

      {/* Phase Checklist */}
      <Card className="shadow-sm border-gray-100">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Transaction Phases</CardTitle>
          <p className="text-sm text-gray-500">Check off phases as they are completed.</p>
        </CardHeader>
        <CardContent>
          <PhaseChecklist
            phasesCompleted={transaction.phases_completed || []}
            currentPhase={transaction.phase || 1}
            onTogglePhase={handleTogglePhase}
          />
        </CardContent>
      </Card>
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