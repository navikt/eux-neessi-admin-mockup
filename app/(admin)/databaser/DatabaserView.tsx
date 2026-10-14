"use client";

import {
  ArrowRightIcon,
  ClockDashedIcon,
  CloudIcon,
  DatabaseIcon,
  HddUpIcon,
  SquareGridIcon,
  PersonGroupIcon,
  ShieldCheckmarkIcon,
  TableIcon,
  WrenchIcon,
} from "@navikt/aksel-icons";
import { Button, Search, Table, Tag, ToggleGroup, Tooltip } from "@navikt/ds-react";
import type { SortState } from "@navikt/ds-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { KpiCard } from "@/components/ui/KpiCard";
import { HeroStat, PageHero } from "@/components/ui/PageHero";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import { Card, Section } from "@/components/ui/Section";
import { Sparkline } from "@/components/ui/Sparkline";
import { useToasts } from "@/components/ui/Toast";
import { fmtDate } from "@/lib/format";
import type { DatabaseOverview, DbInstance, UpgradeRecommendation } from "./data";
import styles from "./databaser.module.css";
import { InstanceDrawer } from "./InstanceDrawer";
import { SizeStats } from "./SizeStats";
import { backupIsStale, diskColor, diskPct, fmtBackup, fmtGb, HEALTH_META, PRIORITY_META, variantLabel } from "./ui";
import { UpgradePlanModal } from "./UpgradePlanModal";
import { HealthSummary, VersionSwimlane } from "./VersionHealth";

type EnvFilter = "alle" | "prod-gcp" | "dev-gcp";
type ViewMode = "kort" | "tabell";

function EnvTag({ inst }: { inst: DbInstance }) {
  const v = variantLabel(inst);
  return (
    <span className={`${styles.envTag} ${inst.env === "prod-gcp" ? styles.envProd : ""}`}>
      {inst.env}
      {v ? ` · ${v}` : ""}
    </span>
  );
}

function VersionTag({ inst }: { inst: DbInstance }) {
  const meta = HEALTH_META[inst.health];
  return (
    <Tooltip content={`${meta.label} · EOL ${fmtDate(inst.eol)}`}>
      <Tag size="small" variant={inst.health === "eol" ? "strong" : "moderate"} data-color={meta.tag}>
        PG {inst.version}
      </Tag>
    </Tooltip>
  );
}

function InstanceCard({ inst, today, onOpen }: { inst: DbInstance; today: string; onOpen: () => void }) {
  const pct = diskPct(inst);
  const connPct = (inst.connections / inst.maxConnections) * 100;
  const stale = backupIsStale(inst.lastBackupIso, today);
  return (
    <div className={`card card--interactive ${styles.inst}`} onClick={onOpen}>
      <div className={styles.instTop}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.instName}>
            <span className={`dot ${inst.status === "RUNNABLE" ? "dot--ok" : "dot--warn dot--pulse"}`} />
            {inst.name}
          </div>
          <div className={styles.instSub}>
            <EnvTag inst={inst} />
            <span>{inst.tier}</span>
            {inst.status !== "RUNNABLE" ? (
              <Tag size="xsmall" variant="moderate" data-color="warning" icon={<WrenchIcon aria-hidden />}>
                Vedlikehold
              </Tag>
            ) : null}
          </div>
        </div>
        <VersionTag inst={inst} />
      </div>

      <div>
        <div className={styles.metricLabel}>
          <span>Disk</span>
          <strong>
            {fmtGb(inst.usedGb)} / {inst.diskGb} GB · {Math.round(pct)} %
          </strong>
        </div>
        <div className="bar-track">
          <motion.div
            className="bar-fill"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${inst.appColor}, ${diskColor(pct)})`, transformOrigin: "left" }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      <div className={styles.instStats}>
        <div className={styles.instStat}>
          <div className={styles.instStatLabel}>Tilkoblinger</div>
          <div className={styles.instStatValue}>
            {inst.connections}
            <span className="muted" style={{ fontWeight: 500, fontSize: "0.78rem" }}>
              /{inst.maxConnections}
            </span>
          </div>
          <div className="bar-track" style={{ height: 4, marginTop: 4 }}>
            <div className="bar-fill" style={{ width: `${connPct}%`, background: "#06b6d4" }} />
          </div>
        </div>
        <div className={styles.instStat}>
          <div className={styles.instStatLabel}>CPU</div>
          <div className={styles.instStatValue}>{inst.cpuPct} %</div>
          <Sparkline data={inst.cpu24h} color="#a855f7" height={16} width={80} fill={false} />
        </div>
        <div className={styles.instStat}>
          <div className={styles.instStatLabel}>HA</div>
          <div className={`${styles.instStatValue} ${inst.highAvailability ? styles.ok : inst.env === "prod-gcp" ? styles.warn : "muted"}`}>
            {inst.highAvailability ? "Regional" : "Sone"}
          </div>
          <div className="muted" style={{ fontSize: "0.72rem" }}>
            {inst.highAvailability ? "failover på" : "ingen failover"}
          </div>
        </div>
      </div>

      <div className={styles.instFoot}>
        <span className={stale ? styles.warn : undefined}>
          <ShieldCheckmarkIcon aria-hidden /> Backup {fmtBackup(inst.lastBackupIso, today)}
          {inst.pointInTimeRecovery ? " · PITR" : ""}
        </span>
        <span className="mono">Flyway V{inst.flywayVersion}</span>
      </div>
    </div>
  );
}

function InstanceTable({ list, today, onOpen }: { list: DbInstance[]; today: string; onOpen: (id: string) => void }) {
  const [sort, setSort] = useState<SortState>({ orderBy: "used", direction: "descending" });
  const sorted = useMemo(() => {
    const key = (i: DbInstance): number | string => {
      switch (sort.orderBy) {
        case "name":
          return i.name;
        case "version":
          return i.version;
        case "disk":
          return diskPct(i);
        case "conn":
          return i.connections / i.maxConnections;
        case "cpu":
          return i.cpuPct;
        default:
          return i.usedGb;
      }
    };
    const dir = sort.direction === "ascending" ? 1 : -1;
    return [...list].sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      return (typeof ka === "string" ? ka.localeCompare(String(kb)) : ka - (kb as number)) * dir;
    });
  }, [list, sort]);

  return (
    <div className="card card--flush data-table" style={{ overflowX: "auto" }}>
      <Table
        size="medium"
        sort={sort}
        onSortChange={(key) =>
          setSort((prev) => ({ orderBy: key, direction: prev.orderBy === key && prev.direction === "descending" ? "ascending" : "descending" }))
        }
      >
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader sortable sortKey="name">
              Instans
            </Table.ColumnHeader>
            <Table.HeaderCell>Miljø</Table.HeaderCell>
            <Table.ColumnHeader sortable sortKey="version">
              Versjon
            </Table.ColumnHeader>
            <Table.ColumnHeader sortable sortKey="used" align="right">
              Brukt
            </Table.ColumnHeader>
            <Table.ColumnHeader sortable sortKey="disk" style={{ minWidth: 140 }}>
              Disk
            </Table.ColumnHeader>
            <Table.ColumnHeader sortable sortKey="conn" align="right">
              Tilkoblinger
            </Table.ColumnHeader>
            <Table.ColumnHeader sortable sortKey="cpu" align="right">
              CPU
            </Table.ColumnHeader>
            <Table.HeaderCell>HA</Table.HeaderCell>
            <Table.HeaderCell>Backup</Table.HeaderCell>
            <Table.HeaderCell>Flyway</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {sorted.map((i) => {
            const pct = diskPct(i);
            return (
              <Table.Row key={i.id} onClick={() => onOpen(i.id)}>
                <Table.DataCell>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }} className="mono">
                    <span className={`dot ${i.status === "RUNNABLE" ? "dot--ok" : "dot--warn dot--pulse"}`} />
                    <strong>{i.name}</strong>
                  </span>
                </Table.DataCell>
                <Table.DataCell>
                  <EnvTag inst={i} />
                </Table.DataCell>
                <Table.DataCell>
                  <VersionTag inst={i} />
                </Table.DataCell>
                <Table.DataCell align="right" className="tabular">
                  {fmtGb(i.usedGb)}
                </Table.DataCell>
                <Table.DataCell>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="bar-track" style={{ flex: 1 }}>
                      <div className="bar-fill" style={{ width: `${pct}%`, background: diskColor(pct) }} />
                    </div>
                    <span className="tabular muted" style={{ fontSize: "0.8rem", width: 36, textAlign: "right" }}>
                      {Math.round(pct)} %
                    </span>
                  </div>
                </Table.DataCell>
                <Table.DataCell align="right" className="tabular">
                  {i.connections}
                  <span className="muted">/{i.maxConnections}</span>
                </Table.DataCell>
                <Table.DataCell align="right" className="tabular">
                  {i.cpuPct} %
                </Table.DataCell>
                <Table.DataCell>
                  <span className={i.highAvailability ? styles.ok : "muted"}>{i.highAvailability ? "Ja" : "Nei"}</span>
                </Table.DataCell>
                <Table.DataCell>
                  <span className={backupIsStale(i.lastBackupIso, today) ? styles.warn : undefined} style={{ whiteSpace: "nowrap" }}>
                    {fmtBackup(i.lastBackupIso, today)}
                  </span>
                </Table.DataCell>
                <Table.DataCell>
                  <span className="mono">V{i.flywayVersion}</span>
                </Table.DataCell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
    </div>
  );
}

function RecommendationItem({
  rec,
  index,
  instances,
  done,
  onPlan,
  onSelect,
}: {
  rec: UpgradeRecommendation;
  index: number;
  instances: DbInstance[];
  done: boolean;
  onPlan: () => void;
  onSelect: (id: string) => void;
}) {
  const prio = PRIORITY_META[rec.priority];
  const list = rec.instanceIds.map((id) => instances.find((i) => i.id === id)).filter((i): i is DbInstance => Boolean(i));
  return (
    <motion.div
      layout
      className={`card card--interactive ${styles.rec}`}
      style={{ ["--prio" as string]: prio.color }}
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.55, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.recRank}>{index + 1}</div>
      <div style={{ minWidth: 0 }}>
        <div className={styles.recHead}>
          <Tag size="small" variant={rec.priority === "kritisk" ? "strong" : "moderate"} data-color={prio.tag}>
            {prio.label}
          </Tag>
          <span className={styles.recApp}>{rec.app}</span>
          {done ? (
            <Tag size="xsmall" variant="outline" data-color="success">
              Oppgave opprettet
            </Tag>
          ) : null}
        </div>
        <p className={styles.recReason}>{rec.reason}</p>
        <p className={styles.recDetail}>{rec.detail}</p>
        <div className={styles.recInstances}>
          {list.map((i) => (
            <button
              type="button"
              key={i.id}
              className={styles.pill}
              style={{ ["--pill" as string]: HEALTH_META[i.health].color }}
              onClick={() => onSelect(i.id)}
            >
              <i />
              {i.name}
              <span className={styles.pillEnv}>PG{i.version}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.recSide}>
        <div className={styles.versionJump}>
          <span className={styles.vchip} style={{ background: HEALTH_META[list[0]?.health ?? "eol"].color }}>
            PG{rec.worstVersion}
          </span>
          <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} style={{ display: "inline-flex" }}>
            <ArrowRightIcon aria-hidden />
          </motion.span>
          <span className={styles.vchip} style={{ background: "#10b981" }}>
            POSTGRES_{rec.target}
          </span>
        </div>
        <div className={styles.recFacts}>
          <span>{fmtGb(rec.totalGb)}</span>
          <span>≈ {rec.estDowntimeMin} min nedetid</span>
        </div>
        <Button size="small" variant={rec.priority === "planlegg" ? "secondary" : "primary"} onClick={onPlan}>
          Lag oppgraderingsplan
        </Button>
      </div>
    </motion.div>
  );
}

export function DatabaserView({ overview }: { overview: DatabaseOverview }) {
  const { instances, versions, recommendations, months, apps, today } = overview;
  const [env, setEnv] = useState<EnvFilter>("alle");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("kort");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [planApp, setPlanApp] = useState<string | null>(null);
  const [doneApps, setDoneApps] = useState<string[]>([]);
  const { toasts, push } = useToasts();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return instances.filter((i) => (env === "alle" || i.env === env) && (!q || `${i.name} ${i.tier} pg${i.version} ${i.typeLabel}`.toLowerCase().includes(q)));
  }, [instances, env, query]);
  const filteredIds = new Set(filtered.map((i) => i.id));
  const visibleRecs = recommendations
    .map((r) => ({ ...r, instanceIds: r.instanceIds.filter((id) => filteredIds.has(id)) }))
    .filter((r) => r.instanceIds.length > 0);

  // Hero / KPI numbers (always the whole estate).
  const totalGb = instances.reduce((s, i) => s + i.usedGb, 0);
  const totalDisk = instances.reduce((s, i) => s + i.diskGb, 0);
  const growthPerMonth = instances.reduce((s, i) => s + i.growthGbPerMonth, 0);
  const needUpgrade = instances.filter((i) => i.health === "eol" || i.health === "soon");
  const eolCount = instances.filter((i) => i.health === "eol").length;
  const online = instances.filter((i) => i.status === "RUNNABLE").length;
  const maintenance = instances.filter((i) => i.status !== "RUNNABLE");
  const totalHistory = months.map((_, idx) => instances.reduce((s, i) => s + i.history[idx], 0));
  const conns24 = Array.from({ length: 24 }, (_, h) => instances.reduce((s, i) => s + i.connections24h[h], 0));
  const connsNow = instances.reduce((s, i) => s + i.connections, 0);
  const prod = instances.filter((i) => i.env === "prod-gcp");
  const prodHa = prod.filter((i) => i.highAvailability).length;
  const backedUp = instances.filter((i) => !backupIsStale(i.lastBackupIso, today)).length;

  const selected = instances.find((i) => i.id === selectedId) ?? null;
  const planRec = recommendations.find((r) => r.app === planApp) ?? null;

  return (
    <>
      <PageHero
        variant="slate"
        eyebrow={
          <>
            <CloudIcon aria-hidden /> Cloud SQL · eessibasis
          </>
        }
        title="Databaser"
        lead="Alle Postgres-instanser for EUX-appene på GCP. Se hvilke versjoner vi kjører, hva som bør oppgraderes, og hvor fort databasene vokser."
        actions={
          <>
            <Button as="a" href="#anbefalinger" size="small" className={`${styles.heroBtn} ${styles.heroBtnSolid}`} icon={<WrenchIcon aria-hidden />}>
              Se anbefalinger
            </Button>
            <Button as="a" href="#storrelse" size="small" className={styles.heroBtn} icon={<HddUpIcon aria-hidden />}>
              Størrelse og vekst
            </Button>
          </>
        }
      >
        <HeroStat label="Instanser" value={<CountUp value={instances.length} />} hint={`${apps.length} apper · prod-gcp og dev-gcp`} />
        <HeroStat
          label="Total lagring"
          value={<CountUp value={totalGb} decimals={0} suffix=" GB" />}
          hint={`av ${totalDisk.toLocaleString("nb-NO")} GB tildelt · +${growthPerMonth.toLocaleString("nb-NO", { maximumFractionDigits: 1 })} GB/mnd`}
        />
        <HeroStat label="Trenger oppgradering" value={<CountUp value={needUpgrade.length} />} hint={`${eolCount} er EOL · ${needUpgrade.length - eolCount} går ut innen 6 mnd`} />
        <HeroStat
          label="Online"
          value={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <span className="dot dot--ok dot--pulse" />
              {online}/{instances.length}
            </span>
          }
          hint={maintenance.length ? `${maintenance.map((m) => m.name).join(", ")} i vedlikehold` : "Alle kjører"}
        />
      </PageHero>

      <Stagger className="grid grid--4">
        <StaggerItem>
          <KpiCard label="Vekst siste 12 mnd" value={totalHistory[11] - totalHistory[0]} suffix=" GB" icon={HddUpIcon} color="#6366f1" delta={((totalHistory[11] - totalHistory[0]) / totalHistory[0]) * 100} invertDelta deltaLabel="mot okt. i fjor" spark={totalHistory} />
        </StaggerItem>
        <StaggerItem>
          <KpiCard label="Tilkoblinger nå" value={connsNow} icon={PersonGroupIcon} color="#06b6d4" deltaLabel={`maks ${Math.max(...conns24)} siste døgn`} spark={conns24} />
        </StaggerItem>
        <StaggerItem>
          <KpiCard label="Prod med høy tilgjengelighet" value={prodHa} suffix={` av ${prod.length}`} icon={ShieldCheckmarkIcon} color="#10b981" foot={<span>{prod.filter((p) => !p.highAvailability).map((p) => p.app.replace("eux-", "")).join(", ")} uten failover</span>} />
        </StaggerItem>
        <StaggerItem>
          <KpiCard label="Backup siste døgn" value={backedUp} suffix={` av ${instances.length}`} icon={ClockDashedIcon} color="#f59e0b" foot={<span>{instances.filter((i) => i.pointInTimeRecovery).length} med point-in-time recovery</span>} />
        </StaggerItem>
      </Stagger>

      <div className={`sticky-filters ${styles.filters}`} style={{ marginTop: 28 }}>
        <ToggleGroup size="small" value={env} onChange={(v) => setEnv(v as EnvFilter)} label={undefined} aria-label="Miljø">
          <ToggleGroup.Item value="alle" label={`Alle (${instances.length})`} />
          <ToggleGroup.Item value="prod-gcp" label={`prod-gcp (${instances.filter((i) => i.env === "prod-gcp").length})`} />
          <ToggleGroup.Item value="dev-gcp" label={`dev-gcp (${instances.filter((i) => i.env === "dev-gcp").length})`} />
        </ToggleGroup>
        <div className={styles.filterSearch}>
          <Search label="Søk etter database" hideLabel size="small" variant="simple" placeholder="Søk på navn, tier eller versjon (f.eks. pg13)" value={query} onChange={setQuery} />
        </div>
        <span className={styles.filterCount}>
          Viser <strong className="tabular">{filtered.length}</strong> av {instances.length} instanser
        </span>
      </div>

      <Section kicker="Postgres-livssyklus" title="Versjonshelse" lead="Hver bane er en PostgreSQL-hovedversjon fra lansering til community-EOL. Instansene står plassert på versjonen de kjører i dag.">
        <Reveal>
          <Card>
            <HealthSummary instances={filtered} />
            <VersionSwimlane versions={versions} instances={filtered} today={today} onSelect={setSelectedId} />
          </Card>
        </Reveal>
      </Section>

      <Section
        id="anbefalinger"
        kicker="Hva bør vi gjøre?"
        title="Anbefalte oppgraderinger"
        lead="Prioritert etter hvor nær EOL versjonen er og hvor mye data som berøres. Anbefalt mål er POSTGRES_17 – PG18 er testet i eux-rina-case-search-q2."
      >
        <div className={styles.recList}>
          {visibleRecs.map((r, idx) => (
            <RecommendationItem
              key={r.app}
              rec={r}
              index={idx}
              instances={instances}
              done={doneApps.includes(r.app)}
              onPlan={() => setPlanApp(r.app)}
              onSelect={setSelectedId}
            />
          ))}
          {visibleRecs.length === 0 ? (
            <div className="card empty">
              <DatabaseIcon aria-hidden style={{ fontSize: "2rem" }} />
              <div>Ingen oppgraderinger trengs i dette utvalget 🎉</div>
            </div>
          ) : null}
        </div>
      </Section>

      <Section
        kicker="Oversikt"
        title="Instanser"
        lead="Klikk på en instans for størrelseshistorikk, tilkoblinger og største tabeller."
        actions={
          <ToggleGroup size="small" value={view} onChange={(v) => setView(v as ViewMode)} aria-label="Visning">
            <ToggleGroup.Item value="kort" icon={<SquareGridIcon aria-hidden />} label="Kort" />
            <ToggleGroup.Item value="tabell" icon={<TableIcon aria-hidden />} label="Tabell" />
          </ToggleGroup>
        }
      >
        <AnimatePresence mode="wait">
          {view === "kort" ? (
            <motion.div key="kort" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
              <motion.div layout className={styles.instGrid}>
                <AnimatePresence>
                  {filtered.map((i, idx) => (
                    <motion.div
                      key={i.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96, y: 14 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4, delay: Math.min(idx, 12) * 0.03, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <InstanceCard inst={i} today={today} onOpen={() => setSelectedId(i.id)} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="tabell" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
              <InstanceTable list={filtered} today={today} onOpen={setSelectedId} />
            </motion.div>
          )}
        </AnimatePresence>
        {filtered.length === 0 ? <div className="card empty">Ingen instanser matcher søket.</div> : null}
      </Section>

      <Section id="storrelse" kicker="Statistikk" title="Størrelse og vekst" lead="Hvor stor er hver database, hvor fort vokser de, og når går disken full med dagens vekst?">
        <SizeStats instances={filtered} months={months} apps={apps} onSelect={setSelectedId} />
      </Section>

      <AnimatePresence>
        {selected ? <InstanceDrawer key={selected.id} inst={selected} months={months} today={today} onClose={() => setSelectedId(null)} /> : null}
      </AnimatePresence>

      <UpgradePlanModal
        key={planApp ?? "none"}
        rec={planRec}
        instances={instances}
        onClose={() => setPlanApp(null)}
        onDone={(app) => {
          setDoneApps((prev) => (prev.includes(app) ? prev : [...prev, app]));
          setPlanApp(null);
          push("Oppgave opprettet i Jira", `Oppgradering av ${app} til POSTGRES_17 er lagt i backloggen til team eessibasis.`, "success");
        }}
      />
      {toasts}
    </>
  );
}
