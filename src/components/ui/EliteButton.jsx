/**
 * EliteButton — Premium animated button component
 * For primary luxury SaaS actions only.
 *
 * Variants: gold | ai | success | danger | ghost | secondary
 * Sizes:    sm | md | lg
 */
import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/styles/elite-button.css";

const VARIANTS = {
  gold:      "elite-btn-gold",
  ai:        "elite-btn-ai",
  success:   "elite-btn-success",
  danger:    "elite-btn-danger",
  ghost:     "elite-btn-ghost",
  secondary: "elite-btn-secondary",
};

const SIZES = {
  sm: "elite-btn-sm",
  md: "elite-btn-md",
  lg: "elite-btn-lg",
};

const MOTION = {
  hover: { scale: 1.02, y: -1 },
  tap:   { scale: 0.98, y: 0 },
  rest:  { scale: 1,    y: 0 },
};

const TRANSITION = {
  type: "tween",
  duration: 0.18,
  ease: [0.25, 0.1, 0.25, 1],
};

export default function EliteButton({
  variant  = "gold",
  size     = "md",
  loading  = false,
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  className,
  onClick,
  type     = "button",
  ariaLabel,
  floatAI  = false,  // adds subtle pulse for the floating AI button
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      className={cn(
        "elite-btn",
        VARIANTS[variant] || VARIANTS.gold,
        SIZES[size]       || SIZES.md,
        floatAI && "elite-btn-ai-float",
        className
      )}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={loading}
      variants={MOTION}
      initial="rest"
      whileHover={isDisabled ? "rest" : "hover"}
      whileTap={isDisabled   ? "rest" : "tap"}
      animate="rest"
      transition={TRANSITION}
      {...rest}
    >
      {/* Shimmer effect for gold/ai */}
      {(variant === "gold" || variant === "ai") && (
        <span className="elite-shimmer" aria-hidden="true" />
      )}

      {/* Left icon or loading spinner */}
      {loading ? (
        <span className="elite-spinner" aria-hidden="true" />
      ) : leftIcon ? (
        <span className="flex-shrink-0 flex items-center" aria-hidden="true">
          {leftIcon}
        </span>
      ) : null}

      {/* Label */}
      {children && (
        <span className="relative z-10">{children}</span>
      )}

      {/* Right icon */}
      {!loading && rightIcon && (
        <span className="flex-shrink-0 flex items-center" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </motion.button>
  );
}