import { ClipboardCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { MitigationAction } from "@/lib/types";

export function MitigationsCard({ mitigations }: { mitigations: MitigationAction[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          <CardTitle>Recommended mitigations</CardTitle>
        </div>
        <CardDescription>Actions mapped to this building&apos;s driving factors.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {mitigations.map((m) => (
          <div key={m.factor} className="border-l-2 border-primary/30 pl-3">
            <p className="text-sm font-medium">{m.factor}</p>
            <ul className="mt-1 flex flex-col gap-1">
              {m.actions.map((a) => (
                <li key={a} className="text-sm text-muted-foreground">
                  {a}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
