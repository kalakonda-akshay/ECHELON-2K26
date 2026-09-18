"use client";

import React, { useState } from "react";
import {
  AdaptiveAnalysis,
  SystemStatus,
  Diagnosis
} from "../types";
import { TraceRouteAPI } from "../api";
import {
  BrainCircuit,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Zap,
  Sliders,
  Layers,
  Activity,
  RefreshCw,
  Clock,
  ChevronRight,
  ShieldCheck,
  Server
} from "lucide-react";

interface AdaptiveViewProps {
  adaptiveData: AdaptiveAnalysis | null;
  status: SystemStatus | null;
  diagnosis: Diagnosis | null;
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
}

export function AdaptiveView({
  adaptiveData,
  status,
  diagnosis,
  onRefresh,
  onNavigate
}: AdaptiveViewProps) {
  const [isAcquiring, setIsAcquiring] = useState(false);

  const hypotheses = adaptiveData?.hypotheses || [];
  const nextEvidence = adaptiveData?.next_best_evidence;
  const isSufficient = adaptiveData?.is_sufficient ?? true;
  const steps = adaptiveData?.investigation_steps || [];
  const scenario = status?.active_scenario;

  async function handleAcquireEvidence() {
    if (!scenario) return;
    setIsAcquiring(true);
    try {
      await TraceRouteAPI.acquireEvidence(scenario);
      await onRefresh();
    } catch (err) {
      console.error("Failed to acquire evidence:", err);
    } finally {
      setIsAcquiring(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Adaptive Evidence Engine 2.0
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800/60 font-medium">
                Information-Gain Guided Investigation
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Evaluates competing root-cause hypotheses, detects evidence insufficiency, and strategically requests the next most informative telemetry probe.
            </p>
          </div>
        </div>

        {/* Sufficiency Badge */}
        <div className="flex items-center gap-3">
          {isSufficient ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-xs font-mono font-bold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>EVIDENCE SUFFICIENT ({adaptiveData?.confidence_score || 95}%)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-800/80 text-xs font-mono font-bold text-amber-300 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>EVIDENCE INSUFFICIENT</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left Competing Hypotheses & Next Best Evidence | Right Sequential Reasoning Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (5 cols): Hypotheses Distribution & Next Best Evidence Action */}
        <div className="lg:col-span-5 space-y-6">
          {/* Competing Hypotheses Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                Root-Cause Hypotheses Distribution
              </span>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/60">
                Bayesian Scoring
              </span>
            </div>

            {hypotheses.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto opacity-50" />
                <p>All microservices operational within nominal baseline.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {hypotheses.map((hyp) => {
                  const isTop = hyp.rank === 1;
                  return (
                    <div
                      key={hyp.service_id}
                      className={`p-3 rounded-lg border transition-all ${
                        isTop && isSufficient
                          ? "bg-emerald-950/20 border-emerald-800/60 ring-1 ring-emerald-500/20"
                          : isTop
                          ? "bg-amber-950/20 border-amber-800/60"
                          : "bg-slate-950/60 border-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">#{hyp.rank}</span>
                          <span className="text-slate-300 font-semibold">{hyp.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                              isTop && isSufficient
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {hyp.status}
                          </span>
                          <span className="font-bold text-slate-100 text-sm">{hyp.probability}%</span>
                        </div>
                      </div>

                      {/* Probability Progress Bar */}
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isTop && isSufficient
                              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                              : isTop
                              ? "bg-gradient-to-r from-amber-500 to-orange-400"
                              : "bg-slate-700"
                          }`}
                          style={{ width: `${hyp.probability}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next Most Useful Evidence Query Card */}
          {nextEvidence && (
            <div className="bg-gradient-to-br from-amber-950/30 to-purple-950/30 border border-amber-800/80 rounded-xl p-5 backdrop-blur space-y-4 shadow-lg shadow-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: "6s" }} />
                  Next Most Useful Evidence
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 font-semibold">
                  Expected Gain: {nextEvidence.expected_information_gain}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-100">{nextEvidence.action_title}</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {nextEvidence.rationale}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 font-mono text-[11px] text-sky-300 overflow-x-auto">
                <code>{nextEvidence.query}</code>
              </div>

              <button
                onClick={handleAcquireEvidence}
                disabled={isAcquiring}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold transition shadow-md shadow-orange-950/40 disabled:opacity-60"
              >
                {isAcquiring ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Correlating Telemetry Evidence...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Acquire & Correlate Evidence ({nextEvidence.expected_information_gain})</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Quick Actions to Sandbox */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-300">Ready to Remediate?</div>
            <p className="text-xs text-slate-400">
              Test candidate playbooks safely in the Digital Twin Counterfactual Sandbox before modifying live Kubernetes pods.
            </p>
            <button
              onClick={() => onNavigate("sandbox")}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Launch Recovery Sandbox</span>
            </button>
          </div>
        </div>

        {/* Right Col (7 cols): Algorithmic Investigation Trail (STEP 01 - 07) */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Algorithmic Investigation Audit Trail ({steps.length} Steps)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Deterministic Traversal
            </span>
          </div>

          {steps.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-40" />
              <p>No active anomalies detected. Telemetry streams nominal.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step) => {
                const isDiagnosed = step.severity === "DIAGNOSED";
                const isCritical = step.severity === "CRITICAL" || step.severity === "FATAL";

                return (
                  <div
                    key={step.step}
                    className={`p-4 rounded-xl border transition-all ${
                      isDiagnosed
                        ? "bg-purple-950/20 border-purple-800/60 ring-1 ring-purple-500/20"
                        : isCritical
                        ? "bg-slate-950/80 border-rose-900/40 hover:border-slate-700"
                        : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-mono font-bold border ${
                            isDiagnosed
                              ? "bg-purple-900/60 text-purple-300 border-purple-700"
                              : "bg-slate-900 text-sky-400 border-slate-800"
                          }`}
                        >
                          {String(step.step).padStart(2, "0")}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-200">{step.title}</h4>
                          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Server className="w-3 h-3 text-sky-400" />
                            {step.target_service} &bull; {step.action}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold shrink-0 ${
                          isDiagnosed
                            ? "bg-purple-950 text-purple-300 border-purple-800"
                            : isCritical
                            ? "bg-rose-950/80 text-rose-300 border-rose-800/60"
                            : "bg-amber-950/60 text-amber-300 border-amber-800/60"
                        }`}
                      >
                        {step.badge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-2.5 leading-relaxed font-sans pl-9">
                      {step.finding}
                    </p>

                    {step.snippet && Object.keys(step.snippet).length > 0 && (
                      <div className="mt-3 ml-9 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                        <div className="text-[10px] text-slate-400 uppercase mb-1">Telemetry Proof Snippet:</div>
                        <pre className="text-sky-300 leading-tight">
                          {JSON.stringify(step.snippet, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
