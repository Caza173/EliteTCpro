/**
 * ToggleSwitch — Backwards compatibility wrapper
 * Now uses ModernToggle for premium fintech/SaaS aesthetic
 */
import React from "react";
import ModernToggle from "./ModernToggle";

export default function ToggleSwitch({ checked, onChange, disabled = false, id }) {
  return <ModernToggle checked={checked} onChange={onChange} disabled={disabled} id={id} />;
}