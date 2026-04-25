import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const CurrentUserContext = createContext(null);

export function CurrentUserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use auth.me() directly — this is fast and gives us the full user including role, profile, etc.
      const authUser = await base44.auth.me();

      if (!authUser) {
        setCurrentUser(null);
        return;
      }

      setCurrentUser(authUser);

      // Background existence check — only logs out if user was deleted.
      // Done async so it never blocks rendering.
      base44.functions.invoke("checkUserExists", {})
        .then(res => {
          if (!res?.data?.exists) {
            base44.auth.logout();
            window.location.href = "/";
          }
        })
        .catch(() => {
          // Network error — don't log out, just continue
        });

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
      const authUser = await base44.auth.me();
      if (authUser) setCurrentUser(authUser);
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