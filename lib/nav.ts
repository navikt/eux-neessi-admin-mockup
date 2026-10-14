import {
  BarChartIcon,
  DatabaseIcon,
  HourglassIcon,
  HouseIcon,
  MegaphoneIcon,
  PencilWritingIcon,
  PersonGroupIcon,
  PieChartIcon,
  WrenchIcon,
} from "@navikt/aksel-icons";
import type { ComponentType, SVGProps } from "react";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { title?: string }>;
  badgeKey?: "overdue";
  isNew?: boolean;
  keywords?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Oversikt",
    items: [
      {
        href: "/",
        label: "I dag",
        description: "Live-oversikt over SED-er, BUC-er og systemstatus",
        icon: HouseIcon,
        keywords: ["dashboard", "live", "forside", "status"],
      },
    ],
  },
  {
    label: "Innsikt",
    items: [
      {
        href: "/svar",
        label: "Har vi svart?",
        description: "Innkommende SED-er som venter på svar fra Norge",
        icon: HourglassIcon,
        badgeKey: "overdue",
        keywords: ["frist", "forfalt", "venter", "purring", "svarfrist"],
      },
      {
        href: "/statistikk",
        label: "Statistikk",
        description: "Hvordan Norge leverer i EESSI – land, sektorer og svartider",
        icon: BarChartIcon,
        keywords: ["tall", "land", "svartid", "rapport"],
      },
      {
        href: "/funksjonsbruk",
        label: "Funksjonsbruk",
        description: "Hvor mye brukes de ulike delene av nEESSI?",
        icon: PieChartIcon,
        keywords: ["adopsjon", "feature", "bruk"],
      },
    ],
  },
  {
    label: "Forvaltning",
    items: [
      {
        href: "/standardtekster",
        label: "Standardtekster",
        description: "Standardverdier for fritekstfelt i SED-er, per enhet",
        icon: PencilWritingIcon,
        keywords: ["tekst", "mal", "H001", "fritekst", "default"],
      },
      {
        href: "/brukere",
        label: "Brukere",
        description: "Brukere, roller og tilganger i nEESSI",
        icon: PersonGroupIcon,
        keywords: ["tilgang", "rolle", "saksbehandler"],
      },
      {
        href: "/verktoy",
        label: "Verktøykasse",
        description: "Ad hoc-verktøy, blant annet publisering av SED-hendelser",
        icon: WrenchIcon,
        keywords: ["kafka", "publiser", "sed hendelser", "ad hoc"],
      },
    ],
  },
  {
    label: "Drift",
    items: [
      {
        href: "/databaser",
        label: "Databaser",
        description: "Postgres-versjoner, størrelse og oppgraderingsbehov",
        icon: DatabaseIcon,
        keywords: ["postgres", "cloud sql", "oppgradering"],
      },
      {
        href: "/driftsmeldinger",
        label: "Driftsmeldinger",
        description: "Publiser bannere og meldinger til brukerne av nEESSI",
        icon: MegaphoneIcon,
        isNew: true,
        keywords: ["banner", "melding", "nedetid"],
      },
    ],
  },
];

export const NAV_ITEMS = NAV.flatMap((g) => g.items);

export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === "/") return NAV_ITEMS[0];
  return NAV_ITEMS.filter((i) => i.href !== "/").find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
}
