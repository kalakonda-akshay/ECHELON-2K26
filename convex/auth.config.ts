/**
 * Tells Convex to trust JWTs issued by Clerk's "convex" JWT template.
 *
 * Setup in the Clerk dashboard (one-time):
 *   1. JWT Templates -> New template -> choose "Convex" (or blank, name it
 *      exactly "convex" if starting from scratch).
 *   2. Under that template's Claims, add a custom claim so Convex can see the
 *      role without a second round trip:
 *        { "publicMetadata": "{{user.public_metadata}}" }
 *   3. Copy the template's Issuer URL — that's CLERK_JWT_ISSUER_DOMAIN below.
 *
 * This is separate from Clerk's *session token* customization (used by
 * `sessionClaims` in Next.js server code) — see convex/lib/auth.ts and
 * app/dashboard/layout.tsx for why both need the same publicMetadata claim
 * added in two different places in the Clerk dashboard.
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
