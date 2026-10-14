import type { NeessiUser, UserRole, UserStatus } from "@/lib/mock/users";

export type { UserRole, UserStatus };

/** A nEESSI user as shown in the admin, with extra enhet access on top of the home enhet. */
export interface AdminUser extends NeessiUser {
  /** Enheter the user can access in addition to the home enhet. */
  extraEnheter: string[];
  /** Set for users invited in this browser session — used for a highlight animation. */
  fresh?: boolean;
}

export interface EnhetOption {
  id: string;
  name: string;
  shortName: string;
}

export const ROLE_ORDER: UserRole[] = ["SAKSBEHANDLER", "FAGANSVARLIG", "SUPERBRUKER", "ADMIN", "UTVIKLER", "LESETILGANG"];

export const ROLE_META: Record<
  UserRole,
  { color: "neutral" | "info" | "meta-purple" | "brand-magenta" | "meta-lime" | "accent"; hex: string; description: string }
> = {
  SAKSBEHANDLER: { color: "accent", hex: "#6366f1", description: "Behandle saker, opprette BUC-er og sende SED-er" },
  FAGANSVARLIG: { color: "info", hex: "#0ea5e9", description: "Forvalter standardtekster og rutiner for enheten" },
  SUPERBRUKER: { color: "meta-purple", hex: "#a855f7", description: "Hjelper kolleger, kan tildele saker på tvers" },
  ADMIN: { color: "brand-magenta", hex: "#ec4899", description: "Full tilgang til nEESSI admin" },
  UTVIKLER: { color: "meta-lime", hex: "#84cc16", description: "Teknisk tilgang til verktøy og logger" },
  LESETILGANG: { color: "neutral", hex: "#94a3b8", description: "Kan se saker og statistikk, men ikke endre" },
};

export const STATUS_ORDER: UserStatus[] = ["AKTIV", "INVITERT", "INAKTIV", "SPERRET"];

export const STATUS_META: Record<UserStatus, { color: "success" | "info" | "neutral" | "danger"; dot: string; hex: string }> = {
  AKTIV: { color: "success", dot: "dot--ok", hex: "#10b981" },
  INVITERT: { color: "info", dot: "dot--warn", hex: "#f59e0b" },
  INAKTIV: { color: "neutral", dot: "", hex: "#94a3b8" },
  SPERRET: { color: "danger", dot: "dot--down", hex: "#f43f5e" },
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** "I dag", "I går", "for 3 dager siden" … */
export function sinceText(days: number | null): string {
  if (days === null) return "Aldri innlogget";
  if (days === 0) return "I dag";
  if (days === 1) return "I går";
  if (days < 7) return `for ${days} dager siden`;
  if (days < 14) return "for 1 uke siden";
  if (days < 30) return `for ${Math.floor(days / 7)} uker siden`;
  if (days < 60) return "for 1 måned siden";
  if (days < 365) return `for ${Math.floor(days / 30)} måneder siden`;
  return `for ${Math.floor(days / 365)} år siden`;
}

const AVATAR_GRADIENTS = [
  ["#6366f1", "#a855f7"],
  ["#0ea5e9", "#6366f1"],
  ["#ec4899", "#f97316"],
  ["#14b8a6", "#0ea5e9"],
  ["#8b5cf6", "#ec4899"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#14b8a6"],
  ["#3b82f6", "#06b6d4"],
];

export function avatarGradient(ident: string): string {
  let h = 0;
  for (let i = 0; i < ident.length; i++) h = (h * 31 + ident.charCodeAt(i)) >>> 0;
  const [a, b] = AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}
