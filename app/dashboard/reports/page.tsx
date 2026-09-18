"use client";

import { AlertTriangle, Building2, FileDown, MapPinned, ShieldAlert } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildings, zones } from "@/lib/mock-data";

// TODO(supabase): compute these aggregates from live queries, or a
// materialized view / RPC, e.g. `supabase.rpc("dashboard_summary_stats")`.

function handleExportPdf() {
  // STUB: wire up server-side PDF generation (e.g. a route handler that
  // renders a report template with a PDF library) and trigger the download.
  alert("Export PDF is not wired up yet in this scaffold.");
}

export default function ReportsPage() {
  const total = buildings.length;
  const highRisk = buildings.filter((b) => b.riskLevel === "high").length;
  const pctHighRisk = Math.round((highRisk / total) * 100);
  const flaggedZones = zones.filter((z) => z.riskLevel !== "low").length;

  const stats = [
    {
      label: "Total buildings monitored",
      value: total.toString(),
      icon: Building2,
    },
    {
      label: "Buildings at high risk",
      value: `${pctHighRisk}%`,
      icon: ShieldAlert,
      sub: `${highRisk} of ${total} buildings`,
    },
    {
      label: "Zones flagged",
      value: `${flaggedZones} / ${zones.length}`,
      icon: MapPinned,
      sub: "Moderate or high aggregate risk",
    },
    {
      label: "Zones needing urgent review",
      value: zones.filter((z) => z.riskLevel === "high").length.toString(),
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            County-wide summary for the current monitoring period.
          </p>
        </div>
        <Button onClick={handleExportPdf} className="gap-1.5">
          <FileDown className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>{s.label}</CardDescription>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-3xl">{s.value}</CardTitle>
              </CardHeader>
              {s.sub && (
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">{s.sub}</p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zone breakdown</CardTitle>
          <CardDescription>Aggregate risk score and building count per zone.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {zones.map((z) => (
            <div key={z.id} className="flex items-center gap-3">
              <div className="w-40 shrink-0 truncate text-sm font-medium">{z.name}</div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${z.aggregateScore}%`,
                    backgroundColor:
                      z.riskLevel === "high"
                        ? "hsl(var(--risk-high))"
                        : z.riskLevel === "medium"
                        ? "hsl(var(--risk-medium))"
                        : "hsl(var(--risk-low))",
                  }}
                />
              </div>
              <div className="w-10 shrink-0 text-right text-sm text-muted-foreground">
                {z.aggregateScore}
              </div>
              <div className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                {z.buildingCount} bldgs
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
