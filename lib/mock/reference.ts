/**
 * Static EESSI reference data: countries, sectors, NAV enheter and SED types.
 * Safe to import from both server and client components.
 */

export type CountryCode =
  | "AT" | "BE" | "BG" | "CH" | "CY" | "CZ" | "DE" | "DK" | "EE" | "ES" | "FI"
  | "FR" | "GB" | "GR" | "HR" | "HU" | "IE" | "IS" | "IT" | "LI" | "LT" | "LU"
  | "LV" | "MT" | "NL" | "PL" | "PT" | "RO" | "SE" | "SI" | "SK";

export interface Country {
  code: CountryCode;
  name: string;
  /** ISO 3166-1 numeric id, matches `world-atlas` feature ids. */
  numeric: string;
  /** Relative exchange volume with Norway. */
  weight: number;
  /** How slow the country is to answer us, 1 = EU average. */
  slowness: number;
}

export const COUNTRIES: Country[] = [
  { code: "SE", name: "Sverige", numeric: "752", weight: 18, slowness: 0.7 },
  { code: "PL", name: "Polen", numeric: "616", weight: 14, slowness: 1.15 },
  { code: "DK", name: "Danmark", numeric: "208", weight: 12, slowness: 0.75 },
  { code: "DE", name: "Tyskland", numeric: "276", weight: 9, slowness: 1.1 },
  { code: "FI", name: "Finland", numeric: "246", weight: 6, slowness: 0.8 },
  { code: "LT", name: "Litauen", numeric: "440", weight: 6, slowness: 1.0 },
  { code: "GB", name: "Storbritannia", numeric: "826", weight: 4, slowness: 1.45 },
  { code: "ES", name: "Spania", numeric: "724", weight: 4, slowness: 1.3 },
  { code: "LV", name: "Latvia", numeric: "428", weight: 3, slowness: 0.95 },
  { code: "NL", name: "Nederland", numeric: "528", weight: 3, slowness: 0.85 },
  { code: "FR", name: "Frankrike", numeric: "250", weight: 3, slowness: 1.4 },
  { code: "IT", name: "Italia", numeric: "380", weight: 2.5, slowness: 1.65 },
  { code: "RO", name: "Romania", numeric: "642", weight: 2.5, slowness: 1.35 },
  { code: "EE", name: "Estland", numeric: "233", weight: 2, slowness: 0.8 },
  { code: "PT", name: "Portugal", numeric: "620", weight: 1.5, slowness: 1.2 },
  { code: "IS", name: "Island", numeric: "352", weight: 1.5, slowness: 0.9 },
  { code: "BE", name: "Belgia", numeric: "056", weight: 1.2, slowness: 1.2 },
  { code: "AT", name: "Østerrike", numeric: "040", weight: 1, slowness: 1.0 },
  { code: "CH", name: "Sveits", numeric: "756", weight: 1, slowness: 0.95 },
  { code: "IE", name: "Irland", numeric: "372", weight: 1, slowness: 1.1 },
  { code: "CZ", name: "Tsjekkia", numeric: "203", weight: 1, slowness: 1.05 },
  { code: "SK", name: "Slovakia", numeric: "703", weight: 0.8, slowness: 1.2 },
  { code: "HU", name: "Ungarn", numeric: "348", weight: 0.8, slowness: 1.3 },
  { code: "BG", name: "Bulgaria", numeric: "100", weight: 0.8, slowness: 1.5 },
  { code: "GR", name: "Hellas", numeric: "300", weight: 0.7, slowness: 1.8 },
  { code: "HR", name: "Kroatia", numeric: "191", weight: 0.5, slowness: 1.25 },
  { code: "SI", name: "Slovenia", numeric: "705", weight: 0.3, slowness: 1.0 },
  { code: "LU", name: "Luxembourg", numeric: "442", weight: 0.2, slowness: 0.9 },
  { code: "CY", name: "Kypros", numeric: "196", weight: 0.1, slowness: 1.4 },
  { code: "MT", name: "Malta", numeric: "470", weight: 0.1, slowness: 1.3 },
  { code: "LI", name: "Liechtenstein", numeric: "438", weight: 0.05, slowness: 1.0 },
];

export const COUNTRY_BY_CODE: Record<CountryCode, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c]),
) as Record<CountryCode, Country>;

export const COUNTRY_BY_NUMERIC: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.numeric, c]),
);

export type SectorCode = "AW" | "FB" | "H" | "LA" | "M" | "P" | "S" | "UB" | "X";

export interface Sector {
  code: SectorCode;
  name: string;
  color: string;
  /** Share of total SED volume. */
  weight: number;
  /** Baseline median days Norway uses to answer a request in this sector. */
  baseAnswerDays: number;
}

export const SECTORS: Sector[] = [
  { code: "P", name: "Pensjon", color: "#6366f1", weight: 0.24, baseAnswerDays: 32 },
  { code: "LA", name: "Lovvalg", color: "#0ea5e9", weight: 0.18, baseAnswerDays: 21 },
  { code: "FB", name: "Familieytelser", color: "#ec4899", weight: 0.14, baseAnswerDays: 26 },
  { code: "S", name: "Sykdom", color: "#f43f5e", weight: 0.12, baseAnswerDays: 15 },
  { code: "H", name: "Horisontale", color: "#8b5cf6", weight: 0.11, baseAnswerDays: 12 },
  { code: "UB", name: "Arbeidsledighet", color: "#f59e0b", weight: 0.09, baseAnswerDays: 9 },
  { code: "X", name: "Administrative", color: "#64748b", weight: 0.08, baseAnswerDays: 5 },
  { code: "AW", name: "Arbeidsskade", color: "#f97316", weight: 0.03, baseAnswerDays: 30 },
  { code: "M", name: "Medisinsk", color: "#14b8a6", weight: 0.01, baseAnswerDays: 28 },
];

export const SECTOR_BY_CODE: Record<SectorCode, Sector> = Object.fromEntries(
  SECTORS.map((s) => [s.code, s]),
) as Record<SectorCode, Sector>;

export interface Enhet {
  id: string;
  name: string;
  shortName: string;
  /** Share of each sector's volume this enhet handles. */
  sectors: Partial<Record<SectorCode, number>>;
}

export const ENHETER: Enhet[] = [
  {
    id: "4530",
    name: "Nav medlemskap og avgift",
    shortName: "Medlemskap og avgift",
    sectors: { LA: 1, H: 0.15 },
  },
  {
    id: "0393",
    name: "Nav pensjon utland",
    shortName: "Pensjon utland",
    sectors: { P: 0.75, H: 0.2 },
  },
  {
    id: "4862",
    name: "Nav familie- og pensjonsytelser utland",
    shortName: "Familie- og pensjon utland",
    sectors: { FB: 0.6, P: 0.25, H: 0.15 },
  },
  {
    id: "4817",
    name: "Nav familie- og pensjonsytelser Steinkjer",
    shortName: "Familie Steinkjer",
    sectors: { FB: 0.4 },
  },
  {
    id: "4402",
    name: "Nav arbeid og ytelser utland",
    shortName: "Arbeid og ytelser utland",
    sectors: { S: 0.5, UB: 0.4, H: 0.15 },
  },
  {
    id: "4475",
    name: "Nav arbeid og ytelser Egersund",
    shortName: "Arbeid og ytelser Egersund",
    sectors: { UB: 0.6 },
  },
  {
    id: "4489",
    name: "Nav helsetjenesteforvaltning",
    shortName: "Helsetjenesteforvaltning",
    sectors: { S: 0.5, M: 1 },
  },
  {
    id: "4488",
    name: "Nav arbeid og ytelser yrkesskade",
    shortName: "Yrkesskade",
    sectors: { AW: 1 },
  },
  {
    id: "4303",
    name: "Nav id og fordeling",
    shortName: "Id og fordeling",
    sectors: { X: 1, H: 0.35 },
  },
];

export const ENHET_BY_ID: Record<string, Enhet> = Object.fromEntries(ENHETER.map((e) => [e.id, e]));

export function enheterForSector(sector: SectorCode): { enhet: Enhet; share: number }[] {
  return ENHETER.filter((e) => e.sectors[sector]).map((enhet) => ({
    enhet,
    share: enhet.sectors[sector] ?? 0,
  }));
}

export interface SedType {
  type: string;
  name: string;
  sector: SectorCode;
  buc: string;
  /** Share of sector volume. */
  share: number;
  /** For request SEDs: which SED answers it and the deadline in days. */
  reply?: string;
  fristDager?: number;
}

export const SED_TYPES: SedType[] = [
  { type: "P2000", name: "Krav om alderspensjon", sector: "P", buc: "P_BUC_01", share: 0.18, reply: "P5000", fristDager: 90 },
  { type: "P2100", name: "Krav om etterlattepensjon", sector: "P", buc: "P_BUC_02", share: 0.05, reply: "P5000", fristDager: 90 },
  { type: "P5000", name: "Trygdetid i andre land", sector: "P", buc: "P_BUC_01", share: 0.2 },
  { type: "P6000", name: "Melding om vedtak", sector: "P", buc: "P_BUC_01", share: 0.22 },
  { type: "P8000", name: "Anmodning om informasjon", sector: "P", buc: "P_BUC_05", share: 0.2, reply: "P9000", fristDager: 30 },
  { type: "P9000", name: "Svar på anmodning om informasjon", sector: "P", buc: "P_BUC_05", share: 0.15 },
  { type: "A001", name: "Anmodning om unntak", sector: "LA", buc: "LA_BUC_01", share: 0.12, reply: "A002", fristDager: 60 },
  { type: "A002", name: "Delvis eller fullt avslag på unntak", sector: "LA", buc: "LA_BUC_01", share: 0.05 },
  { type: "A003", name: "Beslutning om lovvalg", sector: "LA", buc: "LA_BUC_02", share: 0.22, reply: "A004", fristDager: 60 },
  { type: "A004", name: "Uenighet om lovvalg", sector: "LA", buc: "LA_BUC_02", share: 0.06 },
  { type: "A008", name: "Melding om relevant informasjon", sector: "LA", buc: "LA_BUC_03", share: 0.2 },
  { type: "A009", name: "Melding om utsendt arbeidstaker", sector: "LA", buc: "LA_BUC_04", share: 0.35 },
  { type: "F001", name: "Anmodning om fastsettelse av forrang", sector: "FB", buc: "FB_BUC_01", share: 0.35, reply: "F002", fristDager: 60 },
  { type: "F002", name: "Svar om forrang", sector: "FB", buc: "FB_BUC_01", share: 0.3 },
  { type: "F016", name: "Anmodning om informasjon om familieytelser", sector: "FB", buc: "FB_BUC_02", share: 0.2, reply: "F017", fristDager: 30 },
  { type: "F017", name: "Svar på anmodning om familieytelser", sector: "FB", buc: "FB_BUC_02", share: 0.15 },
  { type: "S080", name: "Anmodning om kontantytelser ved sykdom", sector: "S", buc: "S_BUC_19", share: 0.3, reply: "S081", fristDager: 30 },
  { type: "S081", name: "Svar på anmodning om kontantytelser", sector: "S", buc: "S_BUC_19", share: 0.25 },
  { type: "S009", name: "Anmodning om refusjon", sector: "S", buc: "S_BUC_08", share: 0.25, reply: "S010", fristDager: 45 },
  { type: "S010", name: "Svar på anmodning om refusjon", sector: "S", buc: "S_BUC_08", share: 0.2 },
  { type: "H001", name: "Melding/anmodning om informasjon", sector: "H", buc: "H_BUC_01", share: 0.45, reply: "H002", fristDager: 30 },
  { type: "H002", name: "Svar på anmodning om informasjon", sector: "H", buc: "H_BUC_01", share: 0.35 },
  { type: "H020", name: "Krav om refusjon – administrativ kontroll", sector: "H", buc: "H_BUC_04", share: 0.1, reply: "H021", fristDager: 60 },
  { type: "H021", name: "Svar på krav om refusjon", sector: "H", buc: "H_BUC_04", share: 0.1 },
  { type: "U001", name: "Anmodning om perioder for dagpenger", sector: "UB", buc: "UB_BUC_01", share: 0.4, reply: "U002", fristDager: 21 },
  { type: "U002", name: "Svar med perioder (PD U1)", sector: "UB", buc: "UB_BUC_01", share: 0.35 },
  { type: "U003", name: "Anmodning om referanseinntekt", sector: "UB", buc: "UB_BUC_01", share: 0.15, reply: "U004", fristDager: 21 },
  { type: "U004", name: "Svar med referanseinntekt", sector: "UB", buc: "UB_BUC_01", share: 0.1 },
  { type: "DA001", name: "Anmodning om anerkjennelse av arbeidsskade", sector: "AW", buc: "AW_BUC_01A", share: 0.55, reply: "DA002", fristDager: 60 },
  { type: "DA002", name: "Svar på anerkjennelse av arbeidsskade", sector: "AW", buc: "AW_BUC_01A", share: 0.45 },
  { type: "M050", name: "Anmodning om medisinsk undersøkelse", sector: "M", buc: "M_BUC_03A", share: 0.55, reply: "M051", fristDager: 45 },
  { type: "M051", name: "Svar med medisinsk rapport", sector: "M", buc: "M_BUC_03A", share: 0.45 },
  { type: "X001", name: "Avslutning av sak", sector: "X", buc: "Alle", share: 0.35 },
  { type: "X005", name: "Legg til deltaker", sector: "X", buc: "Alle", share: 0.15 },
  { type: "X008", name: "Ugyldiggjøring av SED", sector: "X", buc: "Alle", share: 0.15 },
  { type: "X009", name: "Påminnelse", sector: "X", buc: "Alle", share: 0.35 },
];

export const SED_BY_TYPE: Record<string, SedType> = Object.fromEntries(SED_TYPES.map((s) => [s.type, s]));

export const REQUEST_SEDS = SED_TYPES.filter((s) => s.reply);
