import "server-only";

import { isoToUtcDay, utcDayToIso, weekdayOf } from "./clock";
import { clamp, createRng, normal, poisson } from "./random";
import {
  COUNTRIES,
  SECTORS,
  SED_TYPES,
  enheterForSector,
  type CountryCode,
  type SectorCode,
} from "./reference";
import type { DailyPoint, EnhetRow, MonthInfo, StatRow, StatsDataset } from "./statsTypes";

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];
const MONTH_LONG = [
  "januar", "februar", "mars", "april", "mai", "juni",
  "juli", "august", "september", "oktober", "november", "desember",
];

/** Average weekday SED volumes. */
const BASE_SENT = 1050;
const BASE_RECEIVED = 1250;

/** Relative SED activity per hour of day (Oslo time). */
export const HOUR_SHAPE = [
  0.02, 0.01, 0.01, 0.01, 0.01, 0.03, 0.12, 0.45, 0.95, 1.0, 0.92, 0.7,
  0.62, 0.88, 0.84, 0.6, 0.28, 0.12, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02,
];

export const WEEKDAY_FACTOR = [1.18, 1.12, 1.08, 1.02, 0.86, 0.05, 0.03];

/** Country-specific sector mix: Norwegians retire to Spain, Poles and Lithuanians work here, Swedes commute. */
const SECTOR_BIAS: Partial<Record<CountryCode, Partial<Record<SectorCode, number>>>> = {
  SE: { S: 1.5, UB: 1.4, LA: 1.2, P: 0.8 },
  DK: { S: 1.3, UB: 1.2, LA: 1.2 },
  FI: { S: 1.2, UB: 1.2 },
  PL: { FB: 1.9, UB: 1.6, P: 0.5, LA: 1.2 },
  LT: { FB: 1.8, UB: 1.7, P: 0.4 },
  LV: { FB: 1.7, UB: 1.6, P: 0.4 },
  EE: { FB: 1.4, UB: 1.3 },
  RO: { FB: 1.6, UB: 1.4, P: 0.4 },
  ES: { P: 2.4, LA: 0.6, UB: 0.5, M: 2 },
  PT: { P: 1.8 },
  GB: { P: 1.6, LA: 1.2 },
  DE: { P: 1.3, LA: 1.2 },
  IT: { P: 1.4 },
  FR: { P: 1.3 },
  GR: { P: 1.5 },
};

/** Norway answers these countries slightly faster or slower (language, complexity). */
const NORWAY_FACTOR: Partial<Record<CountryCode, number>> = {
  SE: 0.82, DK: 0.85, FI: 0.9, IS: 0.88, GB: 0.92, IE: 0.92,
  PL: 1.08, LT: 1.06, RO: 1.12, BG: 1.15, GR: 1.1, IT: 1.06,
};

function seasonal(month: number): number {
  // month 0..11 — July is holiday, December slows down
  return [1.06, 1.04, 1.02, 0.98, 1.0, 0.94, 0.58, 0.88, 1.06, 1.08, 1.06, 0.82][month];
}

function answerSeasonal(month: number): number {
  return [1.02, 1.0, 1.0, 1.02, 0.98, 1.04, 1.34, 1.18, 1.0, 0.97, 0.98, 1.1][month];
}

function sectorFrist(sector: SectorCode): number {
  const reqs = SED_TYPES.filter((s) => s.sector === sector && s.fristDager);
  if (!reqs.length) return 14;
  return reqs.reduce((sum, s) => sum + (s.fristDager ?? 0), 0) / reqs.length;
}

function sectorRequestShare(sector: SectorCode): number {
  return SED_TYPES.filter((s) => s.sector === sector && s.reply).reduce((sum, s) => sum + s.share, 0);
}

const cache = new Map<string, StatsDataset>();

export function getStats(todayIso: string): StatsDataset {
  const cached = cache.get(todayIso);
  if (cached) return cached;
  const data = buildStats(todayIso);
  cache.clear();
  cache.set(todayIso, data);
  return data;
}

function buildStats(todayIso: string): StatsDataset {
  const today = isoToUtcDay(todayIso);
  const yesterday = today - 1;
  const [ty, tm] = todayIso.split("-").map(Number);

  // 12 full months + current month to date
  const months: MonthInfo[] = [];
  for (let i = 12; i >= 0; i--) {
    const d = new Date(Date.UTC(ty, tm - 1 - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const startDay = Math.floor(d.getTime() / 86_400_000);
    const endDay = Math.min(Math.floor(Date.UTC(y, m + 1, 1) / 86_400_000) - 1, yesterday);
    months.push({
      key: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: `${MONTH_LONG[m]} ${y}`,
      short: `${MONTH_NAMES[m]}${m === 0 || i === 12 ? ` ${String(y).slice(2)}` : ""}`,
      partial: i === 0,
      startDay,
      endDay,
      days: endDay - startDay + 1,
      monthOfYear: m,
    });
  }

  const totalWeight = COUNTRIES.reduce((s, c) => s + c.weight, 0);
  const firstDay = months[0].startDay;
  const spanDays = yesterday - firstDay;

  const rows: StatRow[] = [];
  const daily: DailyPoint[] = [];
  const dailyIndex = new Map<number, DailyPoint>();
  for (let day = Math.max(firstDay, yesterday - 89); day <= yesterday; day++) {
    const p: DailyPoint = { date: utcDayToIso(day), sent: 0, recv: 0, bucs: 0 };
    daily.push(p);
    dailyIndex.set(day, p);
  }

  months.forEach((month, mi) => {
    for (const country of COUNTRIES) {
      for (const sector of SECTORS) {
        const rng = createRng(`stats:${month.key}:${country.code}:${sector.code}`);
        const bias = SECTOR_BIAS[country.code]?.[sector.code] ?? 1;
        const base = (country.weight / totalWeight) * sector.weight * bias;
        let sent = 0;
        let recv = 0;
        for (let day = month.startDay; day <= month.endDay; day++) {
          const trend = 0.94 + ((day - firstDay) / Math.max(1, spanDays)) * 0.12;
          const f = WEEKDAY_FACTOR[weekdayOf(day)] * seasonal(month.monthOfYear) * trend;
          const s = poisson(rng, BASE_SENT * base * f);
          const r = poisson(rng, BASE_RECEIVED * base * f);
          sent += s;
          recv += r;
          const dp = dailyIndex.get(day);
          if (dp) {
            dp.sent += s;
            dp.recv += r;
            dp.bucs += Math.round(s * 0.27);
          }
        }
        if (sent === 0 && recv === 0) continue;

        const progress = mi / 12;
        const statRng = createRng(`answer:${month.key}:${country.code}:${sector.code}`);
        const frist = sectorFrist(sector.code);
        const improvement = 1.1 - progress * 0.22;
        const nDays = clamp(
          sector.baseAnswerDays *
            (NORWAY_FACTOR[country.code] ?? 1) *
            improvement *
            answerSeasonal(month.monthOfYear) *
            (1 + normal(statRng, 0, 0.06)),
          1,
          120,
        );
        const tDays = clamp(
          sector.baseAnswerDays * 1.12 * country.slowness * answerSeasonal(month.monthOfYear) * (1 + normal(statRng, 0, 0.08)),
          1,
          160,
        );
        const onTime = (days: number) => clamp(104 - Math.max(0, days / frist - 0.2) * 34 + normal(statRng, 0, 1.5), 48, 99.4);

        rows.push({
          m: mi,
          c: country.code,
          s: sector.code,
          sent,
          recv,
          bucNew: Math.round(sent * (0.25 + statRng() * 0.05)),
          bucIn: Math.round(recv * (0.27 + statRng() * 0.05)),
          ans: Math.round(recv * sectorRequestShare(sector.code) * 0.92),
          nDays: Math.round(nDays * 10) / 10,
          nOnTime: Math.round(onTime(nDays) * 10) / 10,
          tDays: Math.round(tDays * 10) / 10,
          tOnTime: Math.round(onTime(tDays) * 10) / 10,
        });
      }
    }
  });

  // Answers per enhet, derived from the same rows so totals match.
  const enhetMap = new Map<string, EnhetRow>();
  for (const row of rows) {
    for (const { enhet, share } of enheterForSector(row.s)) {
      const totalShare = enheterForSector(row.s).reduce((s, e) => s + e.share, 0);
      const key = `${row.m}:${enhet.id}`;
      const existing = enhetMap.get(key) ?? { m: row.m, e: enhet.id, ans: 0, daysWeighted: 0, onTimeWeighted: 0 };
      const ans = (row.ans * share) / totalShare;
      const enhetFactor = enhetSpeed(enhet.id);
      existing.ans += ans;
      existing.daysWeighted += ans * row.nDays * enhetFactor;
      existing.onTimeWeighted += ans * clamp(row.nOnTime + (1 - enhetFactor) * 18, 40, 99.5);
      enhetMap.set(key, existing);
    }
  }
  const enhetRows = [...enhetMap.values()].map((r) => ({
    ...r,
    ans: Math.round(r.ans),
    daysWeighted: Math.round(r.daysWeighted),
    onTimeWeighted: Math.round(r.onTimeWeighted),
  }));

  // SED type totals over the last 12 full months
  const sedTotals = new Map<string, { sent: number; recv: number }>();
  for (const row of rows) {
    if (row.m === 12) continue;
    for (const sed of SED_TYPES.filter((s) => s.sector === row.s)) {
      const t = sedTotals.get(sed.type) ?? { sent: 0, recv: 0 };
      const isRequest = Boolean(sed.reply);
      t.sent += row.sent * sed.share * (isRequest ? 0.9 : 1.1);
      t.recv += row.recv * sed.share * (isRequest ? 1.1 : 0.9);
      sedTotals.set(sed.type, t);
    }
  }
  const sedTypes = [...sedTotals.entries()]
    .map(([type, t]) => ({ type, sent: Math.round(t.sent), recv: Math.round(t.recv) }))
    .sort((a, b) => b.sent + b.recv - (a.sent + a.recv));

  // Weekday × hour rhythm (share of a week's sent SEDs)
  const hourShape = HOUR_SHAPE;
  const weekSent = rows.filter((r) => r.m === 11).reduce((s, r) => s + r.sent, 0) / (months[11].days / 7);
  const shapeTotal = WEEKDAY_FACTOR.reduce((s, w) => s + w, 0) * hourShape.reduce((s, h) => s + h, 0);
  const rhythm = WEEKDAY_FACTOR.map((w) => hourShape.map((h) => Math.round((weekSent * w * h) / shapeTotal)));

  return { generatedFor: todayIso, months, rows, enhetRows, daily, sedTypes, rhythm };
}

function enhetSpeed(id: string): number {
  return (
    {
      "4530": 1.08,
      "0393": 1.12,
      "4862": 0.95,
      "4817": 0.88,
      "4402": 0.92,
      "4475": 0.85,
      "4489": 1.05,
      "4488": 1.15,
      "4303": 0.7,
    }[id] ?? 1
  );
}
