/**
 * /pending-deals — Full-page pending deal queue for TCs and admins.
 * Real-time updates via entity subscription.
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { transactionsApi } from "@/api/transactions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, User, Clock, CheckCircle2, Loader2, UserPlus,
  RefreshCw, AlertTriangle, Inbox,
} from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser } from "../components/auth/useCurrentUser";
import { isSuperAdmin } from "../lib/useDealAccess";

const DEAL_TYPE_STYLES = {
  buyer:       "bg-blue-50 text-blue-700 border-blue-200",
  listing:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  seller:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  dual:        "bg-purple-50 text-purple-700 border-purple-200",
  commercial:  "bg-orange-50 text-orange-700 border-orange-200",
  multifamily: "bg-teal-50 text-teal-700 border-teal-200",
};

function DealCard({ deal, currentUser, tcUsers, isAdmin, isTC, onClaimed }) {
  const [claiming, setClaiming] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedTC, setSelectedTC] = useState("");
  const [error, setError] = useState(null);
  const [claimed, setClaimed] = useState(false);

  const typeStyle = DEAL_TYPE_STYLES[deal.transaction_type] || DEAL_TYPE_STYLES.buyer;
  const createdAt = deal.created_date ? format(new Date(deal.created_date), "MMM d, yyyy") : "—";
  const hasKeyDates = deal.contract_date || deal.inspection_deadline || deal.closing_date;

  const handleClaim = async () => {
    setClaiming(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("claimDeal", { transaction_id: deal.id });
      if (res.data?.error) {
        setError(res.data.already_claimed ? "Already claimed by another TC." : res.data.error);
      } else {
        setClaimed(true);
        setTimeout(() => onClaimed(deal.id), 600);
      }
    } catch (e) {
      setError(e.message || "Claim failed.");
    }
    setClaiming(false);
  };

  const handleAssign = async () => {
    if (!selectedTC) return;
    const tc = tcUsers.find(u => u.id === selectedTC);
    setAssigning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("claimDeal", {
        transaction_id: deal.id,
        force_assign_to_user_id: selectedTC,
        force_assign_to_email: tc?.email,
      });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        setClaimed(true);
        setTimeout(() => onClaimed(deal.id), 600);
      }
    } catch (e) {
      setError(e.message || "Assignment failed.");
    }
    setAssigning(false);
  };

  if (claimed) {
    return (
      <div className="rounded-xl border px-4 py-3.5 flex items-center gap-3 transition-all opacity-50"
        style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        <span className="text-sm font-medium text-emerald-600">Deal claimed — removing from queue…</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden transition-all hover:shadow-md"
      style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-100">
          <MapPin className="w-4 h-4 text-amber-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {deal.address || "No address"}
            </p>
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
            {deal.transaction_type && (
              <Badge variant="outline" className={`text-xs capitalize ${typeStyle}`}>
                {deal.transaction_type}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
            {deal.agent && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {deal.agent}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {createdAt}
            </span>
            {deal.sale_price && (
              <span className="font-semibold text-emerald-600">${deal.sale_price.toLocaleString()}</span>
            )}
          </div>

          {/* Key dates */}
          {hasKeyDates && (
            <div className="flex flex-wrap gap-3 mt-2 text-xs">
              {deal.contract_date && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                  Effective: {format(new Date(deal.contract_date), "MMM d")}
                </span>
              )}
              {deal.inspection_deadline && (
                <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-100">
                  Inspection: {format(new Date(deal.inspection_deadline), "MMM d")}
                </span>
              )}
              {deal.closing_date && (
                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">
                  Closing: {format(new Date(deal.closing_date), "MMM d")}
                </span>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500 font-medium">
              <AlertTriangle className="w-3 h-3" /> {error}
            </div>
          )}
        </div>

        
      </div>
    </div>
  );
}

export default function PendingDeals() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [removedIds, setRemovedIds] = useState(new Set());

  const isAdmin = isSuperAdmin(currentUser);
  const isTC = currentUser?.role === "tc" || currentUser?.role === "tc_lead";

  const { data: allDeals = [], isLoading, refetch } = useQuery({
    queryKey: ["pending-deals-page"],
    queryFn: () => transactionsApi.list({ status: "pending" }),
    enabled: !!currentUser,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
    staleTime: 60_000,
  });
  const tcUsers = allUsers.filter(u => ["tc", "tc_lead", "admin", "owner"].includes(u.role));

  // Real-time subscription — remove claimed deals instantly from all screens
  useEffect(() => {
    const unsubscribe = base44.entities.Transaction.subscribe((event) => {
      if (event.type === "update" && event.data?.status === "active" && event.data?.assigned_tc_id) {
        setRemovedIds(prev => new Set([...prev, event.id]));
      }
      if (event.type === "create" && event.data?.status === "pending") {
        queryClient.invalidateQueries({ queryKey: ["pending-deals-page"] });
      }
    });
    return unsubscribe;
  }, [queryClient]);

  // Ownership-based filter: super admins/TCs see unassigned queue; everyone else sees their own deals
  const pendingDeals = allDeals.filter(d => {
    if (removedIds.has(d.id)) return false;
    if (isAdmin || isTC) return !d.assigned_tc_id; // TC/admin: unassigned claim queue
    return d.created_by === currentUser?.id || d.assigned_tc_id === currentUser?.id;
  });

  const handleClaimed = (dealId) => {
    setRemovedIds(prev => new Set([...prev, dealId]));
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>Pending Deal Queue</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {isLoading ? "Loading…" : `${pendingDeals.length} deal${pendingDeals.length !== 1 ? "s" : ""} awaiting assignment`}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats bar */}
      {!isLoading && (
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }}>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            {pendingDeals.length} pending
          </div>
          {pendingDeals.filter(d => d.contract_date && new Date(d.contract_date) < new Date()).length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs bg-red-50 border-red-200 text-red-700 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              {pendingDeals.filter(d => d.contract_date && new Date(d.contract_date) < new Date()).length} with past effective date
            </div>
          )}
        </div>
      )}

      {/* Deal list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : pendingDeals.length === 0 ? (
        <div className="theme-card p-16 text-center">
          <Inbox className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Queue is clear</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>All pending deals have been claimed or assigned.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingDeals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              currentUser={currentUser}
              tcUsers={tcUsers}
              isAdmin={isAdmin}
              isTC={isTC}
              onClaimed={handleClaimed}
            />
          ))}
        </div>
      )}
    </div>
  );
}