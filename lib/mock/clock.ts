/** Date helpers. All mock data is anchored to "today" in Europe/Oslo. */

export const DAY_MS = 86_400_000;

export function osloToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Minutes since midnight in Oslo. */
export function osloMinutesNow(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function isoToUtcDay(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
}

export function utcDayToIso(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayOf(day: number): number {
  return (new Date(day * DAY_MS).getUTCDay() + 6) % 7;
}

export function addDaysIso(iso: string, days: number): string {
  return utcDayToIso(isoToUtcDay(iso) + days);
}

export function diffDays(fromIso: string, toIso: string): number {
  return isoToUtcDay(toIso) - isoToUtcDay(fromIso);
}
