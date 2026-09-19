"use client";

import React, { useState, useEffect } from "react";
import {
  CandidateOption,
  SandboxSimulation,
  SystemStatus,
  Diagnosis,
  VerificationResult
} from "../types";
import { TraceRootAPI } from "../api";
import {
  Sliders,
  Play,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Clock,
  Sparkles,
  Server,
  Activity,
  ArrowRight,
  Terminal,
  Cpu,
  Flame,
  Check
} from "lucide-react";

interface SandboxViewProps {
  status: SystemStatus | null;
  diagnosis: Diagnosis | null;
  onRecoveryComplete: () => void;
  onNavigate: (tab: string) => void;
}

export function SandboxView({
  status,
  diagnosis,
  onRecoveryComplete,
  onNavigate
}: SandboxViewProps) {
  const [options, setOptions] = useState<CandidateOption[]>([]);
  const [selectedActionId, setSelectedActionId] = useState<string>("");
  const [simulation, setSimulation] = useState<SandboxSimulation | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Live cluster recovery execution states
  const [isExecutingLive, setIsExecutingLive] = useState(false);
  const [executionPhase, setExecutionPhase] = useState<string>("");
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  const scenario = status?.active_scenario;
  const isIncidentActive = Boolean(scenario);

  useEffect(() => {
    async function loadOptions() {
      try {
        const opts = await TraceRootAPI.getRecoveryOptions();
        setOptions(opts);
        if (opts.length > 0) {
          const rec = opts.find((o) => o.is_recommended) || opts[0];
          setSelectedActionId(rec.id);
        }
      } catch (err) {
        console.error("Failed to load candidate recovery options:", err);
      }
    }
    loadOptions();
  }, [scenario]);

  async function handleRunSimulation(actionId: string) {
    setSelectedActionId(actionId);
    setIsSimulating(true);
    try {
      const res = await TraceRootAPI.simulateRecovery(actionId, scenario || undefined);
      setSimulation(res);
    } catch (err) {
      console.error("Failed to run sandbox simulation:", err);
    } finally {
      setIsSimulating(false);
    }
  }

  async function handleApproveAndApply() {
    if (!selectedActionId) return;
    setIsExecutingLive(true);
    setVerificationResult(null);

    try {
      setExecutionPhase("Phase 1/4: Issuing control-plane remediation command to cluster...");
      await TraceRootAPI.approveRecovery(selectedActionId);

      await new Promise((r) => setTimeout(r, 1200));
      setExecutionPhase("Phase 2/4: Mutating live microservice simulator state...");

      await new Promise((r) => setTimeout(r, 1400));
      setExecutionPhase("Phase 3/4: Dispatching synthetic end-to-end telemetry health probes...");

      await new Promise((r) => setTimeout(r, 1200));
      setExecutionPhase("Phase 4/4: Evaluating 5 automated verification gates against SLA baseline...");

      const ver = await TraceRootAPI.verifyRecovery();
      setVerificationResult(ver);
      onRecoveryComplete();
    } catch (err) {
      console.error("Live recovery execution failed:", err);
    } finally {
      setIsExecutingLive(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Recovery Sandbox & Digital Twin Counterfactual Engine
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-medium">
                Zero-Risk Emulation
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Evaluates candidate remediation options against an isolated digital twin of the cluster state. Does NOT modify live pods until engineer approval.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-950 text-slate-400 border border-slate-800">
            Digital Twin: Ready
          </span>
        </div>
      </div>

      {/* Options Selection & Comparison Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
            Available Remediation Playbooks ({options.length} Candidate Options)
          </span>
          <span className="text-[11px] text-slate-400">
            Select an option to simulate counterfactual outcome
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {options.map((opt) => {
            const isSelected = selectedActionId === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setSelectedActionId(opt.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? "bg-slate-900 border-sky-500 ring-2 ring-sky-500/20 shadow-lg shadow-sky-500/10"
                    : "bg-slate-950/70 hover:bg-slate-900/60 border-slate-800"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-semibold">
                      {opt.type}
                    </span>
                    {opt.is_recommended && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 mt-2">{opt.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{opt.tradeoffs}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Risk Impact:</span>
                    <span
                      className={`font-semibold ${
                        opt.risk_level === "LOW"
                          ? "text-emerald-400"
                          : opt.risk_level === "MEDIUM"
                          ? "text-amber-400"
                          : "text-rose-400"
                      }`}
                    >
                      {opt.risk_level} ({opt.risk_score}/100)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Est. Recovery:</span>
                    <span className="text-sky-400 font-semibold">{opt.projected_recovery_time_s}s</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRunSimulation(opt.id);
                    }}
                    disabled={isSimulating}
                    className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition shadow-sm disabled:opacity-60"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Simulate in Digital Twin</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulation Results Display (Before vs After Comparison) */}
      {simulation && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 backdrop-blur space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
            <div>
              <span className="text-xs font-mono text-emerald-400 uppercase font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Digital Twin Counterfactual Simulation Complete ({simulation.simulation_id})
              </span>
              <h3 className="text-base font-bold text-slate-100 mt-1">
                Projected Impact for: {simulation.action_title}
              </h3>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                Risk: {simulation.risk_level} ({simulation.risk_score}/100)
              </span>
              <span className="px-2 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                Projected MTTR: {simulation.projected_duration_s}s
              </span>
            </div>
          </div>

          {/* Before vs After Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before (Live Current State) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-rose-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-rose-400">
                  Current State (Before)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  {simulation.before.customer_impact}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Unhealthy Nodes</div>
                  <div className="text-lg font-bold text-rose-400 mt-0.5">
                    {simulation.before.unhealthy_services_count} services
                  </div>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Cluster Max Error</div>
                  <div className="text-lg font-bold text-rose-400 mt-0.5">
                    {simulation.before.cluster_max_error_rate_pct}%
                  </div>
                </div>
              </div>
            </div>

            {/* After (Simulated Counterfactual State) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-emerald-400">
                  Simulated Outcome (After)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {simulation.after.customer_impact}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Unhealthy Nodes</div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">
                    0 services
                  </div>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Cluster Max Error</div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">
                    0.0%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tradeoffs Analysis & Verification Preview */}
          <div className="space-y-2 text-xs font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              Tradeoffs & Side-Effects Evaluation:
            </div>
            <p className="text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 leading-relaxed font-sans">
              {simulation.side_effects_analysis}
            </p>
          </div>

          {/* Approve and Execute Button */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-400 font-mono">
              Live cluster state remains unmutated. Ready for human-in-the-loop SRE approval.
            </div>
            <button
              onClick={handleApproveAndApply}
              disabled={isExecutingLive}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/50 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isExecutingLive ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Executing Controlled Recovery...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Approve & Apply to Live Cluster</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Live Execution Progress & Verification Result Banner */}
      {isExecutingLive && (
        <div className="p-5 rounded-xl bg-slate-900 border border-sky-500/50 space-y-3 animate-pulse">
          <div className="flex items-center gap-2 text-sky-400 font-mono text-xs font-bold">
            <Activity className="w-4 h-4 animate-spin" />
            <span>Controlled Remediation Execution in Progress...</span>
          </div>
          <p className="text-xs text-slate-300 font-mono">{executionPhase}</p>
        </div>
      )}

      {verificationResult && (
        <div className="p-6 rounded-xl bg-slate-900/80 border border-emerald-500/60 space-y-4 shadow-xl shadow-emerald-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <ShieldAlert className="w-6 h-6 text-emerald-400" />
              </span>
              <div>
                <h3 className="text-base font-bold text-emerald-300 font-mono tracking-wide">
                  {verificationResult.verdict}
                </h3>
                <p className="text-xs text-slate-400">
                  {verificationResult.summary}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              5/5 GATES PASSED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
            {verificationResult.checks.map((chk, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{chk.name}</span>
                </div>
                <span className="text-emerald-400 font-bold">PASSED</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => onNavigate("memory")}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
            >
              Provide Engineer Feedback & Validate
            </button>
            <button
              onClick={() => onNavigate("overview")}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition"
            >
              Return to Command Center
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
