"use client";

import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

import type { Building, Zone } from "@/lib/types";
import { riskHex, riskFillHex } from "@/lib/risk";

interface LeafletMapProps {
  zones: Zone[];
  buildings: Building[];
  onSelectBuilding: (building: Building) => void;
  selectedBuildingId?: string | null;
  center?: LatLngExpression;
  zoom?: number;
}

export function LeafletMap({
  zones,
  buildings,
  onSelectBuilding,
  selectedBuildingId,
  center = [40.735, -75.79],
  zoom = 12,
}: LeafletMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      className="h-full w-full"
      // TODO(supabase): once zones/buildings are streamed from Supabase
      // (e.g. via a realtime channel), this map can re-render on updates
      // without any structural changes to this component.
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {zones.map((zone) => (
        <Polygon
          key={zone.id}
          positions={zone.boundary.positions}
          pathOptions={{
            color: riskHex[zone.riskLevel],
            weight: 1.5,
            fillColor: riskHex[zone.riskLevel],
            fillOpacity: 0.22,
          }}
        >
          <Tooltip sticky>
            <div className="text-xs">
              <p className="font-medium">{zone.name}</p>
              <p className="text-muted-foreground">
                Aggregate score {zone.aggregateScore} &middot; {zone.buildingCount} buildings
              </p>
            </div>
          </Tooltip>
        </Polygon>
      ))}

      {buildings.map((b) => (
        <CircleMarker
          key={b.id}
          center={[b.lat, b.lng]}
          radius={b.id === selectedBuildingId ? 9 : 6.5}
          pathOptions={{
            color: "#ffffff",
            weight: b.id === selectedBuildingId ? 2.5 : 1.5,
            fillColor: riskHex[b.riskLevel],
            fillOpacity: 1,
          }}
          eventHandlers={{
            click: () => onSelectBuilding(b),
          }}
        >
          <Tooltip>
            <div className="text-xs">
              <p className="font-medium">{b.address}</p>
              <p className="text-muted-foreground">Score {b.riskScore}</p>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
