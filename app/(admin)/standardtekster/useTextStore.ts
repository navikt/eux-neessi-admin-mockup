"use client";

import { useCallback, useSyncExternalStore } from "react";
import { seedStore, type TextStore } from "@/lib/mock/texts";

const KEY = "neessi-admin:standardtekster:v1";
const listeners = new Set<() => void>();
let cache: { today: string; store: TextStore } | null = null;

function read(today: string): TextStore {
  if (cache?.today === today) return cache.store;
  let store = seedStore(today);
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) store = { ...store, ...(JSON.parse(raw) as TextStore) };
  } catch {
    // Ignore corrupt or unavailable storage – fall back to the seed.
  }
  cache = { today, store };
  return store;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useTextStore(today: string): [TextStore, (next: TextStore) => void, () => void] {
  const store = useSyncExternalStore(
    subscribe,
    () => read(today),
    () => seedStore(today),
  );
  const write = useCallback(
    (next: TextStore) => {
      cache = { today, store: next };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Storage full or disabled – keep in memory only.
      }
      listeners.forEach((l) => l());
    },
    [today],
  );
  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    cache = null;
    listeners.forEach((l) => l());
  }, []);
  return [store, write, reset];
}
