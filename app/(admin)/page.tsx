import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { getAwaiting, summarizeAwaiting } from "@/lib/mock/awaiting";
import { getToday } from "@/lib/mock/today";
import { DashboardView } from "./DashboardView";

export const metadata: Metadata = { title: "I dag" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  const today = getToday();
  const awaiting = getAwaiting(today.todayIso);
  const summary = summarizeAwaiting(awaiting);

  const overdueByCountry = new Map<string, number>();
  for (const a of awaiting) {
    if (a.status === "FORFALT") overdueByCountry.set(a.country, (overdueByCountry.get(a.country) ?? 0) + 1);
  }
  const topOverdue = [...overdueByCountry.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, count]) => ({ code, count }));
  const oldest = awaiting.reduce((a, b) => (b.daysWaiting > a.daysWaiting ? b : a), awaiting[0]);
  const unassignedOverdue = awaiting.filter((a) => a.status === "FORFALT" && !a.saksbehandler).length;

  return (
    <DashboardView
      firstName={user?.name.split(" ")[0] ?? "du"}
      today={today}
      awaiting={{
        ...summary,
        topOverdue,
        unassignedOverdue,
        oldestItem: { days: oldest.daysWaiting, country: oldest.country, sed: oldest.sedType, rinasakId: oldest.rinasakId },
      }}
    />
  );
}
