"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { EuropeMapData } from "@/lib/geo/europe";
import { COUNTRY_BY_CODE, type CountryCode } from "@/lib/mock/reference";
import { Flag } from "@/components/ui/Flag";

interface Props {
  map: EuropeMapData;
  values: Partial<Record<CountryCode, number>>;
  /** Maps a value in [0,1] (relative to max) to a fill color */
  palette?: [string, string, string];
  selected?: CountryCode | null;
  onSelect?: (code: CountryCode | null) => void;
  tooltip?: (code: CountryCode, value: number) => React.ReactNode;
  /** Draw animated arcs from Oslo to the top N countries */
  flows?: number;
  height?: number;
}

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

export function scaleColor(t: number, palette: [string, string, string]): string {
  const c = Math.max(0, Math.min(1, t));
  return c < 0.5 ? mix(palette[0], palette[1], c * 2) : mix(palette[1], palette[2], (c - 0.5) * 2);
}

export function EuropeMap({ map, values, palette = ["#c3d6ee", "#2f6fb5", "#1f3550"], selected, onSelect, tooltip, flows = 0, height }: Props) {
  const [hover, setHover] = useState<{ code: CountryCode; x: number; y: number } | null>(null);
  const max = useMemo(() => Math.max(1, ...Object.values(values).map((v) => v ?? 0)), [values]);

  const topFlows = useMemo(() => {
    if (!flows) return [];
    return (Object.entries(values) as [CountryCode, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, flows)
      .map(([code, v]) => ({ code, v }));
  }, [values, flows]);

  const oslo = map.points.NO;

  return (
    <div style={{ position: "relative" }} onMouseLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${map.width} ${map.height}`}
        className="europe-map"
        style={{ width: "100%", height: height ?? "auto", display: "block" }}
        role="img"
        aria-label="Kart over Europa"
      >
        <defs>
          <radialGradient id="sea" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="color-mix(in srgb, #2f6fb5 7%, transparent)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width={map.width} height={map.height} fill="url(#sea)" rx={18} />
        {map.shapes.map((s) => {
          if (!s.code) return <path key={s.id} d={s.d} className="other" stroke="var(--ax-bg-default)" strokeWidth={0.6} />;
          if (s.code === "NO")
            return <path key={s.id} d={s.d} fill="#c0765d" stroke="var(--ax-bg-default, #fff)" strokeWidth={0.8} opacity={0.92} />;
          const code = s.code as CountryCode;
          const v = values[code] ?? 0;
          const isSel = selected === code;
          const dim = selected && !isSel;
          return (
            <path
              key={s.id}
              d={s.d}
              className="country"
              fill={v ? scaleColor(Math.sqrt(v / max), palette) : "var(--ax-bg-neutral-moderate, #e4e6ea)"}
              stroke={isSel ? "var(--ax-text-neutral)" : "var(--ax-bg-default, #fff)"}
              strokeWidth={isSel ? 2 : 0.7}
              opacity={dim ? 0.35 : 1}
              onMouseMove={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setHover({ code, x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
              onClick={() => onSelect?.(isSel ? null : code)}
            />
          );
        })}
        {oslo
          ? topFlows.map(({ code }, i) => {
              const p = map.points[code];
              if (!p) return null;
              const mx = (oslo[0] + p[0]) / 2;
              const my = (oslo[1] + p[1]) / 2 - Math.hypot(p[0] - oslo[0], p[1] - oslo[1]) * 0.25;
              const d = `M${oslo[0]},${oslo[1]} Q${mx},${my} ${p[0]},${p[1]}`;
              return (
                <g key={code} pointerEvents="none">
                  <motion.path
                    d={d}
                    fill="none"
                    stroke="#c0765d"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.85 }}
                    transition={{ duration: 1.2, delay: 0.3 + i * 0.12, ease: "easeOut" }}
                  />
                  <motion.circle
                    r={2.6}
                    fill="#f0d9cf"
                    filter="url(#glow)"
                    initial={{ offsetDistance: "0%" }}
                    animate={{ offsetDistance: ["0%", "100%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: 1.2 + i * 0.25, ease: "easeInOut" }}
                    style={{ offsetPath: `path("${d}")` }}
                  />
                  <circle cx={p[0]} cy={p[1]} r={3} fill="#c0765d" />
                </g>
              );
            })
          : null}
        {oslo ? (
          <g pointerEvents="none">
            <motion.circle cx={oslo[0]} cy={oslo[1]} r={6} fill="none" stroke="#c0765d" strokeWidth={1.5} animate={{ r: [6, 16], opacity: [0.9, 0] }} transition={{ duration: 2, repeat: Infinity }} />
            <circle cx={oslo[0]} cy={oslo[1]} r={5} fill="#fff" stroke="#a35f48" strokeWidth={2.5} />
          </g>
        ) : null}
      </svg>
      <AnimatePresence>
        {hover ? (
          <motion.div
            key="tt"
            className="chart-tooltip"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, x: hover.x + 14, y: hover.y + 14 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 40, opacity: { duration: 0.12 } }}
            style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 5 }}
          >
            <div className="chart-tooltip__title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Flag code={hover.code} /> {COUNTRY_BY_CODE[hover.code]?.name}
            </div>
            {tooltip ? tooltip(hover.code, values[hover.code] ?? 0) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
