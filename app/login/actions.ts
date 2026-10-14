"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PERSONAS, USER_COOKIE } from "@/lib/session";

export async function login(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) redirect("/login?feil=navn");
  const persona = PERSONAS.find((p) => p.name === name);
  const store = await cookies();
  store.set(USER_COOKIE, JSON.stringify({ name, title: persona?.title ?? "Administrator" }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}

export async function logout() {
  const store = await cookies();
  store.delete(USER_COOKIE);
  redirect("/login");
}
