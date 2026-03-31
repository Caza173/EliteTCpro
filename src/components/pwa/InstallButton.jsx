import React from "react";
import { Download } from "lucide-react";
import { usePWA } from "@/lib/PWAContext.jsx";
import IOSInstallModal from "./IOSInstallModal.jsx";

/** Header button (desktop) */
export function InstallButtonHeader() {
  const { canInstall, handleInstallClick, showIOSInstructions, setShowIOSInstructions, isIOS } = usePWA();

  if (!canInstall) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 opacity-0 animate-fade-in"
        style={{
          background: "var(--accent-subtle)",
          color: "var(--accent)",
          border: "1px solid var(--accent)",
          boxShadow: "0 0 8px rgba(37,99,235,0.15)",
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px rgba(37,99,235,0.3)"}
        onMouseLeave={e => e.currentTarget.style.boxShadow = "0 0 8px rgba(37,99,235,0.15)"}
      >
        <Download className="w-3.5 h-3.5" />
        Install App
      </button>
      {isIOS && (
        <IOSInstallModal open={showIOSInstructions} onClose={() => setShowIOSInstructions(false)} />
      )}
    </>
  );
}

/** Floating button (mobile) */
export function InstallButtonFloat() {
  const { canInstall, handleInstallClick, showIOSInstructions, setShowIOSInstructions, isIOS } = usePWA();

  if (!canInstall) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="sm:hidden fixed bottom-6 right-5 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 animate-fade-in"
        style={{
          background: "var(--accent)",
          color: "var(--accent-text)",
          boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 6px 24px rgba(37,99,235,0.5)"}
        onMouseLeave={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.35)"}
        title="Install App"
      >
        <Download className="w-5 h-5" />
      </button>
      {isIOS && (
        <IOSInstallModal open={showIOSInstructions} onClose={() => setShowIOSInstructions(false)} />
      )}
    </>
  );
}