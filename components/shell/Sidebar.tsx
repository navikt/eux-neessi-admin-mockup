"use client";

import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  LeaveIcon,
  MagnifyingGlassIcon,
  PersonCircleIcon,
  SidebarLeftIcon,
  StarsEuIcon,
} from "@navikt/aksel-icons";
import { ActionMenu, Tooltip } from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/login/actions";
import { NAV, findNavItem, type NavItem } from "@/lib/nav";
import { initials, type SessionUser } from "@/lib/session";
import { openSearch, useSidebarCollapsed } from "./useSidebar";

// 30 days of fake uptime; one day with a short RINA hiccup.
const UPTIME = Array.from({ length: 30 }, (_, i) => (i === 19 ? "warn" : "ok"));

export function Sidebar({ badges, user }: { badges: { overdue: number }; user: SessionUser }) {
  const pathname = usePathname();
  const active = findNavItem(pathname);
  const [collapsed, toggle] = useSidebarCollapsed();
  const [closedGroups, setClosedGroups] = useState<string[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (e.key === "[" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const toggleGroup = (label: string) =>
    setClosedGroups((g) => (g.includes(label) ? g.filter((x) => x !== label) : [...g, label]));

  return (
    <aside className="sidebar" aria-label="Sidemeny">
      <div className="sidebar__head">
        <Link href="/" className="sidebar__brand" title="nEESSI admin – til forsiden">
          <motion.span
            className="sidebar__logo"
            whileHover={{ rotate: 30 }}
            transition={{ type: "spring", stiffness: 160, damping: 14 }}
          >
            <StarsEuIcon aria-hidden fontSize="1.35rem" color="#e8b923" />
          </motion.span>
          <span className="sidebar__hide" style={{ minWidth: 0 }}>
            <div className="sidebar__title">nEESSI admin</div>
            <div className="sidebar__subtitle">Nav · EESSI</div>
          </span>
        </Link>
        <Tooltip content={collapsed ? "Vis meny" : "Skjul meny"} keys={["["]} placement="right">
          <button type="button" className="sidebar__icon-btn" onClick={toggle} aria-label={collapsed ? "Vis meny" : "Skjul meny"}>
            <SidebarLeftIcon aria-hidden />
          </button>
        </Tooltip>
      </div>

      <WithTip show={collapsed} content="Søk og hopp til" keys={["⌘", "K"]}>
        <button type="button" className="sidebar__search" onClick={openSearch} aria-label="Søk">
          <MagnifyingGlassIcon aria-hidden />
          <span className="sidebar__hide">Søk</span>
          <span className="kbd sidebar__hide">⌘K</span>
        </button>
      </WithTip>

      <nav className="sidebar__nav" aria-label="Hovedmeny">
        {NAV.map((group) => {
          const open = collapsed || !closedGroups.includes(group.label);
          return (
            <div className="sidebar__group" key={group.label}>
              <button
                type="button"
                className="sidebar__group-label"
                aria-expanded={open}
                onClick={() => toggleGroup(group.label)}
              >
                {group.label}
                <ChevronDownIcon aria-hidden />
              </button>
              <AnimatePresence initial={false}>
                {open ? (
                  <motion.div
                    key="items"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    {group.items.map((item) => (
                      <SidebarLink
                        key={item.href}
                        item={item}
                        isActive={active?.href === item.href}
                        badge={item.badgeKey ? badges[item.badgeKey] : undefined}
                        collapsed={collapsed}
                      />
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <WithTip show={collapsed} content="Alle systemer operative">
        <Link href="/databaser" className="sidebar__status">
          <div className="sidebar__status-head">
            <span className="dot dot--ok dot--pulse" />
            <span className="sidebar__hide">Alle systemer operative</span>
          </div>
          <div className="sidebar__hide">
            <div className="sidebar__status-sub">RINA, Kafka og 9 databaser</div>
            <div className="sidebar__uptime" title="Oppetid siste 30 dager: 99,98 %">
              {UPTIME.map((s, i) => (
                <span key={i} data-state={s} />
              ))}
            </div>
            <div className="sidebar__status-sub" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginTop: 4 }}>
              <span>30 dager</span>
              <span className="tabular">99,98 % oppetid</span>
            </div>
          </div>
        </Link>
      </WithTip>

      <div className="sidebar__footer">
        <ActionMenu>
          <ActionMenu.Trigger>
            <button type="button" className="sidebar__user" aria-label={`Innlogget som ${user.name}`}>
              <span className="avatar avatar--sm">{initials(user.name)}</span>
              <span className="sidebar__hide" style={{ minWidth: 0 }}>
                <div className="sidebar__user-name">{user.name}</div>
                <div className="sidebar__user-title">{user.title}</div>
              </span>
              <ChevronUpDownIcon aria-hidden className="sidebar__hide" />
            </button>
          </ActionMenu.Trigger>
          <ActionMenu.Content align="start">
            <ActionMenu.Label>{user.name}</ActionMenu.Label>
            <ActionMenu.Item icon={<PersonCircleIcon aria-hidden />} disabled>
              {user.title}
            </ActionMenu.Item>
            <ActionMenu.Divider />
            <ActionMenu.Item
              icon={<LeaveIcon aria-hidden />}
              variant="danger"
              onSelect={() => {
                void logout();
              }}
            >
              Logg ut
            </ActionMenu.Item>
          </ActionMenu.Content>
        </ActionMenu>
      </div>
    </aside>
  );
}

function SidebarLink({ item, isActive, badge, collapsed }: { item: NavItem; isActive: boolean; badge?: number; collapsed: boolean }) {
  const link = (
    <Link href={item.href} className="sidebar__link" aria-current={isActive ? "page" : undefined} aria-label={collapsed ? item.label : undefined}>
      {isActive ? (
        <motion.span layoutId="sidebar-active" className="sidebar__link-bg" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
      ) : null}
      <item.icon aria-hidden className="sidebar__link-icon" />
      <span className="sidebar__hide">{item.label}</span>
      {badge ? (
        <>
          <span className="sidebar__badge sidebar__hide" title="Forfalte svar">
            {badge}
          </span>
          {collapsed ? <span className="sidebar__badge-dot" /> : null}
        </>
      ) : item.isNew ? (
        <span className="sidebar__badge sidebar__badge--new sidebar__hide">Ny</span>
      ) : item.href === "/" ? (
        <span className="sidebar__live sidebar__hide">
          <span className="dot dot--ok" style={{ width: 6, height: 6, boxShadow: "none" }} />
          Live
        </span>
      ) : null}
    </Link>
  );
  return (
    <WithTip show={collapsed} content={badge ? `${item.label} · ${badge} forfalte` : item.label}>
      {link}
    </WithTip>
  );
}

function WithTip({ show, content, keys, children }: { show: boolean; content: string; keys?: string[]; children: React.ReactElement }) {
  if (!show) return children;
  return (
    <Tooltip content={content} keys={keys} placement="right">
      {children}
    </Tooltip>
  );
}
