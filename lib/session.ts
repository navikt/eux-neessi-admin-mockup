export const USER_COOKIE = "neessi-admin-user";

export interface SessionUser {
  name: string;
  title: string;
}

export interface Persona extends SessionUser {
  description: string;
  color: string;
}

export const PERSONAS: Persona[] = [
  {
    name: "Ragnhild Teigen",
    title: "Fagansvarlig EESSI",
    description: "Standardtekster, svarfrister og fag",
    color: "#6366f1",
  },
  {
    name: "Silje Haugland",
    title: "Administrator",
    description: "Brukere, tilganger og verktøy",
    color: "#ec4899",
  },
  {
    name: "Torbjørn Elvestad",
    title: "Utvikler, Team EESSI",
    description: "Databaser, drift og Kafka",
    color: "#0ea5e9",
  },
  {
    name: "Ida Granli",
    title: "Avdelingsleder",
    description: "Statistikk og leveranse til EU",
    color: "#f59e0b",
  },
];

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function parseSessionUser(raw: string | undefined): SessionUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionUser>;
    if (typeof parsed.name === "string" && parsed.name.trim()) {
      return { name: parsed.name.slice(0, 60), title: String(parsed.title ?? "Admin").slice(0, 60) };
    }
  } catch {
    /* ignore malformed cookie */
  }
  return null;
}
