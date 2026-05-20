// cache-bust: 2026-05-20-v3
/**
 * useDealAccess — Strictly per-user isolated deal access.
 *
 * Uses useState/useEffect to avoid any cross-chunk react-query version mismatch.
 * Super admin (nhcazateam@gmail.com) sees all transactions.
 */
import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser as useCurrentUserCtx } from "@/lib/CurrentUserContext.jsx";

const SUPER_ADMIN_EMAIL = "nhcazateam@gmail.com";

export function isSuperAdmin(user) {
  if (!user) return false;
  return user.email === SUPER_ADMIN_EMAIL;
}

export function useDealAccess() {
  const ctx = useCurrentUserCtx();
  const currentUser = ctx?.currentUser ?? null;
  const userLoading = ctx?.isLoading ?? true;

  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState(null);
  const fetchedForRef = useRef(null);

  const isReady = !userLoading && !!currentUser?.id;

  useEffect(() => {
    if (!isReady) return;
    // Avoid re-fetching for the same user
    if (fetchedForRef.current === currentUser.id && transactions.length > 0) return;

    let cancelled = false;
    setTxLoading(true);
    setTxError(null);

    base44.functions.invoke("getTeamTransactions", { sort: "-created_date", limit: 200 })
      .then(r => {
        if (cancelled) return;
        const txs = r.data?.transactions;
        if (!Array.isArray(txs)) throw new Error("Invalid response from getTeamTransactions");
        setTransactions(txs);
        fetchedForRef.current = currentUser.id;
      })
      .catch(err => {
        if (cancelled) return;
        console.error("[useDealAccess] Error fetching transactions:", err);
        setTxError(err);
      })
      .finally(() => {
        if (!cancelled) setTxLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentUser?.id, isReady]);

  const isLoading = userLoading || txLoading;
  const accessibleDealIds = new Set(transactions.map(t => t.id));

  function canAccess(dealId) {
    if (!currentUser || !dealId) return false;
    if (txError || isLoading) return true;
    return accessibleDealIds.has(dealId);
  }

  return {
    transactions,
    allTransactions: transactions,
    accessibleDealIds,
    isLoading,
    canAccess,
    currentUser,
    isSuperAdmin: isSuperAdmin(currentUser),
  };
}

export function useAccessibleDealIds() {
  const { accessibleDealIds, isLoading } = useDealAccess();
  return { accessibleDealIds, isLoading };
}