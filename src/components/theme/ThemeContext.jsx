import React, { createContext, useContext, useEffect, useState } from "react";

export const THEMES = {
  light: "light",
  dark: "dark",
};

const ThemeContext = createContext({ theme: "light", setTheme: () => {} });

// Apply theme immediately to prevent flash — runs before React renders
(function() {
  try {
    const saved = localStorage.getItem("elitetc_theme");
    const t = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.classList.toggle("dark", t === "dark" || t === "cyber");
  } catch(e) {}
})();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem("elitetc_theme");
      if (saved) return saved;
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch(e) { return "dark"; }
  });

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem("elitetc_theme", t);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}