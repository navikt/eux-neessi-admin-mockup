"use client";

import { ArrowRightIcon, ArrowsCirclepathIcon, CheckmarkCircleIcon } from "@navikt/aksel-icons";
import { BodyShort, TextField } from "@navikt/ds-react";
import { motion } from "motion/react";
import { useState } from "react";
import { syncDiff, type FieldDiff } from "../mock";
import { ToolRunner, type RunContext, type RunOutcome } from "../ToolRunner";
import type { ToolComponentProps } from "../types";
import styles from "../verktoy.module.css";

interface SyncResult {
  rinasakId: string;
  diffs: FieldDiff[];
  unchanged: number;
}

export function SynkroniserRinasak({ tool, onRunComplete }: ToolComponentProps) {
  const [rinasakId, setRinasakId] = useState("");
  const trimmed = rinasakId.trim();
  const error = trimmed && !/^\d{6,8}$/.test(trimmed) ? "rinasakId må være 6–8 siffer" : undefined;

  const run = async (ctx: RunContext): Promise<RunOutcome<SyncResult>> => {
    const steps = [
      `Henter sak ${trimmed} fra RINA CPI`,
      "Henter lagret tilstand i eux-rina-case-store",
      "Sammenligner felter",
      "Oppdaterer eux-nav-rinasak",
      "Publiserer endringshendelse",
    ];
    for (let i = 0; i < steps.length; i++) {
      ctx.step(steps[i]);
      ctx.progress((i + 0.3) / steps.length);
      await ctx.sleep(380 + i * 90);
    }
    const diffs = syncDiff(trimmed);
    return {
      status: "SUCCESS",
      headline: diffs.length ? `${diffs.length} felt oppdatert på sak ${trimmed}` : `Sak ${trimmed} var allerede i synk med RINA`,
      summary: diffs.length ? `${diffs.length} felt oppdatert` : "Allerede i synk",
      params: `rinasakId=${trimmed}`,
      data: { rinasakId: trimmed, diffs, unchanged: 14 - diffs.length },
    };
  };

  return (
    <ToolRunner<SyncResult>
      tool={tool}
      onRunComplete={onRunComplete}
      canRun={!!trimmed && !error}
      runLabel="Synkroniser"
      runIcon={<ArrowsCirclepathIcon aria-hidden />}
      formActions={
        <div className={styles.quickPicks}>
          <span className="muted">Nylig:</span>
          {["1452389", "1587230", "1610447"].map((id) => (
            <button key={id} type="button" className={styles.quickPick} onClick={() => setRinasakId(id)}>
              {id}
            </button>
          ))}
        </div>
      }
      run={run}
      renderResult={(data) =>
        data.diffs.length ? (
          <div className={styles.diffList}>
            {data.diffs.map((d, i) => (
              <motion.div
                key={d.field}
                className={styles.diffRow}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
              >
                <span className={styles.diffField}>{d.field}</span>
                <span className={styles.diffBefore}>{d.before}</span>
                <ArrowRightIcon aria-hidden className="muted" />
                <span className={styles.diffAfter}>{d.after}</span>
              </motion.div>
            ))}
            <BodyShort size="small" className="muted" style={{ marginTop: 6 }}>
              {data.unchanged} andre felt var uendret.
            </BodyShort>
          </div>
        ) : (
          <div className={styles.emptyHint}>
            <CheckmarkCircleIcon aria-hidden />
            <span>Ingen forskjeller funnet – eux har samme data som RINA.</span>
          </div>
        )
      }
    >
      <div className={styles.formRow}>
        <TextField
          label="rinasakId"
          description="Saken hentes på nytt fra RINA og lokale kopier oppdateres."
          value={rinasakId}
          onChange={(e) => setRinasakId(e.target.value)}
          error={error}
          inputMode="numeric"
          className={styles.monoInput}
          style={{ maxWidth: 280 }}
        />
        <div className={styles.flowCard}>
          {["RINA CPI", "eux-rina-case-store", "eux-nav-rinasak"].map((s, i) => (
            <span key={s} className={styles.flowNode}>
              {i > 0 ? <ArrowRightIcon aria-hidden className="muted" /> : null}
              <span className="chip">{s}</span>
            </span>
          ))}
        </div>
      </div>
    </ToolRunner>
  );
}
