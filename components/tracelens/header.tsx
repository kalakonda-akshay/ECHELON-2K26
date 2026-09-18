"use client";

import React from "react";
import { SystemStatus } from "./types";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Layers,
  RotateCcw,
  Sparkles,
  Search,
  ShieldCheck,
  History,
  Terminal,
  Cpu
} from "lucide-react";

interface HeaderProps {
  status: SystemStatus | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onReset: () => void;
}

export function Header({ status, activeTab, setActiveTab, onReset }: HeaderProps) {
  const isIncident = status?.active_scenario != null;
  const isHealthy = status?.system_health === "HEALTHY";
  const isCritical = status?.system_health === "CRITICAL";

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                TraceRoute <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">AI</span>
              </h1>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              Detect &bull; Trace &bull; Explain &bull; Recover &bull; Verify
            </p>
          </div>
        </div>

        {/* Live Cluster Metrics Ticker */}
        <div className="hidden md:flex items-center gap-4 bg-slate-900/80 border border-slate-800/80 rounded-xl px-4 py-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Nodes:</span>
            <span className="font-mono text-slate-200 font-semibold">{status?.total_services || 6}/6</span>
          </div>
          <div className="h-3.5 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Avg Latency:</span>
            <span className={`font-mono font-semibold ${isCritical ? "text-rose-400" : "text-slate-200"}`}>
              {status?.cluster_avg_latency_ms || 24}ms
            </span>
          </div>
          <div className="h-3.5 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Max Error:</span>
            <span className={`font-mono font-semibold ${isCritical ? "text-rose-400 font-bold" : "text-emerald-400"}`}>
              {status?.cluster_max_error_rate_pct || 0}%
            </span>
          </div>
        </div>

        {/* Status Pill & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Health status badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold tracking-wide ${
              isCritical
                ? "bg-rose-950/80 border-rose-800 text-rose-300 shadow-lg shadow-rose-950/50"
                : isHealthy
                ? "bg-emerald-950/80 border-emerald-800 text-emerald-300 shadow-lg shadow-emerald-950/50"
                : "bg-amber-950/80 border-amber-800 text-amber-300"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isCritical ? "bg-rose-500 animate-ping" : isHealthy ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span>{isCritical ? "CRITICAL CASCADE" : isHealthy ? "SYSTEM HEALTHY" : "DEGRADED"}</span>
            {isIncident && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-200">
                {status?.active_incident_id}
              </span>
            )}
          </div>

          {/* Demo Lab Button */}
          <button
            onClick={() => setActiveTab("demo_lab")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 hover:border-amber-400 text-xs font-medium transition shadow-md"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Demo Lab</span>
          </button>

          {/* Quick Reset */}
          <button
            onClick={onReset}
            title="Reset to 100% Baseline Health"
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-1 py-1.5 scrollbar-none">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "topology", label: "Live Topology", icon: Layers },
          { id: "investigation", label: "Adaptive Investigation", icon: Search },
          { id: "root_cause", label: "Root Cause & Evidence", icon: Sparkles },
          { id: "recovery", label: "Recovery & Verification", icon: ShieldCheck },
          { id: "history", label: "Incident History", icon: History },
          { id: "demo_lab", label: "Demo Lab (Scenarios)", icon: Flame }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const hasIncidentAlert = isIncident && (tab.id === "investigation" || tab.id === "root_cause" || tab.id === "recovery");

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
              <span>{tab.label}</span>
              {hasIncidentAlert && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
