"use client";

import React, { useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { DistributedTrace, TraceSpan } from "./types";
import { AlertTriangle, CheckCircle2, Clock, Layers, ChevronRight, ChevronDown } from "lucide-react";

interface TelemetryChartsProps {
  metricsHistory: Record<string, any[]>;
  selectedService: string;
}

export function TelemetryCharts({ metricsHistory, selectedService }: TelemetryChartsProps) {
  const serviceData = metricsHistory[selectedService] || [];

  const chartData = serviceData.map((item, idx) => ({
    time: item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : `T-${serviceData.length - idx}`,
    p50: item.p50_latency_ms,
    p95: item.p95_latency_ms,
    p99: item.p99_latency_ms,
    error_rate: item.error_rate_pct,
    rps: item.rps,
    cpu: item.cpu_pct
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Latency Percentiles Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Latency Percentiles (ms)
            </h4>
            <p className="text-sm text-slate-200 font-medium capitalize">
              {selectedService.replace("-", " ")}
            </p>
          </div>
          <span className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded-md font-mono">
            p50 / p95 / p99
          </span>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                itemStyle={{ color: "#e2e8f0" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
              <Line type="monotone" dataKey="p50" stroke="#38bdf8" strokeWidth={2} dot={false} name="p50 (Median)" />
              <Line type="monotone" dataKey="p95" stroke="#fbbf24" strokeWidth={2} dot={false} name="p95" />
              <Line type="monotone" dataKey="p99" stroke="#f43f5e" strokeWidth={2} dot={false} name="p99 (Outliers)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Error Rate & Throughput Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Error Rate (%) & Throughput (RPS)
            </h4>
            <p className="text-sm text-slate-200 font-medium capitalize">
              {selectedService.replace("-", " ")}
            </p>
          </div>
          <span className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded-md font-mono">
            Traffic vs Failures
          </span>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                itemStyle={{ color: "#e2e8f0" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
              <Area type="monotone" dataKey="error_rate" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.25} name="Error Rate %" />
              <Area type="monotone" dataKey="rps" stroke="#10b981" fill="#10b981" fillOpacity={0.15} name="RPS" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

interface TraceWaterfallProps {
  trace: DistributedTrace | null;
}

export function TraceWaterfallViewer({ trace }: TraceWaterfallProps) {
  const [expandedSpan, setExpandedSpan] = useState<string | null>(null);

  if (!trace) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No distributed trace selected</p>
      </div>
    );
  }

  const maxDuration = Math.max(...trace.spans.map((s) => s.duration_ms), 1);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {trace.status === "OK" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span className="font-mono text-xs text-slate-300 font-semibold">{trace.trace_id}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">{trace.route}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400 flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {trace.duration_ms}ms
          </span>
          <span
            className={`px-2 py-0.5 rounded font-mono text-xs font-semibold ${
              trace.status_code >= 500
                ? "bg-rose-950/80 text-rose-300 border border-rose-800/60"
                : "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60"
            }`}
          >
            HTTP {trace.status_code}
          </span>
        </div>
      </div>

      {trace.error_message && (
        <div className="mb-3 p-2.5 rounded-lg bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 font-mono">
          {trace.error_message}
        </div>
      )}

      {/* Waterfall List */}
      <div className="space-y-2">
        {trace.spans.map((span, idx) => {
          const depth = span.parent_id ? (idx === 0 ? 0 : idx === 1 ? 1 : idx <= 3 ? 2 : 3) : 0;
          const leftOffsetPct = (depth * 8);
          const widthPct = Math.max(8, (span.duration_ms / maxDuration) * (100 - leftOffsetPct));
          const isError = span.status === "ERROR";
          const isExpanded = expandedSpan === span.id;

          return (
            <div key={span.id} className="text-xs">
              <div
                onClick={() => setExpandedSpan(isExpanded ? null : span.id)}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  isError ? "bg-rose-950/20 hover:bg-rose-950/40" : "bg-slate-800/40 hover:bg-slate-800/70"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: `${depth * 16}px` }}>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-200 truncate">{span.service}</span>
                  <span className="text-slate-400 font-mono text-[11px] truncate">({span.name})</span>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {/* Visual Waterfall Bar */}
                  <div className="w-32 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        isError ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="font-mono text-slate-300 w-16 text-right font-medium">
                    {span.duration_ms}ms
                  </span>
                  <span
                    className={`w-12 text-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isError ? "bg-rose-900/60 text-rose-300" : "bg-emerald-900/60 text-emerald-300"
                    }`}
                  >
                    {span.code}
                  </span>
                </div>
              </div>

              {/* Expanded Span Details */}
              {isExpanded && (
                <div className="mt-1 ml-6 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                  <div className="text-slate-400">Span ID: <span className="text-slate-200">{span.id}</span></div>
                  <div className="text-slate-400">Parent Span: <span className="text-slate-200">{span.parent_id || "ROOT"}</span></div>
                  <div className="text-slate-400">Service: <span className="text-cyan-400">{span.service}</span></div>
                  <div className="text-slate-400">Operation: <span className="text-slate-200">{span.name}</span></div>
                  {span.error && (
                    <div className="text-rose-400 pt-1 border-t border-slate-900">
                      Error: <span className="text-rose-300">{span.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
