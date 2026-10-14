import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { osloToday } from "@/lib/mock/clock";
import { ENHET_BY_ID } from "@/lib/mock/reference";
import { TEMPLATE_BY_SED } from "@/lib/mock/texts";
import { StandardteksterView } from "./StandardteksterView";

export const metadata: Metadata = { title: "Standardtekster" };
export const dynamic = "force-dynamic";

export default async function StandardteksterPage({ searchParams }: { searchParams: Promise<{ sed?: string; enhet?: string }> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const sed = sp.sed?.toUpperCase();
  return (
    <StandardteksterView
      todayIso={osloToday()}
      userName={user?.name ?? "Ukjent bruker"}
      initialSed={sed && TEMPLATE_BY_SED[sed] ? sed : "H001"}
      initialScope={sp.enhet && ENHET_BY_ID[sp.enhet] ? sp.enhet : "ALLE"}
    />
  );
}
