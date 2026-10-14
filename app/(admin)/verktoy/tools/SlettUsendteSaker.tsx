"use client";

import { TrashIcon } from "@navikt/aksel-icons";
import { BodyShort, Table } from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { unsentCases, type UnsentCase } from "../mock";
import { ToolRunner, type RunContext, type RunOutcome } from "../ToolRunner";
import type { ToolComponentProps } from "../types";
import styles from "../verktoy.module.css";

interface DeleteResult {
  days: number;
  deleted: UnsentCase[];
  byBuc: { buc: string; n: number }[];
}

const BUCKETS = Array.from({ length: 13 }, (_, i) => i * 30);

export function SlettUsendteSaker({ tool, onRunComplete }: ToolComponentProps) {
  const [cases, setCases] = useState<UnsentCase[]>(() => unsentCases());
  const [days, setDays] = useState(90);

  const matching = useMemo(() => cases.filter((c) => c.ageDays >= days), [cases, days]);
  const histogram = useMemo(
    () =>
      BUCKETS.map((start) => ({
        start,
        n: cases.filter((c) => c.ageDays >= start && c.ageDays < start + 30).length,
      })),
    [cases],
  );
  const maxN = Math.max(1, ...histogram.map((h) => h.n));

  const run = async (ctx: RunContext): Promise<RunOutcome<DeleteResult>> => {
    const target = matching;
    ctx.step(`Låser ${target.length} saker i RINA`);
    await ctx.sleep(500);
    const batches = Math.ceil(target.length / 8);
    for (let b = 0; b < batches; b++) {
      const slice = target.slice(b * 8, b * 8 + 8);
      ctx.step(`Sletter ${slice.length} saker (${b + 1}/${batches})`);
      await ctx.sleep(420);
      ctx.progress((b + 1) / (batches + 1));
    }
    ctx.step("Rydder i eux-nav-rinasak og eux-rina-case-store");
    await ctx.sleep(500);
    const ids = new Set(target.map((c) => c.rinasakId));
    setCases((prev) => prev.filter((c) => !ids.has(c.rinasakId)));
    const counts = new Map<string, number>();
    target.forEach((c) => counts.set(c.buc, (counts.get(c.buc) ?? 0) + 1));
    return {
      status: "SUCCESS",
      headline: `${target.length} usendte RINA-saker eldre enn ${days} dager er slettet`,
      summary: `${target.length} saker slettet`,
      params: `eldre enn ${days} dager`,
      data: {
        days,
        deleted: target,
        byBuc: [...counts.entries()].map(([buc, n]) => ({ buc, n })).sort((a, b) => b.n - a.n),
      },
    };
  };

  return (
    <ToolRunner<DeleteResult>
      tool={tool}
      onRunComplete={onRunComplete}
      canRun={matching.length > 0}
      runLabel={`Slett ${matching.length} saker`}
      runIcon={<TrashIcon aria-hidden />}
      footerNote={matching.length ? `${matching.length} av ${cases.length} usendte saker` : "Ingen saker matcher"}
      confirm={{
        heading: "Slette usendte RINA-saker permanent?",
        confirmLabel: `Slett ${matching.length} saker`,
        typeToConfirm: "SLETT",
        body: (
          <BodyShort>
            <strong>{matching.length} saker</strong> som er opprettet for mer enn {days} dager siden, og der ingen SED er sendt, slettes i RINA
            og i eux. Dette kan <strong>ikke</strong> angres.
          </BodyShort>
        ),
      }}
      run={run}
      renderResult={(d) => (
        <div className={styles.stack}>
          <div className={styles.bigNumberRow}>
            <span className={styles.bigNumber}>
              <CountUp value={d.deleted.length} />
            </span>
            <span className="muted">saker slettet · {cases.length} usendte saker gjenstår</span>
          </div>
          <div className={styles.bucChips}>
            {d.byBuc.map((b, i) => (
              <motion.span
                key={b.buc}
                className="chip"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.05, type: "spring", stiffness: 300, damping: 20 }}
              >
                <span className="sed-code">{b.buc}</span> {b.n}
              </motion.span>
            ))}
          </div>
        </div>
      )}
    >
      <div className={styles.deleteGrid}>
        <div className={styles.stack}>
          <div>
            <div className={styles.sliderHead}>
              <span className={styles.sliderLabel}>Opprettet for mer enn</span>
              <motion.span key={days} className={styles.sliderValue} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                {days} dager
              </motion.span>
            </div>
            <input
              type="range"
              min={30}
              max={360}
              step={15}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className={styles.slider}
              style={{ ["--fill" as string]: `${((days - 30) / 330) * 100}%` }}
              aria-label="Antall dager"
            />
            <div className={styles.sliderScale}>
              <span>30 d</span>
              <span>180 d</span>
              <span>360 d</span>
            </div>
          </div>

          <div className={styles.histogram}>
            {histogram.map((h) => (
              <div key={h.start} className={styles.histCol} title={`${h.start}–${h.start + 29} dager: ${h.n} saker`}>
                <motion.span
                  className={styles.histBar}
                  data-hit={h.start + 29 >= days}
                  initial={false}
                  animate={{ height: `${(h.n / maxN) * 100}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 22 }}
                />
              </div>
            ))}
          </div>
          <BodyShort size="small" className="muted">
            Fordeling av usendte saker etter alder (30-dagers intervaller). Røde søyler blir berørt.
          </BodyShort>

          <div className={styles.bigNumberRow}>
            <span className={styles.bigNumber} data-danger>
              <CountUp value={matching.length} />
            </span>
            <span className="muted">saker blir slettet</span>
          </div>
        </div>

        <div className={styles.tableScroll} style={{ maxHeight: 360 }}>
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell scope="col">rinasakId</Table.HeaderCell>
                <Table.HeaderCell scope="col">BUC</Table.HeaderCell>
                <Table.HeaderCell scope="col">Opprettet av</Table.HeaderCell>
                <Table.HeaderCell scope="col" align="right">
                  Alder
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <AnimatePresence initial={false}>
                {matching.map((c) => (
                  <motion.tr
                    key={c.rinasakId}
                    className={styles.motionRow}
                    initial={{ opacity: 0, backgroundColor: "rgba(196, 80, 92,0.18)" }}
                    animate={{ opacity: 1, backgroundColor: "rgba(196, 80, 92,0)" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Table.DataCell className="mono">{c.rinasakId}</Table.DataCell>
                    <Table.DataCell>
                      <span className="sed-code">{c.buc}</span>
                    </Table.DataCell>
                    <Table.DataCell>
                      {c.createdBy} <span className="muted">· {c.enhet}</span>
                    </Table.DataCell>
                    <Table.DataCell align="right" className="tabular">
                      {c.ageDays} d
                    </Table.DataCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </Table.Body>
          </Table>
          {matching.length === 0 ? <div className="empty">Ingen usendte saker er så gamle</div> : null}
        </div>
      </div>
    </ToolRunner>
  );
}
