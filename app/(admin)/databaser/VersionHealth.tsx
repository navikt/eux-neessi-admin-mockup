"use client";

import { motion } from "motion/react";
import { fmtDate } from "@/lib/format";
import type { DbInstance, PgVersionInfo, VersionHealth } from "./data";
import styles from "./databaser.module.css";
import { HEALTH_META, variantLabel } from "./ui";

const DOMAIN_START = Date.parse("2023-01-01T00:00:00Z");
const DOMAIN_END = Date.parse("2031-01-01T00:00:00Z");
const YEARS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031];

function pos(iso: string): number {
  const t = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return Math.min(1, Math.max(0, (t - DOMAIN_START) / (DOMAIN_END - DOMAIN_START)));
}

function eolText(v: PgVersionInfo): string {
  if (v.daysLeft < 0) {
    const months = Math.round(-v.daysLeft / 30.4);
    return `Utgått for ${months} mnd siden`;
  }
  if (v.daysLeft < 183) return `${v.daysLeft} dager igjen`;
  const years = v.daysLeft / 365;
  return years >= 1.5 ? `${years.toLocaleString("nb-NO", { maximumFractionDigits: 1 })} år igjen` : `${Math.round(v.daysLeft / 30.4)} mnd igjen`;
}

interface Props {
  versions: PgVersionInfo[];
  instances: DbInstance[];
  today: string;
  onSelect: (id: string) => void;
}

export function HealthSummary({ instances }: { instances: DbInstance[] }) {
  const order: VersionHealth[] = ["eol", "soon", "ok", "newest"];
  const counts = order.map((h) => ({ h, n: instances.filter((i) => i.health === h).length }));
  const total = Math.max(1, instances.length);
  return (
    <>
      <div className={styles.healthBar}>
        {counts
          .filter((c) => c.n > 0)
          .map((c, idx) => (
            <motion.div
              key={c.h}
              style={{ flexGrow: c.n, flexBasis: 0, background: HEALTH_META[c.h].color }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 + idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
              title={`${HEALTH_META[c.h].label}: ${c.n}`}
            />
          ))}
      </div>
      <div className={styles.healthLegend}>
        {counts.map((c) => (
          <span key={c.h} className="legend__item">
            <span className="legend__swatch" style={{ background: HEALTH_META[c.h].color }} />
            <strong className="tabular">{c.n}</strong>
            {HEALTH_META[c.h].label}
            <span className="muted">· {Math.round((c.n / total) * 100)} %</span>
          </span>
        ))}
      </div>
    </>
  );
}

export function VersionSwimlane({ versions, instances, today, onSelect }: Props) {
  const todayPct = pos(today) * 100;
  const trackLeft = (pct: number) => `calc(var(--label-w) + (100% - var(--label-w)) * ${pct / 100})`;

  return (
    <div className={styles.swim}>
      <div className={styles.swimAxis}>
        {YEARS.map((y) => {
          const p = pos(`${y}-01-01`) * 100;
          if (Math.abs(p - todayPct) < 3.5) return null;
          return (
            <span key={y} className={styles.swimTick} style={{ left: `${p}%` }}>
              {y}
            </span>
          );
        })}
      </div>
      {YEARS.map((y) => (
        <span key={y} className={styles.swimGridline} style={{ left: trackLeft(pos(`${y}-01-01`) * 100) }} />
      ))}

      {versions.map((v, idx) => {
        const meta = HEALTH_META[v.health];
        const start = pos(v.released) * 100;
        const end = pos(v.eol) * 100;
        const cropped = Date.parse(v.released) < DOMAIN_START;
        const onLane = instances.filter((i) => i.version === v.version);
        return (
          <div key={v.version} className={styles.lane}>
            <div className={styles.laneLabel}>
              <div className={styles.laneVersion}>
                <span className={styles.laneVersionBadge} style={{ background: `linear-gradient(135deg, ${meta.color}, color-mix(in srgb, ${meta.color} 60%, #000))` }}>
                  {v.version}
                </span>
                PostgreSQL {v.version}
              </div>
              <div className={styles.laneMeta}>
                EOL {fmtDate(v.eol)}
                <br />
                <span style={{ color: meta.color, fontWeight: 700 }}>{eolText(v)}</span> · {onLane.length} inst.
              </div>
            </div>
            <div className={styles.laneTrack}>
              <motion.div
                className={`${styles.band} ${cropped ? styles.bandFadeLeft : ""}`}
                style={{
                  left: `${start}%`,
                  width: `${end - start}%`,
                  background: `linear-gradient(90deg, color-mix(in srgb, ${meta.color} 55%, transparent), ${meta.color})`,
                }}
                initial={{ scaleX: 0, opacity: 0 }}
                whileInView={{ scaleX: 1, opacity: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.9, delay: 0.1 + idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                {v.health === "newest" ? "Nyeste · " : ""}EOL {fmtDate(v.eol)}
              </motion.div>
              <div className={styles.lanePills} style={{ marginLeft: `${todayPct}%`, paddingLeft: 10 }}>
                {onLane.length === 0 ? (
                  <span className="muted" style={{ fontSize: "0.8rem" }}>
                    Ingen instanser
                  </span>
                ) : (
                  onLane.map((inst, i) => (
                    <motion.button
                      type="button"
                      key={inst.id}
                      className={styles.pill}
                      style={{ ["--pill" as string]: meta.color }}
                      onClick={() => onSelect(inst.id)}
                      initial={{ opacity: 0, scale: 0.6, x: -12 }}
                      whileInView={{ opacity: 1, scale: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", stiffness: 420, damping: 24, delay: 0.4 + idx * 0.06 + i * 0.04 }}
                    >
                      <i />
                      {inst.app.replace(/^eux-/, "")}
                      <span className={styles.pillEnv}>{variantLabel(inst) ?? (inst.env === "prod-gcp" ? "prod" : "dev")}</span>
                    </motion.button>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div className={styles.today} style={{ left: trackLeft(todayPct) }}>
        <span className={styles.todayLabel}>i dag</span>
      </div>
    </div>
  );
}
