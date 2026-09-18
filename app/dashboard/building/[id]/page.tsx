import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Layers,
  MapPin,
  Wind,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { TrendChart } from "@/components/charts/trend-chart";
import { MitigationsCard } from "@/components/dashboard/mitigations-card";
import { getBuildingById, getZoneById, getMitigationsForFactors } from "@/lib/mock-data";

// TODO(supabase): fetch a single building (+ sensor_readings) by id, e.g.
//   supabase.from("buildings").select("*, sensor_readings(*)").eq("id", params.id).single()

export default function BuildingDetailPage({ params }: { params: { id: string } }) {
  const building = getBuildingById(params.id);
  if (!building) notFound();

  const zone = getZoneById(building.zoneId);
  const mitigations = getMitigationsForFactors(building.drivingFactors);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5 text-muted-foreground">
          <Link href="/dashboard/priority">
            <ArrowLeft className="h-4 w-4" />
            Back to priority list
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <RiskBadge level={building.riskLevel} />
              <span className="text-sm text-muted-foreground">Score {building.riskScore} / 100</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">{building.address}</h1>
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {zone?.name} &middot; {building.pincode}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" /> Construction year
            </CardDescription>
            <CardTitle className="text-2xl">{building.constructionYear}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Floor level
            </CardDescription>
            <CardTitle className="text-2xl">{building.floorLevel}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Wind className="h-3.5 w-3.5" /> Ventilation
            </CardDescription>
            <CardTitle className="text-2xl capitalize">{building.ventilation}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Foundation type
          </CardDescription>
          <CardTitle className="text-lg capitalize">{building.foundation.replace(/-/g, " ")}</CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sensor readings over time</CardTitle>
            <CardDescription>Radon concentration, pCi/L, monthly.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart data={building.sensorHistory} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Driving risk factors</CardTitle>
            <CardDescription>Contributors identified for this building.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {building.drivingFactors.map((f) => (
              <Badge key={f} variant="outline" className="font-normal">
                {f}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <MitigationsCard mitigations={mitigations} />
    </div>
  );
}
