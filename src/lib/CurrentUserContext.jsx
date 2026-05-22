import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

const CurrentUserContext = createContext(null);

export function CurrentUserProvider({ children }) {
  const { user: authUser, isLoadingAuth } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);

  // Sync from AuthContext — no duplicate base44.auth.me() call
  useEffect(() => {
    setCurrentUser(authUser || null);
  }, [authUser]);

  const isLoading = isLoadingAuth;

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await base44.auth.me();
      setCurrentUser(freshUser || null);
    } catch (err) {
      console.error("refreshUser error:", err);
    }
  }, []);

  const updateCurrentUser = useCallback((patch) => {
    setCurrentUser((prev) => prev ? { ...prev, ...patch } : prev);
  }, []);

  return (
    <CurrentUserContext.Provider value={{ currentUser, isLoading, refreshUser, updateCurrentUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}