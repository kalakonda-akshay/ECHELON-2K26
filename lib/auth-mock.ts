"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Stand-in for Supabase Auth so the Official Dashboard is reachable without a
 * live project. Replace both actions below with real Supabase calls:
 *
 *   const supabase = createClient();
 *   await supabase.auth.signInWithPassword({ email, password });
 *   // or: await supabase.auth.signInWithOtp({ email })
 *
 * Keep the function signatures (`signIn`, `signOut`) so `app/login/page.tsx`
 * and the sidebar's sign-out button don't need to change.
 *
 * Note: a "use server" file may only export async functions, so the mock
 * officer profile itself lives in `lib/officer.ts`.
 */

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const next = String(formData.get("next") ?? "/dashboard/map");

  // TODO(supabase): validate credentials via supabase.auth.signInWithPassword
  // and reject invalid ones instead of accepting any non-empty email.
  if (!email) {
    redirect(`/login?error=missing-email&next=${encodeURIComponent(next)}`);
  }

  cookies().set("rg_session", "officer", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect(next);
}

export async function signOut() {
  cookies().delete("rg_session");
  redirect("/login");
}

export async function getMockSession() {
  return cookies().get("rg_session")?.value ?? null;
}
