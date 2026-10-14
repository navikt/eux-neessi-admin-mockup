"use client";

import { CheckmarkCircleFillIcon, XMarkIcon, XMarkOctagonFillIcon } from "@navikt/aksel-icons";
import { Button, Table } from "@navikt/ds-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { Area, AreaChart, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/Section";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { fmtCompact, fmtDate, fmtDec, fmtInt } from "@/lib/format";
import type { DbInstance } from "./data";
import styles from "./databaser.module.css";
import { YamlBlock } from "./UpgradePlanModal";
import { backupIsStale, diskColor, diskPct, fmtBackup, fmtGb, fmtMonths, fmtSize, HEALTH_META } from "./ui";

interface Props {
  inst: DbInstance;
  months: { key: string; label: string }[];
  today: string;
  onClose: () => void;
}

const nbMonth = new Intl.DateTimeFormat("nb-NO", { month: "short", year: "2-digit", timeZone: "UTC" });

function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow;
}

function Yes({ on, children }: { on: boolean; children?: React.ReactNode }) {
  return on ? (
    <span className={styles.ok} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <CheckmarkCircleFillIcon aria-hidden /> {children ?? "På"}
    </span>
  ) : (
    <span className={styles.bad} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <XMarkOctagonFillIcon aria-hidden /> {children ?? "Av"}
    </span>
  );
}

export function InstanceDrawer({ inst, months, today, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const meta = HEALTH_META[inst.health];
  const pct = diskPct(inst);

  // History + 6 months projection.
  const [y, m] = months[months.length - 1].key.split("-").map(Number);
  const sizeData = [
    ...months.map((mo, i) => ({
      label: mo.label,
      faktisk: inst.history[i] as number | null,
      prognose: i === months.length - 1 ? inst.history[i] : (null as number | null),
    })),
    ...Array.from({ length: 6 }, (_, k) => ({
      label: nbMonth.format(new Date(Date.UTC(y, m + k, 1))).replace(".", ""),
      faktisk: null as number | null,
      prognose: Math.round((inst.usedGb + inst.growthGbPerMonth * (k + 1)) * 10) / 10,
    })),
  ];
  const peak = Math.max(inst.diskGb, ...sizeData.map((d) => d.prognose ?? 0));
  const step = niceStep(peak / 4);
  const yMax = Math.ceil((peak * 1.04) / step) * step;
  const yTicks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, k) => k * step);
  const connData = inst.connections24h.map((c, h) => ({ label: `${String(h).padStart(2, "0")}:00`, tilkoblinger: c, cpu: inst.cpu24h[h] }));
  const maxTable = Math.max(...inst.tables.map((t) => t.dataGb + t.indexGb));

  const yaml = [
    { text: "spec:", kind: "key" as const },
    { text: "  gcp:", kind: "key" as const },
    { text: "    sqlInstances:", kind: "key" as const },
    { text: `      - type: ${inst.typeLabel}` },
    { text: `        tier: ${inst.tier}` },
    { text: `        diskSize: ${inst.diskGb}` },
    { text: `        diskAutoresize: ${inst.diskAutoresize}` },
    { text: `        highAvailability: ${inst.highAvailability}` },
    { text: `        pointInTimeRecovery: ${inst.pointInTimeRecovery}` },
    { text: `        retainedBackups: ${inst.backupRetentionDays}` },
  ];

  return (
    <>
      <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        className={styles.drawer}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 34 }}
        aria-label={`Detaljer for ${inst.name}`}
      >
        <header className={styles.drawerHead} style={{ ["--accent" as string]: inst.appColor }}>
          <Button className={styles.drawerClose} variant="tertiary" data-color="neutral" size="small" icon={<XMarkIcon aria-hidden />} onClick={onClose} aria-label="Lukk" />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            <span className={styles.headChip} style={{ ["--c" as string]: meta.color }}>
              <i /> {inst.typeLabel} · {meta.short}
            </span>
            <span className={styles.headChip} style={{ ["--c" as string]: inst.env === "prod-gcp" ? "#7d6aa5" : "#6f7785" }}>
              {inst.env}
            </span>
            <span className={styles.headChip} style={{ ["--c" as string]: inst.status === "RUNNABLE" ? "#3a8a5f" : "#c98a2b" }}>
              {inst.status}
            </span>
          </div>
          <div className={styles.drawerTitle}>
            <span className={`dot ${inst.status === "RUNNABLE" ? "dot--ok dot--pulse" : "dot--warn"}`} />
            {inst.name}
          </div>
          <div className="muted" style={{ fontSize: "0.88rem", position: "relative", zIndex: 1 }}>
            {inst.namespace} · {inst.region} · {inst.tier} ({inst.vcpu} vCPU, {fmtDec(inst.memoryGb)} GB RAM)
          </div>
          <div className={styles.drawerStats}>
            <div className={styles.drawerStat}>
              <div>Brukt disk</div>
              <div>
                {fmtGb(inst.usedGb)} <span className="muted" style={{ fontSize: "0.8rem", fontWeight: 500 }}>/ {inst.diskGb}</span>
              </div>
            </div>
            <div className={styles.drawerStat}>
              <div>Vekst</div>
              <div>
                {inst.growthGbPerMonth >= 0 ? "+" : ""}
                {fmtDec(inst.growthGbPerMonth)} GB/mnd
              </div>
            </div>
            <div className={styles.drawerStat}>
              <div>Tilkoblinger</div>
              <div>
                {inst.connections} <span className="muted" style={{ fontSize: "0.8rem", fontWeight: 500 }}>/ {inst.maxConnections}</span>
              </div>
            </div>
            <div className={styles.drawerStat}>
              <div>EOL</div>
              <div>{fmtDate(inst.eol)}</div>
            </div>
          </div>
        </header>

        <div className={styles.drawerBody}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card
              title="Størrelse siste 12 måneder"
              subtitle={
                inst.daysUntilFull !== null
                  ? `Med dagens vekst er disken full om ca. ${fmtMonths(inst.daysUntilFull)}${inst.diskAutoresize ? " (auto-resize er på)" : ""}`
                  : "Databasen krymper – ingen fare for full disk"
              }
              actions={
                <span className="chip" style={{ color: diskColor(pct) }}>
                  {Math.round(pct)} % brukt
                </span>
              }
            >
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={sizeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="drawerSize" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={inst.appColor} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={inst.appColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval={2} />
                  <YAxis tickLine={false} axisLine={false} unit=" GB" width={70} domain={[0, yMax]} ticks={yTicks} />
                  <Tooltip content={<ChartTooltip formatter={(v) => fmtGb(v)} />} />
                  <ReferenceLine y={inst.diskGb} stroke="#c4505c" strokeDasharray="6 4" label={{ value: `Diskgrense ${inst.diskGb} GB`, position: "insideTopLeft", fill: "#c4505c", fontSize: 11 }} />
                  <Area type="monotone" dataKey="faktisk" name="Faktisk" stroke={inst.appColor} strokeWidth={2} fill="url(#drawerSize)" connectNulls={false} />
                  <Line type="monotone" dataKey="prognose" name="Prognose" stroke={inst.appColor} strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card title="Tilkoblinger siste 24 timer" subtitle={`Maks ${inst.maxConnections} tilkoblinger for ${inst.tier} · CPU nå ${inst.cpuPct} %`}>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={connData} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="drawerConn" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#3f8f8a" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#3f8f8a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval={3} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip formatter={(v, n) => (n === "CPU" ? `${fmtInt(v)} %` : fmtInt(v))} />} />
                  <Area type="monotone" dataKey="tilkoblinger" name="Tilkoblinger" stroke="#3f8f8a" strokeWidth={2} fill="url(#drawerConn)" />
                  <Area type="monotone" dataKey="cpu" name="CPU" stroke="#7d6aa5" strokeWidth={1.5} fill="none" strokeDasharray="4 3" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card title="Største tabeller" subtitle="Data + indekser, estimert fra pg_total_relation_size">
              <div style={{ margin: "0 -8px" }}>
                <Table size="small">
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>Tabell</Table.HeaderCell>
                      <Table.HeaderCell align="right">Rader</Table.HeaderCell>
                      <Table.HeaderCell align="right">Data</Table.HeaderCell>
                      <Table.HeaderCell align="right">Indekser</Table.HeaderCell>
                      <Table.HeaderCell style={{ width: "28%" }}>Andel</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {inst.tables.map((t, i) => {
                      const total = t.dataGb + t.indexGb;
                      return (
                        <Table.Row key={t.name}>
                          <Table.DataCell>
                            <span className="mono" style={{ fontWeight: 600 }}>
                              {t.name}
                            </span>
                          </Table.DataCell>
                          <Table.DataCell align="right" className="tabular">
                            {t.rows >= 100_000 ? fmtCompact(t.rows) : fmtInt(t.rows)}
                          </Table.DataCell>
                          <Table.DataCell align="right" className="tabular">
                            {fmtSize(t.dataGb)}
                          </Table.DataCell>
                          <Table.DataCell align="right" className="tabular muted">
                            {fmtSize(t.indexGb)}
                          </Table.DataCell>
                          <Table.DataCell>
                            <div className="bar-track">
                              <motion.div
                                className="bar-fill"
                                style={{ background: inst.appColor, width: `${Math.max(1, (total / maxTable) * 100)}%`, transformOrigin: "left" }}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ delay: 0.45 + i * 0.05, duration: 0.6 }}
                              />
                            </div>
                          </Table.DataCell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <Card title="Konfigurasjon og drift">
              <dl className={styles.kv}>
                <div>
                  <dt>Høy tilgjengelighet</dt>
                  <dd>
                    <Yes on={inst.highAvailability} />
                  </dd>
                </div>
                <div>
                  <dt>Point-in-time recovery</dt>
                  <dd>
                    <Yes on={inst.pointInTimeRecovery} />
                  </dd>
                </div>
                <div>
                  <dt>Siste backup</dt>
                  <dd className={backupIsStale(inst.lastBackupIso, today) ? styles.warn : undefined}>{fmtBackup(inst.lastBackupIso, today)}</dd>
                </div>
                <div>
                  <dt>Oppbevaring</dt>
                  <dd>{inst.backupRetentionDays} backuper</dd>
                </div>
                <div>
                  <dt>Disk auto-resize</dt>
                  <dd>
                    <Yes on={inst.diskAutoresize} />
                  </dd>
                </div>
                <div>
                  <dt>Minne brukt</dt>
                  <dd>{inst.memPct} %</dd>
                </div>
                <div>
                  <dt>Flyway</dt>
                  <dd className="mono">V{inst.flywayVersion}</dd>
                </div>
                <div>
                  <dt>Siste migrering</dt>
                  <dd>{fmtDate(inst.flywayDate)}</dd>
                </div>
              </dl>
              <p className="muted" style={{ fontSize: "0.85rem", margin: "12px 0 14px" }}>
                Siste migrering: <span className="mono">V{inst.flywayVersion}__{inst.flywayDescription.replaceAll(" ", "_").replaceAll(".", "_")}</span>
              </p>
              <YamlBlock lines={yaml} />
            </Card>
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
}
