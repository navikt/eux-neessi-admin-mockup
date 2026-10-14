"use client";

import { useSyncExternalStore } from "react";

const KEY = "neessi-admin-sidebar";
const EVENT = "neessi:sidebar";
export const OPEN_SEARCH_EVENT = "neessi:open-search";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

const getSnapshot = () => document.documentElement.getAttribute("data-sidebar") === "collapsed";
const getServerSnapshot = () => false;

/** Collapsed state lives on <html data-sidebar> so CSS can lay out the rail before hydration. */
export function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [collapsed, toggleSidebar];
}

export function toggleSidebar() {
  const el = document.documentElement;
  const next = el.getAttribute("data-sidebar") === "collapsed" ? "expanded" : "collapsed";
  if (next === "collapsed") el.setAttribute("data-sidebar", "collapsed");
  else el.removeAttribute("data-sidebar");
  try {
    localStorage.setItem(KEY, next);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function openSearch() {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}
