/**
 * ModernToggle — Premium segmented toggle slider
 * Fintech/SaaS aesthetic (Linear, Stripe, Vercel, Notion AI)
 * 
 * Specs:
 * - Height: 28px (content) | 32px (total with space)
 * - Width: 56px (auto-size to content)
 * - Fully rounded pill (border-radius: 9999px)
 * - Smooth 200ms motion transitions
 * - Subtle glow on active state
 * - White thumb with smooth animation
 * - Premium minimal design with no hard edges
 */

import React from "react";
import { motion } from "framer-motion";

export default function ModernToggle({ checked, onChange, disabled = false, id }) {
  const isDisabled = disabled;

  return (
    <motion.button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={isDisabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDisabled) onChange(!checked);
      }}
      className="relative inline-flex items-center flex-shrink-0 group focus-visible:outline-none"
      style={{
        width: "56px",
        height: "28px",
        borderRadius: "9999px",
        border: "none",
        padding: "2px",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.55 : 1,
        transition: "all 200ms ease-out",
      }}
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      initial={false}
      animate={{
        backgroundColor: checked ? "rgba(37, 99, 235, 1)" : "rgba(75, 85, 99, 0.15)",
        boxShadow: checked && !isDisabled
          ? "0 0 0 4px rgba(37, 99, 235, 0.15), 0 2px 8px rgba(37, 99, 235, 0.2)"
          : "0 0 0 0px rgba(0, 0, 0, 0)",
      }}
      transition={{
        backgroundColor: { duration: 0.2, ease: "easeOut" },
        boxShadow: { duration: 0.2, ease: "easeOut" },
      }}
      onFocus={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.boxShadow = checked
            ? "0 0 0 4px rgba(37, 99, 235, 0.25), 0 2px 8px rgba(37, 99, 235, 0.25)"
            : "0 0 0 3px rgba(0, 0, 0, 0.08)";
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {/* Active gradient background (under thumb) */}
      {checked && !isDisabled && (
        <motion.div
          layoutId={`gradient-${id}`}
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
          }}
          initial={false}
          transition={{ duration: 0.2, ease: "easeOut" }}
        />
      )}

      {/* Thumb toggle */}
      <motion.div
        className="relative w-6 h-6 bg-white rounded-full shadow-md flex-shrink-0 z-10"
        animate={{
          x: checked ? "28px" : "0px",
        }}
        initial={false}
        transition={{
          x: { duration: 0.2, ease: "easeOut" },
        }}
        style={{
          boxShadow: checked
            ? "0 2px 6px rgba(37, 99, 235, 0.3), 0 0 1px rgba(0, 0, 0, 0.1)"
            : "0 1px 4px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)",
        }}
      />

      {/* Focus ring (keyboard accessibility) */}
      <div
        className="absolute inset-0 rounded-full ring-2 ring-transparent group-focus-visible:ring-blue-400 transition-all"
        style={{
          ringOffset: "2px",
          pointerEvents: "none",
        }}
      />
    </motion.button>
  );
}