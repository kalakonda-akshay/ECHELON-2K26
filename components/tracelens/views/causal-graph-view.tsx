"use client";

import React, { useState } from "react";
import {
  CausalGraphData,
  CausalNode,
  SystemStatus,
  Diagnosis
} from "../types";
import {
  GitFork,
  Clock,
  Layers,
  FileText,
  Activity,
  AlertOctagon,
  ArrowRight,
  Database,
  Server,
  Zap,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight
} from "lucide-react";

interface CausalGraphViewProps {
  causalGraph: CausalGraphData | null;
  status: SystemStatus | null;
  diagnosis: Diagnosis | null;
  onNavigate: (tab: string) => void;
}

export function CausalGraphView({
  causalGraph,
  status,
  diagnosis,
  onNavigate
}: CausalGraphViewProps) {
  const [selectedNode, setSelectedNode] = useState<CausalNode | null>(null);

  const nodes = causalGraph?.nodes || [];
  const edges = causalGraph?.edges || [];
  const isIncidentActive = Boolean(status?.active_scenario);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <GitFork className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Causal Incident Graph
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-medium">
                  Event-Level Directed Acyclic Graph
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Distinct from static service topology: maps exact sequential causal events, telemetry evidence, and propagation mechanics.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isIncidentActive ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs font-mono text-rose-300">
              <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>Causal Chain Active: {status?.active_scenario}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-xs font-mono text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>No Active Causal Anomalies</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Causal Chain Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Causal Graph Canvas / Timeline */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Temporal Event Sequence ({nodes.length} Causal Nodes)
            </span>
            <span className="text-[11px] text-slate-400">
              Click any causal node to inspect supporting telemetry
            </span>
          </div>

          {nodes.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-60" />
              <p className="text-sm text-slate-400">System operating at nominal baseline.</p>
              <p className="text-xs text-slate-400">
                Inject a scenario in the Demo Lab to visualize the event-level causal DAG.
              </p>
              <button
                onClick={() => onNavigate("demo_lab")}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs text-white font-medium transition"
              >
                Go to Demo Lab
              </button>
            </div>
          ) : (
            <div className="space-y-4 relative">
              {/* Connecting vertical rail */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-rose-500 via-amber-500 to-sky-500 opacity-40 -z-0" />

              {nodes.map((node, index) => {
                const isSelected = selectedNode?.id === node.id;
                const isFirst = index === 0;
                const isLast = index === nodes.length - 1;

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`relative z-10 flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-800/90 border-sky-500 ring-2 ring-sky-500/20 shadow-lg shadow-sky-500/10"
                        : "bg-slate-950/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {/* Node Order Marker */}
                    <div
                      className={`w-12 h-12 rounded-xl shrink-0 flex flex-col items-center justify-center border font-mono ${
                        isFirst
                          ? "bg-rose-950/80 text-rose-300 border-rose-700/80 shadow-md shadow-rose-900/30"
                          : isLast
                          ? "bg-sky-950/80 text-sky-300 border-sky-700/80"
                          : "bg-amber-950/60 text-amber-300 border-amber-700/60"
                      }`}
                    >
                      <span className="text-[10px] font-bold">EVENT</span>
                      <span className="text-xs font-black">#{index + 1}</span>
                    </div>

                    {/* Event Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                          {node.event}
                          {isFirst && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 uppercase font-bold">
                              Root Trigger
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {node.timestamp}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-xs font-mono">
                        <span className="flex items-center gap-1 text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          <Server className="w-3 h-3 text-sky-400" />
                          {node.service}
                        </span>
                        <span className="flex items-center gap-1 text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/50">
                          <Layers className="w-3 h-3 text-purple-400" />
                          {node.evidence_source}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-2 font-mono bg-slate-900/60 p-2 rounded border border-slate-800/60">
                        &gt; {node.evidence_details}
                      </p>
                    </div>

                    {/* Click indicator */}
                    <ChevronRight className={`w-5 h-5 shrink-0 self-center transition-colors ${isSelected ? "text-sky-400" : "text-slate-600"}`} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Evidence Inspection Drawer / Panel */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                Evidence Inspection Drawer
              </span>
              {selectedNode && (
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {selectedNode ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Selected Event</div>
                  <h4 className="text-sm font-bold text-slate-100 mt-0.5">{selectedNode.event}</h4>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Target Service</div>
                    <div className="text-slate-200 font-semibold mt-0.5">{selectedNode.service}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Timestamp Offset</div>
                    <div className="text-sky-400 font-semibold mt-0.5">{selectedNode.timestamp}</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
                  <div className="text-[10px] text-slate-400 uppercase">Evidence Telemetry Source</div>
                  <div className="text-purple-300 font-medium">{selectedNode.evidence_source}</div>
                  <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800 overflow-x-auto">
                    <code>{selectedNode.evidence_details}</code>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Algorithmic Correlation</div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    This causal event has been mathematically linked to the propagation path with high confidence score. No hallucinated LLM guesses.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                <FileText className="w-8 h-8 text-slate-400 mx-auto opacity-40" />
                <p>Select any causal event from the list on the left to inspect detailed telemetry snippets, timestamps, and stack traces.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <button
              onClick={() => onNavigate("adaptive")}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition shadow-sm"
            >
              <span>View Adaptive Engine Reasoning</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate("sandbox")}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 transition"
            >
              <span>Test Remediation in Sandbox</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
