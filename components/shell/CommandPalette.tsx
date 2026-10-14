"use client";

import { MagnifyingGlassIcon } from "@navikt/aksel-icons";
import { Modal } from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NAV_ITEMS, type NavItem } from "@/lib/nav";

interface Command {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: NavItem["icon"];
  group: string;
  keywords: string;
}

const QUICK: Omit<Command, "icon">[] = [
  { id: "q-forfalt", label: "Vis forfalte svar", description: "Filtrer «Har vi svart?» på forfalte", href: "/svar?status=FORFALT", group: "Snarveier", keywords: "overdue frist" },
  { id: "q-h001", label: "Rediger standardtekst for H001", description: "Anmodning om informasjon", href: "/standardtekster?sed=H001", group: "Snarveier", keywords: "h001 anmodning" },
  { id: "q-publiser", label: "Publiser SED-hendelser", description: "Kafka: sedmottatt-v1 / sedsendt-v1", href: "/verktoy?verktoy=publiser-sed-hendelser", group: "Snarveier", keywords: "kafka hendelse" },
  { id: "q-pg", label: "Databaser som må oppgraderes", description: "Postgres-versjoner med nær EOL", href: "/databaser", group: "Snarveier", keywords: "postgres eol" },
  { id: "q-sverige", label: "Statistikk for Sverige", description: "Land: SE", href: "/statistikk?land=SE", group: "Snarveier", keywords: "sverige se" },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const pages: Command[] = NAV_ITEMS.map((i) => ({
      id: i.href,
      label: i.label,
      description: i.description,
      href: i.href,
      icon: i.icon,
      group: "Sider",
      keywords: (i.keywords ?? []).join(" "),
    }));
    const quick: Command[] = QUICK.map((q) => ({ ...q, icon: NAV_ITEMS.find((n) => q.href.startsWith(n.href) && n.href !== "/")?.icon ?? MagnifyingGlassIcon }));
    return [...pages, ...quick];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.description} ${c.keywords}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const go = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    setQuery("");
    setIndex(0);
    router.push(c.href);
  };

  let lastGroup = "";

  return (
    <Modal open={open} onClose={onClose} aria-label="Søk og naviger" width={620} placement="top" closeOnBackdropClick>
      <Modal.Body style={{ padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--card-border)" }}>
          <MagnifyingGlassIcon aria-hidden fontSize="1.4rem" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(filtered.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(filtered[index]);
              }
            }}
            placeholder="Søk etter sider, verktøy, land, SED-er …"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", font: "inherit", fontSize: "1.05rem", color: "inherit" }}
          />
          <span className="kbd">esc</span>
        </div>
        <div style={{ maxHeight: 420, overflowY: "auto", padding: 8 }}>
          <AnimatePresence initial={false}>
            {filtered.map((c, i) => {
              const header = c.group !== lastGroup ? c.group : null;
              lastGroup = c.group;
              return (
                <div key={c.id}>
                  {header ? (
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", padding: "10px 12px 4px" }}>
                      {header}
                    </div>
                  ) : null}
                  <motion.button
                    type="button"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => go(c)}
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      font: "inherit",
                      color: "inherit",
                      background: i === index ? "color-mix(in srgb, var(--brand-a) 12%, transparent)" : "transparent",
                    }}
                  >
                    <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--ax-bg-neutral-soft)", fontSize: "1.15rem" }}>
                      <c.icon aria-hidden />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{c.label}</div>
                      <div className="muted" style={{ fontSize: "0.85rem" }}>{c.description}</div>
                    </span>
                    {i === index ? <span className="kbd">↵</span> : null}
                  </motion.button>
                </div>
              );
            })}
          </AnimatePresence>
          {filtered.length === 0 ? <div className="empty">Ingen treff for «{query}»</div> : null}
        </div>
      </Modal.Body>
    </Modal>
  );
}
