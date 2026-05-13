import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * SidebarNavButton — Theme-aware sidebar navigation button component
 * 
 * Features:
 * - Semantic color tokens (no hardcoded colors)
 * - Full theme support (light/dark/custom)
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
    // Layout
    "flex items-center justify-center",
    "transition-all duration-200 ease-out",
    "rounded-lg",
    "relative",
    "group",
    collapsed ? "h-9 w-9" : "h-9 px-2.5 gap-2.5"
  );

  const buttonClasses = cn(
    baseClasses,
    // Default state
    "text-xs font-medium",
    active
      ? // Active state: subtle accent background + stronger text
        "bg-sidebar-item-active text-sidebar-accent shadow-sm"
      : // Default state: muted text
        "text-sidebar-text hover:bg-sidebar-item-hover hover:text-sidebar-text-active",
    // Focus/keyboard navigation
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sidebar-accent",
    // Disabled state
    disabled && "opacity-40 cursor-not-allowed pointer-events-none"
  );

  const iconClasses = cn(
    "w-4 h-4 flex-shrink-0",
    active && accentClass,
    !active && "group-hover:opacity-80"
  );

  const content = (
    <>
      <Icon className={iconClasses} />
      {!collapsed && (
        <>
          <span className="truncate flex-1">{label}</span>
          {active && (
            <span className="w-1 h-1 rounded-full bg-sidebar-accent ml-auto flex-shrink-0 opacity-60" />
          )}
        </>
      )}
    </>
  );

  const sharedProps = {
    className: buttonClasses,
    onClick: onClick,
    disabled: disabled,
    title: collapsed ? label : undefined,
    "aria-label": label,
    "data-active": active,
  };

  // Use Link if href/to provided, otherwise use button
  if (href || to) {
    return (
      <Link
        to={href || to}
        {...sharedProps}
        onClick={(e) => {
          onClick?.();
          // Don't prevent default for link navigation
        }}
      >
        {content}
      </Link>
    );
  }

  return <button {...sharedProps}>{content}</button>;
}