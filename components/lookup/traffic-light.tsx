import { riskHex } from "@/lib/risk";
import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TrafficLight({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("h-16 w-16 rounded-full shadow-inner ring-4 ring-background", className)}
      style={{
        backgroundColor: riskHex[level],
        boxShadow: `0 0 0 1px hsl(var(--border)), 0 8px 24px -8px ${riskHex[level]}`,
      }}
    />
  );
}
