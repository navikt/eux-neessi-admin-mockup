import type { Metadata } from "next";
import { getEuropeMap } from "@/lib/geo/europe";
import { osloToday } from "@/lib/mock/clock";
import { COUNTRY_BY_CODE, type CountryCode } from "@/lib/mock/reference";
import { getStats } from "@/lib/mock/stats";
import { StatistikkView } from "./StatistikkView";

export const metadata: Metadata = { title: "Statistikk" };
export const dynamic = "force-dynamic";

export default async function StatistikkPage({ searchParams }: { searchParams: Promise<{ land?: string; periode?: string; sektor?: string }> }) {
  const sp = await searchParams;
  const stats = getStats(osloToday());
  const land = sp.land?.toUpperCase();
  const periode = sp.periode === "3m" || sp.periode === "ytd" || sp.periode === "mnd" ? sp.periode : "12m";
  return (
    <StatistikkView
      stats={stats}
      map={getEuropeMap()}
      initialLand={land && COUNTRY_BY_CODE[land as CountryCode] ? (land as CountryCode) : null}
      initialPeriode={periode}
      initialSektor={sp.sektor ? sp.sektor.toUpperCase().split(",") : []}
    />
  );
}
