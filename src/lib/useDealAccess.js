// cache-bust: 2026-05-22-v10-stable
/**
 * useDealAccess — Strictly per-user isolated deal access.
 * Uses useState/useEffect ONLY — zero react-query — to avoid cross-chunk dispatcher errors.
 */
import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser as useCurrentUserCtx } from "./CurrentUserContext.jsx";

const SUPER_ADMIN_EMAIL = "nhcazateam@gmail.com";

export function isSuperAdmin(user) {
  return user?.email === SUPER_ADMIN_EMAIL;
}

export function useDealAccess() {
  // useContext-based hook must be called FIRST before any useState/useRef
  const ctx = useCurrentUserCtx();
  // ctx may be null if rendered outside CurrentUserProvider; default safely
  const currentUser = (ctx ?? {}).currentUser ?? null;
  const userLoading = (ctx ?? {}).isLoading ?? true;

  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState(null);
  const fetchedForRef = useRef(null);

  const isReady = !userLoading && !!currentUser?.id;

  useEffect(() => {
    if (!isReady) return;
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
        console.error("[useDealAccess] fetch error:", err);
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
    if (isLoading) return false;
    if (txError) return false;
    return accessibleDealIds.has(dealId);
  }

  function refetch() {
    // Force re-fetch by clearing the cache ref
    fetchedForRef.current = null;
    if (!currentUser?.id) return;
    setTxLoading(true);
    setTxError(null);
    base44.functions.invoke("getTeamTransactions", { sort: "-created_date", limit: 200 })
      .then(r => {
        const txs = r.data?.transactions;
        if (!Array.isArray(txs)) throw new Error("Invalid response from getTeamTransactions");
        setTransactions(txs);
        fetchedForRef.current = currentUser.id;
      })
      .catch(err => {
        console.error("[useDealAccess] refetch error:", err);
        setTxError(err);
      })
      .finally(() => setTxLoading(false));
  }

  return {
    transactions,
    allTransactions: transactions,
    accessibleDealIds,
    isLoading,
    canAccess,
    refetch,
    currentUser,
    isSuperAdmin: isSuperAdmin(currentUser),
  };
}

export function useAccessibleDealIds() {
  const { accessibleDealIds, isLoading } = useDealAccess();
  return { accessibleDealIds, isLoading };
}