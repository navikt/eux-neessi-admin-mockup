"use client";

import { CheckmarkIcon, EraserIcon } from "@navikt/aksel-icons";
import { BodyShort } from "@navikt/ds-react";
import { motion } from "motion/react";
import { useState } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { fmtDec, fmtInt, fmtPct } from "@/lib/format";
import { CACHES, type CacheInfo } from "../mock";
import { ToolRunner, type RunContext, type RunOutcome } from "../ToolRunner";
import type { ToolComponentProps } from "../types";
import styles from "../verktoy.module.css";

interface CacheResult {
  cleared: { cache: CacheInfo; keys: number; warmMs: number }[];
}

type Level = Record<string, number>;

export function TomCache({ tool, onRunComplete }: ToolComponentProps) {
  const [selected, setSelected] = useState<string[]>(["kodeverk"]);
  const [level, setLevel] = useState<Level>({});

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const chosen = CACHES.filter((c) => selected.includes(c.id));

  const run = async (ctx: RunContext): Promise<RunOutcome<CacheResult>> => {
    setLevel(Object.fromEntries(chosen.map((c) => [c.id, 1])));
    const cleared: CacheResult["cleared"] = [];
    for (let i = 0; i < chosen.length; i++) {
      const c = chosen[i];
      ctx.step(`Tømmer ${c.name.toLowerCase()} i ${c.owner}`);
      for (let s = 1; s <= 5; s++) {
        await ctx.sleep(90);
        setLevel((prev) => ({ ...prev, [c.id]: 1 - s / 5 }));
      }
      ctx.step(`Varmer opp ${c.name.toLowerCase()}`);
      for (let s = 1; s <= 5; s++) {
        await ctx.sleep(110);
        setLevel((prev) => ({ ...prev, [c.id]: (s / 5) * 0.35 }));
      }
      cleared.push({ cache: c, keys: c.entries, warmMs: 400 + i * 230 });
      ctx.progress((i + 1) / chosen.length);
    }
    const keys = cleared.reduce((s, c) => s + c.keys, 0);
    return {
      status: "SUCCESS",
      headline: `${fmtInt(keys)} nøkler tømt fra ${chosen.length} ${chosen.length === 1 ? "cache" : "cacher"}`,
      summary: `${fmtInt(keys)} nøkler tømt`,
      params: chosen.map((c) => c.id).join(", "),
      data: { cleared },
    };
  };

  return (
    <ToolRunner<CacheResult>
      tool={tool}
      onRunComplete={onRunComplete}
      canRun={chosen.length > 0}
      runLabel={chosen.length > 1 ? `Tøm ${chosen.length} cacher` : "Tøm cache"}
      runIcon={<EraserIcon aria-hidden />}
      footerNote={chosen.length ? `${fmtInt(chosen.reduce((s, c) => s + c.entries, 0))} nøkler` : "Velg minst én cache"}
      run={run}
      liveView={
        <div className={styles.cacheMeters}>
          {chosen.map((c) => (
            <div key={c.id} className={styles.cacheMeter}>
              <span>{c.name}</span>
              <div className="bar-track" style={{ height: 10 }}>
                <motion.span
                  className="bar-fill"
                  style={{ background: c.color }}
                  initial={false}
                  animate={{ width: `${(level[c.id] ?? 1) * 100}%` }}
                  transition={{ duration: 0.12 }}
                />
              </div>
            </div>
          ))}
        </div>
      }
      renderResult={(d) => (
        <div className={styles.cacheResultGrid}>
          {d.cleared.map((c, i) => (
            <motion.div
              key={c.cache.id}
              className={styles.cacheResult}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.1, type: "spring", stiffness: 260, damping: 22 }}
            >
              <span className={styles.cacheSwatch} style={{ background: c.cache.color }} />
              <div style={{ flex: 1 }}>
                <div className={styles.cacheName}>{c.cache.name}</div>
                <BodyShort size="small" className="muted">
                  <CountUp value={c.keys} /> nøkler fjernet · {fmtDec(c.cache.sizeMb)} MB frigjort
                </BodyShort>
              </div>
              <span className={styles.warmTag}>
                <CheckmarkIcon aria-hidden /> Varm igjen etter {c.warmMs} ms
              </span>
            </motion.div>
          ))}
        </div>
      )}
    >
      <div className={styles.cachePicker}>
        {CACHES.map((c) => {
          const on = selected.includes(c.id);
          return (
            <motion.button
              key={c.id}
              type="button"
              className={styles.cacheCard}
              data-on={on}
              onClick={() => toggle(c.id)}
              whileTap={{ scale: 0.97 }}
              style={{ ["--cache" as string]: c.color }}
            >
              <span className={styles.cacheCheck}>{on ? <CheckmarkIcon aria-hidden /> : null}</span>
              <span className={styles.cacheName}>{c.name}</span>
              <span className={styles.cacheDesc}>{c.description}</span>
              <span className={styles.cacheStats}>
                <span>
                  <strong>{fmtInt(c.entries)}</strong> nøkler
                </span>
                <span>
                  <strong>{fmtPct(c.hitRate * 100, 1)}</strong> treff
                </span>
                <span>TTL {c.ttl}</span>
              </span>
              <span className={`mono ${styles.cacheOwner}`}>{c.owner}</span>
            </motion.button>
          );
        })}
      </div>
    </ToolRunner>
  );
}
