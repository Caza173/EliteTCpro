import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Building2, Home, ArrowRight, ShieldCheck } from "lucide-react";

export default function PortalSelect() {
  const navigate = useNavigate();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    if (role === "client") {
      navigate(createPageUrl("ClientPortal"), { replace: true });
    } else if (role === "agent") {
      navigate(createPageUrl("AgentPortal"), { replace: true });
    } else if (role === "tc" || role === "admin" || role === "owner") {
      navigate(createPageUrl("Dashboard"), { replace: true });
    }
  }, [currentUser, navigate]);

  const handleAgentLogin = () => {
    base44.auth.redirectToLogin(createPageUrl("AgentPortal"));
  };

  const handleClientLogin = () => {
    base44.auth.redirectToLogin(createPageUrl("ClientPortal"));
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-12">
        <div className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">EliteTC</h1>
          <p className="text-xs text-slate-400 font-medium">Transaction Management</p>
        </div>
      </div>

      {/* Heading */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-slate-400 text-base">Select your portal to continue</p>
      </div>

      {/* Portal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
        {/* Agent Portal */}
        <button
          onClick={handleAgentLogin}
          className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/50 rounded-2xl p-8 text-left transition-all duration-200 cursor-pointer"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/20 flex items-center justify-center mb-5 group-hover:bg-blue-500/30 transition-colors">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Agent Portal</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Manage transactions, track deadlines, and communicate with your clients.
            </p>
            <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold group-hover:gap-3 transition-all">
              Login to Agent Portal <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Client Portal */}
        <button
          onClick={handleClientLogin}
          className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-400/50 rounded-2xl p-8 text-left transition-all duration-200 cursor-pointer"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/20 flex items-center justify-center mb-5 group-hover:bg-emerald-500/30 transition-colors">
              <Home className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Client Portal</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Track your transaction progress and access important documents.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold group-hover:gap-3 transition-all">
              Access Client Portal <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>

      {/* TC Login */}
      <div className="mt-8">
        <button
          onClick={() => base44.auth.redirectToLogin(createPageUrl("Dashboard"))}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          TC / Admin Login
        </button>
      </div>

      <p className="text-slate-600 text-xs mt-10">© 2025 EliteTC. All rights reserved.</p>
    </div>
  );
}