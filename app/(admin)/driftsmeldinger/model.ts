/**
 * Types and pure helpers for driftsmeldinger. Safe to import from client components.
 * All datetimes are naive Europe/Oslo wall-clock strings on the form `YYYY-MM-DDTHH:MM`,
 * which sort lexicographically.
 */

export type Severity = "info" | "advarsel" | "feil";
export type MessageStatus = "aktiv" | "planlagt" | "utlopt" | "deaktivert";

export interface EnhetReach {
  enhetId: string;
  target: number;
  seen: number;
}

export interface ReadStats {
  /** Active nEESSI users in the audience */
  target: number;
  seen: number;
  closed: number;
  /** Median minutes from first page load to the banner being seen */
  medianMinutesToSeen: number | null;
  /** Cumulative share seen, 12 evenly spaced points through the message period */
  curve: number[];
  byEnhet: EnhetReach[];
}

export interface Driftsmelding {
  id: string;
  title: string;
  body: string;
  severity: Severity;
  /** "alle" or a list of enhet-ids */
  audience: "alle" | string[];
  start: string;
  /** null = until manually deactivated */
  end: string | null;
  dismissible: boolean;
  createdBy: string;
  createdAt: string;
  deactivatedAt: string | null;
  stats: ReadStats;
}

export interface Prefill {
  title?: string;
  body?: string;
  severity?: Severity;
}

export interface DriftsmeldingerData {
  now: string;
  today: string;
  messages: Driftsmelding[];
  /** Active users per enhet, used to estimate reach of a new message */
  activeUsersByEnhet: Record<string, number>;
  totalActiveUsers: number;
  prefill: Prefill | null;
}

export const SEVERITY_META: Record<
  Severity,
  { label: string; color: string; soft: string; tag: "info" | "warning" | "danger"; toast: "info" | "warning" | "error" }
> = {
  info: { label: "Info", color: "#2563eb", soft: "#dbeafe", tag: "info", toast: "info" },
  advarsel: { label: "Advarsel", color: "#f59e0b", soft: "#fef3c7", tag: "warning", toast: "warning" },
  feil: { label: "Feil", color: "#e11d48", soft: "#ffe4e6", tag: "danger", toast: "error" },
};

export const STATUS_META: Record<MessageStatus, { label: string; tag: "success" | "info" | "neutral" | "warning" }> = {
  aktiv: { label: "Aktiv", tag: "success" },
  planlagt: { label: "Planlagt", tag: "info" },
  utlopt: { label: "Utløpt", tag: "neutral" },
  deaktivert: { label: "Deaktivert", tag: "warning" },
};

export function statusOf(m: Pick<Driftsmelding, "start" | "end" | "deactivatedAt">, now: string): MessageStatus {
  if (m.deactivatedAt) return "deaktivert";
  if (m.start > now) return "planlagt";
  if (m.end && m.end <= now) return "utlopt";
  return "aktiv";
}

export function isSeverity(v: string | undefined): v is Severity {
  return v === "info" || v === "advarsel" || v === "feil";
}

/* ---------------------------------------------------------------- time ---- */

function asUtc(dt: string): Date {
  return new Date(`${dt.length === 10 ? `${dt}T00:00` : dt}:00Z`);
}

const whenFmt = new Intl.DateTimeFormat("nb-NO", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const dayFmt = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", timeZone: "UTC" });
const longDayFmt = new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export const timeOf = (dt: string) => dt.slice(11, 16);
export const dateOf = (dt: string) => dt.slice(0, 10);

/** "tor. 15. okt. kl. 08:00" */
export function fmtWhen(dt: string): string {
  return `${whenFmt.format(asUtc(dt))} kl. ${timeOf(dt)}`;
}

/** "15. okt." */
export function fmtDay(dt: string): string {
  return dayFmt.format(asUtc(dt));
}

/** "lørdag 17. oktober" */
export function fmtLongDay(dt: string): string {
  return longDayFmt.format(asUtc(dt));
}

export function fmtPeriod(start: string, end: string | null): string {
  if (!end) return `Fra ${fmtWhen(start)} · til den deaktiveres`;
  if (dateOf(start) === dateOf(end)) return `${fmtWhen(start)}–${timeOf(end)}`;
  return `${fmtWhen(start)} → ${fmtWhen(end)}`;
}

/** Minutes between two naive datetimes */
export function minutesBetween(a: string, b: string): number {
  return Math.round((asUtc(b).getTime() - asUtc(a).getTime()) / 60_000);
}

export function addMinutes(dt: string, minutes: number): string {
  return new Date(asUtc(dt).getTime() + minutes * 60_000).toISOString().slice(0, 16);
}

/** Human relative label: "om 3 dager", "for 2 t siden" */
export function fmtRelative(dt: string, now: string): string {
  const m = minutesBetween(now, dt);
  const abs = Math.abs(m);
  const unit = abs < 60 ? `${abs} min` : abs < 60 * 36 ? `${Math.round(abs / 60)} t` : `${Math.round(abs / 1440)} dager`;
  if (abs < 1) return "nå";
  return m > 0 ? `om ${unit}` : `for ${unit} siden`;
}

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes >= 360 && minutes < 60 * 48) return `ca. ${Math.round(minutes / 60)} t`;
  if (minutes < 60 * 48) {
    const h = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${h} t ${rest} min` : `${h} t`;
  }
  return `${Math.round(minutes / 1440)} dager`;
}

/** Local calendar Date (midnight) for an ISO date, for DatePicker. */
export function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function localDateToIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
