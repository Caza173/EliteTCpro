// cache-bust: 2026-05-26-shared-cache
/**
 * useDealAccess — Shared module-level cache so transactions are fetched ONCE
 * and reused across all pages/components. Prevents duplicate API calls and
 * fixes the "Transactions page shows 0" bug caused by independent per-instance state.
 */
import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser as useCurrentUserCtx } from "./CurrentUserContext.jsx";

const SUPER_ADMIN_EMAIL = "nhcazateam@gmail.com";

export function isSuperAdmin(user) {
  return user?.email === SUPER_ADMIN_EMAIL;
}

// ── Module-level shared cache ──────────────────────────────────────────────────
let _cache = {
  userId: null,
  transactions: [],
  loading: false,
  error: null,
  listeners: new Set(),
};

function notifyListeners() {
  _cache.listeners.forEach(fn => fn({ ..._cache }));
}

function fetchTransactions(userId) {
  if (_cache.loading) return; // already in flight
  if (_cache.userId === userId && _cache.transactions.length > 0) return; // already cached

  _cache.loading = true;
  _cache.error = null;
  notifyListeners();

  base44.entities.Transaction.list("-created_date", 200)
    .then(txs => {
      if (!Array.isArray(txs)) throw new Error("Invalid response from Transaction.list");
      _cache.transactions = txs;
      _cache.userId = userId;
      _cache.loading = false;
      notifyListeners();
    })
    .catch(err => {
      console.error("[useDealAccess] fetch error:", err);
      _cache.error = err;
      _cache.loading = false;
      notifyListeners();
    });
}

function invalidateCache() {
  _cache.userId = null;
  _cache.transactions = [];
  _cache.error = null;
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useDealAccess() {
  const ctx = useCurrentUserCtx();
  const currentUser = (ctx ?? {}).currentUser ?? null;
  const userLoading = (ctx ?? {}).isLoading ?? true;

  const [snapshot, setSnapshot] = useState({ ..._cache });

  useEffect(() => {
    const listener = (state) => setSnapshot({ ...state });
    _cache.listeners.add(listener);
    return () => { _cache.listeners.delete(listener); };
  }, []);

  const isReady = !userLoading && !!currentUser?.id;

  useEffect(() => {
    if (!isReady) return;
    // If user changed, bust the cache
    if (_cache.userId && _cache.userId !== currentUser.id) {
      invalidateCache();
    }
    fetchTransactions(currentUser.id);
  }, [isReady, currentUser?.id]);

  const refetch = useCallback(() => {
    if (!currentUser?.id) return;
    invalidateCache();
    fetchTransactions(currentUser.id);
  }, [currentUser?.id]);

  const transactions = snapshot.transactions;
  const isLoading = userLoading || snapshot.loading;
  const txError = snapshot.error;
  const accessibleDealIds = new Set(transactions.map(t => t.id));

  function canAccess(dealId) {
    if (!currentUser || !dealId) return false;
    if (isLoading) return false;
    if (txError) return false;
    return accessibleDealIds.has(dealId);
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