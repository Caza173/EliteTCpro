/**
 * ToggleSwitch — Premium shared toggle
 * 36×20px track | 16×16px thumb | 200ms ease-out
 * Linear / Stripe / Vercel / Raycast aesthetic
 */
import React from "react";

export default function ToggleSwitch({ checked, onChange, disabled = false, id }) {
  const track = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
    width: 28,
    height: 14,
    borderRadius: 3,
    padding: 1,
    border: "none",
    outline: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "background-color 200ms ease-out",
    backgroundColor: checked ? "#2563EB" : "#D1D5DB",
  };

  const thumb = {
    display: "block",
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
    transition: "transform 200ms ease-out",
    transform: checked ? "translateX(14px)" : "translateX(0px)",
    flexShrink: 0,
  };

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
      style={track}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.boxShadow = checked
          ? "0 0 0 3px rgba(37,99,235,0.18)"
          : "0 0 0 3px rgba(0,0,0,0.07)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
      onFocus={(e) => {
        if (!disabled) e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.3)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <span style={thumb} />
    </button>
  );
}