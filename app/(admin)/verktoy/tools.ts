import {
  ArrowRedoIcon,
  ArrowsCirclepathIcon,
  Buildings3Icon,
  EraserIcon,
  FileCheckmarkIcon,
  PaperplaneIcon,
  TrashIcon,
} from "@navikt/aksel-icons";
import { Institusjonskatalog } from "./tools/Institusjonskatalog";
import { JournalforSed } from "./tools/JournalforSed";
import { PubliserSedHendelser } from "./tools/PubliserSedHendelser";
import { SlettUsendteSaker } from "./tools/SlettUsendteSaker";
import { SpillAvDlq } from "./tools/SpillAvDlq";
import { SynkroniserRinasak } from "./tools/SynkroniserRinasak";
import { TomCache } from "./tools/TomCache";
import type { ToolDefinition } from "./types";

/**
 * Verktøyregisteret.
 *
 * Slik legger du til et nytt verktøy:
 *  1. Lag en komponent i `./tools/` som tar `ToolComponentProps` og bruker `<ToolRunner>`
 *     (skjema → bekreft → kjører → resultat). ToolRunner tar seg av stegvisning, bekreftelse,
 *     fremdrift, resultatbanner og rapportering til kjørehistorikken.
 *  2. Legg til en oppføring under. `id` brukes i URL-en (`?verktoy=<id>`).
 */
export const TOOLS: ToolDefinition[] = [
  {
    id: "publiser-sed-hendelser",
    name: "Publiser SED-hendelser",
    description: "Send SED-hendelser på nytt til Kafka, linje for linje, med validering og tørrkjøring.",
    details:
      "Publiserer sedmottatt/sedsendt-hendelser på nytt slik at journalføring, oppgaver og statistikk kjøres igjen. Erstatter admin-verktøyet i eux-web-app.",
    category: "Kafka",
    risk: "middels",
    icon: PaperplaneIcon,
    color: "#6e5a9e",
    keywords: ["kafka", "sedmottatt", "sedsendt", "hendelse", "republiser", "eux-web-app"],
    component: PubliserSedHendelser,
  },
  {
    id: "synkroniser-rinasak",
    name: "Synkroniser RINA-sak",
    description: "Hent en sak på nytt fra RINA og se nøyaktig hvilke felt som ble oppdatert.",
    details: "Leser saken fra RINA CPI, sammenligner med eux sin lagrede tilstand og oppdaterer det som har drevet fra hverandre.",
    category: "RINA",
    risk: "lav",
    icon: ArrowsCirclepathIcon,
    color: "#2a6cb3",
    keywords: ["rina", "cpi", "synk", "rinasak", "case store"],
    component: SynkroniserRinasak,
  },
  {
    id: "journalfor-sed",
    name: "Journalfør SED på nytt",
    description: "Lag en ny journalpost for en SED, til valgfri enhet, med eller uten oppgave.",
    details: "Henter SED-en fra RINA, lager PDF og journalfører på valgt enhet i Dokarkiv. Kan også opprette en ny Gosys-oppgave.",
    category: "Journalføring",
    risk: "middels",
    icon: FileCheckmarkIcon,
    color: "#35787a",
    keywords: ["journalpost", "dokarkiv", "joark", "enhet", "oppgave", "gosys"],
    component: JournalforSed,
  },
  {
    id: "spill-av-dlq",
    name: "Spill av DLQ",
    description: "Se feilede Kafka-meldinger per konsumentgruppe og send dem gjennom på nytt.",
    details: "Viser meldinger i dead letter-køene til eux-journal, eux-oppgave og eux-nav-rinasak. Velg meldinger og spill dem av.",
    category: "Kafka",
    risk: "middels",
    icon: ArrowRedoIcon,
    color: "#6e5a9e",
    keywords: ["dlq", "dead letter", "kafka", "retry", "replay", "konsument"],
    component: SpillAvDlq,
  },
  {
    id: "slett-usendte-saker",
    name: "Slett usendte RINA-saker",
    description: "Rydd bort saker som ble opprettet, men der ingen SED noen gang ble sendt.",
    details: "Finner usendte saker eldre enn valgt antall dager og sletter dem permanent i RINA og eux. Kan ikke angres.",
    category: "Opprydding",
    risk: "høy",
    icon: TrashIcon,
    color: "#b23a48",
    keywords: ["slett", "rydd", "usendt", "utkast", "gamle saker"],
    component: SlettUsendteSaker,
  },
  {
    id: "tom-cache",
    name: "Tøm cache",
    description: "Tøm og varm opp cachene for institusjoner, kodeverk og saksbehandlere.",
    details: "Nyttig når data er oppdatert i kilden og saksbehandlere ikke ser endringen. Cachen varmes opp igjen automatisk.",
    category: "Cache",
    risk: "lav",
    icon: EraserIcon,
    color: "#b07320",
    keywords: ["cache", "caffeine", "kodeverk", "institusjoner", "saksbehandlere", "tøm"],
    component: TomCache,
  },
  {
    id: "institusjonskatalog",
    name: "Oppdater institusjonskatalog",
    description: "Hent katalogen fra CEF eller RINA og se nye, endrede og fjernede institusjoner per land.",
    details: "Henter institusjonskatalogen, viser en diff per land og lagrer den nye katalogen. Kjøres ellers automatisk hver natt.",
    category: "Katalog",
    risk: "middels",
    icon: Buildings3Icon,
    color: "#2f7a52",
    keywords: ["institusjon", "katalog", "cef", "ir", "mottaker", "land"],
    component: Institusjonskatalog,
  },
];

export const TOOL_BY_ID: Record<string, ToolDefinition> = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
