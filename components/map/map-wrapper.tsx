"use client";

import dynamic from "next/dynamic";

import type { Building, Zone } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const LeafletMap = dynamic(() => import("./leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

interface MapWrapperProps {
  zones: Zone[];
  buildings: Building[];
  onSelectBuilding: (building: Building) => void;
  selectedBuildingId?: string | null;
}

export function MapWrapper(props: MapWrapperProps) {
  return <LeafletMap {...props} />;
}
