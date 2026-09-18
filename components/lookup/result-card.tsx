import { MapPin } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { TrafficLight } from "@/components/lookup/traffic-light";
import { GuidanceSection } from "@/components/lookup/guidance-section";
import { plainLanguage } from "@/lib/risk";
import type { Building } from "@/lib/types";

export function ResultCard({ building }: { building: Building }) {
  const copy = plainLanguage[building.riskLevel];

  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
        <TrafficLight level={building.riskLevel} />

        <div>
          <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {building.address}
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="text-lg font-semibold tracking-tight">{copy.headline}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
        </div>

        <div className="w-full pt-2">
          <GuidanceSection level={building.riskLevel} />
        </div>
      </CardContent>
    </Card>
  );
}
