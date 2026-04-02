import React from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function LogoutButton({ sidebarCollapsed }) {
  const { logout } = useAuth();

  return (
    <button
      onClick={logout}
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
  );
}