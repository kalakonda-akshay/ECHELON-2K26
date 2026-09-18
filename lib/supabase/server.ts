import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for use in Server Components, Route Handlers,
 * and Server Actions.
 *
 * TODO(supabase): once schema + auth are provisioned, swap the mock session
 * helpers in `lib/auth-mock.ts` for real calls like:
 *   const supabase = createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   const { data: officer } = await supabase
 *     .from("officers")
 *     .select("role, jurisdiction_zone_ids")
 *     .eq("user_id", user.id)
 *     .single();
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component without a mutable response;
            // safe to ignore when middleware also refreshes the session.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // See note above.
          }
        },
      },
    }
  );
}
