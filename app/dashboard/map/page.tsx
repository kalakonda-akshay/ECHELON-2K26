"use client";

import { useState } from "react";

import { MapWrapper } from "@/components/map/map-wrapper";
import { MapLegend } from "@/components/dashboard/map-legend";
import { BuildingSheet } from "@/components/dashboard/building-sheet";
import { zones, buildings } from "@/lib/mock-data";
import type { Building } from "@/lib/types";

// TODO(supabase): fetch `zones` and `buildings` (with lat/lng, riskLevel,
// riskScore) from Supabase, scoped to the officer's jurisdiction, e.g.:
//   supabase.from("zones").select("*").eq("municipality_id", officer.municipalityId)
//   supabase.from("buildings").select("*").in("zone_id", zoneIds)

export default function MapPage() {
  const [selected, setSelected] = useState<Building | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleSelect(b: Building) {
    setSelected(b);
    setSheetOpen(true);
  }

  return (
    <div className="relative flex-1">
      <MapWrapper
        zones={zones}
        buildings={buildings}
        onSelectBuilding={handleSelect}
        selectedBuildingId={selected?.id}
      />
      <MapLegend />
      <BuildingSheet building={selected} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
