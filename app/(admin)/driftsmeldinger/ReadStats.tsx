"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "motion/react";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { Card } from "@/components/ui/Section";
import { fmtInt } from "@/lib/format";
import { SEVERITY_ICON } from "./BannerPreview";
import styles from "./driftsmeldinger.module.css";
import type { ListedMessage } from "./MessageList";
import { fmtDay, fmtDuration, SEVERITY_META, type Severity } from "./model";

const COLORS = { lukket: "#3a8a5f", sett: "#9cc5ad", ikke: "#cbd5e1" };

function shorten(s: string, n = 30) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function ReadStats({ messages }: { messages: ListedMessage[] }) {
  const reached = messages
    .filter((m) => m.status !== "planlagt" && m.stats.target > 0)
    .sort((a, b) => b.start.localeCompare(a.start));

  const data = reached.map((m) => {
    const t = m.stats.target;
    return {
      name: shorten(m.title),
      dato: fmtDay(m.start),
      lukket: (m.stats.closed / t) * 100,
      sett: ((m.stats.seen - m.stats.closed) / t) * 100,
      ikke: ((t - m.stats.seen) / t) * 100,
    };
  });

  const bySeverity = (Object.keys(SEVERITY_META) as Severity[]).map((s) => {
    const list = reached.filter((m) => m.severity === s && m.stats.seen > 0);
    const target = list.reduce((a, m) => a + m.stats.target, 0);
    const seen = list.reduce((a, m) => a + m.stats.seen, 0);
    const dismissibleSeen = list.filter((m) => m.dismissible).reduce((a, m) => a + m.stats.seen, 0);
    const closed = list.reduce((a, m) => a + m.stats.closed, 0);
    const medians = list.map((m) => m.stats.medianMinutesToSeen ?? 0).sort((a, b) => a - b);
    return {
      severity: s,
      count: list.length,
      seenPct: target ? (seen / target) * 100 : 0,
      closedPct: dismissibleSeen ? (closed / dismissibleSeen) * 100 : 0,
      median: medians.length ? medians[Math.floor(medians.length / 2)] : null,
    };
  });

  return (
    <div className="grid grid--main-side">
      <Card title="Hvem har sett meldingene?" subtitle="Andel av målgruppen som har sett og lukket banneret">
        <div style={{ height: Math.max(220, data.length * 38 + 40) }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }} barCategoryGap={8}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--card-border)" />
              <XAxis
                type="number"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => `${v} %`}
                tick={{ fontSize: 12, fill: "var(--muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={228}
                tick={<CategoryTick />}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(154, 161, 171,0.12)" }}
                content={<ChartTooltip formatter={(v) => `${Math.round(v)} %`} />}
              />
              <Bar dataKey="lukket" name="Sett og lukket" stackId="a" fill={COLORS.lukket} radius={[6, 0, 0, 6]} animationDuration={900} />
              <Bar dataKey="sett" name="Sett" stackId="a" fill={COLORS.sett} animationDuration={900} />
              <Bar dataKey="ikke" name="Ikke sett" stackId="a" fill={COLORS.ikke} fillOpacity={0.55} radius={[0, 6, 6, 0]} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="legend">
          <span className="legend__item">
            <i className="legend__swatch" style={{ background: COLORS.lukket }} /> Sett og lukket
          </span>
          <span className="legend__item">
            <i className="legend__swatch" style={{ background: COLORS.sett }} /> Sett, ikke lukket
          </span>
          <span className="legend__item">
            <i className="legend__swatch" style={{ background: COLORS.ikke }} /> Ikke sett
          </span>
        </div>
      </Card>

      <Card title="Per alvorlighetsgrad" subtitle="Snitt for meldinger som har vært vist">
        <div className={styles.sevStats}>
          {bySeverity.map((s, i) => {
            const meta = SEVERITY_META[s.severity];
            const Icon = SEVERITY_ICON[s.severity];
            return (
              <div key={s.severity} className={styles.sevStat} style={{ ["--sev" as string]: meta.color }}>
                <Ring pct={s.seenPct} color={meta.color} delay={i * 0.15}>
                  <Icon aria-hidden />
                </Ring>
                <div className={styles.sevStatText}>
                  <strong>
                    {meta.label} <span className="muted">· {s.count} meldinger</span>
                  </strong>
                  <span>
                    <b className="tabular">{Math.round(s.seenPct)} %</b> har sett
                  </span>
                  <span className="muted">
                    {s.closedPct ? `${Math.round(s.closedPct)} % lukket` : "Kan ikke lukkes"}
                    {s.median !== null ? ` · median ${fmtDuration(s.median)}` : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className={styles.sevFoot}>
          Feilmeldinger blir sett raskest. Totalt har {fmtInt(reached.reduce((a, m) => a + m.stats.seen, 0))} visninger blitt registrert.
        </p>
      </Card>
    </div>
  );
}

function CategoryTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill="var(--muted)">
      {payload?.value}
    </text>
  );
}

function Ring({ pct, color, delay, children }: { pct: number; color: string; delay: number; children: React.ReactNode }) {
  const r = 26;
  return (
    <div className={styles.ring}>
      <svg viewBox="0 0 64 64" width={64} height={64} aria-hidden>
        <circle cx={32} cy={32} r={r} fill="none" stroke="var(--ax-bg-neutral-soft, #eef0f2)" strokeWidth={6} />
        <motion.circle
          cx={32}
          cy={32}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          transform="rotate(-90 32 32)"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: pct / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span style={{ color }}>{children}</span>
    </div>
  );
}
