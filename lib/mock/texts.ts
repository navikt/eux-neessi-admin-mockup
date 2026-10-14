import { addDaysIso } from "./clock";
import { ENHETER, SED_BY_TYPE } from "./reference";

export type Lang = "en" | "nb";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "Engelsk" },
  { code: "nb", label: "Norsk" },
];

export interface TextField {
  key: string;
  /** Label as shown in the nEESSI form */
  label: string;
  labelEn: string;
  hint?: string;
  maxLength: number;
  rows: number;
}

export interface TextTemplate {
  sed: string;
  /** The form section in nEESSI where the fields live */
  section: string;
  sectionEn: string;
  fields: TextField[];
  /** SEDs of this type sent last 30 days (mock) */
  sentLast30: number;
  /** How users treat the default text: unchanged / edited / cleared (percent) */
  usage: { unchanged: number; edited: number; cleared: number };
}

export type TextValues = Record<string, Record<Lang, string>>;

export type VersionStatus = "PUBLISERT" | "UTKAST";

export interface TextVersion {
  id: string;
  version: number;
  author: string;
  dateIso: string;
  status: VersionStatus;
  note: string;
  values: TextValues;
}

/** "ALLE" = default for every enhet, otherwise an enhet id with an override. */
export type Scope = "ALLE" | string;

/** sed → scope → versions (newest first) */
export type TextStore = Record<string, Record<Scope, TextVersion[]>>;

export const VARIABLES: { key: string; label: string; example: string }[] = [
  { key: "saksbehandler.navn", label: "Saksbehandler", example: "Ragnhild Teigen" },
  { key: "enhet.navn", label: "Enhet", example: "Nav helsetjenesteforvaltning" },
  { key: "mottaker.land", label: "Mottakerland", example: "Sverige" },
  { key: "mottaker.institusjon", label: "Institusjon", example: "Försäkringskassan" },
  { key: "rinasak.id", label: "RINA-sak", example: "1452290" },
  { key: "person.navn", label: "Person", example: "Kari Nordmann" },
  { key: "dato", label: "Dagens dato", example: "" },
  { key: "frist", label: "Svarfrist", example: "" },
];

const f = (key: string, label: string, labelEn: string, maxLength: number, rows: number, hint?: string): TextField => ({
  key,
  label,
  labelEn,
  maxLength,
  rows,
  hint,
});

export const TEMPLATES: TextTemplate[] = [
  {
    sed: "H001",
    section: "Anmodning om informasjon",
    sectionEn: "Request for information",
    fields: [
      f("dokumenter", "Vennligst send oss følgende dokumenter", "Please send us the following documents", 500, 3),
      f("informasjon", "Vennligst send oss følgende informasjon", "Please send us the following information", 500, 3),
      f("sed", "Vennligst send oss følgende SED-er", "Please send us the following SEDs", 255, 2, "Typisk en liste med SED-typer"),
      f("ytterligere", "Ytterligere informasjon", "Additional information", 1000, 4),
    ],
    sentLast30: 2140,
    usage: { unchanged: 58, edited: 34, cleared: 8 },
  },
  {
    sed: "P8000",
    section: "Anmodning om informasjon",
    sectionEn: "Request for information",
    fields: [
      f("opplysninger", "Etterspurte opplysninger", "Information requested", 1000, 4),
      f("ytterligere", "Ytterligere informasjon", "Additional information", 500, 3),
    ],
    sentLast30: 1310,
    usage: { unchanged: 41, edited: 52, cleared: 7 },
  },
  {
    sed: "F001",
    section: "Fastsettelse av forrang",
    sectionEn: "Determination of priority",
    fields: [f("ytterligere", "Ytterligere informasjon", "Additional information", 500, 4)],
    sentLast30: 980,
    usage: { unchanged: 66, edited: 25, cleared: 9 },
  },
  {
    sed: "A003",
    section: "Begrunnelse for lovvalg",
    sectionEn: "Grounds for the applicable legislation",
    fields: [f("begrunnelse", "Begrunnelse", "Reasoning", 1000, 4), f("ytterligere", "Ytterligere informasjon", "Additional information", 500, 2)],
    sentLast30: 1620,
    usage: { unchanged: 72, edited: 24, cleared: 4 },
  },
  {
    sed: "U001",
    section: "Anmodning om perioder",
    sectionEn: "Request for periods",
    fields: [f("ytterligere", "Ytterligere informasjon", "Additional information", 500, 3)],
    sentLast30: 1150,
    usage: { unchanged: 80, edited: 15, cleared: 5 },
  },
  {
    sed: "S080",
    section: "Anmodning om kontantytelser",
    sectionEn: "Request for cash benefits",
    fields: [f("ytterligere", "Ytterligere informasjon", "Additional information", 500, 3)],
    sentLast30: 420,
    usage: { unchanged: 63, edited: 30, cleared: 7 },
  },
  {
    sed: "X009",
    section: "Påminnelse",
    sectionEn: "Reminder",
    fields: [f("detaljer", "Detaljer om påminnelsen", "Reminder details", 500, 4)],
    sentLast30: 860,
    usage: { unchanged: 77, edited: 19, cleared: 4 },
  },
  {
    sed: "X008",
    section: "Ugyldiggjøring",
    sectionEn: "Invalidation",
    fields: [f("begrunnelse", "Annen begrunnelse", "Other reason", 255, 2, "Brukes når «Annet» er valgt som årsak")],
    sentLast30: 310,
    usage: { unchanged: 49, edited: 44, cleared: 7 },
  },
  {
    sed: "X001",
    section: "Avslutning av sak",
    sectionEn: "Closing the case",
    fields: [f("begrunnelse", "Begrunnelse for avslutning", "Reason for closure", 255, 2)],
    sentLast30: 740,
    usage: { unchanged: 84, edited: 12, cleared: 4 },
  },
];

export const TEMPLATE_BY_SED: Record<string, TextTemplate> = Object.fromEntries(TEMPLATES.map((t) => [t.sed, t]));

type Seed = { sed: string; scope: Scope; versions: { daysAgo: number; author: string; status?: VersionStatus; note: string; values: Record<string, [string, string]> }[] };

const SEEDS: Seed[] = [
  {
    sed: "H001",
    scope: "ALLE",
    versions: [
      {
        daysAgo: 12,
        author: "Ragnhild Teigen",
        note: "La til variabel for svarfrist",
        values: {
          dokumenter: [
            "Please send us copies of relevant documents concerning {{person.navn}}, such as medical certificates, decisions and invoices.",
            "Vennligst send oss kopi av relevante dokumenter for {{person.navn}}, for eksempel legeerklæringer, vedtak og fakturaer.",
          ],
          informasjon: [
            "Please send us information about the periods of insurance and any benefits paid to the person in {{mottaker.land}}.",
            "Vennligst send oss opplysninger om trygdeperioder og eventuelle ytelser utbetalt til personen i {{mottaker.land}}.",
          ],
          sed: ["S072, H002", "S072, H002"],
          ytterligere: [
            "We kindly ask for a reply within {{frist}}. Please refer to RINA case {{rinasak.id}} in all correspondence.\n\nKind regards,\n{{saksbehandler.navn}}\n{{enhet.navn}}",
            "Vi ber om svar innen {{frist}}. Vennligst henvis til RINA-sak {{rinasak.id}} i all korrespondanse.\n\nMed vennlig hilsen\n{{saksbehandler.navn}}\n{{enhet.navn}}",
          ],
        },
      },
      {
        daysAgo: 96,
        author: "Jonas Vikanes",
        note: "Første versjon migrert fra eux-web-app",
        values: {
          dokumenter: ["Please send us relevant documents.", "Vennligst send oss relevante dokumenter."],
          informasjon: ["Please send us the requested information.", "Vennligst send oss etterspurt informasjon."],
          sed: ["", ""],
          ytterligere: ["Kind regards,\n{{saksbehandler.navn}}", "Med vennlig hilsen\n{{saksbehandler.navn}}"],
        },
      },
    ],
  },
  {
    sed: "H001",
    scope: "4489",
    versions: [
      {
        daysAgo: 1,
        author: "Frida Furuheim",
        status: "UTKAST",
        note: "Presisering om EHIC – venter på godkjenning",
        values: {
          dokumenter: [
            "Please send us the invoice, the medical report and a copy of the European Health Insurance Card (EHIC) used by {{person.navn}}.",
            "Vennligst send oss faktura, medisinsk rapport og kopi av europeisk helsetrygdkort (EHIC) brukt av {{person.navn}}.",
          ],
          informasjon: [
            "Please confirm the dates of treatment and whether the treatment was planned or became necessary during the stay.",
            "Vennligst bekreft behandlingsdatoer og om behandlingen var planlagt eller ble nødvendig under oppholdet.",
          ],
          sed: ["S080, H002", "S080, H002"],
          ytterligere: [
            "Helsetjenesteforvaltningen handles all reimbursement claims for Norway. Please refer to RINA case {{rinasak.id}}.\n\nKind regards,\n{{saksbehandler.navn}}\n{{enhet.navn}}",
            "Helsetjenesteforvaltningen behandler alle refusjonskrav for Norge. Vennligst henvis til RINA-sak {{rinasak.id}}.\n\nMed vennlig hilsen\n{{saksbehandler.navn}}\n{{enhet.navn}}",
          ],
        },
      },
      {
        daysAgo: 34,
        author: "Frida Furuheim",
        note: "Egen tekst for helserefusjon",
        values: {
          dokumenter: [
            "Please send us the invoice and the medical report for {{person.navn}}.",
            "Vennligst send oss faktura og medisinsk rapport for {{person.navn}}.",
          ],
          informasjon: ["Please confirm the dates of treatment.", "Vennligst bekreft behandlingsdatoer."],
          sed: ["S080", "S080"],
          ytterligere: ["Kind regards,\n{{saksbehandler.navn}}\n{{enhet.navn}}", "Med vennlig hilsen\n{{saksbehandler.navn}}\n{{enhet.navn}}"],
        },
      },
    ],
  },
  {
    sed: "H001",
    scope: "4862",
    versions: [
      {
        daysAgo: 21,
        author: "Lars Elvestad",
        note: "Tilpasset familieytelser",
        values: {
          dokumenter: [
            "Please send us birth certificates for the children and documentation of the family situation of {{person.navn}}.",
            "Vennligst send oss fødselsattester for barna og dokumentasjon på familiesituasjonen til {{person.navn}}.",
          ],
          informasjon: [
            "Please inform us whether family benefits are paid in {{mottaker.land}}, from which date and the monthly amount.",
            "Vennligst opplys om det utbetales familieytelser i {{mottaker.land}}, fra hvilken dato og månedlig beløp.",
          ],
          sed: ["F002", "F002"],
          ytterligere: ["Kind regards,\n{{saksbehandler.navn}}\n{{enhet.navn}}", "Med vennlig hilsen\n{{saksbehandler.navn}}\n{{enhet.navn}}"],
        },
      },
    ],
  },
  {
    sed: "P8000",
    scope: "ALLE",
    versions: [
      {
        daysAgo: 45,
        author: "Tuva Aasland",
        note: "Oppdatert etter fagmøte pensjon",
        values: {
          opplysninger: [
            "Please send us the complete insurance record (P5000) and information about any pension granted to {{person.navn}} in {{mottaker.land}}.",
            "Vennligst send oss fullstendig oversikt over trygdetid (P5000) og opplysninger om pensjon innvilget til {{person.navn}} i {{mottaker.land}}.",
          ],
          ytterligere: ["Kind regards,\n{{saksbehandler.navn}}\n{{enhet.navn}}", "Med vennlig hilsen\n{{saksbehandler.navn}}\n{{enhet.navn}}"],
        },
      },
    ],
  },
  {
    sed: "P8000",
    scope: "0393",
    versions: [
      {
        daysAgo: 8,
        author: "Bjørnar Skarsvåg",
        note: "Lagt til krav om kontoopplysninger",
        values: {
          opplysninger: [
            "Please send us the insurance record (P5000), the pension decision (P6000) and confirmed bank details (IBAN/BIC) for {{person.navn}}.",
            "Vennligst send oss trygdetid (P5000), pensjonsvedtak (P6000) og bekreftede kontoopplysninger (IBAN/BIC) for {{person.navn}}.",
          ],
          ytterligere: [
            "Nav pensjon utland is the competent institution for all pensions paid abroad.\n\nKind regards,\n{{saksbehandler.navn}}",
            "Nav pensjon utland er kompetent institusjon for alle pensjoner utbetalt i utlandet.\n\nMed vennlig hilsen\n{{saksbehandler.navn}}",
          ],
        },
      },
    ],
  },
  {
    sed: "F001",
    scope: "ALLE",
    versions: [
      {
        daysAgo: 60,
        author: "Astrid Østerås",
        note: "Standardtekst for forrang",
        values: {
          ytterligere: [
            "Norway considers itself secondarily competent for family benefits. Please confirm the priority and send us F002 within {{frist}}.",
            "Norge anser seg som sekundært kompetent for familieytelser. Vennligst bekreft forrang og send oss F002 innen {{frist}}.",
          ],
        },
      },
    ],
  },
  {
    sed: "F001",
    scope: "4817",
    versions: [
      {
        daysAgo: 15,
        author: "Frida Furuheim",
        note: "Kontantstøtte-spesifikk tekst",
        values: {
          ytterligere: [
            "This request concerns cash-for-care benefit (kontantstøtte). Please confirm the priority and send us F002 within {{frist}}.",
            "Denne anmodningen gjelder kontantstøtte. Vennligst bekreft forrang og send oss F002 innen {{frist}}.",
          ],
        },
      },
    ],
  },
  {
    sed: "A003",
    scope: "ALLE",
    versions: [
      {
        daysAgo: 120,
        author: "Aksel Fosshaug",
        note: "Første versjon",
        values: {
          begrunnelse: [
            "Based on the information provided, Norway has determined the applicable legislation in accordance with Article 13 of Regulation (EC) No 883/2004.",
            "Basert på opplysningene har Norge fastsatt lovvalg i henhold til artikkel 13 i forordning (EF) nr. 883/2004.",
          ],
          ytterligere: ["", ""],
        },
      },
    ],
  },
  {
    sed: "U001",
    scope: "ALLE",
    versions: [
      {
        daysAgo: 30,
        author: "Jonas Vikanes",
        note: "Første versjon",
        values: {
          ytterligere: [
            "Please send us the periods of insurance and employment (PD U1) for {{person.navn}}.",
            "Vennligst send oss perioder med trygd og arbeid (PD U1) for {{person.navn}}.",
          ],
        },
      },
    ],
  },
  {
    sed: "X009",
    scope: "ALLE",
    versions: [
      {
        daysAgo: 5,
        author: "Ragnhild Teigen",
        note: "Mer vennlig tone",
        values: {
          detaljer: [
            "We kindly remind you of our request in RINA case {{rinasak.id}}. We would be grateful for a reply as soon as possible.\n\nKind regards,\n{{saksbehandler.navn}}",
            "Vi minner vennlig om vår forespørsel i RINA-sak {{rinasak.id}}. Vi setter pris på et svar så snart som mulig.\n\nMed vennlig hilsen\n{{saksbehandler.navn}}",
          ],
        },
      },
      {
        daysAgo: 70,
        author: "Jonas Vikanes",
        note: "Første versjon",
        values: {
          detaljer: ["Reminder: please reply to our request in case {{rinasak.id}}.", "Påminnelse: vennligst svar på vår forespørsel i sak {{rinasak.id}}."],
        },
      },
    ],
  },
  {
    sed: "X008",
    scope: "ALLE",
    versions: [
      {
        daysAgo: 52,
        author: "Astrid Østerås",
        note: "Første versjon",
        values: { begrunnelse: ["The SED was sent by mistake and is hereby invalidated.", "SED-en ble sendt ved en feil og ugyldiggjøres herved."] },
      },
    ],
  },
];

let seedCache: { today: string; store: TextStore } | null = null;

export function seedStore(todayIso: string): TextStore {
  if (seedCache?.today === todayIso) return seedCache.store;
  const store: TextStore = {};
  for (const t of TEMPLATES) store[t.sed] = {};
  for (const s of SEEDS) {
    const n = s.versions.length;
    store[s.sed][s.scope] = s.versions.map((v, i) => ({
      id: `${s.sed}-${s.scope}-${n - i}`,
      version: n - i,
      author: v.author,
      dateIso: addDaysIso(todayIso, -v.daysAgo),
      status: v.status ?? "PUBLISERT",
      note: v.note,
      values: Object.fromEntries(Object.entries(v.values).map(([k, [en, nb]]) => [k, { en, nb }])),
    }));
  }
  seedCache = { today: todayIso, store };
  return store;
}

export function emptyValues(t: TextTemplate): TextValues {
  return Object.fromEntries(t.fields.map((fl) => [fl.key, { en: "", nb: "" }]));
}

export function latestPublished(versions: TextVersion[] | undefined): TextVersion | undefined {
  return versions?.find((v) => v.status === "PUBLISERT");
}

export function fillVariables(text: string, ctx: Record<string, string>): { text: string; isVar: boolean }[] {
  const out: { text: string; isVar: boolean }[] = [];
  const re = /\{\{\s*([\w.]+)\s*\}\}/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), isVar: false });
    out.push({ text: ctx[m[1]] ?? m[0], isVar: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), isVar: false });
  return out;
}

export function sedLabel(sed: string): string {
  return SED_BY_TYPE[sed]?.name ?? sed;
}

export const ENHET_IDS = ENHETER.map((e) => e.id);
