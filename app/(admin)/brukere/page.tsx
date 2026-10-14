import { getSessionUser } from "@/lib/auth";
import { osloToday } from "@/lib/mock/clock";
import { createRng, pick } from "@/lib/mock/random";
import { ENHETER } from "@/lib/mock/reference";
import { getUsers } from "@/lib/mock/users";
import { BrukereView } from "./BrukereView";
import type { AdminUser, EnhetOption } from "./types";

export const metadata = { title: "Brukere" };

export default async function Page() {
  const session = await getSessionUser();
  const today = osloToday();
  // Mock data can produce creation dates later in the current year – push those back a year
  const pastIso = (iso: string) => (iso > today ? `${Number(iso.slice(0, 4)) - 1}${iso.slice(4)}` : iso);
  const rng = createRng("brukere-extra-enheter");
  const allIds = ENHETER.map((e) => e.id);
  const users: AdminUser[] = getUsers().map((u) => {
    const isTeam = u.roles.includes("ADMIN") || u.roles.includes("UTVIKLER");
    const extra = isTeam
      ? allIds.filter((id) => id !== u.enhetId)
      : u.roles.includes("SUPERBRUKER") || rng() < 0.08
        ? [pick(rng, allIds.filter((id) => id !== u.enhetId))]
        : [];
    return { ...u, createdIso: pastIso(u.createdIso), roles: [...u.roles], extraEnheter: extra };
  });
  const enheter: EnhetOption[] = ENHETER.map(({ id, name, shortName }) => ({ id, name, shortName }));

  return <BrukereView initialUsers={users} enheter={enheter} currentUser={session?.name ?? "Ragnhild Teigen"} todayIso={today} />;
}
