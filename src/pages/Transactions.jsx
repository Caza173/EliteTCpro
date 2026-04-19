import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Clock, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import TransactionTable from "../components/transactions/TransactionTable";
import ContractIntakeModal from "../components/intake/ContractIntakeModal";
import { useDealAccess } from "../lib/useDealAccess";
import PendingDealsQueue from "../components/deals/PendingDealsQueue";

const PAGE_SIZE = 25;

const PHASE_LABELS = {
  1: "Pre-Contract", 2: "Offer Drafting", 3: "Offer Accepted & Escrow",
  4: "Escrow Opened", 5: "Inspection & Repair", 6: "Repair Negotiation",
  7: "Appraisal Ordered", 8: "Loan Processing", 9: "Clear to Close",
  10: "Final Walkthrough", 11: "Closing", 12: "Post Closing",
};

export default function Transactions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showIntake, setShowIntake] = useState(false);
  const [dealTab, setDealTab] = useState("all"); // "all" | "pending" | "my"
  // Role-based deal access — filters to only deals the user may see
  const { transactions, pendingDeals, myDeals, isLoading, currentUser, isSuperAdmin, isTC } = useDealAccess();

  // The base list for the "all" tab respects access control
  const baseList = dealTab === "my" ? myDeals : transactions;

  const filtered = useMemo(() => baseList.filter((tx) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      tx.address?.toLowerCase().includes(q) ||
      tx.buyer?.toLowerCase().includes(q) ||
      tx.buyers?.some(b => b.toLowerCase().includes(q)) ||
      tx.agent?.toLowerCase().includes(q) ||
      tx.mls_number?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter;
    const matchesPhase = phaseFilter === "all" || String(tx.phase || 1) === phaseFilter;
    return matchesSearch && matchesStatus && matchesPhase;
  }), [transactions, search, statusFilter, phaseFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter, phaseFilter, transactions, dealTab]);

  return (
    <div className="flex flex-col w-full min-w-0" style={{ height: "calc(100vh - 48px)", overflow: "hidden" }}>

      {/* Fixed header + filters */}
      <div className="flex-shrink-0 space-y-4 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Transactions</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {dealTab === "pending" ? `${pendingDeals.length} pending deals` : `${filtered.length} of ${baseList.length} transactions`}
            </p>
          </div>
        </div>

        {/* Deal tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-tertiary)", width: "fit-content" }}>
          {[
            { id: "all", label: "All Deals" },
            ...(isSuperAdmin || isTC ? [{ id: "pending", label: `Pending${pendingDeals.length > 0 ? ` (${pendingDeals.length})` : ""}`, icon: Clock }] : []),
            { id: "my", label: "My Deals", icon: Star },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setDealTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={dealTab === tab.id
                ? { background: "var(--card-bg)", color: "var(--text-primary)", boxShadow: "var(--card-shadow)" }
                : { color: "var(--text-muted)" }
              }
            >
              {tab.icon && <tab.icon className="w-3 h-3" />}
              {tab.label}
            </button>
          ))}
        </div>

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
            <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="under_contract">Under Contract</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="withdrawn">Withdraw</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Phases" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              {Object.entries(PHASE_LABELS).map(([num, label]) => (
                <SelectItem key={num} value={num}>Phase {num} — {label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scrollable table / queue */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}>
        {dealTab === "pending" ? (
          <PendingDealsQueue
            currentUser={currentUser}
            pendingDeals={pendingDeals}
            isLoading={isLoading}
          />
        ) : (
          <>
            <Card className="shadow-sm border-gray-100">
              <CardContent className="px-0 pb-0 pt-0">
                {isLoading ? (
                  <div className="space-y-3 p-6">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 rounded" />)}
                  </div>
                ) : (
                  <TransactionTable transactions={paginated} />
                )}
              </CardContent>
            </Card>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-3">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages} · {filtered.length} results
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = totalPages <= 5 ? i + 1
                      : page <= 3 ? i + 1
                      : page >= totalPages - 2 ? totalPages - 4 + i
                      : page - 2 + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        className={page === pageNum ? "bg-blue-600 hover:bg-blue-700 text-white w-9" : "w-9"}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ContractIntakeModal open={showIntake} onClose={() => setShowIntake(false)} />
    </div>
  );
}