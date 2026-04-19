import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * Portal-based popover anchored to a task row element.
 * Opens on the right side with proper z-index and click-outside handling.
 */
export default function MovePhasePopover({
  rowEl,
  allPhases,
  currentPhase,
  onSelect,
  onClose,
}) {
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!rowEl || !popoverRef.current) return;

    // Get row position
    const rowRect = rowEl.getBoundingClientRect();
    
    // Position popover: aligned with row vertically, to the right
    const top = rowRect.top + window.scrollY;
    const left = rowRect.right + window.scrollX + 8; // 8px gap from row

    popoverRef.current.style.position = "fixed";
    popoverRef.current.style.top = `${top}px`;
    popoverRef.current.style.left = `${left}px`;
    popoverRef.current.style.zIndex = "9999";
  }, [rowEl]);

  // Click-outside handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target) && !rowEl.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [rowEl, onClose]);

  return createPortal(
    <div
      ref={popoverRef}
      className="rounded-lg shadow-lg py-1 min-w-[150px]"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
      }}
    >
      <p className="text-[9px] font-semibold text-gray-400 px-2 py-1 uppercase tracking-wider">
        Move to phase
      </p>
      {allPhases.map((p) => (
        <button
          key={p.phaseNum}
          disabled={p.phaseNum === currentPhase}
          onClick={() => onSelect(p.phaseNum)}
          className={`w-full text-left px-2 py-1 text-xs transition-colors ${
            p.phaseNum === currentPhase
              ? "cursor-default opacity-40"
              : "hover:opacity-80"
          }`}
          style={{ color: "var(--text-secondary)" }}
        >
          {p.phaseNum === currentPhase ? "✓ " : ""}
          {p.label}
        </button>
      ))}
    </div>,
    document.body
  );
}