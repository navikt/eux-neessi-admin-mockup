import type { Metadata } from "next";
import { getEuropeMap } from "@/lib/geo/europe";
import { getAwaiting } from "@/lib/mock/awaiting";
import { osloToday } from "@/lib/mock/clock";
import { ENHETER } from "@/lib/mock/reference";
import { saksbehandlereFor } from "@/lib/mock/users";
import { SvarView, type SvarFilters } from "./SvarView";

export const metadata: Metadata = { title: "Har vi svart?" };
export const dynamic = "force-dynamic";

export default async function SvarPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; land?: string; sektor?: string; enhet?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const todayIso = osloToday();
  const items = getAwaiting(todayIso);
  const initial: SvarFilters = {
    status: sp.status === "FORFALT" || sp.status === "SNART" || sp.status === "OK" ? sp.status : "ALLE",
    land: sp.land?.toUpperCase() ?? null,
    sektor: sp.sektor?.toUpperCase() ?? null,
    enhet: sp.enhet ?? null,
    q: sp.q ?? "",
  };
  const teams = Object.fromEntries(ENHETER.map((e) => [e.id, saksbehandlereFor(e.id).slice(0, 10).map((u) => u.name)]));
  return <SvarView items={items} map={getEuropeMap()} todayIso={todayIso} initial={initial} teams={teams} />;
}
