"use client";

import Link from "next/link";
import { ArrowUpRight, Building2, Layers, Wind, CalendarClock } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { TrendChart } from "@/components/charts/trend-chart";
import { getZoneById } from "@/lib/mock-data";
import type { Building } from "@/lib/types";

interface BuildingSheetProps {
  building: Building | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuildingSheet({ building, open, onOpenChange }: BuildingSheetProps) {
  if (!building) return null;
  const zone = getZoneById(building.zoneId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <RiskBadge level={building.riskLevel} />
            <span className="text-xs text-muted-foreground">Score {building.riskScore}</span>
          </div>
          <SheetTitle>{building.address}</SheetTitle>
          <SheetDescription>
            {zone?.name} &middot; {building.pincode}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-md border border-border p-2.5">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Built</p>
              <p className="font-medium">{building.constructionYear}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border p-2.5">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Floor</p>
              <p className="font-medium">{building.floorLevel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border p-2.5">
            <Wind className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Ventilation</p>
              <p className="font-medium capitalize">{building.ventilation}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border p-2.5">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Foundation</p>
              <p className="font-medium capitalize">{building.foundation.replace(/-/g, " ")}</p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Sensor trend</p>
          <TrendChart data={building.sensorHistory} />
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Driving factors</p>
          <div className="flex flex-wrap gap-1.5">
            {building.drivingFactors.map((f) => (
              <Badge key={f} variant="outline" className="font-normal">
                {f}
              </Badge>
            ))}
          </div>
        </div>

        <Button asChild className="mt-6 w-full gap-1.5">
          <Link href={`/dashboard/building/${building.id}`}>
            View full building profile
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </SheetContent>
    </Sheet>
  );
}
