"use client";

import React from "react";
import {
  LayoutDashboard,
  Network,
  GitFork,
  BrainCircuit,
  Target,
  Radio,
  Sliders,
  History,
  GitCommit,
  PlayCircle,
  MonitorPlay,
  Server,
  Activity,
  ShieldCheck,
  Zap,
  RotateCcw,
  FolderPlus,
  FolderGit2,
  Clock,
  Bot,
  Film
} from "lucide-react";
import { SystemStatus, EarlyWarningData } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  status: SystemStatus | null;
  earlyWarning: EarlyWarningData | null;
  isPresentationMode: boolean;
  setIsPresentationMode: (val: boolean) => void;
  onReset: () => void;
  activeProjectId?: string;
  onConnectProject?: () => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  status,
  earlyWarning,
  isPresentationMode,
  setIsPresentationMode,
  onReset,
  activeProjectId = "FoodDelivery-Demo",
  onConnectProject
}: SidebarProps) {
  const isDemo = activeProjectId === "FoodDelivery-Demo";
  const isIncidentActive = Boolean(status?.active_scenario);
  const isHealthy = status?.system_health === "HEALTHY";
  const isCritical = status?.system_health === "CRITICAL" || status?.system_health === "DOWN";

  const navItems = [
    {
      id: "overview",
      label: "Command Center",
      icon: LayoutDashboard,
      badge: isIncidentActive ? "ACTIVE" : null,
      badgeColor: isCritical ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"
    },
    {
      id: "topology",
      label: "Live Topology",
      icon: Network,
      badge: status ? `${status.total_services} Nodes` : null,
      badgeColor: "bg-slate-800 text-slate-400 border-slate-700"
    },
    {
      id: "causal_graph",
      label: "Causal Incident Graph",
      icon: GitFork,
      badge: isIncidentActive ? "Event DAG" : null,
      badgeColor: "bg-sky-500/20 text-sky-400 border-sky-500/30"
    },
    {
      id: "adaptive",
      label: "Adaptive Engine 2.0",
      icon: BrainCircuit,
      badge: isIncidentActive ? "Bayesian" : null,
      badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30"
    },
    {
      id: "root_cause",
      label: "Root Cause & Score",
      icon: Target,
      badge: null
    },
    {
      id: "blast_radius",
      label: "Blast Radius",
      icon: Radio,
      badge: status && status.unhealthy_services_count > 0 ? `${status.unhealthy_services_count} At Risk` : null,
      badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30"
    },
    {
      id: "sandbox",
      label: "Recovery Sandbox",
      icon: Sliders,
      badge: "Digital Twin",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    },
    {
      id: "memory",
      label: "Incident Memory",
      icon: History,
      badge: null
    },
    {
      id: "deployments",
      label: "Deployments",
      icon: GitCommit,
      badge: null
    },
    {
      id: "demo_lab",
      label: "Demo Lab & Auto Demo",
      icon: PlayCircle,
      badge: "Auto Demo",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30"
    }
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none z-30 h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="px-5 py-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-white/10">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-wider text-slate-100 uppercase">
                  TraceRoute
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-semibold">
                  AI
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isCritical
                      ? "bg-rose-500 animate-ping"
                      : isHealthy
                      ? "bg-emerald-500"
                      : "bg-amber-500 animate-pulse"
                  }`}
                />
                <span>{status?.system_health || "CONNECTING"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Early Warning Banner if active */}
        {earlyWarning?.has_early_warning && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                Early Warning
              </span>
              <span className="font-mono text-[10px] bg-amber-900/60 px-1 rounded">
                TTB {earlyWarning.time_to_breach_seconds}s
              </span>
            </div>
            <p className="text-[10px] text-amber-400/80 mt-1 line-clamp-1">
              {earlyWarning.indicators[0]?.warning || "Telemetry drift detected"}
            </p>
          </div>
        )}

        {/* Navigation Groups */}
        <nav className="p-3 space-y-4">
          {/* Project Mode Quick Bar */}
          <div className="px-2.5 py-2 rounded-xl bg-[#161F35] border border-[#26344D] space-y-2 shadow-inner">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="tracking-wider">WORKSPACE</span>
              <span className={`px-1.5 py-0.2 rounded font-semibold text-[9px] ${isDemo ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30" : "bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/30"}`}>
                {isDemo ? "DEMO SIMULATOR" : "PROJECT ANALYSIS"}
              </span>
            </div>
            <button
              onClick={onConnectProject}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#22D3EE]/10 hover:bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/30 text-xs font-mono font-medium transition shadow-sm"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Connect Project</span>
            </button>
          </div>

          {/* Group 1: OBSERVE */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-[#22D3EE]" />
              <span>1. Observe</span>
            </div>
            {[
              { id: "overview", label: "Command Center", icon: LayoutDashboard, badge: isIncidentActive ? "ACTIVE" : null, badgeColor: "bg-[#F43F5E]/20 text-[#F43F5E] border-[#F43F5E]/40" },
              { id: "topology", label: "Service Topology", icon: Network, badge: status ? `${status.total_services} Nodes` : null },
              { id: "deployments", label: "Deployments", icon: GitCommit },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? "bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#161F35] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#22D3EE]" : "text-slate-400 group-hover:text-slate-300"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-semibold ${item.badgeColor || "bg-slate-800 text-slate-300 border-slate-700"}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Group 2: INVESTIGATE */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <Target className="w-3 h-3 text-[#8B5CF6]" />
              <span>2. Investigate</span>
            </div>
            {[
              { id: "root_cause", label: "Root Cause & Score", icon: Target, badge: isIncidentActive ? "RCA" : null, badgeColor: "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/40" },
              { id: "why_now", label: "Why Now? / Changed", icon: Clock, badge: isIncidentActive ? "Trigger" : null, badgeColor: "bg-[#22D3EE]/20 text-[#22D3EE] border-[#22D3EE]/40" },
              { id: "copilot", label: "TraceRoute Copilot", icon: Bot, badge: "AI SRE", badgeColor: "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/40" },
              { id: "adaptive", label: "Adaptive Evidence", icon: BrainCircuit, badge: isIncidentActive ? "Bayesian" : null, badgeColor: "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/40" },
              { id: "causal_graph", label: "Causal Graph", icon: GitFork, badge: isIncidentActive ? "DAG" : null },
              { id: "blast_radius", label: "Blast Radius", icon: Radio, badge: status && status.unhealthy_services_count > 0 ? `${status.unhealthy_services_count} At Risk` : null, badgeColor: "bg-[#F43F5E]/20 text-[#F43F5E] border-[#F43F5E]/40" },
              { id: "replay", label: "Incident Replay", icon: Film, badge: "Scrubber" },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? "bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#161F35] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#8B5CF6]" : "text-slate-400 group-hover:text-slate-300"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-semibold ${item.badgeColor || "bg-slate-800 text-slate-300 border-slate-700"}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Group 3: RECOVER */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-[#22C55E]" />
              <span>3. Recover</span>
            </div>
            {[
              { id: "sandbox", label: "SafeOps Sandbox", icon: Sliders, badge: "Digital Twin", badgeColor: "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/40" },
              { id: "memory", label: "Incident Memory", icon: History },
              { id: "demo_lab", label: "Demo Lab & Scenarios", icon: PlayCircle, badge: "Auto Demo", badgeColor: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40" },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#161F35] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#22C55E]" : "text-slate-400 group-hover:text-slate-300"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-semibold ${item.badgeColor || "bg-slate-800 text-slate-300 border-slate-700"}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Bottom Footer Section */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        {/* Presentation Mode Toggle */}
        <button
          onClick={() => setIsPresentationMode(!isPresentationMode)}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
            isPresentationMode
              ? "bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20 animate-pulse"
              : "bg-slate-900/90 text-purple-300 border-purple-900/60 hover:bg-purple-950/40 hover:border-purple-700"
          }`}
        >
          <MonitorPlay className="w-3.5 h-3.5" />
          <span>Presentation Mode</span>
        </button>

        {/* Quick Reset Button */}
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 transition"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Cluster to Nominal</span>
        </button>

        {/* Environment & Operator Info */}
        <div className="px-2 pt-2 text-[10px] text-slate-400 font-mono space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Cluster:</span>
            <span className="text-slate-300">k8s-prod-us-east-1</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Control Plane:</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              127.0.0.1:8000
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">On-Call SRE:</span>
            <span className="text-slate-300 truncate max-w-[110px]">oncall-sre@acme.corp</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
