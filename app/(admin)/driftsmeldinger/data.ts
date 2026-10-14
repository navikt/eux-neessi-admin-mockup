import { ENHETER } from "@/lib/mock/reference";
import { addDaysIso, isoToUtcDay, weekdayOf } from "@/lib/mock/clock";
import { createRng, int, type Rng } from "@/lib/mock/random";
import { getUsers } from "@/lib/mock/users";
import {
  addMinutes,
  fmtLongDay,
  minutesBetween,
  statusOf,
  type Driftsmelding,
  type DriftsmeldingerData,
  type EnhetReach,
  type Prefill,
  type ReadStats,
  type Severity,
} from "./model";

interface Seed {
  id: string;
  title: string | ((ctx: SeedCtx) => string);
  body: string | ((ctx: SeedCtx) => string);
  severity: Severity;
  audience: "alle" | string[];
  /** [dayOffset, "HH:MM"] relative to today */
  start: [number, string];
  end: [number, string] | null;
  dismissible: boolean;
  createdBy: string;
  /** Minutes before start the message was created */
  createdLead: number;
  /** Deactivated this many minutes after start */
  deactivatedAfter?: number;
}

interface SeedCtx {
  saturday: string;
}

const SEEDS: Seed[] = [
  {
    id: "dm-2041",
    title: "Treg innlasting av saker",
    body: "Vi opplever treg innlasting av saksoversikten og enkelte SED-er i nEESSI. Feilen er meldt videre, og vi jobber med å finne årsaken. Du kan jobbe som normalt, men må regne med ventetid.",
    severity: "advarsel",
    audience: "alle",
    start: [-1, "13:20"],
    end: null,
    dismissible: true,
    createdBy: "Ragnhild Teigen",
    createdLead: 4,
  },
  {
    id: "dm-2039",
    title: "Feil ved sending av H-SED-er til Tyskland",
    body: "H-SED-er til tyske institusjoner blir stående i utboksen. Ikke send på nytt – meldingene sendes automatisk når forbindelsen er gjenopprettet.",
    severity: "feil",
    audience: ["4489", "4402"],
    start: [-1, "15:10"],
    end: [2, "16:00"],
    dismissible: false,
    createdBy: "Torbjørn Elvestad",
    createdLead: 2,
  },
  {
    id: "dm-2036",
    title: "Ny versjon av nEESSI: raskere journalføring",
    body: "Journalføring av innkommende SED-er går nå direkte fra saksvisningen. Se «Hva er nytt» i menyen for detaljer.",
    severity: "info",
    audience: "alle",
    start: [-3, "08:00"],
    end: [4, "16:00"],
    dismissible: true,
    createdBy: "Silje Haugland",
    createdLead: 60 * 20,
  },
  {
    id: "dm-2043",
    title: ({ saturday }) => `RINA er nede for vedlikehold ${fmtLongDay(saturday)} kl. 08–12`,
    body: "RINA oppgraderes til versjon 2026.2. I tidsrommet kan du ikke åpne, opprette eller sende saker i nEESSI. Arbeid som ikke er lagret før kl. 08 kan gå tapt.",
    severity: "advarsel",
    audience: "alle",
    start: [1, "08:00"],
    end: [3, "12:00"],
    dismissible: true,
    createdBy: "Ragnhild Teigen",
    createdLead: 60 * 26,
  },
  {
    id: "dm-2044",
    title: "Planlagt nedetid for journalføring (databaseoppgradering)",
    body: "Databasen for journalføring oppgraderes fra PostgreSQL 13 til 17. Journalføring er utilgjengelig i opptil 30 minutter. Innkommende SED-er køes og behandles etterpå.",
    severity: "info",
    audience: ["4530", "0393", "4862", "4817"],
    start: [12, "17:00"],
    end: [12, "18:00"],
    dismissible: true,
    createdBy: "Torbjørn Elvestad",
    createdLead: 60 * 30,
  },
  {
    id: "dm-2045",
    title: "Nye kodeverk for familieytelser fra 1. desember",
    body: "Fra 1. desember tas nye koder for familieytelser i bruk i F-SED-er. Eldre utkast må oppdateres før de sendes.",
    severity: "info",
    audience: ["4862", "4817"],
    start: [33, "07:00"],
    end: [47, "16:00"],
    dismissible: true,
    createdBy: "Silje Haugland",
    createdLead: 60 * 24 * 4,
  },
  {
    id: "dm-2031",
    title: "RINA utilgjengelig",
    body: "RINA svarer ikke. Ingen saker kan åpnes eller sendes. Vi jobber med saken og oppdaterer meldingen fortløpende.",
    severity: "feil",
    audience: "alle",
    start: [-9, "09:10"],
    end: [-9, "11:45"],
    dismissible: false,
    createdBy: "Ragnhild Teigen",
    createdLead: 3,
  },
  {
    id: "dm-2027",
    title: "Forsinkelse i journalføring",
    body: "Journalposter for innkommende SED-er opprettes med opptil to timers forsinkelse. Oppgaver blir laget når journalposten er klar.",
    severity: "advarsel",
    audience: ["4530", "0393", "4862"],
    start: [-16, "10:30"],
    end: [-14, "15:00"],
    dismissible: true,
    createdBy: "Torbjørn Elvestad",
    createdLead: 12,
  },
  {
    id: "dm-2024",
    title: "Problemer med innlogging",
    body: "Noen brukere får feilmelding ved innlogging. Prøv å lukke nettleseren og logge inn på nytt.",
    severity: "feil",
    audience: "alle",
    start: [-22, "07:50"],
    end: null,
    dismissible: false,
    createdBy: "Ragnhild Teigen",
    createdLead: 5,
    deactivatedAfter: 95,
  },
  {
    id: "dm-2019",
    title: "Ny innboks for X-SED-er",
    body: "X-SED-er (administrative) vises nå i en egen fane i innboksen, slik at de ikke blandes med fagsaker.",
    severity: "info",
    audience: ["4303"],
    start: [-30, "08:00"],
    end: [-23, "16:00"],
    dismissible: true,
    createdBy: "Silje Haugland",
    createdLead: 60 * 18,
  },
  {
    id: "dm-2014",
    title: "Planlagt vedlikehold av saksdatabasen",
    body: "Saksoversikten var utilgjengelig i 20 minutter grunnet vedlikehold av databasen.",
    severity: "info",
    audience: "alle",
    start: [-41, "16:30"],
    end: [-40, "08:00"],
    dismissible: true,
    createdBy: "Torbjørn Elvestad",
    createdLead: 60 * 48,
  },
];

function nextSaturday(today: string): string {
  const wd = weekdayOf(isoToUtcDay(today));
  const delta = (5 - wd + 7) % 7 || 7;
  return addDaysIso(today, delta);
}

function at(today: string, [offset, time]: [number, string]): string {
  return `${addDaysIso(today, offset)}T${time}`;
}

function buildStats(
  rng: Rng,
  m: Omit<Driftsmelding, "stats">,
  now: string,
  activeByEnhet: Record<string, number>,
): ReadStats {
  const enheter = m.audience === "alle" ? ENHETER.map((e) => e.id) : m.audience;
  const status = statusOf(m, now);
  const stop = m.deactivatedAt ?? (m.end && m.end < now ? m.end : now);
  const elapsedH = status === "planlagt" ? 0 : Math.max(0, minutesBetween(m.start, stop) / 60);
  // Business hours matter more than wall clock, and "feil" banners get noticed faster.
  const speed = m.severity === "feil" ? 3.5 : m.severity === "advarsel" ? 7 : 12;
  const ceiling = m.severity === "feil" ? 0.97 : m.severity === "advarsel" ? 0.93 : 0.88;
  const reachFrac = elapsedH === 0 ? 0 : ceiling * (1 - Math.exp(-elapsedH / speed));

  const byEnhet: EnhetReach[] = enheter.map((id) => {
    const target = activeByEnhet[id] ?? 0;
    const jitter = 0.9 + rng() * 0.16;
    const seen = Math.min(target, Math.round(target * reachFrac * jitter));
    return { enhetId: id, target, seen };
  });
  const target = byEnhet.reduce((s, e) => s + e.target, 0);
  const seen = byEnhet.reduce((s, e) => s + e.seen, 0);
  const closeRate = m.dismissible ? (m.severity === "info" ? 0.78 : 0.52) + rng() * 0.12 : 0;
  const closed = Math.round(seen * closeRate);
  const curve = Array.from({ length: 12 }, (_, i) => {
    const h = (elapsedH * (i + 1)) / 12;
    return elapsedH === 0 ? 0 : Math.min(1, (ceiling * (1 - Math.exp(-h / speed))) / Math.max(reachFrac, 0.001)) * (seen / Math.max(target, 1));
  });
  return {
    target,
    seen,
    closed,
    medianMinutesToSeen: seen > 0 ? int(rng, Math.round(speed * 4), Math.round(speed * 11)) : null,
    curve,
    byEnhet: byEnhet.sort((a, b) => b.target - a.target),
  };
}

function toPrefill(sp: Record<string, string | string[] | undefined>): Prefill | null {
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const title = one("tittel");
  const body = one("melding");
  const sev = one("alvorlighet");
  if (!title && !body && !sev) return null;
  return {
    title: title?.slice(0, 120),
    body: body?.slice(0, 600),
    severity: sev === "info" || sev === "advarsel" || sev === "feil" ? sev : undefined,
  };
}

export function getDriftsmeldinger(
  today: string,
  now: string,
  searchParams: Record<string, string | string[] | undefined> = {},
): DriftsmeldingerData {
  const users = getUsers().filter((u) => u.status === "AKTIV");
  const activeUsersByEnhet: Record<string, number> = {};
  for (const u of users) activeUsersByEnhet[u.enhetId] = (activeUsersByEnhet[u.enhetId] ?? 0) + 1;

  const ctx: SeedCtx = { saturday: nextSaturday(today) };
  const satOffset = minutesBetween(`${today}T00:00`, `${ctx.saturday}T00:00`) / 1440;

  const messages = SEEDS.map((s) => {
    const rng = createRng(s.id);
    // The RINA maintenance seed is anchored to the coming Saturday.
    const isRina = s.id === "dm-2043";
    const start = isRina ? at(today, [Math.max(1, satOffset - 2), s.start[1]]) : at(today, s.start);
    const end = isRina ? `${ctx.saturday}T12:00` : s.end ? at(today, s.end) : null;
    const base: Omit<Driftsmelding, "stats"> = {
      id: s.id,
      title: typeof s.title === "function" ? s.title(ctx) : s.title,
      body: typeof s.body === "function" ? s.body(ctx) : s.body,
      severity: s.severity,
      audience: s.audience,
      start,
      end,
      dismissible: s.dismissible,
      createdBy: s.createdBy,
      createdAt: addMinutes(start, -s.createdLead),
      deactivatedAt: s.deactivatedAfter ? addMinutes(start, s.deactivatedAfter) : null,
    };
    return { ...base, stats: buildStats(rng, base, now, activeUsersByEnhet) };
  });

  return {
    now,
    today,
    messages,
    activeUsersByEnhet,
    totalActiveUsers: users.length,
    prefill: toPrefill(searchParams),
  };
}
