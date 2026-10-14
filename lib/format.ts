const intFmt = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const compactFmt = new Intl.NumberFormat("nb-NO", { notation: "compact", maximumFractionDigits: 1 });
const dateFmt = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateShortFmt = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", timeZone: "UTC" });
const weekdayFmt = new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export const fmtInt = (n: number) => intFmt.format(Math.round(n));
export const fmtDec = (n: number) => dec1.format(n);
export const fmtCompact = (n: number) => compactFmt.format(n);
export const fmtPct = (n: number, digits = 1) =>
  `${new Intl.NumberFormat("nb-NO", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)} %`;
export const fmtDays = (n: number) => `${dec1.format(n)} d`;
export const fmtDate = (iso: string) => dateFmt.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
export const fmtDateShort = (iso: string) => dateShortFmt.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
export const fmtWeekday = (iso: string) => weekdayFmt.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

export function fmtDaysAgo(days: number | null): string {
  if (days === null) return "Aldri";
  if (days === 0) return "I dag";
  if (days === 1) return "I går";
  if (days < 7) return `${days} dager siden`;
  if (days < 14) return "1 uke siden";
  if (days < 30) return `${Math.floor(days / 7)} uker siden`;
  if (days < 365) return `${Math.floor(days / 30)} mnd siden`;
  return `${Math.floor(days / 365)} år siden`;
}

export function pctChange(current: number, previous: number): number {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}
