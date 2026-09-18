# RadonGuard auth — setup notes

Code is complete and drop-in. Three things live in the Clerk dashboard rather
than in code, and all of them are easy to forget, so do them in this order:

## 1. Install packages

```bash
npm install @clerk/nextjs convex convex/react-clerk svix
```

(`convex/react-clerk` ships inside the `convex` package — no separate
install needed once `convex` is installed.)

## 2. Clerk dashboard — JWT template for Convex

JWT Templates -> New template -> "Convex" (or blank, named exactly `convex`).
Add a custom claim so `ctx.auth.getUserIdentity()` sees the role directly:

```json
{ "publicMetadata": "{{user.public_metadata}}" }
```

Copy the template's **Issuer** URL into `CLERK_JWT_ISSUER_DOMAIN`.

## 3. Clerk dashboard — session token claim

This is separate from step 2. Sessions -> Customize session token -> add:

```json
{ "publicMetadata": "{{user.public_metadata}}" }
```

Without this, `sessionClaims.publicMetadata` in `app/dashboard/layout.tsx`
will be `undefined` even though the Convex-side check works fine — the two
tokens are configured independently.

## 4. Clerk dashboard — webhook

Webhooks -> Add endpoint -> `https://<your-domain>/api/webhooks/clerk` ->
subscribe to `user.created`. Copy the signing secret into
`CLERK_WEBHOOK_SECRET`. This is what sets `publicMetadata.role = "official"`
on every new account (see the long comment in that route for why a webhook
was used instead of an `afterSignUp` action).

In local dev, either use `ngrok`/Clerk's local tunnel to give the webhook a
reachable URL, or manually set a test user's role from the Clerk dashboard's
user detail page while iterating.

## 5. Files delivered

| File | Purpose |
|---|---|
| `middleware.ts` | Gates everything except `/`, `/lookup`, `/sign-in`, `/sign-up`, and the webhook |
| `app/layout.tsx` + `components/providers/convex-client-provider.tsx` | Wires `ClerkProvider` and `ConvexProviderWithClerk` |
| `convex/auth.config.ts` | Points Convex at the Clerk issuer |
| `convex/lib/auth.ts` | `requireOfficial(ctx)` guard for official-only functions |
| `app/sign-in/[[...sign-in]]/page.tsx` | Prebuilt `<SignIn/>`, restyled |
| `app/sign-up/[[...sign-up]]/page.tsx` | Custom form (name + org/department -> `unsafeMetadata`) |
| `app/api/webhooks/clerk/route.ts` | Sets default role on `user.created` |
| `app/dashboard/layout.tsx` | Server-side session + role check, redirect, `UserButton` |
| `components/dashboard/dashboard-skeleton.tsx` | Loading state for client-side auth reads inside the dashboard |

One deliberate deviation from the prompt worth flagging: it asked for
Clerk's `authMiddleware`, which is deprecated — `middleware.ts` uses the
current replacement, `clerkMiddleware` + `createRouteMatcher`, since
`authMiddleware` will break on current `@clerk/nextjs` versions.

## 6. Not included (out of scope for auth)

`components/ui/skeleton.tsx` (shadcn's own generated component — run
`npx shadcn@latest add skeleton`) and `app/globals.css`'s `.input`/
`.btn-primary` utility classes referenced in the sign-up form (a few lines,
noted inline in that file).
