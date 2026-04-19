/**
 * PendingDealsQueue
 * Shows all deals with status="pending" to TCs and admins.
 * TCs can claim a deal; admins can assign it to any TC.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, User, Clock, CheckCircle2, UserPlus, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { isSuperAdmin } from "@/lib/useDealAccess";

export default function PendingDealsQueue({ currentUser, pendingDeals, isLoading }) {
  const queryClient = useQueryClient();
  const [claimingId, setClaimingId] = useState(null);
  const [claimError, setClaimError] = useState({});
  const [assigningId, setAssigningId] = useState(null);
  const [selectedTC, setSelectedTC] = useState({});

  const isAdmin = isSuperAdmin(currentUser);
  const isTC = currentUser?.role === "tc" || currentUser?.role === "tc_lead";

  // Load TC users for admin assignment dropdown
  const { data: allUsers = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
    staleTime: 60_000,
  });
  const tcUsers = allUsers.filter(u => ["tc", "tc_lead"].includes(u.role));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions", "all"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const handleClaim = async (deal) => {
    setClaimingId(deal.id);
    setClaimError(prev => ({ ...prev, [deal.id]: null }));
    try {
      const res = await base44.functions.invoke("claimDeal", { transaction_id: deal.id });
      if (res.data?.error) {
        setClaimError(prev => ({ ...prev, [deal.id]: res.data.already_claimed ? "Deal already claimed by another TC." : res.data.error }));
      } else {
        invalidate();
      }
    } catch (e) {
      setClaimError(prev => ({ ...prev, [deal.id]: e.message || "Claim failed." }));
    }
    setClaimingId(null);
  };

  const handleAdminAssign = async (deal) => {
    const tcId = selectedTC[deal.id];
    if (!tcId) return;
    const tc = tcUsers.find(u => u.id === tcId);
    setAssigningId(deal.id);
    try {
      const res = await base44.functions.invoke("claimDeal", {
        transaction_id: deal.id,
        force_assign_to_user_id: tcId,
        force_assign_to_email: tc?.email,
      });
      if (res.data?.error) {
        setClaimError(prev => ({ ...prev, [deal.id]: res.data.error }));
      } else {
        invalidate();
        setSelectedTC(prev => ({ ...prev, [deal.id]: "" }));
      }
    } catch (e) {
      setClaimError(prev => ({ ...prev, [deal.id]: e.message }));
    }
    setAssigningId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-sm" style={{ color: "var(--text-muted)" }}>
        <Loader2 className="w-4 h-4 animate-spin" /> Loading pending deals…
      </div>
    );
  }

  if (!pendingDeals || pendingDeals.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No pending deals</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>All deals have been claimed or assigned.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendingDeals.map(deal => {
        const isClaiming = claimingId === deal.id;
        const isAssigning = assigningId === deal.id;
        const err = claimError[deal.id];

        return (
          <div key={deal.id} className="rounded-xl border overflow-hidden"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
            <div className="flex items-start gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {deal.address || "No address"}
                  </p>
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    Pending
                  </Badge>
                  {deal.transaction_type && (
                    <Badge variant="outline" className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>
                      {deal.transaction_type}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  {deal.agent && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {deal.agent}
                    </span>
                  )}
                  {deal.created_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {format(new Date(deal.created_date), "MMM d, yyyy")}
                    </span>
                  )}
                  {deal.sale_price && (
                    <span className="font-medium text-emerald-600">${deal.sale_price.toLocaleString()}</span>
                  )}
                </div>

                {err && (
                  <p className="text-xs text-red-500 mt-1">{err}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {/* TC: Claim button */}
                {(isTC || isAdmin) && (
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isClaiming || isAssigning}
                    onClick={() => handleClaim(deal)}
                  >
                    {isClaiming
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Claim Deal
                  </Button>
                )}

                {/* Admin: assign to specific TC */}
                {isAdmin && tcUsers.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={selectedTC[deal.id] || ""}
                      onChange={e => setSelectedTC(prev => ({ ...prev, [deal.id]: e.target.value }))}
                      className="h-7 text-xs rounded-md border px-2 focus:outline-none"
                      style={{ borderColor: "var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)" }}
                    >
                      <option value="">Assign to TC…</option>
                      {tcUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                      disabled={!selectedTC[deal.id] || isAssigning}
                      onClick={() => handleAdminAssign(deal)}
                    >
                      {isAssigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                      Assign
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}