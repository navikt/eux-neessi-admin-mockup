"use client";

import { motion } from "motion/react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { Card } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { fmtDec } from "@/lib/format";
import type { DbInstance } from "./data";
import styles from "./databaser.module.css";
import { fmtGb, fmtMonthYear, fmtMonths } from "./ui";

interface Props {
  instances: DbInstance[];
  months: { key: string; label: string }[];
  apps: { app: string; color: string }[];
  onSelect: (id: string) => void;
}

interface TreeCellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  size?: number;
  color?: string;
  depth?: number;
  index?: number;
}

function TreeCell({ x = 0, y = 0, width = 0, height = 0, name, size, color, depth }: TreeCellProps) {
  if (depth !== 1) return null;
  const showName = width > 70 && height > 34;
  const showSize = width > 50 && height > 52;
  const r = Math.max(2, Math.min(8, width / 5, height / 5));
  return (
    <g>
      <rect x={x + 2} y={y + 2} width={Math.max(0, width - 4)} height={Math.max(0, height - 4)} rx={r} ry={r} fill={color} fillOpacity={0.82} />
      {showName ? (
        <text x={x + 12} y={y + 22} fill="#fff" fontSize={width > 150 ? 13 : 11} fontWeight={600} style={{ fontFamily: "var(--font-mono)" }}>
          {name && name.length * 7 > width - 20 ? `${name.slice(0, Math.max(3, Math.floor((width - 24) / 7)))}…` : name}
        </text>
      ) : null}
      {showSize && size !== undefined ? (
        <text x={x + 12} y={y + (width > 150 ? 46 : 40)} fill="#fff" fillOpacity={0.9} fontSize={width > 150 ? 20 : 13} fontWeight={600} style={{ fontVariantNumeric: "tabular-nums" }}>
          {fmtGb(size)}
        </text>
      ) : null}
    </g>
  );
}

const dec2 = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const fmtGrowth = (n: number) => dec2.format(n);

export function SizeStats({ instances, months, apps, onSelect }: Props) {
  const activeApps = apps.filter((a) => instances.some((i) => i.app === a.app));
  // Stack largest app at the bottom.
  const ordered = [...activeApps].sort(
    (a, b) =>
      instances.filter((i) => i.app === b.app).reduce((s, i) => s + i.usedGb, 0) -
      instances.filter((i) => i.app === a.app).reduce((s, i) => s + i.usedGb, 0),
  );
  const stacked = months.map((m, idx) => {
    const row: Record<string, number | string> = { label: m.label };
    for (const a of ordered) {
      row[a.app] = Math.round(instances.filter((i) => i.app === a.app).reduce((s, i) => s + i.history[idx], 0) * 10) / 10;
    }
    return row;
  });

  const growth = ordered
    .map((a) => {
      const list = instances.filter((i) => i.app === a.app);
      const perMonth = list.reduce((s, i) => s + i.growthGbPerMonth, 0);
      const first = list.reduce((s, i) => s + i.history[0], 0);
      const last = list.reduce((s, i) => s + i.history[11], 0);
      return { ...a, perMonth, pct: first > 0 ? ((last - first) / first) * 100 : 0, size: last };
    })
    .sort((a, b) => b.perMonth - a.perMonth);
  const maxGrowth = Math.max(0.01, ...growth.map((g) => Math.abs(g.perMonth)));

  const tree = [...instances]
    .sort((a, b) => b.usedGb - a.usedGb)
    .map((i) => ({ name: i.name, size: i.usedGb, color: i.appColor, id: i.id }));

  const proj = instances
    .filter((i) => i.daysUntilFull !== null)
    .sort((a, b) => (a.daysUntilFull ?? 0) - (b.daysUntilFull ?? 0))
    .slice(0, 8);
  const horizonDays = 36 * 30.4;

  return (
    <>
      <div className="grid grid--main-side">
        <Reveal>
          <Card
            title="Total størrelse siste 12 måneder"
            subtitle="Brukt lagring per app (alle miljøer), stablet"
            actions={<span className="chip">{fmtGb(instances.reduce((s, i) => s + i.usedGb, 0))} i dag</span>}
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stacked} margin={{ top: 10, right: 10, left: -6, bottom: 0 }}>
                <defs>
                  {ordered.map((a) => (
                    <linearGradient key={a.app} id={`stack-${a.app}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={a.color} stopOpacity={0.75} />
                      <stop offset="100%" stopColor={a.color} stopOpacity={0.3} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} unit=" GB" width={72} />
                <Tooltip content={<ChartTooltip formatter={(v) => fmtGb(v)} />} />
                {ordered.map((a) => (
                  <Area
                    key={a.app}
                    type="monotone"
                    dataKey={a.app}
                    name={a.app}
                    stackId="1"
                    stroke={a.color}
                    strokeWidth={1.5}
                    fill={`url(#stack-${a.app})`}
                    animationDuration={1200}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
            <div className="legend" style={{ marginTop: 8 }}>
              {ordered.map((a) => (
                <span key={a.app} className="legend__item">
                  <span className="legend__swatch" style={{ background: a.color }} />
                  {a.app.replace(/^eux-/, "")}
                </span>
              ))}
            </div>
          </Card>
        </Reveal>
        <Reveal delay={0.08}>
          <Card title="Vekst per måned" subtitle="GB per måned og endring siste 12 mnd" style={{ height: "100%" }}>
            {growth.map((g, i) => (
              <div key={g.app} className={styles.growthRow}>
                <span className="legend__swatch" style={{ background: g.color, width: 12, height: 12 }} />
                <div style={{ minWidth: 0 }}>
                  <div className={styles.growthName}>{g.app}</div>
                  <div className="bar-track" style={{ height: 6 }}>
                    <motion.div
                      className="bar-fill"
                      style={{ width: `${(Math.abs(g.perMonth) / maxGrowth) * 100}%`, background: g.perMonth < 0 ? "#9aa1ab" : g.color, transformOrigin: "left" }}
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
                <div className={styles.growthVal}>
                  {g.perMonth >= 0 ? "+" : "−"}
                  {Math.abs(g.perMonth) < 0.1 ? fmtGrowth(Math.abs(g.perMonth)) : fmtDec(Math.abs(g.perMonth))} GB
                  <small>
                    {g.pct >= 0 ? "+" : "−"}
                    {Math.abs(Math.round(g.pct))} % / år
                  </small>
                </div>
              </div>
            ))}
          </Card>
        </Reveal>
      </div>

      <div className="grid grid--2" style={{ marginTop: 20 }}>
        <Reveal>
          <Card title="Hvem tar plassen?" subtitle="Brukt lagring per database – klikk for detaljer" style={{ height: "100%" }}>
            <ResponsiveContainer width="100%" height={420}>
              <Treemap
                data={tree}
                dataKey="size"
                nameKey="name"
                aspectRatio={1.4}
                isAnimationActive
                animationDuration={900}
                content={<TreeCell />}
                onClick={(node) => {
                  const id = (node as unknown as { id?: string }).id;
                  if (id) onSelect(id);
                }}
                style={{ cursor: "pointer" }}
              >
                <Tooltip content={<ChartTooltip formatter={(v) => fmtGb(v)} />} />
              </Treemap>
            </ResponsiveContainer>
          </Card>
        </Reveal>
        <Reveal delay={0.08}>
          <Card title="Når er disken full?" subtitle="Prognose med dagens vekst, horisont 3 år" style={{ height: "100%" }}>
            <div style={{ position: "relative", paddingTop: 16 }}>
              {proj.map((i, idx) => {
                const d = i.daysUntilFull ?? 0;
                const frac = Math.min(1, d / horizonDays);
                const color = d < 183 ? "#b23a48" : d < 365 ? "#b8743e" : "#3a8a5f";
                return (
                  <div key={i.id} className={styles.projRow} onClick={() => onSelect(i.id)}>
                    <div className={styles.projName} title={i.name}>
                      {i.name}
                      <div className="muted" style={{ fontFamily: "inherit", fontWeight: 500, fontSize: "0.72rem" }}>
                        {fmtGb(i.usedGb)} av {i.diskGb} GB{i.diskAutoresize ? " · auto-resize" : ""}
                      </div>
                    </div>
                    <div className={styles.projTrack}>
                      {[12, 24].map((mo) => (
                        <span key={mo} className={styles.projMarker} style={{ left: `${((mo * 30.4) / horizonDays) * 100}%` }}>
                          {idx === 0 ? <span className={styles.projMarkerLabel}>{mo / 12} år</span> : null}
                        </span>
                      ))}
                      <motion.div
                        className={styles.projFill}
                        style={{ width: `${Math.max(3, frac * 100)}%`, background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 55%, transparent))` }}
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <div className={styles.projWhen} style={{ color }}>
                      {d > horizonDays ? "> 3 år" : fmtMonths(d)}
                      <small>{i.fullDateIso ? fmtMonthYear(i.fullDateIso) : ""}</small>
                    </div>
                  </div>
                );
              })}
              {proj.length === 0 ? <div className="empty">Ingen databaser vokser i utvalget.</div> : null}
            </div>
          </Card>
        </Reveal>
      </div>
    </>
  );
}
