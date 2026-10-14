"use client";

import { ChevronRightIcon, MagnifyingGlassIcon } from "@navikt/aksel-icons";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV, findNavItem } from "@/lib/nav";
import type { SessionUser } from "@/lib/session";
import { CommandPalette } from "./CommandPalette";
import { ThemeToggle } from "./ThemeToggle";
import { OPEN_SEARCH_EVENT } from "./useSidebar";
import { UserMenu } from "./UserMenu";

export function Topbar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const item = findNavItem(pathname);
  const group = NAV.find((g) => g.items.some((i) => i.href === item?.href));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="topbar__crumbs">
        <span>{group?.label ?? "nEESSI admin"}</span>
        <ChevronRightIcon aria-hidden />
        <strong>{item?.label ?? "Side"}</strong>
        {item ? <span className="topbar__desc hide-sm">{item.description}</span> : null}
      </div>
      <div className="topbar__spacer" />
      <button type="button" className="search-trigger show-mobile" onClick={() => setOpen(true)} aria-label="Søk">
        <MagnifyingGlassIcon aria-hidden fontSize="1.1rem" />
      </button>
      <span className="env-pill" title="Alle data i denne prototypen er fiktive">
        <span className="dot dot--warn" style={{ width: 7, height: 7, boxShadow: "none" }} /> Prototype · fiktive data
      </span>
      <ThemeToggle />
      <span className="show-mobile">
        <UserMenu user={user} />
      </span>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </header>
  );
}
