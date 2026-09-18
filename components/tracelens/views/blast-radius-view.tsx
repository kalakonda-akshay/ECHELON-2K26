"use client";

import React from "react";
import { BlastRadiusData, SystemStatus } from "../types";
import {
  Radio,
  AlertOctagon,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Users,
  Activity,
  ArrowRight,
  Server,
  Zap,
  Layers,
  Sliders
} from "lucide-react";

interface BlastRadiusViewProps {
  blastRadius: BlastRadiusData | null;
  status: SystemStatus | null;
  onNavigate: (tab: string) => void;
}

export function BlastRadiusView({
  blastRadius,
  status,
  onNavigate
}: BlastRadiusViewProps) {
  const isHealthy = status?.system_health === "HEALTHY";
  const affected = blastRadius?.currently_affected || [];
  const exposed = blastRadius?.potentially_exposed || [];
  const isolated = blastRadius?.isolated_healthy || [];
  const criticalPath = blastRadius?.critical_path || [];
  const impact = blastRadius?.customer_impact;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Blast Radius & Exposure Boundary Analysis
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/60 font-medium">
                DAG Topological Reachability
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Categorizes services into Root Cause, Currently Affected, Potentially Exposed (At-Risk), and Isolated Healthy components.
            </p>
          </div>
        </div>

        {/* Severity Pill */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border ${
              blastRadius?.impact_level === "CRITICAL_OUTAGE"
                ? "bg-rose-950 text-rose-300 border-rose-700 animate-pulse"
                : blastRadius?.impact_level === "DEGRADED_EXPERIENCE"
                ? "bg-amber-950 text-amber-300 border-amber-700"
                : "bg-emerald-950 text-emerald-300 border-emerald-700"
            }`}
          >
            <span>{blastRadius?.impact_level || "NOMINAL"}</span>
          </div>
        </div>
      </div>

      {/* Customer Impact KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 backdrop-blur">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Impacted Services</div>
          <div className="text-2xl font-bold text-slate-100 mt-1 flex items-baseline gap-2">
            <span>{blastRadius?.affected_count || 0}</span>
            <span className="text-xs font-mono text-slate-400">
              / {blastRadius?.total_services || 6} ({blastRadius?.affected_percentage || 0}%)
            </span>
          </div>
          <div className="text-[11px] text-rose-400 mt-1 font-mono">
            Root: {blastRadius?.root_cause_name || "None"}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 backdrop-blur">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Transaction Drop Rate</div>
          <div className="text-2xl font-bold text-slate-100 mt-1 flex items-baseline gap-2">
            <span className={impact && impact.failed_transactions_pct > 0 ? "text-rose-400" : "text-emerald-400"}>
              {impact?.failed_transactions_pct || 0}%
            </span>
            <span className="text-xs font-mono text-slate-400">Error Rate</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            SLA: {impact?.sla_breached ? "BREACHED" : "HEALTHY"}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 backdrop-blur">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Affected Users Traffic</div>
          <div className="text-2xl font-bold text-slate-100 mt-1 flex items-baseline gap-2">
            <span className="text-amber-400 font-mono">
              ~{impact?.estimated_affected_users_per_min || 0}
            </span>
            <span className="text-xs font-mono text-slate-400">req/min</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            Ingress Latency: {impact?.gateway_latency_ms || 24}ms
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 backdrop-blur">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Customer Route Impact</div>
          <div className="text-xs font-mono font-bold text-sky-400 mt-1.5 truncate">
            {impact?.impacted_endpoints[0] || "All Routes Healthy"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono truncate">
            {blastRadius?.impact_summary || "Normal operations"}
          </div>
        </div>
      </div>

      {/* Critical Path Visualization */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
            Critical Failure Propagation Path
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Root Origin &rarr; Edge Gateway Ingress
          </span>
        </div>

        {criticalPath.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">
            No active failure propagation chain.
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap py-2">
            {criticalPath.map((svc, idx) => {
              const isRoot = idx === 0;
              const isGateway = idx === criticalPath.length - 1;
              return (
                <React.Fragment key={svc}>
                  <div
                    className={`px-3 py-2 rounded-lg border font-mono text-xs flex items-center gap-2 ${
                      isRoot
                        ? "bg-rose-950/80 border-rose-700 text-rose-300 shadow-md shadow-rose-950/30"
                        : isGateway
                        ? "bg-sky-950/80 border-sky-700 text-sky-300"
                        : "bg-amber-950/60 border-amber-700 text-amber-300"
                    }`}
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span className="font-semibold">{svc}</span>
                    {isRoot && (
                      <span className="text-[9px] bg-rose-900 px-1 rounded text-white font-bold uppercase">
                        Origin
                      </span>
                    )}
                  </div>
                  {idx < criticalPath.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* 3 Categories Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Category 1: Currently Affected */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              Currently Affected ({affected.length})
            </span>
          </div>

          {affected.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              0 affected microservices.
            </div>
          ) : (
            <div className="space-y-2.5">
              {affected.map((svc) => (
                <div
                  key={svc.service_id}
                  className="p-3 rounded-lg bg-slate-950 border border-rose-900/50 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-200">{svc.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                      {svc.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Latency: {svc.latency_ms}ms</span>
                    <span className="text-rose-400">Error: {svc.error_rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category 2: Potentially Exposed / At-Risk */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Potentially Exposed ({exposed.length})
            </span>
          </div>

          {exposed.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No adjacent services currently exposed.
            </div>
          ) : (
            <div className="space-y-2.5">
              {exposed.map((svc) => (
                <div
                  key={svc.service_id}
                  className="p-3 rounded-lg bg-slate-950 border border-amber-900/50 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-200">{svc.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      AT RISK
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-400/90 font-mono">
                    &gt; {svc.exposure_reason || "Topological neighbor"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category 3: Isolated Healthy */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Isolated Healthy ({isolated.length})
            </span>
          </div>

          {isolated.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              All services involved in active cascade.
            </div>
          ) : (
            <div className="space-y-2.5">
              {isolated.map((svc) => (
                <div
                  key={svc.service_id}
                  className="p-3 rounded-lg bg-slate-950 border border-emerald-900/30 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-200">{svc.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      HEALTHY
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Latency: {svc.latency_ms}ms</span>
                    <span className="text-emerald-400">0% Errors</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
