import React, { useState, useEffect } from "react";
import "./globals.css";
import { Link, useNavigate } from "react-router-dom";
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
  Workflow,
  LogOut
} from "lucide-react";
import NotificationBell from "./components/dashboard/NotificationBell";
import { ThemeProvider } from "./components/theme/ThemeContext";
import ThemeToggle from "./components/theme/ThemeToggle";

const TC_NAV = [
  { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
  { label: "Transactions", page: "Transactions", icon: FileText },
  { label: "Deal Intake", page: "AgentIntake", icon: UserPlus },
  { label: "Deadlines", page: "Deadlines", icon: Clock },
  { label: "Documents", page: "Documents", icon: FolderOpen },
  { label: "Templates", page: "Templates", icon: Workflow },
  { label: "Settings", page: "Settings", icon: Settings },
];

const OWNER_NAV = [
  { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
  { label: "Transactions", page: "Transactions", icon: FileText },
  { label: "Deal Intake", page: "AgentIntake", icon: UserPlus },
  { label: "Deadlines", page: "Deadlines", icon: Clock },
  { label: "Documents", page: "Documents", icon: FolderOpen },
  { label: "Templates", page: "Templates", icon: Workflow },
  { label: "Billing", page: "Billing", icon: CreditCard },
  { label: "Audit Log", page: "AuditLog", icon: Shield },
  { label: "Settings", page: "Settings", icon: Settings },
];

const AGENT_NAV = [
  { label: "My Transactions", page: "AgentPortal", icon: LayoutDashboard },
  { label: "Deal Intake", page: "AgentIntake", icon: UserPlus },
  { label: "Documents", page: "Documents", icon: FolderOpen },
];

const CLIENT_NAV = [
  { label: "My Transaction", page: "ClientPortal", icon: Home },
  { label: "Documents", page: "Documents", icon: FolderOpen },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: currentUser = null } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try { return await base44.auth.me(); }
      catch { return null; }
    },
    retry: false,
  });

  const navigate = useNavigate();

  // Redirect unauthenticated users to landing page
  useEffect(() => {
    if (currentUser === undefined) return; // still loading
    if (currentUser === null && currentPageName !== "PortalSelect") {
      navigate(createPageUrl("PortalSelect"), { replace: true });
      return;
    }
    // If user is authenticated but on PortalSelect, go to Dashboard
    if (currentUser !== null && currentPageName === "PortalSelect") {
      navigate(createPageUrl("Dashboard"), { replace: true });
      return;
    }
  }, [currentUser, currentPageName, navigate]);

  // Role-based redirect guard
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    const path = window.location.hash.replace("#", "") || "/";

    const isClientPage = path.startsWith("/ClientPortal");
    const isAgentPage  = path.startsWith("/AgentPortal");
    const isTCPage     = !isClientPage && !isAgentPage && path !== "/PortalSelect";

    if (role === "client" && !isClientPage) {
      navigate(createPageUrl("ClientPortal"), { replace: true });
    } else if (role === "agent" && !isAgentPage && isTCPage) {
      navigate(createPageUrl("AgentPortal"), { replace: true });
    } else if (!role || role === "user") {
      navigate(createPageUrl("Dashboard"), { replace: true });
    }
  }, [currentUser, navigate]);

  const role = currentUser?.role;
  const navItems = role === "client" ? CLIENT_NAV
    : role === "agent" ? AGENT_NAV
    : (role === "owner" || role === "admin") ? OWNER_NAV
    : (role === "tc" || role === "tc_lead") ? TC_NAV
    : TC_NAV;

  // Render landing page without any chrome
  if (currentPageName === "PortalSelect") {
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{ backgroundColor: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 text-white flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">EliteTC</h1>
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
                style={isActive ? {
                  backgroundColor: "var(--sidebar-item-active)",
                  color: "var(--sidebar-accent)",
                } : {
                  color: "var(--sidebar-text)",
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group sidebar-nav-item"
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = "var(--sidebar-item-hover)"; e.currentTarget.style.color = "var(--sidebar-text-active)"; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = ""; e.currentTarget.style.color = "var(--sidebar-text)"; }}}
              >
                <Icon className="w-[18px] h-[18px]" style={{ color: isActive ? "var(--sidebar-accent)" : "inherit" }} />
                {item.label}
                {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t space-y-2" style={{ borderColor: "var(--sidebar-border)" }}>
          {currentUser && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                {currentUser.full_name?.[0] || currentUser.email?.[0] || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "var(--sidebar-text-active)" }}>{currentUser.full_name || currentUser.email}</p>
                <p className="text-[10px] capitalize" style={{ color: "var(--sidebar-text)" }}>{currentUser.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => base44.auth.logout()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-red-500/10 hover:text-red-400"
            style={{ color: "var(--sidebar-text)" }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center gap-4" style={{ backgroundColor: "var(--header-bg)", borderBottom: "1px solid var(--header-border)" }}>
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {currentPageName === "TransactionDetail" ? "Transaction Detail" : 
             currentPageName === "AddTransaction" ? "New Transaction" :
             currentPageName === "AgentIntake" ? "Deal Intake" :
             currentPageName === "ClientPortal" ? "My Transaction" :
             currentPageName === "Documents" ? "Documents" :
             currentPageName === "AuditLog" ? "Audit Log" :
             currentPageName === "BrokerageSetup" ? "Brokerage Setup" :
             currentPageName === "AgentPortal" ? "My Transactions" :
             currentPageName}
          </h2>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8" style={{ backgroundColor: "var(--bg-primary)" }}>
          {children}
        </main>
      </div>
      </div>
    </ThemeProvider>
  );
}