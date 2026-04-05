import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "./ThemeContext";
import { Sun, Moon, Zap } from "lucide-react";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "cyber", label: "Cyber", icon: Zap },
];

// For simple toggle between Light and Dark only (recommended)
const SIMPLE_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = OPTIONS.find((o) => o.value === theme) || OPTIONS[0];
  const Icon = current.icon;

  // Toggle to next theme (light -> dark -> light)
  const handleQuickToggle = () => {
    const nextTheme = theme === "light" ? "dark" : theme === "dark" ? "cyber" : "light";
    setTheme(nextTheme);
  };

  return (
    <div ref={ref} className="relative">
      {/* Main toggle button */}
      <button
        onClick={handleQuickToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium theme-toggle-btn"
        title={`Switch theme (${theme} → ${theme === "light" ? "dark" : theme === "dark" ? "cyber" : "light"})`}
      >
        <Icon className="w-4 h-4" />
        <span className="hidden sm:inline">{current.label}</span>
        <span className="hidden sm:inline text-[10px] opacity-50">▼</span>
      </button>

      {/* Theme dropdown menu */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-40 rounded-lg border theme-dropdown z-50 overflow-hidden animate-fade-in">
          {OPTIONS.map((opt) => {
            const OptionIcon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => { setTheme(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium theme-dropdown-item ${theme === opt.value ? "theme-dropdown-active" : ""}`}
              >
                <OptionIcon className="w-4 h-4" />
                <span className="flex-1 text-left">{opt.label}</span>
                {theme === opt.value && (
                  <span className="w-2 h-2 rounded-full theme-accent-dot" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}