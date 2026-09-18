"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";

import type { SensorReading } from "@/lib/types";

const EPA_ACTION_LEVEL = 4; // pCi/L — standard reference line, not a live config value

export function TrendChart({ data }: { data: SensorReading[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString(undefined, { month: "short" }),
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={formatted} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={{ stroke: "hsl(var(--border))" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <ReferenceLine
          y={EPA_ACTION_LEVEL}
          stroke="hsl(var(--risk-high))"
          strokeDasharray="4 4"
          label={{
            value: "Action level",
            position: "insideTopRight",
            fontSize: 10,
            fill: "hsl(var(--risk-high))",
          }}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value: number) => [`${value} pCi/L`, "Radon reading"]}
        />
        <Line
          type="monotone"
          dataKey="radonPCiL"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
