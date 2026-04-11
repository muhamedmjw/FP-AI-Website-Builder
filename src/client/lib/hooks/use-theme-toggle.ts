"use client";

import { useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light";

const DEFAULT_THEME_STORAGE_KEY = "app-theme";

function resolveInitialTheme(storageKey: string): Theme {
  const root = document.documentElement;
  const rootTheme = root.getAttribute("data-theme");
  const savedTheme = window.localStorage.getItem(storageKey);
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  if (rootTheme === "light" || rootTheme === "dark") {
    return rootTheme;
  }

  return prefersLight ? "light" : "dark";
}

/**
 * Keeps app theme state, document attribute, and local storage synchronized.
 */
export default function useThemeToggle(storageKey = DEFAULT_THEME_STORAGE_KEY) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const nextTheme = resolveInitialTheme(storageKey);
    document.documentElement.setAttribute("data-theme", nextTheme);
    setTheme(nextTheme);
  }, [storageKey]);

  const isLightTheme = useMemo(() => theme === "light", [theme]);

  function toggleTheme() {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
  }

  return {
    theme,
    isLightTheme,
    toggleTheme,
  };
}
