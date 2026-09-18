import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "TraceLens AI — Intelligent Microservice Cascade Observability & Controlled Recovery",
  description:
    "Detect. Trace. Explain. Recover. Verify. Deterministic graph reasoning and controlled remediation for distributed systems.",
};

const hasRealClerkKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.trim() !== "" &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("example.com") &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("xxxx") &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("pk_test_Y2xlcmsu")
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Leaflet base CSS — required by react-leaflet. Kept as a CDN link
            rather than an npm import so it loads once, globally. */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-background`}>
        {hasRealClerkKey ? (
          <ClerkProvider
            appearance={{
              variables: {
                colorPrimary: "#1e3a5f",
              },
            }}
          >
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
