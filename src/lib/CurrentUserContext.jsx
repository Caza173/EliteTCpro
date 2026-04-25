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
      // Verify the user record still exists in the app's User entity.
      // If it was deleted by an admin, force logout so they can't access the app.
      const users = await base44.entities.User.filter({ id: user.id });
      if (!users || users.length === 0) {
        // User was deleted from the app — clear session
        await base44.auth.logout();
        return;
      }
      setCurrentUser(user || null);
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
      const users = await base44.entities.User.filter({ id: user.id });
      if (!users || users.length === 0) {
        await base44.auth.logout();
        return;
      }
      setCurrentUser(user || null);
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