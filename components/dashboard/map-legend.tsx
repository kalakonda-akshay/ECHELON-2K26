import { riskHex, riskLabels } from "@/lib/risk";
import type { RiskLevel } from "@/lib/types";

const levels: RiskLevel[] = ["low", "medium", "high"];

export function MapLegend() {
  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-[400] rounded-lg border border-border bg-card/95 p-3 shadow-md backdrop-blur">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Risk level</p>
      <div className="flex flex-col gap-1.5">
        {levels.map((level) => (
          <div key={level} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: riskHex[level] }}
            />
            <span>{riskLabels[level]}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 max-w-[11rem] text-[11px] leading-snug text-muted-foreground">
        Shaded zones show area risk; dots mark individual buildings.
      </p>
    </div>
  );
}
