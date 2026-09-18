import { Badge } from "@/components/ui/badge";
import { riskLabels } from "@/lib/risk";
import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <Badge variant={level} className={cn("gap-1", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {riskLabels[level]}
    </Badge>
  );
}
