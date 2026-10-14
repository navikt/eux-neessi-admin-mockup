"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { Theme } from "@navikt/ds-react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "neessi-admin-theme";

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeMode must be used within <ThemeProvider>");
  return ctx;
}

type Snapshot = { mode: ThemeMode; resolved: ResolvedTheme | undefined };

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* storage unavailable */
  }
  return "system";
}

function resolve(mode: ThemeMode): ResolvedTheme {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return dark ? "dark" : "light";
}

let cachedSnapshot: Snapshot | null = null;

function getSnapshot(): Snapshot {
  const mode = readMode();
  const resolved = resolve(mode);
  if (cachedSnapshot && cachedSnapshot.mode === mode && cachedSnapshot.resolved === resolved) return cachedSnapshot;
  cachedSnapshot = { mode, resolved };
  return cachedSnapshot;
}

const SERVER_SNAPSHOT: Snapshot = { mode: "system", resolved: undefined };

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", emit);
  window.addEventListener("storage", emit);
  return () => {
    listeners.delete(callback);
    media.removeEventListener("change", emit);
    window.removeEventListener("storage", emit);
  };
}

function applyToDocument(mode: ThemeMode, resolved: ResolvedTheme): void {
  const el = document.documentElement;
  el.classList.remove("light", "dark");
  el.classList.add(resolved);
  el.style.colorScheme = resolved;
  el.setAttribute("data-theme-mode", mode);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, resolved } = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);

  useEffect(() => {
    if (resolved) applyToDocument(mode, resolved);
  }, [mode, resolved]);

  const setMode = useCallback((next: ThemeMode) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* best effort */
    }
    emit();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedTheme: resolved ?? "light", setMode }),
    [mode, resolved, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <Theme theme={resolved}>{children}</Theme>
    </ThemeContext.Provider>
  );
}
