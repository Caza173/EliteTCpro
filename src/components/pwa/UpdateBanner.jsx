import React from "react";
import { RefreshCw, X } from "lucide-react";
import { usePWA } from "@/lib/PWAContext.jsx";

export default function UpdateBanner() {
  const { updateAvailable, applyUpdate } = usePWA();

  if (!updateAvailable) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl"
      style={{
        transform: "translateX(-50%)",
        background: "var(--card-bg)",
        border: "1px solid rgba(210,163,95,0.4)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        minWidth: 280,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(210,163,95,0.12)" }}
      >
        <RefreshCw className="w-4 h-4" style={{ color: "#d2a35f" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Update available
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Reload to get the latest version
        </p>
      </div>
      <button
        onClick={applyUpdate}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
        style={{
          background: "rgba(210,163,95,0.15)",
          color: "#d2a35f",
          border: "1px solid rgba(210,163,95,0.3)",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(210,163,95,0.25)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(210,163,95,0.15)"}
      >
        Reload
      </button>
    </div>
  );
}