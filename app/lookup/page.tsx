"use client";

import { useState } from "react";

import { PublicHeader } from "@/components/lookup/public-header";
import { SearchCommand } from "@/components/lookup/search-command";
import { ResultCard } from "@/components/lookup/result-card";
import type { Building } from "@/lib/types";

export default function LookupPage() {
  const [selected, setSelected] = useState<Building | null>(null);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PublicHeader />

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Check your area's radon risk</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Enter your address or pincode to see a plain-language risk summary for your building.
          </p>
        </div>

        <div className="w-full max-w-md">
          <SearchCommand onSelect={setSelected} />
        </div>

        {selected && <ResultCard building={selected} />}

        {!selected && (
          <p className="text-xs text-muted-foreground">
            Try an address like &ldquo;Quarry Ridge Rd&rdquo; or a pincode like 18401.
          </p>
        )}
      </main>

      <footer className="border-t border-border px-5 py-4 text-center text-xs text-muted-foreground">
        Data shown is for informational purposes. For official readings, contact your municipal health office.
      </footer>
    </div>
  );
}
