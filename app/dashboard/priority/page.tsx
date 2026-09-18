"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { buildings, getZoneById } from "@/lib/mock-data";
import type { RiskLevel } from "@/lib/types";

// TODO(supabase): replace `buildings` with a query ordered by risk_score desc,
// e.g. supabase.from("buildings").select("*").order("risk_score", { ascending: false })

export default function PriorityListPage() {
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<RiskLevel | "all">("all");

  const rows = useMemo(() => {
    return [...buildings]
      .filter((b) => (levelFilter === "all" ? true : b.riskLevel === levelFilter))
      .filter((b) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        const zoneName = getZoneById(b.zoneId)?.name.toLowerCase() ?? "";
        return b.address.toLowerCase().includes(q) || zoneName.includes(q) || b.pincode.includes(q);
      })
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [query, levelFilter]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Priority list</h1>
        <p className="text-sm text-muted-foreground">
          All monitored buildings, ranked by risk score. Highest priority first.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search address, zone, or pincode"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as RiskLevel | "all")}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Filter by risk level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risk levels</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Moderate</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Risk level</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Primary driving factor</TableHead>
              <TableHead>Last updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((b) => (
              <TableRow key={b.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/dashboard/building/${b.id}`} className="hover:underline">
                    {b.address}
                  </Link>
                  <p className="text-xs text-muted-foreground">{b.pincode}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {getZoneById(b.zoneId)?.name}
                </TableCell>
                <TableCell>
                  <RiskBadge level={b.riskLevel} />
                </TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums">{b.riskScore}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{b.drivingFactors[0]}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(b.lastUpdated).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No buildings match your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
