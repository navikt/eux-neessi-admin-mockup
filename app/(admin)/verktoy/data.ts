import { createRng, int, pick, weightedPick } from "@/lib/mock/random";
import type { AuditEntry, RunStatus } from "./types";

/** Mock data for the Verktøykasse page (server side): seeded audit log anchored to "now". */

const OPERATORS = ["Ragnhild Teigen", "Silje Haugland", "Torbjørn Elvestad", "Kristoffer Bakke", "Amalie Nordvik", "Jonas Lie Ruud"];
const TOPICS = ["eessibasis.sedmottatt-v1", "eessibasis.sedsendt-v1"];
const ENHETER = ["4530", "0393", "4862", "4402", "4489", "4303"];
const GROUPS = ["eux-journal", "eux-oppgave", "eux-nav-rinasak"];
const CACHES = ["institusjoner", "kodeverk", "saksbehandlere"];

interface Seeded {
  toolId: string;
  weight: number;
  make: (rng: () => number) => { params: string; summary: string; status: RunStatus; durationMs: number };
}

const rinasak = (rng: () => number) => String(int(rng, 1_100_000, 1_699_999));

const SEEDS: Seeded[] = [
  {
    toolId: "publiser-sed-hendelser",
    weight: 6,
    make: (rng) => {
      const n = int(rng, 1, 40);
      const dry = rng() < 0.2;
      const failed = dry ? 0 : rng() < 0.6 ? 0 : int(rng, 1, Math.max(1, Math.floor(n / 3)));
      const status: RunStatus = dry ? "DRY_RUN" : failed === 0 ? "SUCCESS" : failed === n ? "FAILURE" : "PARTIAL_SUCCESS";
      return {
        params: `${n} ${n === 1 ? "linje" : "linjer"} · ${pick(rng, TOPICS)}`,
        summary: dry ? `${n} gyldige, ingenting publisert` : `${n - failed} av ${n} publisert`,
        status,
        durationMs: n * int(rng, 140, 260),
      };
    },
  },
  {
    toolId: "synkroniser-rinasak",
    weight: 4,
    make: (rng) => {
      const f = int(rng, 0, 5);
      return {
        params: `rinasakId=${rinasak(rng)}`,
        summary: f === 0 ? "Allerede i synk" : `${f} felt oppdatert`,
        status: rng() < 0.08 ? "FAILURE" : "SUCCESS",
        durationMs: int(rng, 1800, 4200),
      };
    },
  },
  {
    toolId: "journalfor-sed",
    weight: 3,
    make: (rng) => ({
      params: `rinasakId=${rinasak(rng)} · enhet=${pick(rng, ENHETER)}`,
      summary: `Journalpost ${int(rng, 670_000_000, 679_999_999)} opprettet`,
      status: rng() < 0.1 ? "FAILURE" : "SUCCESS",
      durationMs: int(rng, 2200, 3800),
    }),
  },
  {
    toolId: "spill-av-dlq",
    weight: 4,
    make: (rng) => {
      const n = int(rng, 1, 12);
      const failed = rng() < 0.55 ? 0 : int(rng, 1, Math.ceil(n / 2));
      return {
        params: `${pick(rng, GROUPS)} · ${n} meldinger`,
        summary: `${n - failed} av ${n} spilt av`,
        status: failed === 0 ? "SUCCESS" : "PARTIAL_SUCCESS",
        durationMs: n * int(rng, 300, 500),
      };
    },
  },
  {
    toolId: "slett-usendte-saker",
    weight: 1.4,
    make: (rng) => {
      const days = pick(rng, [60, 90, 120, 180]);
      const n = int(rng, 4, 40);
      return {
        params: `eldre enn ${days} dager`,
        summary: `${n} saker slettet`,
        status: "SUCCESS",
        durationMs: n * int(rng, 120, 200),
      };
    },
  },
  {
    toolId: "tom-cache",
    weight: 2.5,
    make: (rng) => {
      const c = CACHES.filter(() => rng() < 0.5);
      const chosen = c.length ? c : [pick(rng, CACHES)];
      return {
        params: chosen.join(", "),
        summary: `${new Intl.NumberFormat("nb-NO").format(int(rng, 800, 24_000))} nøkler tømt`,
        status: "SUCCESS",
        durationMs: int(rng, 900, 2400),
      };
    },
  },
  {
    toolId: "institusjonskatalog",
    weight: 1.6,
    make: (rng) => ({
      params: `kilde=${rng() < 0.7 ? "CEF" : "RINA"} · alle land`,
      summary: `+${int(rng, 2, 30)} / ~${int(rng, 10, 80)} / −${int(rng, 0, 9)} institusjoner`,
      status: rng() < 0.12 ? "PARTIAL_SUCCESS" : "SUCCESS",
      durationMs: int(rng, 6000, 11000),
    }),
  },
];

export interface VerktoyData {
  nowMs: number;
  audit: AuditEntry[];
}

export function getVerktoyData(): VerktoyData {
  // Round to the minute so the seeded log is stable within a minute.
  const nowMs = Math.floor(Date.now() / 60_000) * 60_000;
  const rng = createRng(`verktoy-audit-${Math.floor(nowMs / 86_400_000)}`);
  const audit: AuditEntry[] = [];
  let minutesAgo = int(rng, 25, 90);
  for (let i = 0; i < 26; i++) {
    const seed = weightedPick(rng, SEEDS, (s) => s.weight);
    const made = seed.make(rng);
    // Work happens within office hours-ish; jumps grow as we go back in time.
    audit.push({
      id: `seed-${i}`,
      atMs: nowMs - minutesAgo * 60_000,
      who: weightedPick(rng, OPERATORS, (o) => (o === "Torbjørn Elvestad" ? 3 : o === "Silje Haugland" ? 2 : 1)),
      toolId: seed.toolId,
      ...made,
    });
    minutesAgo += int(rng, 40, 60 * 26);
  }
  return { nowMs, audit };
}
