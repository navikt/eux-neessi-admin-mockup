const timeFmt = new Intl.DateTimeFormat("nb-NO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo" });
const dateFmt = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", timeZone: "Europe/Oslo" });
const dayKeyFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" });

export function relTime(atMs: number, now: number): string {
  const min = Math.round((now - atMs) / 60_000);
  if (min < 1) return "nå nettopp";
  if (min < 60) return `for ${min} min siden`;
  const h = Math.floor(min / 60);
  if (h < 24) return `for ${h} t siden`;
  const d = Math.floor(h / 24);
  if (d === 1) return "i går";
  if (d < 7) return `for ${d} dager siden`;
  return `for ${Math.floor(d / 7)} uker siden`;
}

export function clockTime(atMs: number): string {
  return timeFmt.format(atMs);
}

export function dayLabel(atMs: number, now: number): string {
  const a = dayKeyFmt.format(atMs);
  const today = dayKeyFmt.format(now);
  const yesterday = dayKeyFmt.format(now - 86_400_000);
  if (a === today) return "I dag";
  if (a === yesterday) return "I går";
  return dateFmt.format(atMs);
}

export function fmtDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toLocaleString("nb-NO", { maximumFractionDigits: 1 })} s`;
}
