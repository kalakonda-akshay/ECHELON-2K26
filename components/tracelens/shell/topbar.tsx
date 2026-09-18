"use client";

import React from "react";
import {
  Search,
  RefreshCw,
  Bell,
  Radio,
  RotateCcw,
  MonitorPlay,
  Server,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ChevronDown,
  FolderGit2,
  PlusCircle,
  Layers
} from "lucide-react";
import { SystemStatus, EarlyWarningData, ProjectSummary } from "../types";

interface TopbarProps {
  status: SystemStatus | null;
  earlyWarning: EarlyWarningData | null;
  lastRefreshed: Date;
  onRefresh: () => void;
  onReset: () => void;
  isPresentationMode: boolean;
  setIsPresentationMode: (val: boolean) => void;
  onNavigate: (tab: string) => void;
  projects?: ProjectSummary[];
  activeProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  onOpenConnectProject?: () => void;
}

export function Topbar({
  status,
  earlyWarning,
  lastRefreshed,
  onRefresh,
  onReset,
  isPresentationMode,
  setIsPresentationMode,
  onNavigate,
  projects = [],
  activeProjectId = "FoodDelivery-Demo",
  onSelectProject,
  onOpenConnectProject
}: TopbarProps) {
  const [isProjectMenuOpen, setIsProjectMenuOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isHealthy = status?.system_health === "HEALTHY";
  const isCritical = status?.system_health === "CRITICAL" || status?.system_health === "DOWN";
  const isDegraded = status?.system_health === "DEGRADED" || status?.system_health === "WARNING";

  const activeProject = projects.find((p) => p.id === activeProjectId) || {
    id: "FoodDelivery-Demo",
    name: "FoodDelivery-Demo",
    type: "DEMO",
    readiness_pct: 100
  };

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Left: Project Switcher & Status Badges */}
      <div className="flex items-center gap-3">
        {/* Project Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-mono text-slate-200 transition shadow-sm group"
          >
            <div className={`w-2 h-2 rounded-full ${activeProjectId === "FoodDelivery-Demo" ? "bg-emerald-400" : "bg-sky-400"}`} />
            <span className="font-semibold text-white max-w-[140px] sm:max-w-[180px] truncate">
              {activeProject.name}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {activeProject.type === "DEMO" ? "SIMULATOR" : "PROJECT"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition" />
          </button>

          {isProjectMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
                <span>Select Workspace</span>
                <span>{projects.length} Available</span>
              </div>

              <div className="max-h-60 overflow-y-auto py-1">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      setIsProjectMenuOpen(false);
                      onSelectProject?.(proj.id);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-900 transition ${
                      proj.id === activeProjectId ? "bg-sky-500/10 text-sky-400" : "text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${proj.id === "FoodDelivery-Demo" ? "bg-emerald-400" : "bg-sky-400"}`} />
                      <div className="truncate">
                        <div className="text-xs font-medium text-white truncate">{proj.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {proj.services_count || 1} Services • {proj.readiness_pct}% Ready
                        </div>
                      </div>
                    </div>
                    {proj.id === activeProjectId && (
                      <span className="text-[10px] font-mono px-1 rounded bg-sky-950 text-sky-400 shrink-0">
                        ACTIVE
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="pt-2 mt-1 border-t border-slate-800/80 px-2">
                <button
                  onClick={() => {
                    setIsProjectMenuOpen(false);
                    onOpenConnectProject?.();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition shadow-md shadow-sky-600/20"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Connect New Project</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* System Health Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border ${
            isHealthy
              ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
              : isCritical
              ? "bg-rose-950/80 text-rose-300 border-rose-800/80 animate-pulse"
              : "bg-amber-950/60 text-amber-300 border-amber-800/60"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isHealthy
                ? "bg-emerald-400"
                : isCritical
                ? "bg-rose-500 animate-ping"
                : "bg-amber-400"
            }`}
          />
          <span>{status?.system_health || "UNKNOWN"}</span>
          {status?.unhealthy_services_count ? (
            <span className="ml-1 px-1 rounded bg-rose-900/60 text-[10px] text-white">
              {status.unhealthy_services_count} failing
            </span>
          ) : null}
        </div>

        {/* Active Scenario Tag */}
        {status?.active_scenario && (
          <div
            onClick={() => onNavigate("overview")}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-900/30 border border-rose-700/50 text-[11px] font-mono text-rose-300 cursor-pointer hover:bg-rose-900/50 transition"
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>INCIDENT: {status.active_scenario}</span>
            <span className="text-[10px] text-rose-400 bg-rose-950 px-1 rounded">
              {status.active_incident_id}
            </span>
          </div>
        )}

        {/* Early Warning Tag */}
        {earlyWarning?.has_early_warning && !status?.active_scenario && (
          <div
            onClick={() => onNavigate("overview")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/60 border border-amber-700/60 text-[11px] font-mono text-amber-300 cursor-pointer animate-pulse"
          >
            <Radio className="w-3 h-3 text-amber-400" />
            <span>EARLY WARNING (TTB: {earlyWarning.time_to_breach_seconds}s)</span>
          </div>
        )}
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden md:flex items-center max-w-sm w-full mx-4">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search microservices, traces, spans, incidents (e.g. payment-db)..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-sky-500/80 focus:ring-1 focus:ring-sky-500/50 font-mono transition"
          />
        </div>
      </div>

      {/* Right: Actions & Sync Status */}
      <div className="flex items-center gap-3">
        {/* Sync Status Button */}
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-xs font-mono transition"
          title="Manual Telemetry Sync"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline" suppressHydrationWarning>
            {mounted ? `Synced ${lastRefreshed.toLocaleTimeString()}` : "Synced"}
          </span>
        </button>

        {/* Quick Reset */}
        <button
          onClick={onReset}
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs transition"
          title="Reset Cluster to Baseline"
        >
          <RotateCcw className="w-3 h-3 text-slate-400" />
          <span>Reset</span>
        </button>

        {/* Presentation Mode Button */}
        <button
          onClick={() => setIsPresentationMode(!isPresentationMode)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition ${
            isPresentationMode
              ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20"
              : "bg-purple-950/40 text-purple-300 border-purple-800/60 hover:bg-purple-900/50"
          }`}
        >
          <MonitorPlay className="w-3.5 h-3.5 text-purple-300" />
          <span className="hidden sm:inline">Presentation Mode</span>
        </button>
      </div>
    </header>
  );
}
