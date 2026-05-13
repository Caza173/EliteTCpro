/**
 * ToggleSwitch — Backwards compatibility wrapper
 * Now uses CyberToggle for holographic sci-fi aesthetic
 */
import React from "react";
import CyberToggle from "./CyberToggle";

export default function ToggleSwitch({ checked, onChange, disabled = false, id }) {
  return <CyberToggle checked={checked} onChange={onChange} disabled={disabled} id={id} />;
}