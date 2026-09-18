"use client";

import { useState } from "react";
import { ChevronDown, Wind, ShieldCheck, Building2 } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";

const guidance: Record<RiskLevel, { icon: typeof Wind; title: string; body: string }[]> = {
  high: [
    { icon: ShieldCheck, title: "Get your home tested", body: "Use a short-term or long-term radon test kit, or ask the municipal office for a certified tester." },
    { icon: Wind, title: "Ventilate lived-in spaces", body: "Open windows regularly and avoid spending long hours in unventilated basements until tested." },
    { icon: Building2, title: "Contact the municipal office", body: "Ask about mitigation subsidies and inspection scheduling for your area." },
  ],
  medium: [
    { icon: ShieldCheck, title: "Consider testing your home", body: "A simple test kit will tell you whether your specific home needs further action." },
    { icon: Wind, title: "Improve ventilation", body: "Small changes, like regular airing of basements and ground floors, can help." },
    { icon: Building2, title: "Know who to contact", body: "The municipal health office can advise if your test results come back elevated." },
  ],
  low: [
    { icon: ShieldCheck, title: "Test every few years", body: "Routine testing every 3-5 years is a good habit even in low-risk areas." },
    { icon: Wind, title: "Keep normal ventilation", body: "No special action needed — your usual airflow is enough." },
    { icon: Building2, title: "Reach out if unsure", body: "The municipal office can answer questions any time." },
  ],
};

export function GuidanceSection({ level }: { level: RiskLevel }) {
  const [open, setOpen] = useState(false);
  const items = guidance[level];

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/70">
        What should I do?
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3 border-x border-b border-border rounded-b-md px-4 py-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </div>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
