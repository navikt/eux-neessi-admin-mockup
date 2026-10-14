import "server-only";

import { addDaysIso, isoToUtcDay, osloMinutesNow, osloToday, weekdayOf } from "./clock";
import { makeEvent, type LiveEvent } from "./events";
import { createRng, int, normal } from "./random";
import { HOUR_SHAPE, getStats } from "./stats";
import { sumRows, type Totals } from "./statsTypes";

export interface HourPoint {
  hour: number;
  label: string;
  today: number | null;
  lastWeek: number;
}

export type SystemState = "ok" | "warn" | "down";

export interface SystemCheck {
  name: string;
  kind: "app" | "db" | "kafka" | "ekstern";
  state: SystemState;
  detail: string;
  latencyMs?: number;
  uptime: number;
  /** 24 hourly samples, 1 = healthy */
  history: number[];
}

export interface TodaySnapshot {
  todayIso: string;
  minute: number;
  expectedDay: { sent: number; recv: number; bucs: number };
  sofar: { sent: number; recv: number; bucs: number; journal: number };
  /** Same time of day, same weekday last week */
  lastWeekSofar: { sent: number; recv: number; bucs: number };
  /** Events per minute right now, for the client ticker */
  ratePerMinute: { sent: number; recv: number; bucs: number };
  hourly: HourPoint[];
  events: LiveEvent[];
  systems: SystemCheck[];
  monthToDate: Totals & { label: string; days: number };
  prevMonthSameDays: { sent: number; recv: number };
  last14: { date: string; sent: number; recv: number }[];
}

const SHAPE_TOTAL = HOUR_SHAPE.reduce((s, h) => s + h, 0);

/** Share of the day's volume that has happened by a given minute. */
function cumulativeShare(minute: number): number {
  const h = Math.floor(minute / 60);
  const frac = (minute % 60) / 60;
  let acc = 0;
  for (let i = 0; i < h; i++) acc += HOUR_SHAPE[i];
  acc += (HOUR_SHAPE[h] ?? 0) * frac;
  return acc / SHAPE_TOTAL;
}

const APPS = [
  { name: "eux-web-app", label: "nEESSI" },
  { name: "eux-rina-api" },
  { name: "eux-nav-rinasak" },
  { name: "eux-journal" },
  { name: "eux-oppgave" },
  { name: "eux-saksbehandler" },
  { name: "eux-rina-case-search" },
  { name: "eux-person-oppdatering" },
  { name: "eux-avslutt-rinasaker" },
  { name: "eux-slett-usendte-rinasaker" },
];

const DATABASES = [
  "eux-nav-rinasak", "eux-journal", "eux-oppgave", "eux-saksbehandler", "eux-rina-case-search",
  "eux-avslutt-rinasaker", "eux-slett-usendte-rinasaker", "eux-person-oppdatering", "eux-portal-core",
];

const TOPICS = [
  "eessibasis.sedmottatt-v1",
  "eessibasis.sedsendt-v1",
  "eessibasis.rinasak-opprettet-v1",
  "eessibasis.journalfoering-v1",
];

export function getToday(now: Date = new Date()): TodaySnapshot {
  const todayIso = osloToday(now);
  const minute = osloMinutesNow(now);
  const stats = getStats(todayIso);
  const day = isoToUtcDay(todayIso);
  const wd = weekdayOf(day);
  const rng = createRng(`today:${todayIso}`);

  // Expected volume today: average of the same weekday the last four weeks.
  const sameWeekday = stats.daily.filter((d) => weekdayOf(isoToUtcDay(d.date)) === wd).slice(-4);
  const avg = (k: "sent" | "recv" | "bucs") =>
    sameWeekday.reduce((s, d) => s + d[k], 0) / Math.max(1, sameWeekday.length);
  const drift = 1 + normal(rng, 0.02, 0.04);
  const expectedDay = {
    sent: Math.round(avg("sent") * drift),
    recv: Math.round(avg("recv") * drift),
    bucs: Math.round(avg("bucs") * drift),
  };
  const share = cumulativeShare(minute);
  const sofar = {
    sent: Math.round(expectedDay.sent * share),
    recv: Math.round(expectedDay.recv * share),
    bucs: Math.round(expectedDay.bucs * share),
    journal: Math.round(expectedDay.recv * share * 0.86),
  };
  const lastWeek = stats.daily.find((d) => d.date === addDaysIso(todayIso, -7));
  const lastWeekSofar = {
    sent: Math.round((lastWeek?.sent ?? 0) * share),
    recv: Math.round((lastWeek?.recv ?? 0) * share),
    bucs: Math.round((lastWeek?.bucs ?? 0) * share),
  };
  const hourNow = Math.floor(minute / 60);
  const perMinute = (total: number) => (total * (HOUR_SHAPE[hourNow] ?? 0)) / SHAPE_TOTAL / 60;
  const ratePerMinute = {
    sent: perMinute(expectedDay.sent),
    recv: perMinute(expectedDay.recv),
    bucs: perMinute(expectedDay.bucs),
  };

  const hourly: HourPoint[] = HOUR_SHAPE.map((h, hour) => {
    const lw = Math.round(((lastWeek?.sent ?? 0) + (lastWeek?.recv ?? 0)) * (h / SHAPE_TOTAL));
    let today: number | null = null;
    if (hour < hourNow) today = Math.round((expectedDay.sent + expectedDay.recv) * (h / SHAPE_TOTAL) * (1 + normal(rng, 0, 0.05)));
    else if (hour === hourNow) {
      // Current hour: projected full-hour volume based on the pace so far
      today = Math.round((expectedDay.sent + expectedDay.recv) * (h / SHAPE_TOTAL));
    }
    return { hour, label: `${String(hour).padStart(2, "0")}`, today, lastWeek: lw };
  });

  const events = buildEvents(todayIso, minute, ratePerMinute);

  const systems = buildSystems(todayIso, minute);

  const m = stats.months.length - 1;
  const mtd = sumRows(stats.rows.filter((r) => r.m === m));
  const monthToDate = {
    ...mtd,
    sent: mtd.sent + sofar.sent,
    recv: mtd.recv + sofar.recv,
    bucNew: mtd.bucNew + sofar.bucs,
    label: stats.months[m].label,
    days: stats.months[m].days + 1,
  };
  // Previous month, same number of days, using daily data when available.
  const prevStart = stats.months[m - 1].startDay;
  const prevDays = stats.daily.filter((d) => {
    const dd = isoToUtcDay(d.date);
    return dd >= prevStart && dd < prevStart + stats.months[m].days;
  });
  const prevMonthSameDays = {
    sent: prevDays.reduce((s, d) => s + d.sent, 0) + Math.round((lastWeek?.sent ?? 0) * share),
    recv: prevDays.reduce((s, d) => s + d.recv, 0) + Math.round((lastWeek?.recv ?? 0) * share),
  };

  const last14 = stats.daily.slice(-14).map((d) => ({ date: d.date, sent: d.sent, recv: d.recv }));

  return {
    todayIso,
    minute,
    expectedDay,
    sofar,
    lastWeekSofar,
    ratePerMinute,
    hourly,
    events,
    systems,
    monthToDate,
    prevMonthSameDays,
    last14,
  };
}

function buildEvents(todayIso: string, minute: number, rate: { sent: number; recv: number }): LiveEvent[] {
  const rng = createRng(`events:${todayIso}:${Math.floor(minute / 5)}`);
  const events: LiveEvent[] = [];
  const count = 18;
  const perMin = Math.max(0.4, rate.sent + rate.recv);
  let t = minute;
  for (let i = 0; i < count; i++) {
    events.push(makeEvent(rng, Math.max(0, Math.round(t)), `${todayIso}-${i}`));
    t -= Math.max(0.2, -Math.log(Math.max(rng(), 1e-6)) / perMin) * 3;
  }
  return events;
}

function buildSystems(todayIso: string, minute: number): SystemCheck[] {
  const rng = createRng(`systems:${todayIso}:${Math.floor(minute / 10)}`);
  const history = (bad = 0) =>
    Array.from({ length: 24 }, (_, i) => (bad && i > 24 - bad - 3 && i < 24 - 2 ? 0.6 : 1));
  const apps: SystemCheck[] = APPS.map((a) => {
    const slow = a.name === "eux-person-oppdatering";
    return {
      name: a.label ? `${a.label} (${a.name})` : a.name,
      kind: "app",
      state: slow ? "warn" : "ok",
      detail: slow ? "Høy responstid mot PDL" : `${int(rng, 2, 4)}/${int(rng, 4, 4)} poder klare`,
      latencyMs: slow ? int(rng, 900, 1400) : int(rng, 18, 140),
      uptime: slow ? 99.62 : 99.9 + Math.round(rng() * 9) / 100,
      history: history(slow ? 4 : 0),
    };
  });
  const dbs: SystemCheck[] = DATABASES.map((name) => ({
    name,
    kind: "db",
    state: "ok",
    detail: `${int(rng, 4, 38)} tilkoblinger · ${int(rng, 1, 22)} % CPU`,
    latencyMs: int(rng, 1, 6),
    uptime: 99.99,
    history: history(),
  }));
  const kafka: SystemCheck[] = TOPICS.map((name, i) => {
    const lag = i === 3 ? int(rng, 140, 420) : int(rng, 0, 12);
    return {
      name,
      kind: "kafka",
      state: lag > 100 ? "warn" : "ok",
      detail: lag > 100 ? `Konsumentlag ${lag} (eux-journal)` : `Lag ${lag}`,
      uptime: 100,
      history: history(lag > 100 ? 2 : 0),
    };
  });
  const ext: SystemCheck[] = [
    { name: "RINA (CEF)", kind: "ekstern", state: "ok", detail: "Tilgjengelig · v2025.2", latencyMs: int(rng, 180, 320), uptime: 99.71, history: history() },
    { name: "Joark / dokarkiv", kind: "ekstern", state: "ok", detail: "Tilgjengelig", latencyMs: int(rng, 60, 120), uptime: 99.95, history: history() },
    { name: "PDL", kind: "ekstern", state: "warn", detail: "Treg respons", latencyMs: int(rng, 700, 1100), uptime: 99.4, history: history(4) },
    { name: "Gosys / oppgave", kind: "ekstern", state: "ok", detail: "Tilgjengelig", latencyMs: int(rng, 40, 90), uptime: 99.97, history: history() },
  ];
  return [...apps, ...dbs, ...kafka, ...ext];
}

