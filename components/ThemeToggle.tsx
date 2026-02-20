"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

function resolveTheme(): ThemeMode {
  if (typeof document === "undefined") {
    return "light";
  }
  const current = document.documentElement.getAttribute("data-theme");
  if (current === "dark" || current === "light") {
    return current;
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const initialTheme = resolveTheme();
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("warriors-theme", nextTheme);
    }
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4.4a.8.8 0 0 1 .8.8v1.5a.8.8 0 1 1-1.6 0V5.2a.8.8 0 0 1 .8-.8Zm0 12.9a.8.8 0 0 1 .8.8v1.5a.8.8 0 1 1-1.6 0V18a.8.8 0 0 1 .8-.8Zm7.6-5.3a.8.8 0 0 1 0 1.6h-1.5a.8.8 0 0 1 0-1.6Zm-12.2 0a.8.8 0 1 1 0 1.6H5.9a.8.8 0 1 1 0-1.6ZM17 7a.8.8 0 0 1 1.1 0l1 1a.8.8 0 0 1-1.1 1.1l-1-1A.8.8 0 0 1 17 7Zm-11 11a.8.8 0 0 1 1.1 0l1 1A.8.8 0 0 1 7 20.1l-1-1A.8.8 0 0 1 6 18Zm12.1.9a.8.8 0 0 1 1.1-1.1l1 1a.8.8 0 0 1-1.1 1.1ZM7 7.1A.8.8 0 0 1 8.1 8l-1 1A.8.8 0 0 1 6 7.9Zm5 1.3a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2Zm0 1.6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.9 3.5a.8.8 0 0 1 .9 1A7.3 7.3 0 1 0 19.5 16a.8.8 0 0 1 1 .9A8.9 8.9 0 1 1 14 3.5h.9Z" />
        </svg>
      )}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
