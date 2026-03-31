import React from "react";
import { X, Share, Plus } from "lucide-react";

export default function IOSInstallModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:w-80 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:opacity-60 transition-opacity"
          style={{ color: "var(--text-muted)" }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-subtle)" }}>
            <Plus className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Install App</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Add to Home Screen</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { num: 1, icon: Share, text: "Tap the Share icon at the bottom of your browser" },
            { num: 2, icon: null, text: "Scroll down in the share sheet" },
            { num: 3, icon: Plus, text: 'Tap "Add to Home Screen"' },
          ].map(({ num, icon: Icon, text }) => (
            <div key={num} className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
              >
                {num}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}