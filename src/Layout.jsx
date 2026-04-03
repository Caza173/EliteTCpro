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
  CreditCard,
  Shield,
  LogOut,
  Users,
  Link2,
  PanelLeftClose,
  PanelLeftOpen,
  ClipboardList,
  Layers,
  Receipt,
  Droplets,
  BookUser,
  HelpCircle,
  MessageSquarePlus,
  Plug,
} from "lucide-react";
import NotificationBell from "./components/dashboard/NotificationBell";
import { InstallButtonHeader, InstallButtonFloat } from "./components/pwa/InstallButton.jsx";
import { ThemeProvider } from "./components/theme/ThemeContext";
import ThemeToggle from "./components/theme/ThemeToggle";
import OfflineBanner from "./components/pwa/OfflineBanner";
import UserMenuDropdown from "./components/user/UserMenuDropdown";
import LogoutButton from "./components/auth/LogoutButton";
import { useCurrentUser as useCurrentUserCtx } from "./lib/CurrentUserContext.jsx";

const TC_NAV = [
  { label: "Dashboard",      page: "Dashboard",      icon: LayoutDashboard },
  { label: "Transactions",   page: "Transactions",   icon: FileText },
  { label: "Contacts",       page: "Contacts",       icon: BookUser },
  { label: "Deal Intake",    page: "AgentIntake",    icon: UserPlus },
  { label: "User Management",page: "UserManagement", icon: Users },
  { label: "Commission",     page: "CommissionStatements", icon: Receipt },
  { label: "Fuel Prorations",page: "FuelProrations",   icon: Droplets },
  { label: "Addendum Builder",page: "AddendumBuilder", icon: ClipboardList },
  { label: "Templates",      page: "TemplateManager", icon: Layers },
  { label: "Integrations",   page: "DotloopIntegration", icon: Plug },
  { label: "Help & Training", page: "help",             icon: HelpCircle, path: "/help" },
  { label: "Settings",       page: "Settings",         icon: Settings },
];

const OWNER_NAV = [
  { label: "Dashboard",      page: "Dashboard",      icon: LayoutDashboard },
  { label: "Transactions",   page: "Transactions",   icon: FileText },
  { label: "Contacts",       page: "Contacts",       icon: BookUser },
  { label: "Deal Intake",    page: "AgentIntake",    icon: UserPlus },
  { label: "User Management",page: "UserManagement", icon: Users },
  { label: "Commission",     page: "CommissionStatements", icon: Receipt },
  { label: "Fuel Prorations",  page: "FuelProrations",   icon: Droplets },
  { label: "Addendum Builder",page: "AddendumBuilder",  icon: ClipboardList },
  { label: "Templates",      page: "TemplateManager", icon: Layers },
  { label: "Billing",          page: "Billing",          icon: CreditCard },
  { label: "Audit Log",      page: "AuditLog",       icon: Shield },
  { label: "Feedback Center",page: "FeedbackCenter", icon: MessageSquarePlus },
  { label: "Integrations",   page: "DotloopIntegration", icon: Plug },
  { label: "Help & Training", page: "help",            icon: HelpCircle, path: "/help" },
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
  AddendumBuilder: "Addendum Builder",
  TemplateManager: "Templates",
  Contacts: "Contacts",
  TutorialFAQPage: "Help & Training",
};

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { currentUser = null } = useCurrentUserCtx();

  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser === undefined) return;
    // Enforce profile setup for logged-in users who haven't completed it
    if (currentUser !== null && currentUser.profile_completed === false && currentPageName !== "SetupProfile") {
      navigate("/SetupProfile", { replace: true });
      return;
    }
  }, [currentUser, currentPageName, navigate]);

  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    const email = currentUser.email;
    const path = window.location.hash.replace("#", "") || "/";
    const isClientPage = path.startsWith("/ClientPortal");
    const isTransactionDetail = path.startsWith("/TransactionDetail");
    if (email === "nhcazateam@gmail.com") return;
    if (role === "client" && !isClientPage && !isTransactionDetail) {
      navigate(createPageUrl("ClientPortal"), { replace: true });
    } else if ((!role || role === "user") && !isTransactionDetail) {
      navigate(createPageUrl("Dashboard"), { replace: true });
    }
  }, [currentUser, navigate]);

  const role = currentUser?.role;
  const isMaster = currentUser?.email === "nhcazateam@gmail.com";
  const navItems = (isMaster || role === "owner" || role === "admin") ? OWNER_NAV
    : role === "client"   ? CLIENT_NAV
    : role === "agent"    ? AGENT_NAV
    : TC_NAV;

  if (currentPageName === "Landing" || currentPageName === "PortalSelect" || currentPageName === "SetupProfile" || currentPageName === "AgentSignIn") {
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
                  to={item.path || createPageUrl(item.page)}
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
                {currentUser.profile?.profile_photo_url ? (
                  <img
                    src={currentUser.profile.profile_photo_url}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: "rgba(37,99,235,0.2)", color: "var(--sidebar-accent)" }}
                  >
                    {currentUser.profile?.first_name?.[0] || currentUser.email?.[0] || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-white">
                    {currentUser.profile?.full_name || currentUser.email}
                  </p>
                  <p className="text-[10px] capitalize" style={{ color: "var(--sidebar-text)" }}>
                    {currentUser.role}
                  </p>
                </div>
              </div>
            )}
            <LogoutButton sidebarCollapsed={sidebarCollapsed} />
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
              <InstallButtonHeader />
              <ThemeToggle />
              <NotificationBell />
              <UserMenuDropdown />
            </div>
          </header>

          {/* Page content */}
          <main
            className="flex-1 p-4 lg:p-5 min-w-0 overflow-y-auto overflow-x-hidden"
            style={{ backgroundColor: "var(--bg-primary)" }}
          >
            {children}
          </main>
          <InstallButtonFloat />
        </div>
      </div>
    </ThemeProvider>
  );
}