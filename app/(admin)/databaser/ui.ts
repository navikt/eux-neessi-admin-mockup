import type { DbInstance, Env, Priority, VersionHealth } from "./data";

export const HEALTH_META: Record<VersionHealth, { label: string; short: string; color: string; tag: "danger" | "warning" | "success" | "info" }> = {
  eol: { label: "Utgått (EOL)", short: "EOL", color: "#e11d48", tag: "danger" },
  soon: { label: "EOL innen 6 mnd", short: "Snart EOL", color: "#f97316", tag: "warning" },
  ok: { label: "Støttet", short: "OK", color: "#10b981", tag: "success" },
  newest: { label: "Nyeste versjon", short: "Nyest", color: "#3b82f6", tag: "info" },
};

export const PRIORITY_META: Record<Priority, { label: string; color: string; tag: "danger" | "warning" | "neutral" }> = {
  kritisk: { label: "Kritisk", color: "#e11d48", tag: "danger" },
  hoy: { label: "Høy", color: "#f97316", tag: "warning" },
  planlegg: { label: "Planlegg", color: "#64748b", tag: "neutral" },
};

export const ENV_LABEL: Record<Env, string> = { "prod-gcp": "prod-gcp", "dev-gcp": "dev-gcp" };

const dec1 = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const int0 = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 });

/** GB with one decimal below 100, integers above. */
export function fmtGb(gb: number): string {
  return `${gb >= 100 ? int0.format(gb) : dec1.format(gb)} GB`;
}

/** Human size for tables: GB → MB → kB. */
export function fmtSize(gb: number): string {
  if (gb >= 1) return `${dec1.format(gb)} GB`;
  if (gb * 1024 >= 1) return `${int0.format(gb * 1024)} MB`;
  return `${int0.format(Math.max(8, gb * 1024 * 1024))} kB`;
}

const timeFmt = new Intl.DateTimeFormat("nb-NO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Oslo" });
const dayFmt = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", timeZone: "Europe/Oslo" });

export function fmtBackup(iso: string, today: string): string {
  const d = new Date(iso);
  const day = iso.slice(0, 10);
  if (day === today) return `i dag ${timeFmt.format(d)}`;
  return `${dayFmt.format(d)} ${timeFmt.format(d)}`;
}

export function backupIsStale(iso: string, today: string): boolean {
  return iso.slice(0, 10) !== today;
}

export function fmtMonths(days: number): string {
  const m = days / 30.4;
  if (m < 1) return `${Math.max(1, Math.round(days))} dager`;
  if (m < 24) return `${Math.round(m)} mnd`;
  return `${dec1.format(m / 12)} år`;
}

const monthYearFmt = new Intl.DateTimeFormat("nb-NO", { month: "short", year: "numeric", timeZone: "UTC" });
export function fmtMonthYear(iso: string): string {
  return monthYearFmt.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

export function diskPct(i: DbInstance): number {
  return (i.usedGb / i.diskGb) * 100;
}

export function diskColor(pct: number): string {
  if (pct >= 85) return "#e11d48";
  if (pct >= 70) return "#f97316";
  return "#10b981";
}

export function variantLabel(i: DbInstance): string | null {
  return i.variant === "q1" || i.variant === "q2" ? i.variant : null;
}
