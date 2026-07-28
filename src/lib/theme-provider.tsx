import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

function isAuthPath() {
  const path = window.location.pathname;
  return path === "/login" || path === "/signup";
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as Theme;
      if (stored) return stored;
      if (isAuthPath()) return "light";
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/** Force light theme on auth pages; restores the prior theme on unmount. */
export function useAuthLightTheme() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const previous = theme;
    if (previous !== "light") setTheme("light");
    return () => {
      if (previous !== "light") setTheme(previous);
    };
    // ponytail: mount-only — auth routes always open in light, restore on leave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
