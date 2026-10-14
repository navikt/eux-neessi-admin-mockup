import { createRng, int, pick } from "@/lib/mock/random";
import { ENHET_BY_ID, SED_TYPES, type SectorCode } from "@/lib/mock/reference";
import type { AdminUser } from "./types";

export type AuditKind = "sed" | "buc" | "journal" | "text" | "login" | "admin" | "invite";

export interface AuditEntry {
  id: string;
  kind: AuditKind;
  text: string;
  detail?: string;
  daysAgo: number;
  time: string;
}

/** Daily sessions for the last 30 days (oldest first). Pure and deterministic per user. */
export function dailyActivity(user: AdminUser): number[] {
  const rng = createRng(`activity-${user.ident}`);
  const days = Array.from({ length: 30 }, () => 0);
  if (user.status !== "AKTIV" || user.sessions30d === 0) {
    if (user.lastActiveDaysAgo !== null && user.lastActiveDaysAgo < 30) days[29 - user.lastActiveDaysAgo] = 1;
    return days;
  }
  const last = user.lastActiveDaysAgo ?? 0;
  const workdays: number[] = [];
  for (let i = 0; i < 30 - last; i++) {
    // index 29 is today (a Wednesday in the mock world): skip weekends
    const weekday = (((2 - (29 - i)) % 7) + 7) % 7; // 0 = mon
    if (weekday < 5) workdays.push(i);
  }
  if (!workdays.length) return days;
  for (let s = 0; s < user.sessions30d; s++) days[pick(rng, workdays)] += 1;
  return days;
}

const KIND_TEMPLATES: Record<Exclude<AuditKind, "invite">, (rng: () => number, sector: SectorCode) => { text: string; detail?: string }> = {
  sed: (rng, sector) => {
    const sed = pick(rng, SED_TYPES.filter((s) => s.sector === sector).concat(SED_TYPES.filter((s) => s.sector === "X")));
    return { text: `Sendte ${sed.type}`, detail: `${sed.name} · sak ${int(rng, 1400000, 1499999)}` };
  },
  buc: (rng, sector) => {
    const sed = pick(rng, SED_TYPES.filter((s) => s.sector === sector));
    return { text: `Opprettet ${sed?.buc ?? "H_BUC_01"}`, detail: `Mottaker ${pick(rng, ["SE", "DK", "DE", "PL", "FI", "NL", "ES", "LT"])} · sak ${int(rng, 1400000, 1499999)}` };
  },
  journal: (rng, sector) => {
    const sed = pick(rng, SED_TYPES.filter((s) => s.sector === sector));
    return { text: `Journalførte ${sed?.type ?? "H002"}`, detail: `Fagsak ${int(rng, 100000000, 199999999)}` };
  },
  text: (rng) => ({ text: "Brukte standardtekst", detail: pick(rng, ["H001 – Anmodning om informasjon", "A003 – Begrunnelse", "F001 – Fritekst til forrang", "P8000 – Ytterligere informasjon"]) }),
  login: (rng) => ({ text: "Logget inn i nEESSI", detail: pick(rng, ["Chrome · Windows", "Edge · Windows", "Chrome · Citrix"]) }),
  admin: (rng) => ({ text: pick(rng, ["Endret standardtekst", "Publiserte SED-hendelser", "Oppdaterte driftsmelding", "Endret roller for en bruker"]), detail: "nEESSI admin" }),
};

/** Recent actions for the mock audit log. */
export function auditLog(user: AdminUser): AuditEntry[] {
  const rng = createRng(`audit-${user.ident}`);
  const enhet = ENHET_BY_ID[user.enhetId];
  const sectors = (Object.keys(enhet?.sectors ?? { H: 1 }) as SectorCode[]).filter((s) => SED_TYPES.some((t) => t.sector === s));
  const sector = sectors.length ? pick(rng, sectors) : "H";
  const entries: AuditEntry[] = [];
  const time = () => `${String(int(rng, 7, 16)).padStart(2, "0")}:${String(int(rng, 0, 59)).padStart(2, "0")}`;

  if (user.status === "INVITERT" || user.lastActiveDaysAgo === null) {
    entries.push({ id: "inv", kind: "invite", text: "Invitasjon sendt", detail: "av Ragnhild Teigen · venter på første innlogging", daysAgo: int(rng, 0, 9), time: time() });
    return entries;
  }

  const kinds: Exclude<AuditKind, "invite">[] = user.roles.includes("ADMIN") || user.roles.includes("UTVIKLER")
    ? ["admin", "login", "admin", "text", "login"]
    : ["sed", "journal", "buc", "text", "sed", "login"];
  let day = user.lastActiveDaysAgo;
  for (let i = 0; i < 6; i++) {
    const kind = i === 0 ? kinds[0] : pick(rng, kinds);
    entries.push({ id: `${i}`, kind, ...KIND_TEMPLATES[kind](rng, sector), daysAgo: day, time: time() });
    day += rng() < 0.55 ? 0 : int(rng, 1, 3);
  }
  return entries;
}
