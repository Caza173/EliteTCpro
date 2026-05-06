import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { authApi } from "@/api/auth";

const CurrentUserContext = createContext(null);

export function CurrentUserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    authApi.me()
      .then(authUser => {
        setCurrentUser(authUser || null);
      })
      .catch(err => {
        console.error("User fetch error:", err);
        setCurrentUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const authUser = await authApi.me();
      setCurrentUser(authUser || null);
    } catch (err) {
      console.error("refreshUser error:", err);
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