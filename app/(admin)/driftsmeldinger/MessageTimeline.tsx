"use client";

import { Tooltip } from "@navikt/ds-react";
import { motion } from "motion/react";
import { addDaysIso, isoToUtcDay, weekdayOf } from "@/lib/mock/clock";
import styles from "./driftsmeldinger.module.css";
import type { ListedMessage } from "./MessageList";
import { dateOf, fmtDay, fmtPeriod, minutesBetween, SEVERITY_META, STATUS_META } from "./model";

interface Props {
  messages: ListedMessage[];
  now: string;
  range: { before: number; after: number };
  onSelect: (msg: ListedMessage) => void;
}

export function MessageTimeline({ messages, now, range, onSelect }: Props) {
  const today = dateOf(now);
  const winStart = `${addDaysIso(today, -range.before)}T00:00`;
  const winEnd = `${addDaysIso(today, range.after)}T00:00`;
  const span = minutesBetween(winStart, winEnd);
  const pos = (dt: string) => Math.min(100, Math.max(0, (minutesBetween(winStart, dt) / span) * 100));

  const rows = messages
    .filter((m) => {
      const stop = m.deactivatedAt ?? m.end ?? winEnd;
      return stop > winStart && m.start < winEnd;
    })
    .sort((a, b) => a.start.localeCompare(b.start));

  // Monday ticks
  const ticks: string[] = [];
  const first = addDaysIso(today, -range.before);
  for (let i = 0; i <= range.before + range.after; i++) {
    const d = addDaysIso(first, i);
    if (weekdayOf(isoToUtcDay(d)) === 0) ticks.push(d);
  }
  const nowPct = pos(now);

  return (
    <div className={styles.tl}>
      <div className={styles.tlAxis}>
        <div className={styles.tlLabelCol} />
        <div className={styles.tlTrackCol}>
          {ticks.map((d) => {
            const p = pos(`${d}T00:00`);
            if (Math.abs(p - nowPct) < 4) return null;
            return (
              <span key={d} className={styles.tlTick} style={{ left: `${p}%` }}>
                {fmtDay(d)}
              </span>
            );
          })}
          <span className={styles.tlTodayLabel} style={{ left: `${nowPct}%` }}>
            i dag
          </span>
        </div>
      </div>

      <div className={styles.tlRows}>
        <div className={styles.tlGridLayer}>
          <div className={styles.tlLabelCol} />
          <div className={styles.tlTrackCol}>
            {ticks.map((d) => (
              <span key={d} className={styles.tlGridLine} style={{ left: `${pos(`${d}T00:00`)}%` }} />
            ))}
            <span className={styles.tlFuture} style={{ left: `${nowPct}%` }} />
            <span className={styles.tlToday} style={{ left: `${nowPct}%` }} />
          </div>
        </div>

        {rows.map((m, i) => {
          const sev = SEVERITY_META[m.severity];
          const stop = m.deactivatedAt ?? m.end;
          const left = pos(m.start);
          const right = stop ? pos(stop) : 100;
          const width = Math.max(right - left, 0.6);
          const openEnded = !stop;
          return (
            <div key={m.id} className={styles.tlRow}>
              <div className={styles.tlLabelCol}>
                <button type="button" className={styles.tlLabel} onClick={() => onSelect(m)}>
                  <i style={{ background: sev.color }} />
                  <span>{m.title}</span>
                </button>
              </div>
              <div className={styles.tlTrackCol}>
                <Tooltip
                  content={`${STATUS_META[m.status].label} · ${fmtPeriod(m.start, stop)}`}
                  placement="top"
                >
                  <motion.button
                    type="button"
                    aria-label={`${m.title}, ${STATUS_META[m.status].label}`}
                    className={`${styles.tlBar} ${m.status === "planlagt" ? styles.tlBarPlanned : ""} ${
                      m.status === "deaktivert" ? styles.tlBarStopped : ""
                    } ${openEnded ? styles.tlBarOpen : ""}`}
                    style={{ left: `${left}%`, ["--sev" as string]: sev.color }}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: `${width}%`, opacity: 1 }}
                    transition={{ delay: 0.1 + i * 0.05, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -2 }}
                    onClick={() => onSelect(m)}
                  >
                    {m.status === "aktiv" ? <span className={styles.tlPulse} /> : null}
                  </motion.button>
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>

      <div className="legend" style={{ marginTop: 14 }}>
        {(Object.keys(SEVERITY_META) as (keyof typeof SEVERITY_META)[]).map((s) => (
          <span key={s} className="legend__item">
            <i className="legend__swatch" style={{ background: SEVERITY_META[s].color }} /> {SEVERITY_META[s].label}
          </span>
        ))}
        <span className="legend__item">
          <i className={`legend__swatch ${styles.legendPlanned}`} /> Planlagt
        </span>
        <span className="legend__item">
          <i className={`legend__swatch ${styles.legendOpen}`} /> Uten sluttid
        </span>
      </div>
    </div>
  );
}
