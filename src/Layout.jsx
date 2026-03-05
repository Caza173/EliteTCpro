import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FileText,
  Clock,
  Settings,
  Menu,
  X,
  ChevronRight,
  Building2,
  ClipboardList,
  UserPlus,
  FolderOpen,
  Home,
  CreditCard,
  Shield,
  Workflow
} from "lucide-react";
import NotificationBell from "./components/dashboard/NotificationBell";

const TC_NAV = [
  { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
  { label: "Transactions", page: "Transactions", icon: FileText },
  { label: "Agent Intake", page: "AgentIntake", icon: UserPlus },
  { label: "Deadlines", page: "Deadlines", icon: Clock },
  { label: "Tasks", page: "Tasks", icon: ClipboardList },
  { label: "Documents", page: "Documents", icon: FolderOpen },
  { label: "Templates", page: "Templates", icon: Workflow },
  { label: "Settings", page: "Settings", icon: Settings },
];

const OWNER_NAV = [
  { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
  { label: "Transactions", page: "Transactions", icon: FileText },
  { label: "Agent Intake", page: "AgentIntake", icon: UserPlus },
  { label: "Deadlines", page: "Deadlines", icon: Clock },
  { label: "Tasks", page: "Tasks", icon: ClipboardList },
  { label: "Documents", page: "Documents", icon: FolderOpen },
  { label: "Templates", page: "Templates", icon: Workflow },
  { label: "Billing", page: "Billing", icon: CreditCard },
  { label: "Audit Log", page: "AuditLog", icon: Shield },
  { label: "Settings", page: "Settings", icon: Settings },
];

const AGENT_NAV = [
  { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
  { label: "Transactions", page: "Transactions", icon: FileText },
  { label: "Agent Intake", page: "AgentIntake", icon: UserPlus },
  { label: "Tasks", page: "Tasks", icon: ClipboardList },
  { label: "Documents", page: "Documents", icon: FolderOpen },
];

const CLIENT_NAV = [
  { label: "My Transaction", page: "ClientPortal", icon: Home },
  { label: "Documents", page: "Documents", icon: FolderOpen },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  const role = currentUser?.role;
  const navItems = role === "client" ? CLIENT_NAV
    : role === "agent" ? AGENT_NAV
    : (role === "owner" || role === "admin") ? OWNER_NAV
    : TC_NAV;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <style>{`
        :root {
          --sidebar-bg: #0f172a;
          --sidebar-hover: #1e293b;
          --sidebar-active: #3b82f6;
          --accent: #3b82f6;
          --accent-light: #eff6ff;
        }
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-[#0f172a] text-white flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">TC Manager</h1>
            <p className="text-[11px] text-slate-400 font-medium">Transaction Coordinator</p>
          </div>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;
            const Icon = item.icon;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? "bg-blue-500/15 text-blue-400"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`w-[18px] h-[18px] ${isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-blue-400/60" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-[11px] text-slate-500 text-center">TC Manager v1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/60 px-4 lg:px-8 py-3 flex items-center gap-4">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
            {currentPageName === "TransactionDetail" ? "Transaction Detail" : 
             currentPageName === "AddTransaction" ? "New Transaction" :
             currentPageName === "AgentIntake" ? "Agent Intake" :
             currentPageName === "ClientPortal" ? "My Transaction" :
             currentPageName === "Documents" ? "Documents" :
             currentPageName === "AuditLog" ? "Audit Log" :
             currentPageName === "BrokerageSetup" ? "Brokerage Setup" :
             currentPageName}
          </h2>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}