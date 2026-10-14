"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { fmtDec, fmtInt } from "@/lib/format";
import type { CategoryId, Feature } from "./data";
import styles from "./funksjonsbruk.module.css";

interface Props {
  features: Feature[];
  enheter: { id: string; shortName: string; users: number }[];
  categoryColor: (id: CategoryId) => string;
  focusId: string | null;
  onFocus: (id: string) => void;
}

interface Hover {
  featureId: string;
  enhetId: string;
  x: number;
  y: number;
}

/** Feature × enhet usage intensity as a CSS grid heatmap with a floating tooltip. */
export function Heatmap({ features, enheter, categoryColor, focusId, onFocus }: Props) {
  const [hover, setHover] = useState<Hover | null>(null);
  const max = Math.max(0.01, ...features.flatMap((f) => f.byEnhet.map((b) => b.intensity)));
  const level = (v: number) => (v <= 0 ? 0 : Math.sqrt(v / max));

  const hf = hover ? features.find((f) => f.id === hover.featureId) : null;
  const hb = hf?.byEnhet.find((b) => b.enhetId === hover?.enhetId);
  const he = enheter.find((e) => e.id === hover?.enhetId);

  const onEnter = (e: React.MouseEvent<HTMLDivElement>, featureId: string, enhetId: string) => {
    const cell = e.currentTarget;
    const wrap = cell.closest(`.${styles.heatWrap}`) as HTMLElement | null;
    if (!wrap) return;
    const c = cell.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    setHover({ featureId, enhetId, x: c.left - w.left + c.width / 2, y: c.top - w.top });
  };

  return (
    <div className={styles.heatWrap} onMouseLeave={() => setHover(null)}>
      <div className={styles.heatScroll}>
        <div className={styles.heatGrid} style={{ gridTemplateColumns: `minmax(190px, 1.4fr) repeat(${enheter.length}, minmax(64px, 1fr))` }}>
          <div className={styles.heatCorner}>Funksjon ↓ / Enhet →</div>
          {enheter.map((e) => (
            <div key={e.id} className={`${styles.heatHead} ${hover?.enhetId === e.id ? styles.heatHeadOn : ""}`}>
              <span className="mono">{e.id}</span>
              <span>{e.shortName}</span>
            </div>
          ))}
          {features.map((f, row) => {
            const color = categoryColor(f.category);
            const dimRow = focusId !== null && focusId !== f.id;
            return (
              <div key={f.id} style={{ display: "contents" }}>
                <button
                  type="button"
                  className={`${styles.heatLabel} ${focusId === f.id ? styles.heatLabelOn : ""} ${dimRow ? styles.dim : ""}`}
                  onClick={() => onFocus(f.id)}
                >
                  <span className={styles.catDot} style={{ background: color }} />
                  {f.name}
                </button>
                {enheter.map((e, col) => {
                  const b = f.byEnhet.find((x) => x.enhetId === e.id);
                  const lv = level(b?.intensity ?? 0);
                  const isHover = hover?.featureId === f.id && hover?.enhetId === e.id;
                  const crossHover = hover && (hover.featureId === f.id || hover.enhetId === e.id) && !isHover;
                  return (
                    <motion.div
                      key={e.id}
                      className={`${styles.heatCell} ${lv === 0 ? styles.heatEmpty : ""} ${isHover ? styles.heatCellOn : ""} ${crossHover ? styles.heatCross : ""} ${dimRow ? styles.dim : ""}`}
                      style={{
                        background: lv ? `color-mix(in srgb, ${color} ${Math.round(12 + lv * 88)}%, var(--card-bg))` : undefined,
                        color: lv > 0.55 ? "#fff" : undefined,
                      }}
                      initial={{ opacity: 0, scale: 0.6 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, margin: "-20px" }}
                      transition={{ duration: 0.4, delay: (row + col) * 0.012, ease: [0.16, 1, 0.3, 1] }}
                      onMouseEnter={(ev) => onEnter(ev, f.id, e.id)}
                      onClick={() => onFocus(f.id)}
                    >
                      {lv ? ((b?.intensity ?? 0) < 0.05 ? "<0,1" : fmtDec(b?.intensity ?? 0)) : "–"}
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {hover && hf && he ? (
          <motion.div
            key="tip"
            className={styles.heatTip}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1, left: hover.x, top: hover.y }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
          >
            <div className={styles.heatTipTitle}>
              <span className={styles.catDot} style={{ background: categoryColor(hf.category) }} />
              {hf.name}
            </div>
            <div className="muted" style={{ marginBottom: 6 }}>
              {he.id} · {he.shortName}
            </div>
            <div className="chart-tooltip__row">
              <span>Brukere</span>
              <strong className="tabular">
                {fmtInt(hb?.users ?? 0)} av {fmtInt(he.users)}
              </strong>
            </div>
            <div className="chart-tooltip__row">
              <span>Handlinger siste 4 uker</span>
              <strong className="tabular">{fmtInt(hb?.uses ?? 0)}</strong>
            </div>
            <div className="chart-tooltip__row">
              <span>Per saksbehandler/uke</span>
              <strong className="tabular">{fmtDec(hb?.intensity ?? 0)}</strong>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className={styles.heatLegend}>
        <span>Fargen følger kategorien</span>
        <span className={styles.heatSep} />
        <span>Lite brukt</span>
        <span className={styles.heatScale}>
          {[0.08, 0.3, 0.55, 0.8, 1].map((lv) => (
            <span key={lv} style={{ background: `color-mix(in srgb, #6f7785 ${Math.round(12 + lv * 88)}%, var(--card-bg))` }} />
          ))}
        </span>
        <span>Mye brukt</span>
        <span className={styles.heatSep} />
        <span className={styles.heatNone} /> Ikke i bruk
      </div>
    </div>
  );
}
