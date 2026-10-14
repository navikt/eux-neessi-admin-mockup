"use client";

import { Buildings3Icon, CloudDownIcon } from "@navikt/aksel-icons";
import { BodyShort, Radio, RadioGroup, Switch, Table } from "@navikt/ds-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { Flag } from "@/components/ui/Flag";
import { fmtInt } from "@/lib/format";
import { COUNTRIES, type CountryCode } from "@/lib/mock/reference";
import { catalogDiff, type CatalogDiff } from "../mock";
import { ToolRunner, type RunContext, type RunOutcome } from "../ToolRunner";
import type { ToolComponentProps } from "../types";
import styles from "../verktoy.module.css";

interface CatalogResult {
  source: string;
  dryRun: boolean;
  rows: CatalogDiff[];
  added: number;
  changed: number;
  removed: number;
  total: number;
}

const SOURCES = [
  { id: "CEF", label: "CEF (EU-katalogen)", description: "Offisiell institusjonskatalog fra EU-kommisjonen. Anbefalt." },
  { id: "RINA", label: "RINA lokal", description: "Katalogen slik vår RINA-installasjon ser den nå." },
];

export function Institusjonskatalog({ tool, onRunComplete }: ToolComponentProps) {
  const [source, setSource] = useState("CEF");
  const [dryRun, setDryRun] = useState(false);
  const [done, setDone] = useState<CountryCode[]>([]);
  const [current, setCurrent] = useState<CountryCode | null>(null);
  const salt = useRef(0);

  const run = async (ctx: RunContext): Promise<RunOutcome<CatalogResult>> => {
    salt.current += 1;
    setDone([]);
    ctx.step(`Henter katalog fra ${source}`);
    await ctx.sleep(700);
    ctx.step("Sammenligner institusjoner per land");
    for (let i = 0; i < COUNTRIES.length; i++) {
      const c = COUNTRIES[i];
      setCurrent(c.code);
      await ctx.sleep(110);
      setDone((prev) => [...prev, c.code]);
      ctx.progress(0.08 + ((i + 1) / COUNTRIES.length) * 0.82);
    }
    setCurrent(null);
    ctx.step(dryRun ? "Tørrkjøring – ingenting lagres" : "Lagrer katalog og tømmer cache for institusjoner");
    await ctx.sleep(600);
    const rows = catalogDiff(source, salt.current)
      .filter((r) => r.added + r.changed + r.removed > 0)
      .sort((a, b) => b.added + b.changed + b.removed - (a.added + a.changed + a.removed));
    const all = catalogDiff(source, salt.current);
    const added = rows.reduce((s, r) => s + r.added, 0);
    const changed = rows.reduce((s, r) => s + r.changed, 0);
    const removed = rows.reduce((s, r) => s + r.removed, 0);
    return {
      status: dryRun ? "DRY_RUN" : "SUCCESS",
      headline: `${rows.length} land med endringer: ${added} nye, ${changed} endret og ${removed} fjernet institusjoner`,
      summary: `+${added} / ~${changed} / −${removed} institusjoner`,
      params: `kilde=${source} · alle land${dryRun ? " · tørrkjøring" : ""}`,
      data: { source, dryRun, rows, added, changed, removed, total: all.reduce((s, r) => s + r.total, 0) },
    };
  };

  return (
    <ToolRunner<CatalogResult>
      tool={tool}
      onRunComplete={onRunComplete}
      canRun
      runLabel={dryRun ? "Vis endringer" : "Oppdater katalog"}
      runIcon={<CloudDownIcon aria-hidden />}
      footerNote={`${COUNTRIES.length} land · kilde ${source}`}
      confirm={
        dryRun
          ? null
          : {
              heading: "Oppdatere institusjonskatalogen?",
              confirmLabel: "Oppdater",
              body: (
                <BodyShort>
                  Katalogen for alle {COUNTRIES.length} land hentes fra <strong>{source}</strong> og erstatter dagens. Saksbehandlere ser endringene
                  i mottakervelgeren med en gang.
                </BodyShort>
              ),
            }
      }
      run={run}
      liveView={
        <div className={styles.flagGrid}>
          {COUNTRIES.map((c) => {
            const isDone = done.includes(c.code);
            return (
              <motion.span
                key={c.code}
                className={styles.flagCell}
                data-done={isDone}
                data-current={current === c.code}
                animate={current === c.code ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                title={c.name}
              >
                <Flag code={c.code} />
              </motion.span>
            );
          })}
        </div>
      }
      renderResult={(d) => (
        <div className={styles.stack}>
          <div className={styles.catalogTotals}>
            {[
              { label: "Nye", value: d.added, kind: "added", sign: "+" },
              { label: "Endret", value: d.changed, kind: "changed", sign: "~" },
              { label: "Fjernet", value: d.removed, kind: "removed", sign: "−" },
            ].map((t, i) => (
              <motion.div
                key={t.kind}
                className={styles.catalogTotal}
                data-kind={t.kind}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
              >
                <span className={styles.catalogTotalValue}>
                  {t.sign}
                  <CountUp value={t.value} />
                </span>
                <span>{t.label}</span>
              </motion.div>
            ))}
            <div className={styles.catalogTotal} data-kind="total">
              <span className={styles.catalogTotalValue}>{fmtInt(d.total)}</span>
              <span>institusjoner totalt</span>
            </div>
          </div>
          <div className={styles.tableScroll} style={{ maxHeight: 340 }}>
            <Table size="small">
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell scope="col">Land</Table.HeaderCell>
                  <Table.HeaderCell scope="col" align="right">
                    Nye
                  </Table.HeaderCell>
                  <Table.HeaderCell scope="col" align="right">
                    Endret
                  </Table.HeaderCell>
                  <Table.HeaderCell scope="col" align="right">
                    Fjernet
                  </Table.HeaderCell>
                  <Table.HeaderCell scope="col" style={{ width: "34%" }}>
                    Fordeling
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {d.rows.map((r) => {
                  const sum = r.added + r.changed + r.removed;
                  const max = d.rows.length ? d.rows[0].added + d.rows[0].changed + d.rows[0].removed : 1;
                  return (
                    <Table.Row key={r.code}>
                      <Table.DataCell>
                        <span className={styles.inlineGap}>
                          <Flag code={r.code} /> {r.name}
                        </span>
                      </Table.DataCell>
                      <Table.DataCell align="right" className={`tabular ${styles.addedText}`}>
                        {r.added ? `+${r.added}` : "–"}
                      </Table.DataCell>
                      <Table.DataCell align="right" className={`tabular ${styles.changedText}`}>
                        {r.changed ? `~${r.changed}` : "–"}
                      </Table.DataCell>
                      <Table.DataCell align="right" className={`tabular ${styles.removedText}`}>
                        {r.removed ? `−${r.removed}` : "–"}
                      </Table.DataCell>
                      <Table.DataCell>
                        <div className={styles.stackBar} style={{ width: `${(sum / max) * 100}%` }}>
                          <span style={{ flex: r.added, background: "#3a8a5f" }} />
                          <span style={{ flex: r.changed, background: "#c98a2b" }} />
                          <span style={{ flex: r.removed, background: "#c4505c" }} />
                        </div>
                      </Table.DataCell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          </div>
        </div>
      )}
    >
      <div className={styles.publishGrid}>
        <RadioGroup legend="Kilde" value={source} onChange={(v: string) => setSource(v)} className={styles.radioCards}>
          {SOURCES.map((s) => (
            <Radio key={s.id} value={s.id} description={s.description} className={styles.radioCard}>
              <span className={styles.radioCardTitle}>{s.label}</span>
            </Radio>
          ))}
        </RadioGroup>
        <div className={styles.stack}>
          <div className={styles.switchCard} data-on={dryRun}>
            <Switch checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} description="Henter og sammenligner, men lagrer ingenting">
              Tørrkjøring
            </Switch>
          </div>
          <div className={styles.tipCard}>
            <Buildings3Icon aria-hidden />
            <BodyShort size="small">
              Katalogen oppdateres automatisk hver natt kl. 02:00. Kjør manuelt når et land har meldt om nye eller nedlagte institusjoner.
            </BodyShort>
          </div>
        </div>
      </div>
    </ToolRunner>
  );
}
