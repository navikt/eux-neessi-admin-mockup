import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { osloMinutesNow, osloToday } from "@/lib/mock/clock";
import { getDriftsmeldinger } from "./data";
import { DriftsmeldingerView } from "./DriftsmeldingerView";

export const metadata: Metadata = { title: "Driftsmeldinger" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export default async function Page({ searchParams }: Props) {
  const [sp, user] = await Promise.all([searchParams, getSessionUser()]);
  const today = osloToday();
  const now = `${today}T${hhmm(osloMinutesNow())}`;
  return <DriftsmeldingerView data={getDriftsmeldinger(today, now, sp)} userName={user?.name ?? "Ragnhild Teigen"} />;
}
