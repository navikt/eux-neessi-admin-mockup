import "server-only";

import { addDaysIso } from "./clock";
import { FIRST_NAMES, FOREIGN_NAMES, LAST_NAMES } from "./names";
import { createRng, hex, int, pick, weightedPick } from "./random";
import { COUNTRIES, REQUEST_SEDS, SECTOR_BY_CODE, enheterForSector, type CountryCode, type SectorCode } from "./reference";
import { saksbehandlereFor } from "./users";

export type AwaitingStatus = "FORFALT" | "SNART" | "OK";

export interface AwaitingItem {
  id: string;
  rinasakId: string;
  buc: string;
  sedType: string;
  sedName: string;
  replySed: string;
  country: CountryCode;
  institution: string;
  sector: SectorCode;
  enhetId: string;
  receivedIso: string;
  fristIso: string;
  fristDager: number;
  daysWaiting: number;
  /** Negative when overdue */
  daysLeft: number;
  status: AwaitingStatus;
  saksbehandler: string | null;
  /** X009 reminders received from the other country */
  reminders: number;
  personName: string;
  /** Draft reply exists in nEESSI */
  draftStarted: boolean;
}

const INSTITUTIONS: Partial<Record<CountryCode, string[]>> = {
  SE: ["Försäkringskassan", "Pensionsmyndigheten", "Arbetsförmedlingen"],
  DK: ["Udbetaling Danmark", "Styrelsen for Arbejdsmarked og Rekruttering"],
  PL: ["ZUS – Zakład Ubezpieczeń Społecznych", "Regionalny Ośrodek Polityki Społecznej"],
  DE: ["Deutsche Rentenversicherung", "Familienkasse", "Bundesagentur für Arbeit"],
  FI: ["Kela", "Eläketurvakeskus"],
  LT: ["Sodra", "Užimtumo tarnyba"],
  GB: ["HM Revenue & Customs", "DWP International Pension Centre"],
  ES: ["Instituto Nacional de la Seguridad Social", "Tesorería General"],
  NL: ["Sociale Verzekeringsbank", "UWV"],
  FR: ["CNAV", "CLEISS"],
  IT: ["INPS"],
};

const AWAITING_COUNT = 486;

const cache = new Map<string, AwaitingItem[]>();

export function getAwaiting(todayIso: string): AwaitingItem[] {
  const hit = cache.get(todayIso);
  if (hit) return hit;
  const items = build(todayIso);
  cache.clear();
  cache.set(todayIso, items);
  return items;
}

function build(todayIso: string): AwaitingItem[] {
  const rng = createRng(`awaiting:${todayIso}`);
  const items: AwaitingItem[] = [];
  for (let i = 0; i < AWAITING_COUNT; i++) {
    const sed = weightedPick(rng, REQUEST_SEDS, (s) => SECTOR_BY_CODE[s.sector].weight * s.share);
    const country = weightedPick(rng, COUNTRIES, (c) => c.weight);
    const enhetOptions = enheterForSector(sed.sector);
    const { enhet } = weightedPick(rng, enhetOptions, (o) => o.share);
    const frist = sed.fristDager ?? 30;
    // Mostly fresh requests, with a long tail of forgotten ones.
    const ageFactor = enhet.id === "0393" || enhet.id === "4488" ? 0.6 : enhet.id === "4303" ? 0.3 : 0.45;
    const age = Math.min(220, Math.floor(-Math.log(Math.max(rng(), 1e-6)) * frist * ageFactor));
    const receivedIso = addDaysIso(todayIso, -age);
    const fristIso = addDaysIso(receivedIso, frist);
    const daysLeft = frist - age;
    const status: AwaitingStatus = daysLeft < 0 ? "FORFALT" : daysLeft <= 7 ? "SNART" : "OK";
    const team = saksbehandlereFor(enhet.id);
    const assigned = rng() < (status === "FORFALT" ? 0.62 : 0.78) ? pick(rng, team)?.name ?? null : null;
    const reminders = status === "FORFALT" ? (rng() < 0.55 ? int(rng, 1, Math.min(3, 1 + Math.floor(-daysLeft / 20))) : 0) : 0;
    const foreign = rng() < 0.45;
    const pool = FOREIGN_NAMES[country.code] ?? FOREIGN_NAMES.default;
    const personName = foreign
      ? `${pick(rng, pool.first)} ${pick(rng, pool.last)}`
      : `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
    const rinasakId = String(1_420_000 + Math.floor((1 - age / 260) * 90_000) + int(rng, 0, 9_999));
    items.push({
      id: `${rinasakId}_${hex(rng, 8)}`,
      rinasakId,
      buc: sed.buc,
      sedType: sed.type,
      sedName: sed.name,
      replySed: sed.reply ?? "",
      country: country.code,
      institution: pick(rng, INSTITUTIONS[country.code] ?? [`${country.name} – trygdemyndighet`]),
      sector: sed.sector,
      enhetId: enhet.id,
      receivedIso,
      fristIso,
      fristDager: frist,
      daysWaiting: age,
      daysLeft,
      status,
      saksbehandler: assigned,
      reminders,
      personName,
      draftStarted: rng() < 0.22,
    });
  }
  return items.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function summarizeAwaiting(items: AwaitingItem[]) {
  const overdue = items.filter((i) => i.status === "FORFALT").length;
  const soon = items.filter((i) => i.status === "SNART").length;
  const sorted = [...items].map((i) => i.daysWaiting).sort((a, b) => a - b);
  return {
    total: items.length,
    overdue,
    soon,
    ok: items.length - overdue - soon,
    oldest: sorted[sorted.length - 1] ?? 0,
    medianWait: sorted[Math.floor(sorted.length / 2)] ?? 0,
    reminders: items.reduce((s, i) => s + i.reminders, 0),
  };
}
