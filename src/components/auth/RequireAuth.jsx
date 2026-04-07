import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

/**
 * RequireAuth wrapper - uses Base44 built-in auth. Redirects to Base44 login if not authenticated.
 */
export default function RequireAuth({ children }) {
  const { user, isLoadingAuth } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      base44.auth.redirectToLogin(window.location.href);
    }
  }, [isLoadingAuth, user]);

  if (isLoadingAuth || !user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return children;
}