"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://dummy.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

/**
 * Bridges Clerk's client-side auth state into Convex. Convex calls
 * `useAuth()` under the hood to fetch a fresh "convex"-template JWT whenever
 * it needs one, so every `useQuery`/`useMutation` call is authenticated
 * automatically — no manual token plumbing anywhere else in the app.
 *
 * This must be a Client Component (hooks), which is why it's split out from
 * app/layout.tsx rather than inlined there.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth as any}>
      {children}
    </ConvexProviderWithClerk>
  );
}
