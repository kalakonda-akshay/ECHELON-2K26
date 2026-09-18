"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { buildings, getZoneById } from "@/lib/mock-data";
import type { Building } from "@/lib/types";

// TODO(supabase): replace the in-memory filter below with a debounced query,
// e.g. supabase.from("buildings").select("id,address,pincode").ilike("address", `%${q}%`)

interface SearchCommandProps {
  onSelect: (building: Building) => void;
}

export function SearchCommand({ onSelect }: SearchCommandProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return buildings
      .filter((b) => b.address.toLowerCase().includes(q) || b.pincode.includes(q))
      .slice(0, 8);
  }, [query]);

  return (
    <Command className="overflow-visible rounded-xl border border-border bg-card shadow-sm" shouldFilter={false}>
      <CommandInput
        placeholder="Enter an address or pincode…"
        value={query}
        onValueChange={setQuery}
        className="h-12 text-base"
      />
      {query.trim().length > 0 && (
        <CommandList>
          <CommandEmpty>No matching address found. Check the spelling or try a nearby pincode.</CommandEmpty>
          {results.length > 0 && (
            <CommandGroup heading="Matching addresses">
              {results.map((b) => (
                <CommandItem key={b.id} value={b.id} onSelect={() => onSelect(b)}>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{b.address}</span>
                    <span className="text-xs text-muted-foreground">
                      {getZoneById(b.zoneId)?.name} &middot; {b.pincode}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      )}
    </Command>
  );
}
