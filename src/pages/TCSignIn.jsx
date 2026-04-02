import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Building2 } from "lucide-react";
import { useCurrentUser } from "@/lib/CurrentUserContext.jsx";
import { createPageUrl } from "@/utils";

export default function TCSignIn() {
  const { currentUser, isLoading } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (currentUser) {
      const role = currentUser.role;
      if (role === "admin" || role === "owner" || role === "tc" || role === "tc_lead") {
        navigate(createPageUrl("Dashboard"), { replace: true });
      } else if (role === "agent") {
        navigate("/agent/submit-transaction", { replace: true });
      }
    }
  }, [currentUser, isLoading, navigate]);

  const handleSignIn = () => {
    base44.auth.redirectToLogin(createPageUrl("Dashboard"));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">EliteTC</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">TC / Admin Sign In</h1>
        <p className="text-sm text-slate-500 mb-8">
          Sign in to access the transaction coordinator dashboard.
        </p>

        <button
          onClick={handleSignIn}
          className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors"
        >
          Sign In
        </button>

        <p className="text-xs text-slate-400 mt-5">
          Are you an agent?{" "}
          <a href="/agent-signin" className="text-blue-600 hover:underline font-medium">Agent sign in →</a>
        </p>
      </div>
    </div>
  );
}