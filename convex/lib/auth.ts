import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";

export type Role = "official" | "public";

/**
 * Shape of the identity Convex hands back after verifying the Clerk JWT.
 * `publicMetadata` only shows up here if the "convex" JWT template in Clerk
 * has a custom claim mapping `{{user.public_metadata}}` — see auth.config.ts.
 */
export interface RadonGuardIdentity {
  subject: string;
  tokenIdentifier: string;
  email?: string;
  name?: string;
  publicMetadata?: {
    role?: Role;
    [key: string]: unknown;
  };
}

type Ctx = QueryCtx | MutationCtx | ActionCtx;

/**
 * Call this first in every official-only query/mutation/action.
 */
export async function requireOfficial(ctx: Ctx): Promise<RadonGuardIdentity> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError("Unauthorized");
  }

  const role = (identity as RadonGuardIdentity).publicMetadata?.role;

  if (role !== "official") {
    throw new ConvexError("Unauthorized");
  }

  return identity as RadonGuardIdentity;
}

/**
 * Lighter-weight check for functions any signed-in user may call, regardless
 * of role. Still throws if there's no session at all.
 */
export async function requireAuthenticated(ctx: Ctx): Promise<RadonGuardIdentity> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError("Unauthorized");
  }

  return identity as RadonGuardIdentity;
}
