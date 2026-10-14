import { int, pick, weightedPick } from "./random";
import { COUNTRIES, SECTOR_BY_CODE, SED_TYPES, enheterForSector, type CountryCode, type SectorCode } from "./reference";

export type LiveEventKind = "sent" | "recv" | "buc" | "journal";

export interface LiveEvent {
  id: string;
  minute: number;
  kind: LiveEventKind;
  sedType: string;
  sedName: string;
  buc: string;
  sector: SectorCode;
  country: CountryCode;
  enhetId: string;
  rinasakId: string;
}

export function makeEvent(rng: () => number, minute: number, id: string): LiveEvent {
  const sed = weightedPick(rng, SED_TYPES, (s) => SECTOR_BY_CODE[s.sector].weight * s.share);
  const country = weightedPick(rng, COUNTRIES, (c) => c.weight);
  const enhets = enheterForSector(sed.sector);
  const enhet = enhets.length ? weightedPick(rng, enhets, (e) => e.share).enhet.id : "4303";
  const r = rng();
  const kind: LiveEventKind = r < 0.42 ? "sent" : r < 0.84 ? "recv" : r < 0.94 ? "buc" : "journal";
  return {
    id,
    minute,
    kind,
    sedType: sed.type,
    sedName: sed.name,
    buc: sed.buc === "Alle" ? pick(rng, ["H_BUC_01", "P_BUC_01", "LA_BUC_02", "FB_BUC_01"]) : sed.buc,
    sector: sed.sector,
    country: country.code,
    enhetId: enhet,
    rinasakId: String(1_500_000 + int(rng, 0, 19_999)),
  };
}

