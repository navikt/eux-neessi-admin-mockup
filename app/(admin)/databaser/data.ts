/**
 * Mock data for the database view: GCP Cloud SQL Postgres instances for the EUX apps in the
 * `eessibasis` namespace. Deterministic — the same fake world on every request.
 */
import { addDaysIso, diffDays } from "@/lib/mock/clock";
import { clamp, createRng, int, normal, type Rng } from "@/lib/mock/random";

export type PgVersion = 13 | 14 | 15 | 16 | 17 | 18;
export type Env = "prod-gcp" | "dev-gcp";
export type Variant = "prod" | "dev" | "q1" | "q2";
export type VersionHealth = "eol" | "soon" | "ok" | "newest";
export type InstanceStatus = "RUNNABLE" | "MAINTENANCE";
export type Priority = "kritisk" | "hoy" | "planlegg";

export interface PgVersionInfo {
  version: PgVersion;
  released: string;
  eol: string;
  daysLeft: number;
  health: VersionHealth;
}

export interface DbTable {
  name: string;
  rows: number;
  dataGb: number;
  indexGb: number;
}

export interface DbInstance {
  id: string;
  name: string;
  app: string;
  appColor: string;
  env: Env;
  variant: Variant;
  namespace: string;
  version: PgVersion;
  typeLabel: string;
  tier: string;
  vcpu: number;
  memoryGb: number;
  region: string;
  status: InstanceStatus;
  diskGb: number;
  usedGb: number;
  diskAutoresize: boolean;
  /** 12 monthly samples, oldest first. */
  history: number[];
  growthGbPerMonth: number;
  growthPct: number;
  /** Days until disk is full at current growth, null if shrinking/flat. */
  daysUntilFull: number | null;
  fullDateIso: string | null;
  connections: number;
  maxConnections: number;
  cpuPct: number;
  memPct: number;
  /** 24 hourly samples for the last day. */
  connections24h: number[];
  cpu24h: number[];
  highAvailability: boolean;
  backupsEnabled: boolean;
  lastBackupIso: string;
  backupRetentionDays: number;
  pointInTimeRecovery: boolean;
  flywayVersion: number;
  flywayDescription: string;
  flywayDate: string;
  tables: DbTable[];
  health: VersionHealth;
  eol: string;
  daysToEol: number;
}

export interface UpgradeRecommendation {
  app: string;
  appColor: string;
  priority: Priority;
  instanceIds: string[];
  fromVersions: PgVersion[];
  worstVersion: PgVersion;
  target: PgVersion;
  reason: string;
  detail: string;
  totalGb: number;
  estDowntimeMin: number;
  hasProd: boolean;
}

export interface DatabaseOverview {
  today: string;
  months: { key: string; label: string }[];
  versions: PgVersionInfo[];
  instances: DbInstance[];
  recommendations: UpgradeRecommendation[];
  apps: { app: string; color: string }[];
}

export const TARGET_VERSION: PgVersion = 17;

const VERSIONS: { version: PgVersion; released: string; eol: string }[] = [
  { version: 13, released: "2020-09-24", eol: "2025-11-13" },
  { version: 14, released: "2021-09-30", eol: "2026-11-12" },
  { version: 15, released: "2022-10-13", eol: "2027-11-11" },
  { version: 16, released: "2023-09-14", eol: "2028-11-09" },
  { version: 17, released: "2024-09-26", eol: "2029-11-08" },
  { version: 18, released: "2025-09-25", eol: "2030-11-14" },
];

export const APP_COLORS: Record<string, string> = {
  "eux-nav-rinasak": "#2f6fb5",
  "eux-rina-case-search": "#8c7ab0",
  "eux-journal": "#3f8f8a",
  "eux-oppgave": "#c98a2b",
  "eux-person-oppdatering": "#4a84c4",
  "eux-saksbehandler": "#c0765d",
  "eux-avslutt-rinasaker": "#3a8a5f",
  "eux-slett-usendte-rinasaker": "#c4505c",
  "eux-portal-core": "#7f9a4a",
};

const TIERS: Record<string, { vcpu: number; memoryGb: number; maxConnections: number }> = {
  "db-f1-micro": { vcpu: 1, memoryGb: 0.6, maxConnections: 25 },
  "db-g1-small": { vcpu: 1, memoryGb: 1.7, maxConnections: 50 },
  "db-custom-1-3840": { vcpu: 1, memoryGb: 3.75, maxConnections: 100 },
  "db-custom-2-7680": { vcpu: 2, memoryGb: 7.5, maxConnections: 200 },
  "db-custom-4-15360": { vcpu: 4, memoryGb: 15, maxConnections: 400 },
};

interface Spec {
  app: string;
  variant: Variant;
  v: PgVersion;
  tier: string;
  disk: number;
  used: number;
  growth: number;
  ha?: boolean;
  pitr?: boolean;
  autoresize?: boolean;
  status?: InstanceStatus;
  load?: number;
  flywayAhead?: number;
  backupDaysAgo?: number;
}

const SPECS: Spec[] = [
  { app: "eux-nav-rinasak", variant: "prod", v: 14, tier: "db-custom-4-15360", disk: 250, used: 181.6, growth: 4.6, ha: true, pitr: true, autoresize: true, load: 0.42 },
  { app: "eux-nav-rinasak", variant: "q1", v: 14, tier: "db-custom-1-3840", disk: 40, used: 23.4, growth: 0.62 },
  { app: "eux-nav-rinasak", variant: "q2", v: 16, tier: "db-custom-1-3840", disk: 40, used: 19.8, growth: 0.55, flywayAhead: 1 },
  { app: "eux-journal", variant: "prod", v: 13, tier: "db-custom-2-7680", disk: 100, used: 64.2, growth: 1.9, ha: true, pitr: true, load: 0.33 },
  { app: "eux-journal", variant: "q1", v: 13, tier: "db-custom-1-3840", disk: 20, used: 8.1, growth: 0.21 },
  { app: "eux-journal", variant: "q2", v: 14, tier: "db-custom-1-3840", disk: 20, used: 6.9, growth: 0.18 },
  { app: "eux-oppgave", variant: "prod", v: 15, tier: "db-custom-2-7680", disk: 60, used: 38.4, growth: 1.2, ha: true, pitr: true, load: 0.27 },
  { app: "eux-oppgave", variant: "q1", v: 15, tier: "db-custom-1-3840", disk: 20, used: 5.2, growth: 0.11 },
  { app: "eux-oppgave", variant: "q2", v: 15, tier: "db-custom-1-3840", disk: 20, used: 4.9, growth: 0.1, status: "MAINTENANCE", backupDaysAgo: 2 },
  { app: "eux-saksbehandler", variant: "prod", v: 16, tier: "db-custom-1-3840", disk: 20, used: 6.3, growth: 0.15, ha: false, pitr: true, load: 0.18 },
  { app: "eux-saksbehandler", variant: "dev", v: 16, tier: "db-f1-micro", disk: 10, used: 1.1, growth: 0.02 },
  { app: "eux-rina-case-search", variant: "prod", v: 17, tier: "db-custom-4-15360", disk: 100, used: 91.8, growth: 3.4, ha: true, pitr: true, autoresize: false, load: 0.55 },
  { app: "eux-rina-case-search", variant: "q1", v: 17, tier: "db-custom-1-3840", disk: 30, used: 14.2, growth: 0.4, flywayAhead: 1 },
  { app: "eux-rina-case-search", variant: "q2", v: 18, tier: "db-custom-1-3840", disk: 30, used: 12.7, growth: 0.36, flywayAhead: 1 },
  { app: "eux-avslutt-rinasaker", variant: "prod", v: 14, tier: "db-custom-1-3840", disk: 10, used: 4.2, growth: 0.08, ha: false, pitr: true, load: 0.1 },
  { app: "eux-avslutt-rinasaker", variant: "dev", v: 14, tier: "db-f1-micro", disk: 10, used: 0.9, growth: 0.01 },
  { app: "eux-slett-usendte-rinasaker", variant: "prod", v: 13, tier: "db-custom-1-3840", disk: 10, used: 2.1, growth: -0.03, ha: false, pitr: true, load: 0.08 },
  { app: "eux-slett-usendte-rinasaker", variant: "dev", v: 15, tier: "db-f1-micro", disk: 10, used: 0.6, growth: -0.01 },
  { app: "eux-person-oppdatering", variant: "prod", v: 16, tier: "db-custom-2-7680", disk: 50, used: 21.4, growth: 0.9, ha: true, pitr: true, load: 0.3 },
  { app: "eux-person-oppdatering", variant: "dev", v: 17, tier: "db-custom-1-3840", disk: 10, used: 3.2, growth: 0.06 },
  { app: "eux-portal-core", variant: "prod", v: 17, tier: "db-custom-1-3840", disk: 10, used: 1.4, growth: 0.05, ha: true, pitr: false, load: 0.12 },
  { app: "eux-portal-core", variant: "dev", v: 17, tier: "db-f1-micro", disk: 10, used: 0.3, growth: 0.01 },
];

const FLYWAY: Record<string, { version: number; description: string; date: string; nextDescription: string }> = {
  "eux-nav-rinasak": { version: 112, description: "indeks på sed_hendelse.rinasak_id", date: "2026-10-02", nextDescription: "fagsak_type på fagsak" },
  "eux-journal": { version: 47, description: "retry_count på feilet_journalfoering", date: "2026-08-19", nextDescription: "" },
  "eux-oppgave": { version: 63, description: "partisjoner oppgave_hendelse per år", date: "2026-09-24", nextDescription: "" },
  "eux-saksbehandler": { version: 18, description: "sortering på favoritt_sak", date: "2026-06-03", nextDescription: "" },
  "eux-rina-case-search": { version: 89, description: "trigram-indeks på deltaker_navn", date: "2026-10-07", nextDescription: "fulltekst på dokument_tittel" },
  "eux-avslutt-rinasaker": { version: 12, description: "frist på avslutning_kandidat", date: "2026-03-11", nextDescription: "" },
  "eux-slett-usendte-rinasaker": { version: 9, description: "audit-tabell slettet_rinasak", date: "2025-12-02", nextDescription: "" },
  "eux-person-oppdatering": { version: 31, description: "status på pdl_oppdatering", date: "2026-09-02", nextDescription: "" },
  "eux-portal-core": { version: 24, description: "kanal på varsel", date: "2026-09-29", nextDescription: "" },
};

/** Table name → [share of data, bytes per row]. */
const TABLES: Record<string, [string, number, number][]> = {
  "eux-nav-rinasak": [
    ["dokument", 0.36, 2_400],
    ["sed_hendelse", 0.3, 880],
    ["rinasak", 0.13, 610],
    ["sak_status_historikk", 0.09, 240],
    ["fagsak", 0.07, 420],
    ["initiell_fagsak", 0.05, 380],
  ],
  "eux-journal": [
    ["journalpost", 0.52, 1_150],
    ["journalfoering_hendelse", 0.31, 520],
    ["feilet_journalfoering", 0.1, 1_900],
    ["dokument_variant", 0.07, 300],
  ],
  "eux-oppgave": [
    ["oppgave_hendelse", 0.48, 640],
    ["oppgave", 0.34, 820],
    ["tildeling", 0.12, 180],
    ["frist_varsel", 0.06, 150],
  ],
  "eux-saksbehandler": [
    ["saksbehandler_innstilling", 0.44, 1_400],
    ["favoritt_sak", 0.33, 120],
    ["sist_besokt", 0.23, 160],
  ],
  "eux-rina-case-search": [
    ["rina_case", 0.31, 1_250],
    ["document", 0.29, 1_700],
    ["participant", 0.16, 320],
    ["case_search_token", 0.24, 96],
  ],
  "eux-avslutt-rinasaker": [
    ["avslutning_kandidat", 0.58, 260],
    ["avsluttet_rinasak", 0.42, 340],
  ],
  "eux-slett-usendte-rinasaker": [
    ["slett_kandidat", 0.47, 220],
    ["slettet_rinasak", 0.53, 300],
  ],
  "eux-person-oppdatering": [
    ["person_hendelse", 0.61, 720],
    ["pdl_oppdatering", 0.32, 540],
    ["ident_historikk", 0.07, 110],
  ],
  "eux-portal-core": [
    ["bruker_innstilling", 0.38, 900],
    ["varsel", 0.42, 640],
    ["lenke", 0.2, 380],
  ],
};

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

function versionInfo(today: string): PgVersionInfo[] {
  const newest = Math.max(...VERSIONS.map((v) => v.version));
  return VERSIONS.map((v) => {
    const daysLeft = diffDays(today, v.eol);
    const health: VersionHealth =
      daysLeft < 0 ? "eol" : daysLeft < 183 ? "soon" : v.version === newest ? "newest" : "ok";
    return { ...v, daysLeft, health };
  });
}

function monthsBack(today: string): { key: string; label: string }[] {
  const [y, m] = today.split("-").map(Number);
  const fmt = new Intl.DateTimeFormat("nb-NO", { month: "short", year: "2-digit", timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (11 - i), 1));
    return { key: d.toISOString().slice(0, 7), label: fmt.format(d).replace(".", "") };
  });
}

function hourly(rng: Rng, base: number, peak: number, max: number): number[] {
  return Array.from({ length: 24 }, (_, h) => {
    const work = h >= 7 && h <= 16 ? Math.sin(((h - 7) / 9) * Math.PI) : 0;
    const batch = h === 2 || h === 3 ? 0.35 : 0;
    const v = base + (peak - base) * (work * 0.9 + batch) + normal(rng, 0, Math.max(1, base * 0.08));
    return Math.round(clamp(v, 0, max));
  });
}

function buildInstance(spec: Spec, today: string, versions: PgVersionInfo[]): DbInstance {
  const rng = createRng(`db-${spec.app}-${spec.variant}`);
  const isProd = spec.variant === "prod";
  const env: Env = isProd ? "prod-gcp" : "dev-gcp";
  const name = spec.variant === "q1" || spec.variant === "q2" ? `${spec.app}-${spec.variant}` : spec.app;
  const tier = TIERS[spec.tier];
  const vi = versions.find((v) => v.version === spec.v)!;

  // 12 months of size history, ending at today's size.
  const history: number[] = [];
  let size = spec.used;
  for (let i = 0; i < 12; i++) {
    history.unshift(round(Math.max(0.1, size), 2));
    const g = spec.growth * (1 + normal(rng, 0, 0.18));
    size -= g;
  }
  const growthPct = history[0] > 0 ? ((history[11] - history[0]) / history[0]) * 100 : 0;
  const daysUntilFull = spec.growth > 0.001 ? Math.round(((spec.disk - spec.used) / spec.growth) * 30.4) : null;

  const load = spec.load ?? 0.04 + rng() * 0.08;
  const maxConn = tier.maxConnections;
  const conns24 = hourly(rng, maxConn * load * 0.35, maxConn * load * 1.15, maxConn);
  const connections = Math.max(2, Math.round(maxConn * load * (0.9 + rng() * 0.2)));
  const cpuPct = round(clamp(load * 85 + normal(rng, 0, 4), 2, 92), 0);
  const cpu24 = hourly(rng, cpuPct * 0.35, cpuPct * 1.1, 100);

  const backupHour = int(rng, 1, 2);
  const backupMin = int(rng, 2, 48);
  const backupDay = addDaysIso(today, -(spec.backupDaysAgo ?? 0));
  const lastBackupIso = `${backupDay}T${String(backupHour).padStart(2, "0")}:${String(backupMin).padStart(2, "0")}:00Z`;

  const fw = FLYWAY[spec.app];
  const ahead = spec.flywayAhead ?? 0;
  const flywayVersion = fw.version + ahead;
  const flywayDescription = ahead ? fw.nextDescription : fw.description;
  const flywayDate = ahead ? addDaysIso(today, -int(rng, 2, 6)) : fw.date;

  const dataTotal = spec.used * 0.97;
  const tables: DbTable[] = TABLES[spec.app].map(([tname, share, bytes]) => {
    const total = dataTotal * share;
    const idxShare = 0.18 + rng() * 0.2;
    return {
      name: tname,
      rows: Math.round(((total * (1 - idxShare)) * 1e9) / bytes),
      dataGb: round(total * (1 - idxShare), 2),
      indexGb: round(total * idxShare, 2),
    };
  });
  tables.push({ name: "flyway_schema_history", rows: flywayVersion, dataGb: 0.0001, indexGb: 0.00004 });
  tables.sort((a, b) => b.dataGb + b.indexGb - (a.dataGb + a.indexGb));

  return {
    id: `${env}/${name}`,
    name,
    app: spec.app,
    appColor: APP_COLORS[spec.app],
    env,
    variant: spec.variant,
    namespace: "eessibasis",
    version: spec.v,
    typeLabel: `POSTGRES_${spec.v}`,
    tier: spec.tier,
    vcpu: tier.vcpu,
    memoryGb: tier.memoryGb,
    region: "europe-north1",
    status: spec.status ?? "RUNNABLE",
    diskGb: spec.disk,
    usedGb: spec.used,
    diskAutoresize: spec.autoresize ?? false,
    history,
    growthGbPerMonth: spec.growth,
    growthPct: round(growthPct, 1),
    daysUntilFull,
    fullDateIso: daysUntilFull !== null ? addDaysIso(today, daysUntilFull) : null,
    connections,
    maxConnections: maxConn,
    cpuPct,
    memPct: round(clamp(35 + load * 80 + normal(rng, 0, 5), 18, 94), 0),
    connections24h: conns24,
    cpu24h: cpu24,
    highAvailability: spec.ha ?? false,
    backupsEnabled: true,
    lastBackupIso,
    backupRetentionDays: isProd ? 14 : 7,
    pointInTimeRecovery: spec.pitr ?? false,
    flywayVersion,
    flywayDescription,
    flywayDate,
    tables,
    health: vi.health,
    eol: vi.eol,
    daysToEol: vi.daysLeft,
  };
}

const MONTHS_NB = ["jan.", "feb.", "mars", "apr.", "mai", "juni", "juli", "aug.", "sep.", "okt.", "nov.", "des."];
const monthYear = (iso: string) => `${MONTHS_NB[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

function recommendations(instances: DbInstance[], versions: PgVersionInfo[]): UpgradeRecommendation[] {
  const byApp = new Map<string, DbInstance[]>();
  for (const inst of instances) {
    const info = versions.find((v) => v.version === inst.version)!;
    const needs = info.health === "eol" || info.health === "soon" || inst.version < TARGET_VERSION - 1;
    if (!needs) continue;
    byApp.set(inst.app, [...(byApp.get(inst.app) ?? []), inst]);
  }
  const rank: Record<Priority, number> = { kritisk: 0, hoy: 1, planlegg: 2 };
  const recs: UpgradeRecommendation[] = [];
  for (const [app, list] of byApp) {
    const worst = Math.min(...list.map((i) => i.version)) as PgVersion;
    const info = versions.find((v) => v.version === worst)!;
    const priority: Priority = info.health === "eol" ? "kritisk" : info.health === "soon" ? "hoy" : "planlegg";
    const eolDate = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
      new Date(`${info.eol}T00:00:00Z`),
    );
    const reason =
      priority === "kritisk"
        ? `PG${worst} er EOL siden ${monthYear(info.eol)}`
        : priority === "hoy"
          ? `PG${worst} når EOL ${eolDate} – om ${info.daysLeft} dager`
          : `PG${worst} når EOL ${monthYear(info.eol)} – planlegg i god tid`;
    const detail =
      priority === "kritisk"
        ? `Ingen sikkerhetsoppdateringer på ${Math.round(-info.daysLeft / 30.4)} måneder. Google Cloud SQL tar betalt for utvidet støtte.`
        : priority === "hoy"
          ? "Etter EOL kommer det ingen sikkerhetsrettinger fra PostgreSQL-prosjektet. Oppgrader før fristen."
          : "Fortsatt støttet, men to hovedversjoner bak. Ta det sammen med neste planlagte vedlikehold.";
    const totalGb = round(list.reduce((s, i) => s + i.usedGb, 0), 1);
    const prodGb = list.filter((i) => i.env === "prod-gcp").reduce((s, i) => s + i.usedGb, 0);
    recs.push({
      app,
      appColor: APP_COLORS[app],
      priority,
      instanceIds: list.sort((a, b) => (a.env === b.env ? a.name.localeCompare(b.name) : a.env === "dev-gcp" ? -1 : 1)).map((i) => i.id),
      fromVersions: [...new Set(list.map((i) => i.version))].sort() as PgVersion[],
      worstVersion: worst,
      target: TARGET_VERSION,
      reason,
      detail,
      totalGb,
      estDowntimeMin: Math.round(6 + Math.max(prodGb, totalGb * 0.3) * 0.14),
      hasProd: list.some((i) => i.env === "prod-gcp"),
    });
  }
  return recs.sort((a, b) => rank[a.priority] - rank[b.priority] || b.totalGb - a.totalGb);
}

export function getDatabaseOverview(today: string): DatabaseOverview {
  const versions = versionInfo(today);
  const instances = SPECS.map((s) => buildInstance(s, today, versions));
  return {
    today,
    months: monthsBack(today),
    versions,
    instances,
    recommendations: recommendations(instances, versions),
    apps: Object.entries(APP_COLORS).map(([app, color]) => ({ app, color })),
  };
}
