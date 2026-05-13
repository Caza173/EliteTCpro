/**
 * CyberToggle — Holographic Sci-Fi Toggle
 * UIverse.io design with full animations and particle effects
 * Blue (off) ↔ Green (on) with scanning lines, energy rings, and glows
 */
import React from "react";

export default function CyberToggle({ checked, onChange, disabled = false, id }) {
  const handleChange = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) onChange(!checked);
  };

  return (
    <div className="toggle-container" style={{ opacity: disabled ? 0.55 : 1 }}>
      <div className="toggle-wrap">
        <input
          id={id}
          type="checkbox"
          className="toggle-input"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          role="switch"
          aria-checked={checked}
        />
        
        <div className="toggle-track">
          {/* Track background gradients */}
          
          {/* Scanning line animation */}
          <div className="track-lines">
            <div className="track-line" />
          </div>

          {/* Main thumb slider */}
          <div className="toggle-thumb">
            {/* Thumb core gradient */}
            <div className="thumb-core" />
            
            {/* Inner pulsing light */}
            <div className="thumb-inner" />
            
            {/* Scanning beam effect */}
            <div className="thumb-scan" />
            
            {/* Floating particles */}
            <div className="thumb-particles">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="thumb-particle" />
              ))}
            </div>
          </div>

          {/* Energy rings around thumb */}
          <div className="energy-rings">
            <div className="energy-ring" />
            <div className="energy-ring" />
            <div className="energy-ring" />
          </div>

          {/* Data text labels */}
          <div className="toggle-data">
            <div className="data-text off">OFF</div>
            <div className="data-text on">ON</div>
          </div>

          {/* Status indicator lights */}
          <div className="status-indicator off" />
          <div className="status-indicator on" />

          {/* Interface connector lines */}
          <div className="interface-lines">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="interface-line" />
            ))}
          </div>

          {/* Reflection gloss */}
          <div className="toggle-reflection" />

          {/* Holographic glow halo */}
          <div className="holo-glow" />
        </div>
      </div>

      {/* Optional label */}
      <div className="toggle-label">System Status</div>
    </div>
  );
}