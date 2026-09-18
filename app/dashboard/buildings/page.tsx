import Link from "next/link";
import { Building2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { zones, buildings } from "@/lib/mock-data";

// TODO(supabase): fetch zones + buildings scoped to the officer's jurisdiction.

export default function BuildingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Buildings</h1>
        <p className="text-sm text-muted-foreground">
          Every monitored building, grouped by zone.
        </p>
      </div>

      {zones.map((zone) => {
        const zoneBuildings = buildings.filter((b) => b.zoneId === zone.id);
        return (
          <section key={zone.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">{zone.name}</h2>
                <p className="text-xs text-muted-foreground">{zone.geology}</p>
              </div>
              <RiskBadge level={zone.riskLevel} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {zoneBuildings.map((b) => (
                <Link key={b.id} href={`/dashboard/building/${b.id}`}>
                  <Card className="h-full transition-colors hover:border-primary/40">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-sm">{b.address}</CardTitle>
                        </div>
                        <RiskBadge level={b.riskLevel} />
                      </div>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between pt-0 text-xs text-muted-foreground">
                      <span>Score {b.riskScore}</span>
                      <span>{b.pincode}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
