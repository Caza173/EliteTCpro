import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const CurrentUserContext = createContext(null);

export function CurrentUserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(undefined); // undefined = loading
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const user = await base44.auth.me();
      if (!user) {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }
      // Use backend (service role) to definitively verify the user record still exists.
      // If the user was deleted from the app, force logout immediately.
      try {
        const res = await base44.functions.invoke("checkUserExists", {});
        if (!res?.data?.exists) {
          await base44.auth.logout();
          return;
        }
      } catch {
        // If the check fails (e.g. network error), still allow user in — 
        // don't block legitimate users due to a transient backend error.
      }
      setCurrentUser(user);
    } catch {
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
      const user = await base44.auth.me();
      if (!user) { setCurrentUser(null); return; }
      try {
        const res = await base44.functions.invoke("checkUserExists", {});
        if (!res?.data?.exists) {
          await base44.auth.logout();
          return;
        }
      } catch {
        // transient error — keep current session
      }
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
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