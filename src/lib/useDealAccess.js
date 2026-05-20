// cache-bust: 2026-05-20-v6-force
/**
 * useDealAccess — Strictly per-user isolated deal access.
 * Uses useState/useEffect ONLY — zero react-query — to avoid cross-chunk dispatcher errors.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser as useCurrentUserCtx } from "@/lib/CurrentUserContext.jsx";

const SUPER_ADMIN_EMAIL = "nhcazateam@gmail.com";

export function isSuperAdmin(user) {
  return user?.email === SUPER_ADMIN_EMAIL;
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

  const fetchTransactions = useCallback(async () => {
    const r = await base44.functions.invoke("getTeamTransactions", { sort: "-created_date", limit: 200 });
    const txs = r.data?.transactions;
    if (!Array.isArray(txs)) throw new Error("Invalid response from getTeamTransactions");
    return txs;
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (fetchedForRef.current === currentUser.id && transactions.length > 0) return;

    let cancelled = false;
    setTxLoading(true);
    setTxError(null);

    fetchTransactions()
      .then(txs => {
        if (cancelled) return;
        setTransactions(txs);
        fetchedForRef.current = currentUser.id;
      })
      .catch(err => {
        if (cancelled) return;
        console.error("[useDealAccess] fetch error:", err);
        setTxError(err);
      })
      .finally(() => {
        if (!cancelled) setTxLoading(false);
      });

    return () => { cancelled = true; };
  }, [currentUser?.id, isReady, fetchTransactions]);

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