import React, { createContext, useContext, useEffect, useState } from "react";

export const THEMES = {
  light: "light",
  dark: "dark",
  cyber: "cyber",
};

const ThemeContext = createContext({ theme: "light", setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("elitetc_theme") || "light";
  });

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem("elitetc_theme", t);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
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