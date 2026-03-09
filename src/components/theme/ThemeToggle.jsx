import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "./ThemeContext";
import { Sun, Moon, Zap } from "lucide-react";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "cyber", label: "Cyber", icon: Zap },
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all theme-toggle-btn"
        title="Change theme"
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{current.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-36 rounded-xl shadow-xl border theme-dropdown z-50 overflow-hidden">
          {OPTIONS.map((opt) => {
            const OptionIcon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => { setTheme(opt.value); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors theme-dropdown-item ${theme === opt.value ? "theme-dropdown-active" : ""}`}
              >
                <OptionIcon className="w-3.5 h-3.5" />
                {opt.label}
                {theme === opt.value && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full theme-accent-dot" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}