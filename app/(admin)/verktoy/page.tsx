import { getSessionUser } from "@/lib/auth";
import { getVerktoyData } from "./data";
import { VerktoyView } from "./VerktoyView";

export const metadata = { title: "Verktøykasse · nEESSI admin" };

export default async function Page({ searchParams }: { searchParams: Promise<{ verktoy?: string }> }) {
  const [{ verktoy }, user] = await Promise.all([searchParams, getSessionUser()]);
  const { nowMs, audit } = getVerktoyData();
  return <VerktoyView initialToolId={verktoy ?? null} initialAudit={audit} nowMs={nowMs} userName={user?.name ?? "Ukjent bruker"} />;
}
