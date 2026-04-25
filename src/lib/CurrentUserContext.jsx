import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const CurrentUserContext = createContext(null);

export function CurrentUserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleted, setIsDeleted] = useState(false);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const authUser = await base44.auth.me();

      if (!authUser) {
        setCurrentUser(null);
        return;
      }

      // Service-role check: does this user actually exist in the app DB?
      const res = await base44.functions.invoke("checkUserExists", {});
      const data = res?.data;

      if (!data?.exists) {
        // User was deleted — hard logout
        setIsDeleted(true);
        await base44.auth.logout();
        window.location.href = "/";
        return;
      }

      setCurrentUser(data.user);
    } catch (err) {
      console.error("User fetch error:", err);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("checkUserExists", {});
      const data = res?.data;
      if (!data?.exists) {
        setIsDeleted(true);
        await base44.auth.logout();
        window.location.href = "/";
        return;
      }
      setCurrentUser(data.user);
    } catch (err) {
      console.error("refreshUser error:", err);
    }
  }, []);

  const updateCurrentUser = useCallback((patch) => {
    setCurrentUser((prev) => prev ? { ...prev, ...patch } : prev);
  }, []);

  return (
    <CurrentUserContext.Provider value={{ currentUser, isLoading, isDeleted, refreshUser, updateCurrentUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}