import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * SidebarNavButton — Theme-aware sidebar navigation button component
 * 
 * Features:
 * - Semantic color tokens (CSS variables, not hardcoded)
 * - Full theme support (light/dark/cyber)
 * - Active state detection
 * - Collapsed sidebar mode with tooltip
 * - Icon accent color support
 * - Smooth animations
 * - Accessible keyboard navigation
 */
export default function SidebarNavButton({
  icon: Icon,
  label,
  href,
  to,
  onClick,
  active = false,
  collapsed = false,
  disabled = false,
  accentClass = "text-blue-500",
}) {
  const baseClasses = cn(
    "flex items-center",
    "transition-all duration-200",
    "rounded-lg",
    "relative group",
    "w-full",
    "text-xs font-medium",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    collapsed ? "justify-center h-9" : "h-9 px-2.5 gap-2.5"
  );

  const buttonClasses = cn(
    baseClasses,
    disabled && "opacity-40 cursor-not-allowed pointer-events-none"
  );

  // Use inline styles for theme token colors since they're CSS variables
  const buttonStyle = {
    backgroundColor: active ? "var(--sidebar-item-active)" : "transparent",
    color: active ? "var(--sidebar-accent)" : "var(--sidebar-text)",
    transitionProperty: "background-color, color",
    transitionDuration: "200ms",
  };

  const iconClasses = cn(
    "w-4 h-4 flex-shrink-0",
    active && accentClass,
    !active && !disabled && "group-hover:opacity-80"
  );

  const content = (
    <>
      <Icon className={iconClasses} />
      {!collapsed && (
        <>
          <span className="truncate flex-1">{label}</span>
          {active && (
            <span 
              className="w-1 h-1 rounded-full ml-auto flex-shrink-0 opacity-60"
              style={{ backgroundColor: "var(--sidebar-accent)" }}
            />
          )}
        </>
      )}
    </>
  );

  const handleMouseEnter = (e) => {
    if (!disabled && !active) {
      e.currentTarget.style.backgroundColor = "var(--sidebar-item-hover)";
      e.currentTarget.style.color = "var(--sidebar-text-active)";
    }
  };

  const handleMouseLeave = (e) => {
    if (!active) {
      e.currentTarget.style.backgroundColor = "transparent";
      e.currentTarget.style.color = "var(--sidebar-text)";
    }
  };

  // Use Link if href/to provided, otherwise use button
  if (href || to) {
    return (
      <Link
        to={href || to}
        className={buttonClasses}
        style={buttonStyle}
        title={collapsed ? label : undefined}
        aria-label={label}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      className={buttonClasses}
      style={buttonStyle}
      onClick={onClick}
      disabled={disabled}
      title={collapsed ? label : undefined}
      aria-label={label}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {content}
    </button>
  );
}