import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginView } from "./LoginView";

export const metadata: Metadata = { title: "Logg inn" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ feil?: string }> }) {
  if (await getSessionUser()) redirect("/");
  const { feil } = await searchParams;
  return <LoginView error={feil === "navn" ? "Velg en person eller skriv inn navnet ditt" : undefined} />;
}
