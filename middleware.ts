import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const hasRealClerkKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.trim() !== "" &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("example.com") &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("xxxx") &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("pk_test_Y2xlcmsu")
);

const isPublicRoute = createRouteMatcher([
  "/",
  "/lookup(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

export default function middleware(request: NextRequest, event: any) {
  if (!hasRealClerkKey) {
    return NextResponse.next();
  }

  return clerkMiddleware((auth, req) => {
    if (!isPublicRoute(req)) {
      const { userId } = auth();
      if (!userId) {
        return auth().redirectToSignIn({ returnBackUrl: req.url });
      }
    }
  })(request, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
