"use client";

import { StarsEuIcon } from "@navikt/aksel-icons";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, findNavItem } from "@/lib/nav";

export function Sidebar({ badges }: { badges: { overdue: number } }) {
  const pathname = usePathname();
  const active = findNavItem(pathname);

  return (
    <aside className="sidebar">
      <SidebarStars />
      <Link href="/" className="sidebar__brand">
        <motion.span
          className="sidebar__logo"
          whileHover={{ rotate: 72, scale: 1.06 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
        >
          <StarsEuIcon aria-hidden fontSize="1.6rem" color="#ffcc00" />
        </motion.span>
        <span>
          <div className="sidebar__title">nEESSI admin</div>
          <div className="sidebar__subtitle">EUX · Team EESSI</div>
        </span>
      </Link>
      <nav className="sidebar__nav" aria-label="Hovedmeny">
        {NAV.map((group) => (
          <div className="sidebar__group" key={group.label}>
            <div className="sidebar__group-label">{group.label}</div>
            {group.items.map((item) => {
              const isActive = active?.href === item.href;
              const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
              return (
                <Link key={item.href} href={item.href} className="sidebar__link" aria-current={isActive ? "page" : undefined}>
                  {isActive ? (
                    <motion.span
                      layoutId="sidebar-active"
                      className="sidebar__link-bg"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                  <item.icon aria-hidden />
                  <span>{item.label}</span>
                  {badge ? (
                    <span className="sidebar__badge" title="Forfalte svar">
                      {badge}
                    </span>
                  ) : item.isNew ? (
                    <span className="sidebar__badge sidebar__badge--new">Ny</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar__footer">
        <span className="dot dot--ok dot--pulse" />
        <span>Alle systemer operative · prototype</span>
      </div>
    </aside>
  );
}

function SidebarStars() {
  const stars = [
    [24, 120, 1.2], [210, 80, 0.8], [140, 300, 1], [60, 460, 0.7], [230, 520, 1.3],
    [100, 640, 0.9], [200, 720, 0.7], [30, 820, 1.1], [180, 900, 0.8], [120, 40, 0.6],
  ];
  return (
    <svg className="sidebar__stars" width="100%" height="100%" aria-hidden>
      {stars.map(([x, y, r], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          fill="#fff"
          animate={{ opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.4 }}
        />
      ))}
    </svg>
  );
}
