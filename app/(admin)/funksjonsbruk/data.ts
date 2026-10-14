import { addDaysIso, diffDays } from "@/lib/mock/clock";
import { clamp, createRng, normal } from "@/lib/mock/random";
import { ENHETER } from "@/lib/mock/reference";
import { getUsers } from "@/lib/mock/users";

/** Feature adoption mock data for nEESSI (eux-web-app). Deterministic. */

export type CategoryId = "saksbehandling" | "dokumenter" | "navigasjon" | "pdu1" | "administrativ" | "kontroll";

export interface Category {
  id: CategoryId;
  name: string;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: "saksbehandling", name: "Saksbehandling", color: "#2a6cb3" },
  { id: "dokumenter", name: "Dokumenter", color: "#457c9d" },
  { id: "navigasjon", name: "Navigasjon og søk", color: "#3f8f8a" },
  { id: "pdu1", name: "PDU1", color: "#c98a2b" },
  { id: "administrativ", name: "Administrative SED-er", color: "#c0765d" },
  { id: "kontroll", name: "Kontroll", color: "#7d6aa5" },
];

export type Verdict = "TAR_AV" | "LOVENDE" | "LAV";

export interface FeatureEnhetUsage {
  enhetId: string;
  /** Uses per week per user in the enhet (last 4 weeks). */
  intensity: number;
  uses: number;
  users: number;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  category: CategoryId;
  route: string;
  launchIso: string;
  isNew: boolean;
  /** Days since launch (only meaningful for new features). */
  daysSinceLaunch: number;
  /** Weekly active users, oldest first, 26 weeks. */
  wau: number[];
  /** Uses (actions) per week, oldest first, 26 weeks. */
  uses: number[];
  uniqueEnheter: number;
  /** % change in WAU, last 4 weeks vs previous 4 weeks. */
  delta: number;
  trend: "opp" | "flat" | "ned";
  /** Users who should use the feature (based on enhet). */
  targetUsers: number;
  /** Share of target users that used it last 4 weeks (0..1). */
  adoption: number;
  /** Median days from launch (or onboarding) until first use. */
  timeToFirstUse: number;
  verdict?: Verdict;
  /** Weekly adoption since launch (0..1 of target users). Only for new features. */
  adoptionCurve?: { week: number; label: string; pct: number }[];
  byEnhet: FeatureEnhetUsage[];
  dormant: boolean;
  suggestion?: string;
}

export interface WeekPoint {
  week: string;
  startIso: string;
}

export interface AdoptionData {
  weeks: WeekPoint[];
  features: Feature[];
  categories: Category[];
  enheter: { id: string; shortName: string; users: number }[];
  totals: {
    wau: number[];
    dau: number;
    dauSeries: number[];
    activeUsers: number;
    featuresInUse: number;
    newest: { name: string; launchIso: string; daysAgo: number };
  };
}

interface FeatureSpec {
  id: string;
  name: string;
  description: string;
  category: CategoryId;
  route: string;
  /** Share of target users who use it weekly at steady state. */
  reach: number;
  /** Uses per user per week. */
  freq: number;
  /** WAU growth per week as a fraction (negative = declining). */
  slope?: number;
  /** Launched N days ago; omitted = old feature. */
  launchedDaysAgo?: number;
  /** Adoption ceiling + speed for new features. */
  ramp?: { ceiling: number; speed: number };
  /** Relative affinity by enhet id (default 1). Enheter not listed get `otherAffinity`. */
  affinity?: Record<string, number>;
  otherAffinity?: number;
  suggestion?: string;
}

const SPECS: FeatureSpec[] = [
  { id: "opprett-sak", name: "Opprett sak (BUC)", description: "Opprette ny BUC og første SED", category: "saksbehandling", route: "/opprettsak", reach: 0.82, freq: 6.5, slope: 0.002 },
  { id: "svarsed", name: "Svar på SED (SvarSED)", description: "Fylle ut og sende svar-SED i eksisterende sak", category: "saksbehandling", route: "/svarsed", reach: 0.9, freq: 11, slope: 0.004 },
  { id: "journalforing", name: "Journalføring", description: "Journalføre inn- og utgående SED-er i fagsak", category: "dokumenter", route: "/journalforing", reach: 0.86, freq: 9, slope: 0.001 },
  { id: "sok", name: "Søk etter sak", description: "Søk på RINA-saksnummer, fnr eller fagsak", category: "navigasjon", route: "/sok", reach: 0.95, freq: 18, slope: 0.001 },
  { id: "vedlegg", name: "Vedlegg", description: "Legge ved dokumenter fra Joark på SED", category: "dokumenter", route: "/vedlegg", reach: 0.58, freq: 3.2, slope: 0.003 },
  { id: "forhandsvis", name: "Forhåndsvis SED (PDF)", description: "Se SED som PDF før sending", category: "dokumenter", route: "/pdf", reach: 0.66, freq: 4.8, slope: 0.006 },
  {
    id: "relaterte",
    name: "Relaterte saker",
    description: "Se andre BUC-er for samme person",
    category: "navigasjon",
    route: "/relaterte",
    reach: 0.34,
    freq: 1.6,
    slope: -0.028,
    suggestion: "Bruken har falt jevnt siden sommeren. Vurder å vise relaterte saker direkte i saksvisningen i stedet for i egen fane.",
  },
  {
    id: "avslutt",
    name: "Avslutt sak",
    description: "Lukke BUC i RINA med X001",
    category: "saksbehandling",
    route: "/avslutt",
    reach: 0.4,
    freq: 1.4,
    slope: -0.004,
  },
  {
    id: "videresend",
    name: "Videresend sak",
    description: "Videresende BUC til annen institusjon (X100)",
    category: "saksbehandling",
    route: "/videresend",
    reach: 0.09,
    freq: 0.6,
    slope: -0.021,
    suggestion: "Svært få bruker funksjonen, og de fleste videresendinger gjøres fortsatt i RINA. Undersøk med fagansvarlige om behovet – eller gjør knappen mer synlig.",
  },
  {
    id: "pdu1",
    name: "PDU1 (A/U)",
    description: "Opprette og sende PDU1 for arbeidsledighet",
    category: "pdu1",
    route: "/pdu1",
    reach: 0.78,
    freq: 7,
    slope: 0.003,
    affinity: { "4402": 1, "4475": 1.1 },
    otherAffinity: 0,
  },
  {
    id: "kontroller-pdu1",
    name: "Kontrollér PDU1",
    description: "Kontroll av PDU1 mot registerdata før sending",
    category: "pdu1",
    route: "/pdu1/kontroll",
    reach: 0.2,
    freq: 1.2,
    launchedDaysAgo: 68,
    ramp: { ceiling: 0.16, speed: 0.55 },
    affinity: { "4402": 1, "4475": 1 },
    otherAffinity: 0,
    suggestion: "Lav bruk ti uker etter lansering. Saksbehandlerne i Egersund bruker den mest – snakk med dem og vurder å gjøre kontrollen til et automatisk steg i PDU1-flyten.",
  },
  {
    id: "arlig-kontroll",
    name: "Årlig kontroll",
    description: "Årlig kontroll av lovvalg og medlemskap (LA_BUC)",
    category: "kontroll",
    route: "/arligkontroll",
    reach: 0.6,
    freq: 4,
    launchedDaysAgo: 35,
    ramp: { ceiling: 0.62, speed: 0.75 },
    affinity: { "4530": 1, "4303": 0.25 },
    otherAffinity: 0,
  },
  {
    id: "standardtekster",
    name: "Standardtekster",
    description: "Ferdige fritekster fra nEESSI admin i SED-skjemaene",
    category: "saksbehandling",
    route: "/svarsed#standardtekst",
    reach: 0.7,
    freq: 5.5,
    launchedDaysAgo: 14,
    ramp: { ceiling: 0.74, speed: 1.6 },
  },
  { id: "tildel", name: "Tildel saksbehandler", description: "Tildele sak til kollega i enheten", category: "saksbehandling", route: "/tildel", reach: 0.3, freq: 2.2, slope: 0.008 },
  { id: "x009", name: "Påminnelse X009", description: "Sende purring på ubesvart SED", category: "administrativ", route: "/x009", reach: 0.42, freq: 1.8, slope: 0.012 },
  {
    id: "x008",
    name: "Ugyldiggjør SED (X008)",
    description: "Ugyldiggjøre feilsendt SED",
    category: "administrativ",
    route: "/x008",
    reach: 0.11,
    freq: 0.4,
    slope: -0.012,
    suggestion: "Lav bruk er forventet – X008 brukes bare ved feil. Fall i bruk kan bety færre feilsendinger. Behold, men følg med.",
  },
  { id: "mine-saker", name: "Mine saker / oversikt", description: "Personlig oversikt over egne saker og frister", category: "navigasjon", route: "/", reach: 0.88, freq: 14, slope: 0.005 },
];

const WEEKS = 26;

function isoWeek(iso: string): number {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

export function getAdoptionData(todayIso: string): AdoptionData {
  const rng = createRng(`funksjonsbruk-v1-${todayIso.slice(0, 7)}`);
  const users = getUsers().filter((u) => u.status === "AKTIV" && u.roles.includes("SAKSBEHANDLER"));
  const usersByEnhet = Object.fromEntries(ENHETER.map((e) => [e.id, users.filter((u) => u.enhetId === e.id).length]));

  // Monday of the current week
  const weekday = (new Date(`${todayIso}T00:00:00Z`).getUTCDay() + 6) % 7;
  const thisMonday = addDaysIso(todayIso, -weekday);
  const weeks: WeekPoint[] = Array.from({ length: WEEKS }, (_, i) => {
    const startIso = addDaysIso(thisMonday, -(WEEKS - 1 - i) * 7);
    return { startIso, week: `Uke ${isoWeek(startIso)}` };
  });
  // Seasonal factor: summer holidays (weeks 28–32) dip, current week partial is extrapolated
  const season = weeks.map((w) => {
    const n = isoWeek(w.startIso);
    return n >= 28 && n <= 31 ? 0.55 : n === 27 || n === 32 ? 0.8 : 1;
  });

  const features: Feature[] = SPECS.map((spec) => {
    const frng = createRng(`feature-${spec.id}`);
    const affinityOf = (id: string) => spec.affinity?.[id] ?? (spec.affinity ? (spec.otherAffinity ?? 1) : 1);
    const targetUsers = ENHETER.reduce((s, e) => s + (affinityOf(e.id) > 0 ? usersByEnhet[e.id] : 0), 0);
    const launchIso = spec.launchedDaysAgo !== undefined ? addDaysIso(todayIso, -spec.launchedDaysAgo) : `20${21 + Math.floor(frng() * 3)}-0${1 + Math.floor(frng() * 9)}-${String(1 + Math.floor(frng() * 27)).padStart(2, "0")}`;

    const wau: number[] = [];
    const uses: number[] = [];
    const curve: { week: number; label: string; pct: number }[] = [{ week: 0, label: "Lansering", pct: 0 }];
    for (let i = 0; i < WEEKS; i++) {
      const wStart = weeks[i].startIso;
      const wEnd = addDaysIso(wStart, 6);
      let share: number;
      if (spec.ramp && spec.launchedDaysAgo !== undefined) {
        if (wEnd < launchIso) {
          share = 0;
        } else {
          const weeksSince = Math.max(0, diffDays(launchIso, wEnd)) / 7;
          share = spec.ramp.ceiling * (1 - Math.exp(-spec.ramp.speed * (weeksSince + 0.35)));
          share *= 1 + normal(frng, 0, 0.04);
          curve.push({ week: curve.length, label: `Uke ${curve.length}`, pct: clamp(share, 0, 1) });
        }
      } else {
        const t = i - (WEEKS - 1);
        share = spec.reach * Math.exp((spec.slope ?? 0) * t * 4) * (1 + normal(frng, 0, 0.035));
      }
      const w = Math.round(clamp(share, 0, 0.99) * targetUsers * season[i]);
      wau.push(w);
      uses.push(Math.round(w * spec.freq * (1 + normal(frng, 0, 0.08))));
    }

    const last4 = wau.slice(-4).reduce((a, b) => a + b, 0) / 4;
    const prev4 = wau.slice(-8, -4).reduce((a, b) => a + b, 0) / 4;
    // No baseline (launched within the last 8 weeks) → mark as "new" with a sentinel value
    const delta = prev4 ? ((last4 - prev4) / prev4) * 100 : last4 ? 999 : 0;
    const trend = delta > 6 ? "opp" : delta < -6 ? "ned" : "flat";
    const adoption = targetUsers ? clamp(Math.max(...wau.slice(-4)) / targetUsers * 1.12, 0, 1) : 0;

    const byEnhet: FeatureEnhetUsage[] = ENHETER.map((e) => {
      const aff = affinityOf(e.id);
      const enhetUsers = usersByEnhet[e.id];
      const u = aff > 0 ? Math.round(clamp(adoption * aff * (0.75 + frng() * 0.5), 0, 0.9 + frng() * 0.1) * enhetUsers) : 0;
      const intensity = u ? spec.freq * (0.6 + frng() * 0.9) * (u / Math.max(1, enhetUsers)) : 0;
      return { enhetId: e.id, users: u, uses: Math.round(intensity * enhetUsers * 4), intensity };
    });
    const uniqueEnheter = byEnhet.filter((b) => b.users > 0).length;

    const isNew = spec.launchedDaysAgo !== undefined;
    let verdict: Verdict | undefined;
    if (isNew) verdict = adoption >= 0.45 && delta > 0 ? "TAR_AV" : adoption >= 0.25 ? "LOVENDE" : "LAV";
    const dormant = !isNew ? delta < -8 || adoption < 0.15 : verdict === "LAV";
    const ttf = isNew ? (spec.ramp ? Math.max(0.6, 1.4 / spec.ramp.speed + normal(frng, 0, 0.3)) : 3) : 0.5 + frng() * 2;

    return {
      id: spec.id,
      name: spec.name,
      description: spec.description,
      category: spec.category,
      route: spec.route,
      launchIso,
      isNew,
      daysSinceLaunch: spec.launchedDaysAgo ?? diffDays(launchIso, todayIso),
      wau,
      uses,
      uniqueEnheter,
      delta,
      trend,
      targetUsers,
      adoption,
      timeToFirstUse: Math.round(ttf * 10) / 10,
      verdict,
      adoptionCurve: isNew ? curve : undefined,
      byEnhet,
      dormant,
      suggestion: spec.suggestion ?? (dormant ? "Bruken er lav eller fallende. Sjekk om funksjonen er lett å finne, og spør brukerne om de trenger den." : undefined),
    };
  });

  // Overall WAU: distinct users using nEESSI weekly — slightly above the most used feature
  const wauTotal = weeks.map((_, i) => {
    const top = Math.max(...features.map((f) => f.wau[i]));
    return Math.min(users.length, Math.round(top * (1.04 + rng() * 0.03)));
  });
  const dauSeries = wauTotal.map((w) => Math.round(w * (0.6 + rng() * 0.06)));
  const featuresInUse = features.filter((f) => f.wau[WEEKS - 1] > 0).length;
  const newest = features.filter((f) => f.isNew).sort((a, b) => b.launchIso.localeCompare(a.launchIso))[0];

  return {
    weeks,
    features,
    categories: CATEGORIES,
    enheter: ENHETER.map((e) => ({ id: e.id, shortName: e.shortName, users: usersByEnhet[e.id] })),
    totals: {
      wau: wauTotal,
      dau: dauSeries[WEEKS - 1],
      dauSeries,
      activeUsers: users.length,
      featuresInUse,
      newest: { name: newest.name, launchIso: newest.launchIso, daysAgo: diffDays(newest.launchIso, todayIso) },
    },
  };
}
