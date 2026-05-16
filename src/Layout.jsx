import React, { useState, useEffect } from "react";
import "./globals.css";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
// useQuery removed — user now comes from CurrentUserContext
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
  Shield,
  LogOut,
  Users,
  Link2,
  PanelLeftClose,
  PanelLeftOpen,
  ClipboardList,
  Layers,
  Receipt,
  CreditCard,
  Droplets,
  BookUser,
  MessageSquarePlus,
  Cpu,
} from "lucide-react";

import { InstallButtonHeader, InstallButtonFloat } from "./components/pwa/InstallButton.jsx";
import { ThemeProvider } from "./components/theme/ThemeContext";
import ThemeToggle from "./components/theme/ThemeToggle";
import OfflineBanner from "./components/pwa/OfflineBanner";
import UserMenuDropdown from "./components/user/UserMenuDropdown";
import LogoutButton from "./components/auth/LogoutButton";
import { useCurrentUser as useCurrentUserCtx } from "./lib/CurrentUserContext.jsx";
import FloatingAIButton from "./components/ai/FloatingAIButton";
import SidebarAIButton from "./components/ai/SidebarAIButton";
import AIModal from "./components/ai/AIModal";

const TC_NAV = [
  { label: "Dashboard",       page: "Dashboard",       icon: LayoutDashboard, path: "/Dashboard" },
  { label: "Transactions",    page: "Transactions",    icon: FileText, path: "/Transactions" },
  { label: "Addendum Builder", page: "AddendumBuilder", icon: ClipboardList, path: "/AddendumBuilder" },
  { label: "Contacts",        page: "Contacts",         icon: BookUser, path: "/Contacts" },
  { label: "Invoices",        page: "Invoices",         icon: Receipt, path: "/invoices" },
  { label: "Billing",         page: "Billing",          icon: CreditCard, path: "/Billing" },
  { label: "Settings",        page: "Settings",         icon: Settings, path: "/Settings" },
];

const OWNER_NAV = [
  { label: "Dashboard",      page: "Dashboard",      icon: LayoutDashboard, path: "/Dashboard" },
  { label: "Transactions",   page: "Transactions",   icon: FileText, path: "/Transactions" },
  { label: "Addendum Builder",page: "AddendumBuilder",  icon: ClipboardList, path: "/AddendumBuilder" },
  { label: "Contacts",       page: "Contacts",       icon: BookUser, path: "/Contacts" },
  { label: "Invoices",       page: "Invoices",       icon: Receipt, path: "/invoices" },
  { label: "Settings",       page: "Settings",       icon: Settings, path: "/Settings" },
  { label: "Diagnostics",   page: "TransactionDiagnostics", icon: Cpu, path: "/diagnostics" },
];

const AGENT_NAV = [
  { label: "Deal Intake", page: "AgentIntake", icon: UserPlus },
];

const CLIENT_NAV = [];

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
  Integrations:      "Integrations",
  FuelProrations:    "Fuel Prorations",
  Billing:           "Billing",
  Settings:          "Settings",
  Deadlines:         "Deadlines",
  Dashboard:         "Dashboard",
  Transactions:      "Transactions",
  CommissionStatements: "Commission Statements",
  AddendumBuilder: "Addendum Builder",
  PendingDeals: "Pending Deal Queue",
  TemplateManager: "Templates",
  Contacts: "Contacts",

  Contacts: "Contacts",
  Invoices: "Invoices",
  TutorialFAQPage: "Help & Training",
  TransactionDiagnostics: "Transaction Intelligence Diagnostics",
};

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { currentUser = null } = useCurrentUserCtx() || {};

  const navigate = useNavigate();

  // Role-specific page restrictions (only for completed users)
  useEffect(() => {
    if (!currentUser || currentUser.profile_completed !== true) return;

    const isMaster = currentUser.email === "nhcazateam@gmail.com";
    if (isMaster) return;

    const role = currentUser.role;
    const isTCRole = role === "tc" || role === "tc_lead";
    const TC_RESTRICTED = ["Integrations", "AuditLog", "Billing"];
    const path = window.location.pathname;
    const isTransactionDetail = path.includes("TransactionDetail") || path.includes("/transactions/");

    if (isTCRole && TC_RESTRICTED.includes(currentPageName)) {
      navigate("/Dashboard", { replace: true });
    } else if (role === "client" && !path.includes("ClientPortal") && !isTransactionDetail) {
      navigate(createPageUrl("ClientPortal"), { replace: true });
    }
    // Removed the "user" role redirect — AuthGate handles all onboarding redirects
  }, [currentUser?.id, currentUser?.profile_completed, currentUser?.role, currentPageName]);

  const role = currentUser?.role;
  const isMaster = currentUser?.email === "nhcazateam@gmail.com";
  const navItems = (isMaster || role === "owner" || role === "admin") ? OWNER_NAV
    : role === "client"   ? CLIENT_NAV
    : role === "agent"    ? AGENT_NAV
    : TC_NAV;

  if (["Landing", "PortalSelect", "SetupProfile", "AgentSignIn", "Onboarding"].includes(currentPageName)) {
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  const pageTitle = PAGE_TITLES[currentPageName] || currentPageName;

  return (
    <ThemeProvider>
      <OfflineBanner />

      <div
        className="h-screen flex overflow-hidden w-full"
        style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
      >
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            style={{ touchAction: "none" }}
          />
        )}

        {/* Sidebar */}
        <aside
          style={{
            backgroundColor: "var(--sidebar-bg)",
            borderRight: "1px solid var(--sidebar-border)",
            width: sidebarCollapsed ? "60px" : "220px",
          }}
          className={`fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col transition-all duration-250 ease-in-out flex-shrink-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Logo */}
          <div
            className="flex items-center gap-2.5 px-3 py-4 border-b"
            style={{ borderColor: "var(--sidebar-border)" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm"
              style={{ backgroundColor: "rgba(210,163,95,0.15)", border: "1px solid rgba(210,163,95,0.3)", color: "var(--gold, #d2a35f)" }}
            >
              E
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold tracking-tight" style={{ color: "#f7f3ea", fontFamily: "'Playfair Display', serif" }}>EliteTC</h1>
                <p className="text-[9px] font-medium tracking-widest uppercase" style={{ color: "var(--sidebar-text)" }}>
                  Transaction Platform
                </p>
              </div>
            )}
            <button
              className="ml-auto lg:hidden p-1 rounded"
              style={{ color: "var(--sidebar-text)" }}
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
            <button
              className="hidden lg:flex ml-auto p-1 rounded transition-colors"
              style={{ color: "var(--sidebar-text)" }}
              onClick={() => setSidebarCollapsed(c => !c)}
              onMouseEnter={e => e.currentTarget.style.color = "#d2a35f"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--sidebar-text)"}
              title={sidebarCollapsed ? "Expand" : "Collapse"}
            >
              {sidebarCollapsed
                ? <PanelLeftOpen className="w-3.5 h-3.5" />
                : <PanelLeftClose className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-none">
            {navItems.map((item) => {
              const isActive = currentPageName === item.page;
              const isLocked = currentUser?.profile_completed !== true;
              const Icon = item.icon;
              return (
                <Link
                  key={item.page}
                  to={item.path || createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  title={isLocked ? "Complete your profile to access this page" : (sidebarCollapsed ? item.label : undefined)}
                  className={`sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium ${
                    sidebarCollapsed ? "justify-center" : ""
                  } ${isLocked ? "opacity-30 cursor-not-allowed pointer-events-none" : ""}`}
                  style={isActive
                    ? { backgroundColor: "rgba(210,163,95,0.12)", color: "#d2a35f", borderLeft: "2px solid #d2a35f" }
                    : { color: "var(--sidebar-text)", borderLeft: "2px solid transparent" }
                  }
                  onMouseEnter={e => {
                    if (!isActive && !isLocked) {
                      e.currentTarget.style.backgroundColor = "rgba(210,163,95,0.07)";
                      e.currentTarget.style.color = "#f7f3ea";
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
                    className="w-[17px] h-[17px] flex-shrink-0"
                    style={{ color: isActive ? "#d2a35f" : "inherit" }}
                  />
                  {!sidebarCollapsed && (
                    <span className="truncate text-[13px]">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-2 py-3 border-t space-y-1" style={{ borderColor: "var(--sidebar-border)" }}>
            {currentUser && !sidebarCollapsed && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1">
                {currentUser.profile?.profile_photo_url ? (
                  <img
                    src={currentUser.profile.profile_photo_url}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: "rgba(210,163,95,0.15)", color: "#d2a35f" }}
                  >
                    {currentUser.profile?.first_name?.[0] || currentUser.email?.[0] || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "#f7f3ea" }}>
                    {currentUser.profile?.full_name || currentUser.email}
                  </p>
                  <p className="text-[10px] capitalize" style={{ color: "var(--sidebar-text)" }}>
                    {currentUser.role}
                  </p>
                </div>
              </div>
            )}
            <LogoutButton sidebarCollapsed={sidebarCollapsed} />
            <SidebarAIButton sidebarCollapsed={sidebarCollapsed} />
            </div>
            </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <header
            className="sticky top-0 z-30 flex-shrink-0 flex flex-col"
            style={{
              backgroundColor: "var(--header-bg)",
              borderBottom: "1px solid var(--header-border)",
              paddingTop: "env(safe-area-inset-top)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center justify-between px-4 lg:px-6 h-14">
              {/* LEFT — hamburger (mobile only) */}
              <button
                className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={e => e.currentTarget.style.color = "#d2a35f"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* CENTER — page title */}
              <h2
                className="text-sm font-semibold tracking-wide truncate flex-1 text-center lg:text-left lg:ml-0 mx-2"
                style={{ color: "var(--text-primary)", fontFamily: "'Playfair Display', serif", letterSpacing: "0.02em" }}
              >
                {pageTitle}
              </h2>

              {/* RIGHT — actions */}
              <div className="flex items-center gap-2">
                <InstallButtonHeader />
                <ThemeToggle />
                <UserMenuDropdown />
              </div>
            </div>
          </header>

          {/* Page content */}
          <main
            className="flex-1 p-4 lg:p-6 min-w-0 overflow-y-auto overflow-x-hidden"
            style={{
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}
          >
            {children}
          </main>
          <InstallButtonFloat />
        </div>

        {/* Global AI System — visible across entire app */}
        <AIModal />
      </div>
    </ThemeProvider>
  );
}