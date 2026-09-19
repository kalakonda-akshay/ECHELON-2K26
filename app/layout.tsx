import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "TraceRoot AI — Intelligent Microservice Cascade Observability & Controlled Recovery",
  description:
    "Detect. Trace. Explain. Recover. Verify. Deterministic graph reasoning and controlled remediation for distributed systems.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-slate-950 text-slate-100 dark`}>
        {children}
      </body>
    </html>
  );
}
