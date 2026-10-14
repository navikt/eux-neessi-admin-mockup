import { COUNTRIES, type CountryCode } from "@/lib/mock/reference";
import { createRng, hashSeed, hex, int, pick, weightedPick } from "@/lib/mock/random";

/** Deterministic, client-safe mock data used by the individual tools. */

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/* ------------------------------ Publiser SED-hendelser ------------------------------ */

export const TOPICS = [
  {
    id: "eessibasis.sedmottatt-v1",
    label: "SED mottatt",
    description: "Trigger journalføring, oppgave og varsling for innkommende SED-er.",
  },
  {
    id: "eessibasis.sedsendt-v1",
    label: "SED sendt",
    description: "Trigger journalføring og statistikk for SED-er Norge har sendt.",
  },
] as const;
export type TopicId = (typeof TOPICS)[number]["id"];

export function exampleLines(): string {
  const rng = createRng("publiser-eksempel");
  const make = (version?: number) =>
    `${int(rng, 1_200_000, 1_699_999)}_${hex(rng, 32)}_${version ?? weightedPick(rng, [1, 2, 3], (v) => (v === 1 ? 6 : v === 2 ? 2 : 1))}`;
  // Ten lines that publish fine, one that RINA does not know and one with a version that does not exist,
  // so the example demonstrates a PARTIAL_SUCCESS.
  const lines: string[] = [];
  let missing: string | null = null;
  while (lines.length < 10 || !missing) {
    const line = make();
    const ok = publishOutcome(line).ok;
    if (ok && lines.length < 10) lines.push(line);
    else if (!ok && !missing) missing = line;
  }
  lines.splice(3, 0, missing);
  lines.splice(7, 0, make(4));
  // Sprinkle in mistakes the validator should catch.
  lines.splice(4, 0, lines[1]);
  lines.splice(8, 0, `${int(rng, 1_200_000, 1_699_999)}_${hex(rng, 31)}_1`);
  lines.splice(11, 0, `SAK-48211_${hex(rng, 32)}_2`);
  return lines.join("\n");
}

const PUBLISH_FAILURES = [
  "Fant ikke dokument i RINA",
  "Versjon finnes ikke",
  "RINA-saken er arkivert",
  "Tidsavbrudd mot RINA CPI (504)",
  "Dokumentet mangler vedlegg i RINA",
];

export function publishOutcome(line: string): { ok: true; partition: number; offset: number } | { ok: false; reason: string } {
  const rng = createRng(hashSeed(line));
  if (Number(line.split("_")[2]) > 3) return { ok: false, reason: "Versjon finnes ikke" };
  if (rng() < 0.82) return { ok: true, partition: int(rng, 0, 5), offset: int(rng, 1_200_000, 1_990_000) };
  return { ok: false, reason: pick(rng, PUBLISH_FAILURES) };
}

/* ------------------------------ Synkroniser RINA-sak ------------------------------ */

export interface FieldDiff {
  field: string;
  before: string;
  after: string;
}

export function syncDiff(rinasakId: string): FieldDiff[] {
  const rng = createRng(`sync-${rinasakId}`);
  const candidates: FieldDiff[] = [
    { field: "Status", before: "open", after: pick(rng, ["closed", "archived"]) },
    { field: "Antall dokumenter", before: String(int(rng, 3, 6)), after: String(int(rng, 7, 11)) },
    { field: "Sist oppdatert i RINA", before: "02.10.2026 13:41", after: "14.10.2026 08:12" },
    { field: "Motpart", before: "SE:FK (Försäkringskassan)", after: "SE:FK, DK:ATP" },
    { field: "Tildelt enhet", before: "4303", after: pick(rng, ["4530", "4862", "0393"]) },
    { field: "Fnr på sak", before: "—", after: `${int(rng, 10, 28)}0${int(rng, 1, 9)}8${int(rng, 10_000, 99_999)}` },
    { field: "Siste SED", before: "H001", after: pick(rng, ["H002", "H020", "X009"]) },
  ];
  return candidates.filter(() => rng() < 0.55).slice(0, 5);
}

/* ------------------------------ Spill av DLQ ------------------------------ */

export const CONSUMER_GROUPS = ["eux-journal", "eux-oppgave", "eux-nav-rinasak"] as const;
export type ConsumerGroup = (typeof CONSUMER_GROUPS)[number];

export interface DlqMessage {
  id: string;
  group: ConsumerGroup;
  topic: string;
  partition: number;
  offset: number;
  rinasakId: string;
  sedType: string;
  error: string;
  attempts: number;
  minutesAgo: number;
}

const DLQ_ERRORS: Record<ConsumerGroup, string[]> = {
  "eux-journal": [
    "Dokarkiv svarte 409 Conflict",
    "Mangler fnr – kan ikke journalføre",
    "SAF timeout etter 30 s",
    "Ugyldig tema for BUC-type",
  ],
  "eux-oppgave": ["Oppgave-API svarte 503", "Fant ingen enhet for tema UFM", "Duplikat oppgave"],
  "eux-nav-rinasak": ["Låsekonflikt i eux-nav-rinasak-db", "RINA CPI-sesjon utløpt", "Uventet null i documentId"],
};

export function dlqMessages(): DlqMessage[] {
  const rng = createRng("dlq-v2");
  const sizes: Record<ConsumerGroup, number> = { "eux-journal": 9, "eux-oppgave": 5, "eux-nav-rinasak": 4 };
  const out: DlqMessage[] = [];
  for (const group of CONSUMER_GROUPS) {
    for (let i = 0; i < sizes[group]; i++) {
      out.push({
        id: `${group}-${i}`,
        group,
        topic: pick(rng, ["eessibasis.sedmottatt-v1", "eessibasis.sedsendt-v1"]),
        partition: int(rng, 0, 5),
        offset: int(rng, 1_400_000, 1_990_000),
        rinasakId: String(int(rng, 1_200_000, 1_699_999)),
        sedType: pick(rng, ["H001", "A003", "P2000", "F001", "U002", "S080", "X009", "A009", "P8000"]),
        error: pick(rng, DLQ_ERRORS[group]),
        attempts: int(rng, 3, 8),
        minutesAgo: int(rng, 12, 60 * 72),
      });
    }
  }
  return out.sort((a, b) => a.minutesAgo - b.minutesAgo);
}

export function replayOutcome(msg: DlqMessage, salt: number): boolean {
  return createRng(`${msg.id}-${salt}`)() < 0.8;
}

/* ------------------------------ Slett usendte RINA-saker ------------------------------ */

export interface UnsentCase {
  rinasakId: string;
  buc: string;
  ageDays: number;
  createdBy: string;
  enhet: string;
  drafts: number;
}

export function unsentCases(): UnsentCase[] {
  const rng = createRng("usendte-saker");
  const people = ["K. Bakke", "A. Nordvik", "M. Solheim", "E. Haugen", "S. Dahl", "H. Berg", "L. Strand", "T. Moen"];
  const out: UnsentCase[] = [];
  for (let i = 0; i < 64; i++) {
    out.push({
      rinasakId: String(int(rng, 1_500_000, 1_699_999)),
      buc: pick(rng, ["LA_BUC_02", "H_BUC_01", "P_BUC_02", "FB_BUC_01", "UB_BUC_01", "S_BUC_24", "AW_BUC_06", "H_BUC_07"]),
      ageDays: Math.round(5 + rng() ** 1.6 * 360),
      createdBy: pick(rng, people),
      enhet: pick(rng, ["4530", "0393", "4862", "4402", "4489", "4303"]),
      drafts: int(rng, 0, 2),
    });
  }
  return out.sort((a, b) => b.ageDays - a.ageDays);
}

/* ------------------------------ Tøm cache ------------------------------ */

export interface CacheInfo {
  id: string;
  name: string;
  description: string;
  owner: string;
  entries: number;
  sizeMb: number;
  hitRate: number;
  ttl: string;
  color: string;
}

export const CACHES: CacheInfo[] = [
  {
    id: "institusjoner",
    name: "Institusjoner",
    description: "Institusjonskatalogen fra CEF, brukt ved valg av mottaker",
    owner: "eux-rina-api",
    entries: 14_872,
    sizeMb: 38.4,
    hitRate: 0.987,
    ttl: "24 t",
    color: "#059669",
  },
  {
    id: "kodeverk",
    name: "Kodeverk",
    description: "EESSI-kodeverk, land, valuta og ytelsestyper",
    owner: "eux-neessi",
    entries: 6_214,
    sizeMb: 11.2,
    hitRate: 0.996,
    ttl: "12 t",
    color: "#d97706",
  },
  {
    id: "saksbehandlere",
    name: "Saksbehandlere",
    description: "Navn, enhet og tilganger fra Entra ID og NOM",
    owner: "eux-neessi",
    entries: 2_431,
    sizeMb: 4.7,
    hitRate: 0.941,
    ttl: "30 min",
    color: "#2563eb",
  },
];

/* ------------------------------ Institusjonskatalog ------------------------------ */

export interface CatalogDiff {
  code: CountryCode;
  name: string;
  added: number;
  changed: number;
  removed: number;
  total: number;
}

export function catalogDiff(source: string, salt: number): CatalogDiff[] {
  const rng = createRng(`katalog-${source}-${salt}`);
  return COUNTRIES.map((c) => {
    const total = int(rng, 40, 1400);
    const busy = rng() < 0.35;
    return {
      code: c.code,
      name: c.name,
      total,
      added: busy ? int(rng, 1, 9) : rng() < 0.2 ? 1 : 0,
      changed: busy ? int(rng, 2, 24) : rng() < 0.35 ? int(rng, 1, 3) : 0,
      removed: busy && rng() < 0.5 ? int(rng, 1, 4) : 0,
    };
  });
}
