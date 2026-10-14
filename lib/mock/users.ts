import { FIRST_NAMES, LAST_NAMES } from "./names";
import { createRng, int, pick, weightedPick } from "./random";
import { ENHETER } from "./reference";

export type UserRole = "SAKSBEHANDLER" | "FAGANSVARLIG" | "SUPERBRUKER" | "ADMIN" | "UTVIKLER" | "LESETILGANG";
export type UserStatus = "AKTIV" | "INAKTIV" | "INVITERT" | "SPERRET";

export interface NeessiUser {
  ident: string;
  name: string;
  email: string;
  enhetId: string;
  roles: UserRole[];
  status: UserStatus;
  /** Days since last login, null if never */
  lastActiveDaysAgo: number | null;
  createdIso: string;
  /** Sessions in nEESSI the last 30 days */
  sessions30d: number;
  /** SEDs sent the last 30 days */
  seds30d: number;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SAKSBEHANDLER: "Saksbehandler",
  FAGANSVARLIG: "Fagansvarlig",
  SUPERBRUKER: "Superbruker",
  ADMIN: "Administrator",
  UTVIKLER: "Utvikler",
  LESETILGANG: "Lesetilgang",
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  AKTIV: "Aktiv",
  INAKTIV: "Inaktiv",
  INVITERT: "Invitert",
  SPERRET: "Sperret",
};

const ENHET_HEADCOUNT: Record<string, number> = {
  "4530": 34, "0393": 38, "4862": 30, "4817": 16, "4402": 26, "4475": 18, "4489": 14, "4488": 8, "4303": 12,
};

function slug(s: string): string {
  return s
    .toLowerCase()
    .replaceAll("ø", "o").replaceAll("æ", "ae").replaceAll("å", "a")
    .replace(/[^a-z]/g, "");
}

let cached: NeessiUser[] | null = null;

/** All nEESSI users. Deterministic — same list on every request. */
export function getUsers(): NeessiUser[] {
  if (cached) return cached;
  const rng = createRng("users-v1");
  const used = new Set<string>();
  const users: NeessiUser[] = [];
  for (const enhet of ENHETER) {
    const count = ENHET_HEADCOUNT[enhet.id] ?? 10;
    for (let i = 0; i < count; i++) {
      let name = "";
      do {
        name = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
      } while (used.has(name));
      used.add(name);
      const [first, last] = name.split(" ");
      const status = weightedPick<UserStatus>(rng, ["AKTIV", "INAKTIV", "INVITERT", "SPERRET"], (s) =>
        ({ AKTIV: 86, INAKTIV: 8, INVITERT: 4, SPERRET: 1.2 })[s],
      );
      const roles: UserRole[] = ["SAKSBEHANDLER"];
      if (i === 0) roles.push("FAGANSVARLIG");
      if (i === 1 || rng() < 0.06) roles.push("SUPERBRUKER");
      const lastActive =
        status === "INVITERT" ? null : status === "AKTIV" ? Math.floor(rng() ** 3 * 20) : int(rng, 35, 260);
      const sessions = status === "AKTIV" ? int(rng, 8, 62) : 0;
      users.push({
        ident: `${String.fromCharCode(65 + int(rng, 0, 25))}${int(rng, 100000, 999999)}`,
        name,
        email: `${slug(first)}.${slug(last)}@nav.no`,
        enhetId: enhet.id,
        roles,
        status,
        lastActiveDaysAgo: lastActive,
        createdIso: `20${int(rng, 21, 26)}-${String(int(rng, 1, 12)).padStart(2, "0")}-${String(int(rng, 1, 28)).padStart(2, "0")}`,
        sessions30d: sessions,
        seds30d: status === "AKTIV" ? Math.round(sessions * (2 + rng() * 9)) : 0,
      });
    }
  }
  // Team EESSI: admins and developers
  const team: [string, UserRole[]][] = [
    ["Eirik Lysaker", ["ADMIN", "UTVIKLER"]],
    ["Silje Haugland", ["ADMIN", "UTVIKLER"]],
    ["Torbjørn Elvestad", ["UTVIKLER"]],
    ["Hedda Nordbø", ["UTVIKLER"]],
    ["Sindre Fosshaug", ["UTVIKLER"]],
    ["Ragnhild Teigen", ["ADMIN", "FAGANSVARLIG"]],
    ["Ida Granli", ["LESETILGANG", "FAGANSVARLIG"]],
    ["Live Aasland", ["LESETILGANG"]],
  ];
  for (const [name, roles] of team) {
    const [first, last] = name.split(" ");
    users.push({
      ident: `${String.fromCharCode(65 + int(rng, 0, 25))}${int(rng, 100000, 999999)}`,
      name,
      email: `${slug(first)}.${slug(last)}@nav.no`,
      enhetId: "4303",
      roles,
      status: "AKTIV",
      lastActiveDaysAgo: int(rng, 0, 3),
      createdIso: `2022-0${int(rng, 1, 9)}-1${int(rng, 0, 9)}`,
      sessions30d: int(rng, 20, 70),
      seds30d: 0,
    });
  }
  cached = users;
  return users;
}

export function saksbehandlereFor(enhetId: string): NeessiUser[] {
  return getUsers().filter((u) => u.enhetId === enhetId && u.status === "AKTIV" && u.roles.includes("SAKSBEHANDLER"));
}
