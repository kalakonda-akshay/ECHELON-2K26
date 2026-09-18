import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 *
 * TODO(supabase): set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * in your environment before this is used for real auth/data calls. Until then,
 * `lib/mock-data.ts` and `lib/auth-mock.ts` stand in for this client throughout
 * the app.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key"
  );
}
