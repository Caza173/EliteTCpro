import React, { useEffect } from "react";

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "danger", // "danger" | "default"
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal */}
      <div
        className="relative w-full max-w-sm rounded-2xl border shadow-2xl p-6 flex flex-col gap-4"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--card-border)",
          color: "var(--text-primary)",
        }}
      >
        <div>
          <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            {title}
          </h2>
          {message && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {message}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          {cancelText && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--bg-tertiary)"}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => { onConfirm(); onCancel(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors text-white ${
              variant === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}