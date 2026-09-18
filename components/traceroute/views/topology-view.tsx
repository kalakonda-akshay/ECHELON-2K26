"use client";

import React, { useState } from "react";
import { TopologyData, TopologyNode, TelemetryData } from "../types";
import {
  Server,
  Database,
  Radio,
  Cpu,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Layers,
  Terminal,
  Activity
} from "lucide-react";

interface TopologyViewProps {
  topology: TopologyData | null;
  telemetry: TelemetryData | null;
  activeScenario: string | null;
}

export function TopologyView({ topology, telemetry, activeScenario }: TopologyViewProps) {
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);

  if (!topology) return null;

  const nodeMap = new Map<string, TopologyNode>();
  topology.nodes.forEach((n) => nodeMap.set(n.id, n));

  return (
    <div className="space-y-4">
      {/* Top Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Interactive Microservice Dependency Topology</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any node to inspect real-time metrics, connection pools, and container logs
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-300">Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-slate-300">Critical / Down</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-slate-300">Investigating</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Canvas Graph */}
        <div className="lg:col-span-2 relative bg-slate-950 border border-slate-800/90 rounded-2xl p-4 overflow-hidden min-h-[560px] flex items-center justify-center shadow-2xl">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

          {/* SVG Dependency Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 560">
            <defs>
              <linearGradient id="healthyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#065f46" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="criticalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#881337" stopOpacity="0.5" />
              </linearGradient>
            </defs>

            {topology.edges.map((edge, idx) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              if (!source || !target) return null;

              const isCritical = edge.status === "CRITICAL";
              const isWarning = edge.status === "WARNING";

              const strokeColor = isCritical ? "#f43f5e" : isWarning ? "#fbbf24" : "#10b981";

              const sx = source.x ?? 400;
              const sy = source.y ?? 100;
              const tx = target.x ?? 400;
              const ty = target.y ?? 300;

              // Draw curved path
              const midY = (sy + ty) / 2;
              const pathD = `M ${sx} ${sy + 25} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty - 25}`;

              const protocolName = (edge.protocol ? String(edge.protocol).split(" ")[0] : "HTTP");
              const latencyVal = edge.latency_ms ?? (edge as any).avg_latency ?? 20;

              return (
                <g key={idx}>
                  {/* Glowing line backdrop */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isCritical ? "4" : "2"}
                    strokeOpacity={isCritical ? "0.8" : "0.5"}
                    strokeDasharray={isCritical ? "6,4" : "none"}
                    className={isCritical ? "animate-pulse" : ""}
                  />

                  {/* Flow Particle */}
                  <circle r={isCritical ? "4" : "3"} fill={strokeColor}>
                    <animateMotion dur={isCritical ? "1.2s" : "2.4s"} repeatCount="indefinite" path={pathD} />
                  </circle>

                  {/* Edge Protocol Tag */}
                  <text
                    x={(sx + tx) / 2 + (idx % 2 === 0 ? 12 : -12)}
                    y={midY}
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {protocolName} ({latencyVal}ms)
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Render Service Nodes */}
          <div className="relative w-full h-[560px]">
            {topology.nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isCrit = node.status === "CRITICAL" || node.status === "DOWN";
              const isWarn = node.status === "WARNING";
              const isInvestigating = Boolean(activeScenario && (isCrit || isWarn));

              // Map coordinates
              const style = {
                left: `${(node.x / 800) * 100}%`,
                top: `${(node.y / 560) * 100}%`,
                transform: "translate(-50%, -50%)"
              };

              return (
                <div
                  key={node.id}
                  style={style}
                  onClick={() => setSelectedNode(node)}
                  className={`absolute z-10 p-3 rounded-2xl border cursor-pointer transition-all duration-700 ease-in-out w-44 select-none ${
                    isSelected
                      ? "bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/50 shadow-2xl shadow-cyan-500/30 scale-105"
                      : isCrit
                      ? "bg-slate-900/95 border-rose-500/90 shadow-xl shadow-rose-950/60 hover:scale-102 ring-1 ring-rose-500/30"
                      : isWarn
                      ? "bg-slate-900/95 border-amber-500/80 shadow-xl shadow-amber-950/60 hover:scale-102 ring-1 ring-amber-500/30"
                      : "bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:scale-102 ring-1 ring-emerald-500/20"
                  }`}
                >
                  {/* Status Indicator Glow */}
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isCrit ? "bg-rose-500 animate-ping" : isWarn ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                      />
                      <span className="text-[10px] font-mono text-slate-400 truncate uppercase tracking-wider">
                        {node.tier}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        isCrit
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : isWarn
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>

                  {/* Title & Icon */}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isCrit ? "bg-rose-950/60 text-rose-400" : "bg-slate-800 text-cyan-400"
                      }`}
                    >
                      {node.type === "database" ? (
                        <Database className="w-4 h-4" />
                      ) : (
                        <Server className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{node.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{node.runtime}</p>
                    </div>
                  </div>

                  {/* Micro metrics bar */}
                  <div className="flex items-center justify-between text-[10px] font-mono pt-1.5 border-t border-slate-800 text-slate-400">
                    <span>{node.p50_latency_ms}ms</span>
                    <span className={node.error_rate_pct > 0 ? "text-rose-400 font-bold" : "text-emerald-400"}>
                      {node.error_rate_pct}% err
                    </span>
                    <span>{node.rps} rps</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Node Telemetry Inspector Drawer */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Service Telemetry Inspector
                </h4>
              </div>
              {selectedNode && (
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-4">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{selectedNode.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Port {selectedNode.port}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{selectedNode.description}</p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">p50 / p99 Latency</span>
                    <span className="text-slate-200 font-bold">{selectedNode.p50_latency_ms}ms / {selectedNode.p99_latency_ms}ms</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Error Rate</span>
                    <span className={`font-bold ${selectedNode.error_rate_pct > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {selectedNode.error_rate_pct}%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Throughput</span>
                    <span className="text-slate-200 font-bold">{selectedNode.rps} RPS</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">CPU Load</span>
                    <span className="text-slate-200 font-bold">{selectedNode.cpu_pct}%</span>
                  </div>
                </div>

                {/* Structured Logs from this service */}
                <div>
                  <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-slate-500" />
                    <span>Recent Structured Logs</span>
                  </h5>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto font-mono text-[10px]">
                    {telemetry?.recent_logs
                      .filter((l) => l.service === selectedNode.id)
                      .slice(0, 5)
                      .map((log, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded border ${
                            log.level === "ERROR"
                              ? "bg-rose-950/40 border-rose-900/60 text-rose-300"
                              : log.level === "WARN"
                              ? "bg-amber-950/40 border-amber-900/60 text-amber-300"
                              : "bg-slate-950 border-slate-800 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[9px] text-slate-500 mb-0.5">
                            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className="font-bold">{log.level}</span>
                          </div>
                          <p className="line-clamp-2">{log.message}</p>
                        </div>
                      ))}

                    {telemetry?.recent_logs.filter((l) => l.service === selectedNode.id).length === 0 && (
                      <p className="text-slate-500 text-center py-4">No recent warnings or errors logged.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <Layers className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">Select any service node on the map to inspect its real-time telemetry stream.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
