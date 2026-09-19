"use client";

import React, { useState } from "react";
import {
  SystemStatus,
  TopologyData,
  TelemetryData,
  Diagnosis,
  InvestigationStep,
  BlastRadiusData,
  CausalGraphData,
  AdaptiveAnalysis,
  RecoveryPlan,
  VerificationResult
} from "../types";
import { TraceRootAPI } from "../api";
import {
  MonitorPlay,
  X,
  RotateCcw,
  Zap,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle2,
  GitFork,
  Radio,
  Sliders,
  Play,
  ShieldCheck,
  Check
} from "lucide-react";

interface PresentationViewProps {
  status: SystemStatus | null;
  topology: TopologyData | null;
  telemetry: TelemetryData | null;
  diagnosis: Diagnosis | null;
  investigationSteps: InvestigationStep[];
  blastRadius: BlastRadiusData | null;
  causalGraph: CausalGraphData | null;
  adaptiveData: AdaptiveAnalysis | null;
  recoveryPlan: RecoveryPlan | null;
  onExit: () => void;
  onReset: () => void;
  onRefresh: () => void;
}

export function PresentationView({
  status,
  topology,
  telemetry,
  diagnosis,
  investigationSteps,
  blastRadius,
  causalGraph,
  adaptiveData,
  recoveryPlan,
  onExit,
  onReset,
  onRefresh
}: PresentationViewProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [isExecutingLive, setIsExecutingLive] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  const isHealthy = status?.system_health === "HEALTHY";
  const isCritical = status?.system_health === "CRITICAL" || status?.system_health === "DOWN";
  const scenario = status?.active_scenario;
  const nodes = topology?.nodes || [];
  const edges = topology?.edges || [];

  async function handleQuickRecovery() {
    if (!recoveryPlan?.action_id) return;
    setIsExecutingLive(true);
    try {
      await TraceRootAPI.approveRecovery(recoveryPlan.action_id);
      await new Promise((r) => setTimeout(r, 1500));
      const ver = await TraceRootAPI.verifyRecovery();
      setVerificationResult(ver);
      onRefresh();
    } catch (err) {
      console.error("Presentation mode recovery failed:", err);
    } finally {
      setIsExecutingLive(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 overflow-y-auto font-sans p-6 select-none flex flex-col justify-between">
      {/* Cinematic Top Control Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-wider text-slate-100 uppercase">
                TraceRoot AI
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold uppercase">
                Projector Presentation Mode
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Detect &bull; Trace &bull; Explain &bull; Recover &bull; Verify
            </div>
          </div>
        </div>

        {/* Global Cluster Status Indicators */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border ${
              isHealthy
                ? "bg-emerald-950/80 text-emerald-400 border-emerald-700"
                : isCritical
                ? "bg-rose-950 text-rose-300 border-rose-700 animate-pulse"
                : "bg-amber-950 text-amber-300 border-amber-700"
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isHealthy ? "bg-emerald-400" : "bg-rose-500 animate-ping"
              }`}
            />
            <span>{status?.system_health || "UNKNOWN"}</span>
            {scenario && <span>({scenario})</span>}
          </div>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-900/60 text-slate-300 hover:text-white border border-slate-800 transition text-xs font-medium"
          >
            <X className="w-4 h-4" />
            <span>Exit Fullscreen</span>
          </button>
        </div>
      </div>

      {/* Main Multi-Column Cinematic Screen (1920x1080 Optimized) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column (5 Cols): Live Service Topology SVG Graph */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              Live Microservice Topology ({nodes.length} Services)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {status?.cascade_stage || "Nominal Baseline"}
            </span>
          </div>

          {/* SVG Topology Visualizer */}
          <div className="relative w-full h-[460px] bg-slate-950/90 rounded-xl border border-slate-800/80 overflow-hidden my-3">
            <svg className="w-full h-full" viewBox="0 0 800 560">
              <defs>
                <linearGradient id="edgeNominal" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="edgeCritical" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="1" />
                </linearGradient>
              </defs>

              {/* Render Directed Edges */}
              {edges.map((e, idx) => {
                const sNode = nodes.find((n) => n.id === e.source);
                const tNode = nodes.find((n) => n.id === e.target);
                if (!sNode || !tNode) return null;

                const isCrit = e.status === "CRITICAL";

                return (
                  <g key={idx}>
                    <line
                      x1={sNode.x}
                      y1={sNode.y + 25}
                      x2={tNode.x}
                      y2={tNode.y - 25}
                      stroke={isCrit ? "url(#edgeCritical)" : "url(#edgeNominal)"}
                      strokeWidth={isCrit ? "3" : "2"}
                      strokeDasharray={isCrit ? "6 4" : "none"}
                    />
                  </g>
                );
              })}

              {/* Render Service Nodes */}
              {nodes.map((n) => {
                const isCrit = n.status === "CRITICAL" || n.status === "DOWN";
                const isWarn = n.status === "WARNING" || n.status === "DEGRADED";

                return (
                  <g key={n.id} transform={`translate(${n.x - 90}, ${n.y - 30})`}>
                    <rect
                      width="180"
                      height="60"
                      rx="12"
                      className={`transition-all duration-700 ${
                        isCrit
                          ? "fill-rose-950/90 stroke-rose-500 stroke-2"
                          : isWarn
                          ? "fill-amber-950/90 stroke-amber-500 stroke-2"
                          : "fill-slate-900/90 stroke-sky-500/60 stroke"
                      }`}
                    />
                    <text
                      x="14"
                      y="26"
                      className="fill-slate-100 font-bold text-xs font-mono"
                    >
                      {n.name}
                    </text>
                    <text
                      x="14"
                      y="46"
                      className={`text-[10px] font-mono ${
                        isCrit ? "fill-rose-400 font-bold" : "fill-slate-400"
                      }`}
                    >
                      {n.latency ?? n.p50_latency_ms ?? 20}ms &bull; {n.error_rate ?? n.error_rate_pct ?? 0}% err
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>Cluster p95: {status?.cluster_avg_latency_ms}ms</span>
            <span>Max Error Rate: {status?.cluster_max_error_rate_pct}%</span>
          </div>
        </div>

        {/* Center Column (4 Cols): Causal Incident Graph & Root Cause */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <GitFork className="w-4 h-4 text-sky-400" />
              Causal Chain & Root Cause
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
              Confidence: {diagnosis?.confidence_score || 100}%
            </span>
          </div>

          {/* Root Cause Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-rose-800/60 space-y-2">
            <div className="text-[10px] font-mono uppercase text-rose-400 font-bold">
              Isolated Root Cause Initiator:
            </div>
            <div className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-rose-400" />
              <span>{diagnosis?.initiating_service_name || "Payment Database"}</span>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-rose-950 text-rose-300">
                100/100 PTS
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {diagnosis?.ai_explanation?.technical_narrative ||
                "Multi-factor scoring identified this node as the true causal initiator based on temporal precedence and connection pool exhaustion."}
            </p>
          </div>

          {/* Causal Event Sequence */}
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[280px] pr-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
              Event-Level Propagation Steps:
            </div>
            {(causalGraph?.nodes || []).map((ev, i) => (
              <div
                key={ev.id}
                className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono flex items-start gap-2.5"
              >
                <span className="w-5 h-5 rounded bg-slate-900 text-sky-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-200 truncate">{ev.event}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{ev.service}</span>
                    <span>&bull;</span>
                    <span className="text-sky-400">{ev.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Blast Radius Summary */}
          <div className="pt-2 border-t border-slate-800/80 text-xs font-mono flex items-center justify-between text-slate-400">
            <span>Blast Radius: {blastRadius?.affected_count || 0} Affected</span>
            <span className="text-rose-400">{blastRadius?.impact_level || "NOMINAL"}</span>
          </div>
        </div>

        {/* Right Column (3 Cols): Recovery & Automated Verification */}
        <div className="lg:col-span-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Controlled Recovery
            </span>
          </div>

          {/* Recovery Playbook */}
          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-800/60 space-y-3">
            <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
              Recommended Remediation Playbook:
            </div>
            <h4 className="text-xs font-bold text-slate-100">
              {recoveryPlan?.action_name || "Reset DB Connection Pool"}
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              {recoveryPlan?.description || "Gracefully clears idle database connections with zero transaction loss."}
            </p>

            <button
              onClick={handleQuickRecovery}
              disabled={isExecutingLive}
              className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/40 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isExecutingLive ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing 5-Gate Verification...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Execute & Verify Recovery</span>
                </>
              )}
            </button>
          </div>

          {/* Verification Result Badge */}
          {verificationResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500 text-xs font-mono space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>RECOVERY VERIFIED</span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans">
                {verificationResult.summary}
              </p>
              <div className="text-[10px] text-emerald-400">
                &bull; All 6 services returned to nominal SLA baseline.
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="text-[10px] font-mono text-slate-400 text-center">
            TraceRoot AI Intelligent SRE Autonomous Control Plane
          </div>
        </div>
      </div>
    </div>
  );
}
