import { headers } from "next/headers";
import { Webhook } from "svix";
import { clerkClient } from "@clerk/nextjs/server";
import type { WebhookEvent } from "@clerk/nextjs/server";

/**
 * Sets publicMetadata.role = "official" the moment a Clerk user is created.
 *
 * Why a webhook and not an "afterSignUp" server action: publicMetadata can
 * only be written from trusted server code (the Backend API), and this app
 * has no server action guaranteed to run for every sign-up path (email
 * verification redirect, OAuth, etc.) — a webhook on `user.created` fires
 * exactly once per account regardless of how it was created, which a client
 * or route-level "afterSignUp" hook can't guarantee.
 *
 * Setup:
 *   1. Clerk dashboard -> Webhooks -> Add endpoint -> this route's URL
 *      (https://yourdomain.com/api/webhooks/clerk), subscribe to
 *      "user.created".
 *   2. Copy the signing secret into CLERK_WEBHOOK_SECRET.
 *   3. Make sure "/api/webhooks/clerk" stays in middleware.ts's public
 *      matcher — Clerk signs this request with svix, not a session cookie.
 */
export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Missing CLERK_WEBHOOK_SECRET", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(webhookSecret);

  let event: WebhookEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Clerk webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "user.created") {
    const user = event.data;
    const existingRole = (user.public_metadata as { role?: string } | null)?.role;

    if (!existingRole) {
      const client = await clerkClient();
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          role: "official",
        },
      });
    }
  }

  return new Response("ok", { status: 200 });
}
