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
  UserPlus,
  FolderOpen,
  CreditCard,
  Shield,
  LogOut,
  Users,
  Link2,
  PanelLeftClose,
  PanelLeftOpen,
  ClipboardList,
  Receipt,
  Droplets,
} from "lucide-react";
import NotificationBell from "./components/dashboard/NotificationBell";
import { ThemeProvider } from "./components/theme/ThemeContext";
import ThemeToggle from "./components/theme/ThemeToggle";
import InstallPrompt from "./components/pwa/InstallPrompt";
import OfflineBanner from "./components/pwa/OfflineBanner";

const TC_NAV = [
  { label: "Dashboard",      page: "Dashboard",      icon: LayoutDashboard },
  { label: "Transactions",   page: "Transactions",   icon: FileText },
  { label: "Deal Intake",    page: "AgentIntake",    icon: UserPlus },
  { label: "User Management",page: "UserManagement", icon: Users },
  { label: "Commission",     page: "CommissionStatements", icon: Receipt },
  { label: "Fuel Prorations",page: "FuelProrations", icon: Droplets },
  { label: "Settings",       page: "Settings",       icon: Settings },
];

const OWNER_NAV = [
  { label: "Dashboard",      page: "Dashboard",      icon: LayoutDashboard },
  { label: "Transactions",   page: "Transactions",   icon: FileText },
  { label: "Deal Intake",    page: "AgentIntake",    icon: UserPlus },
  { label: "User Management",page: "UserManagement", icon: Users },
  { label: "Commission",     page: "CommissionStatements", icon: Receipt },
  { label: "Fuel Prorations",page: "FuelProrations", icon: Droplets },
  { label: "Billing",        page: "Billing",        icon: CreditCard },
  { label: "Audit Log",      page: "AuditLog",       icon: Shield },
  { label: "Settings",       page: "Settings",       icon: Settings },
];

const AGENT_NAV = [
  { label: "My Transactions", page: "AgentPortal",  icon: LayoutDashboard },
  { label: "Deal Intake",     page: "AgentIntake",  icon: UserPlus },
];

const CLIENT_NAV = [
  { label: "My Transaction",  page: "ClientPortal", icon: LayoutDashboard },
];

const PAGE_TITLES = {
  TransactionDetail: "Transaction Detail",
  AddTransaction:    "New Transaction",
  AgentIntake:       "Deal Intake",
  ClientPortal:      "My Transaction",
  Documents:         "Documents",
  AuditLog:          "Audit Log",
  BrokerageSetup:    "Brokerage Setup",
  AgentPortal:       "My Transactions",
  UserManagement:    "User Management",
  DotloopIntegration:"Dotloop Integration",
  FuelProrations:    "Fuel Prorations",
  Billing:           "Billing",
  Settings:          "Settings",
  Deadlines:         "Deadlines",
  Dashboard:         "Dashboard",
  Transactions:      "Transactions",
  CommissionStatements: "Commission Statements",
};

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: currentUser = null } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try { return await base44.auth.me(); }
      catch { return null; }
    },
    retry: false,
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser === undefined) return;
    if (currentUser === null && currentPageName !== "PortalSelect") {
      navigate(createPageUrl("PortalSelect"), { replace: true });
      return;
    }
    if (currentUser !== null && currentPageName === "PortalSelect") {
      navigate(createPageUrl("Dashboard"), { replace: true });
      return;
    }
  }, [currentUser, currentPageName, navigate]);

  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    const email = currentUser.email;
    const path = window.location.hash.replace("#", "") || "/";
    const isClientPage = path.startsWith("/ClientPortal");
    if (email === "nhcazateam@gmail.com") return;
    if (role === "client" && !isClientPage) {
      navigate(createPageUrl("ClientPortal"), { replace: true });
    } else if (!role || role === "user") {
      navigate(createPageUrl("Dashboard"), { replace: true });
    }
  }, [currentUser, navigate]);

  const role = currentUser?.role;
  const isMaster = currentUser?.email === "nhcazateam@gmail.com";
  const navItems = (isMaster || role === "owner" || role === "admin") ? OWNER_NAV
    : role === "client"   ? CLIENT_NAV
    : role === "agent"    ? AGENT_NAV
    : TC_NAV;

  if (currentPageName === "PortalSelect") {
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  const pageTitle = PAGE_TITLES[currentPageName] || currentPageName;

  return (
    <ThemeProvider>
      <OfflineBanner />
      <InstallPrompt />

      <div
        className="h-screen flex overflow-hidden w-full"
        style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
      >
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          style={{
            backgroundColor: "var(--sidebar-bg)",
            borderRight: "1px solid var(--sidebar-border)",
            width: sidebarCollapsed ? "60px" : "220px",
          }}
          className={`fixed lg:sticky top-0 left-0 z-50 h-screen text-white flex flex-col transition-all duration-250 ease-in-out flex-shrink-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Logo */}
          <div
            className="flex items-center gap-2.5 px-3 py-4 border-b"
            style={{ borderColor: "var(--sidebar-border)" }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "var(--sidebar-accent)" }}>
              <Building2 className="w-4 h-4 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-semibold tracking-tight text-white">EliteTC</h1>
                <p className="text-[10px] font-medium" style={{ color: "var(--sidebar-text)" }}>
                  Transaction Platform
                </p>
              </div>
            )}
            {/* Mobile close */}
            <button
              className="ml-auto lg:hidden p-1 rounded"
              style={{ color: "var(--sidebar-text)" }}
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
            {/* Desktop collapse */}
            <button
              className="hidden lg:flex ml-auto p-1 rounded transition-colors hover:bg-white/10"
              style={{ color: "var(--sidebar-text)" }}
              onClick={() => setSidebarCollapsed(c => !c)}
              title={sidebarCollapsed ? "Expand" : "Collapse"}
            >
              {sidebarCollapsed
                ? <PanelLeftOpen className="w-3.5 h-3.5" />
                : <PanelLeftClose className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = currentPageName === item.page;
              const Icon = item.icon;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`sidebar-nav-item flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium ${
                    sidebarCollapsed ? "justify-center" : ""
                  }`}
                  style={isActive
                    ? { backgroundColor: "var(--sidebar-item-active)", color: "var(--sidebar-accent)" }
                    : { color: "var(--sidebar-text)" }
                  }
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "var(--sidebar-item-hover)";
                      e.currentTarget.style.color = "var(--sidebar-text-active)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "";
                      e.currentTarget.style.color = "var(--sidebar-text)";
                    }
                  }}
                >
                  <Icon
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: isActive ? "var(--sidebar-accent)" : "inherit" }}
                  />
                  {!sidebarCollapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <ChevronRight className="w-3 h-3 ml-auto opacity-40 flex-shrink-0" />
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-2 py-3 border-t space-y-1" style={{ borderColor: "var(--sidebar-border)" }}>
            {currentUser && !sidebarCollapsed && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: "rgba(37,99,235,0.2)", color: "var(--sidebar-accent)" }}
                >
                  {currentUser.full_name?.[0] || currentUser.email?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-white">
                    {currentUser.full_name || currentUser.email}
                  </p>
                  <p className="text-[10px] capitalize" style={{ color: "var(--sidebar-text)" }}>
                    {currentUser.role}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={() => base44.auth.logout()}
              title={sidebarCollapsed ? "Sign Out" : undefined}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                sidebarCollapsed ? "justify-center" : ""
              }`}
              style={{ color: "var(--sidebar-text)" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#EF4444"; e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--sidebar-text)"; e.currentTarget.style.backgroundColor = ""; }}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && "Sign Out"}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
          {/* Top bar */}
          <header
            className="sticky top-0 z-30 backdrop-blur-sm px-4 lg:px-5 h-12 flex items-center gap-3 flex-shrink-0"
            style={{
              backgroundColor: "var(--header-bg)",
              borderBottom: "1px solid var(--header-border)",
            }}
          >
            <button
              className="lg:hidden p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </button>

            <h2
              className="text-sm font-semibold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {pageTitle}
            </h2>

            <div className="ml-auto flex items-center gap-1.5">
              <ThemeToggle />
              <NotificationBell />
            </div>
          </header>

          {/* Page content */}
          <main
            className="flex-1 p-4 lg:p-5 min-w-0 overflow-x-hidden"
            style={{ backgroundColor: "var(--bg-primary)" }}
          >
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}