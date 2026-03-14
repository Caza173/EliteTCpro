import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Layers, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 25;

const PHASE_LABELS = {
  1: "Pre-Contract", 2: "Offer Drafting", 3: "Offer Accepted & Escrow",
  4: "Escrow Opened", 5: "Inspection & Repair", 6: "Repair Negotiation",
  7: "Appraisal Ordered", 8: "Loan Processing", 9: "Clear to Close",
  10: "Final Walkthrough", 11: "Closing", 12: "Post Closing",
};
import { Skeleton } from "@/components/ui/skeleton";
import TransactionTable from "../components/transactions/TransactionTable";
import { useCurrentUser, isOwnerOrAdmin } from "../components/auth/useCurrentUser";

export default function Transactions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const { data: currentUser } = useCurrentUser();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", currentUser?.email, currentUser?.role],
    queryFn: () => {
      if (!currentUser) return [];
      if (isOwnerOrAdmin(currentUser)) return base44.entities.Transaction.list("-created_date");
      // TC/agent: see transactions assigned to them OR created by them
      return base44.entities.Transaction.list("-created_date");
    },
    enabled: !!currentUser,
  });

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      !search ||
      tx.address?.toLowerCase().includes(search.toLowerCase()) ||
      tx.buyer?.toLowerCase().includes(search.toLowerCase()) ||
      tx.agent?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    const matchesPhase = phaseFilter === "all" || String(tx.phase || 1) === phaseFilter;
    return matchesSearch && matchesStatus && matchesPhase;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">All Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{transactions.length} total transactions</p>
        </div>
        <Link to={createPageUrl("AddTransaction")}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Transaction
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by address, buyer, or agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Phases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            {Object.entries(PHASE_LABELS).map(([num, label]) => (
              <SelectItem key={num} value={num}>Phase {num} — {label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="shadow-sm border-gray-100">
        <CardContent className="px-0 pb-0 pt-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 rounded" />
              ))}
            </div>
          ) : (
            <TransactionTable transactions={filtered} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}