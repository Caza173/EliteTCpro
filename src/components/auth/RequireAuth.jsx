import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { buildLoginPath } from "@/lib/authRouting";

export default function RequireAuth({ children }) {
  const { user, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth || !user) {
    if (!isLoadingAuth && !user) {
      const next = `${location.pathname}${location.search}${location.hash}`;
      return <Navigate to={buildLoginPath(next)} replace />;
    }

    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return children;
}