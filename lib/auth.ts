import "server-only";

import { cookies } from "next/headers";
import { USER_COOKIE, parseSessionUser, type SessionUser } from "./session";

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return parseSessionUser(store.get(USER_COOKIE)?.value);
}
