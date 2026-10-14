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
  SAKSBEHANDLER: { color: "accent", hex: "#2a6cb3", description: "Behandle saker, opprette BUC-er og sende SED-er" },
  FAGANSVARLIG: { color: "info", hex: "#457c9d", description: "Forvalter standardtekster og rutiner for enheten" },
  SUPERBRUKER: { color: "meta-purple", hex: "#7d6aa5", description: "Hjelper kolleger, kan tildele saker på tvers" },
  ADMIN: { color: "brand-magenta", hex: "#c0765d", description: "Full tilgang til nEESSI admin" },
  UTVIKLER: { color: "meta-lime", hex: "#7f9a4a", description: "Teknisk tilgang til verktøy og logger" },
  LESETILGANG: { color: "neutral", hex: "#9aa1ab", description: "Kan se saker og statistikk, men ikke endre" },
};

export const STATUS_ORDER: UserStatus[] = ["AKTIV", "INVITERT", "INAKTIV", "SPERRET"];

export const STATUS_META: Record<UserStatus, { color: "success" | "info" | "neutral" | "danger"; dot: string; hex: string }> = {
  AKTIV: { color: "success", dot: "dot--ok", hex: "#3a8a5f" },
  INVITERT: { color: "info", dot: "dot--warn", hex: "#c98a2b" },
  INAKTIV: { color: "neutral", dot: "", hex: "#9aa1ab" },
  SPERRET: { color: "danger", dot: "dot--down", hex: "#c4505c" },
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

/** Muted single hues from the Nav palette — avatars use a gentle same-hue fade. */
const AVATAR_HUES = ["#2a6cb3", "#457c9d", "#c0765d", "#3f8f8a", "#7d6aa5", "#c49a3c", "#3a8a5f", "#6f7785"];

export function avatarHue(ident: string): string {
  let h = 0;
  for (let i = 0; i < ident.length; i++) h = (h * 31 + ident.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}

export function avatarGradient(ident: string): string {
  const hue = avatarHue(ident);
  return `linear-gradient(135deg, ${hue}, color-mix(in srgb, ${hue} 80%, #1b2430))`;
}
