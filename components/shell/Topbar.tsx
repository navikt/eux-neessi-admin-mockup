"use client";

import { ChevronRightIcon, MagnifyingGlassIcon } from "@navikt/aksel-icons";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { findNavItem } from "@/lib/nav";
import type { SessionUser } from "@/lib/session";
import { CommandPalette } from "./CommandPalette";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

export function Topbar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const item = findNavItem(pathname);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar__crumbs">
        <span>nEESSI admin</span>
        <ChevronRightIcon aria-hidden />
        <strong>{item?.label ?? "Side"}</strong>
      </div>
      <div className="topbar__spacer" />
      <button type="button" className="search-trigger hide-sm" onClick={() => setOpen(true)}>
        <MagnifyingGlassIcon aria-hidden fontSize="1.1rem" />
        Søk eller hopp til …
        <span className="kbd">⌘ K</span>
      </button>
      <span className="env-pill" title="Alle data i denne prototypen er fiktive">
        <span className="dot dot--warn" /> Prototype · fiktive data
      </span>
      <ThemeToggle />
      <UserMenu user={user} />
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </header>
  );
}
