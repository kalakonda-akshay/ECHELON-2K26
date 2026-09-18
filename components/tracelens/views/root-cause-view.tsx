"use client";

import React from "react";
import { Diagnosis } from "../types";
import {
  Sparkles,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  GitCommit,
  Layers,
  Database,
  Server,
  ShieldAlert,
  Info,
  ExternalLink
} from "lucide-react";

interface RootCauseViewProps {
  diagnosis: Diagnosis | null;
  onNavigate: (tab: string) => void;
}

export function RootCauseView({ diagnosis, onNavigate }: RootCauseViewProps) {
  if (!diagnosis || !diagnosis.has_incident || !diagnosis.initiating_service) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Root Cause Engine Idle</h3>
          <p className="text-xs text-slate-400 mt-1">
            No active incident detected. When a cascading failure is triggered, the engine deterministically scores candidates across anomaly timestamps, topological depth, and trace origins.
          </p>
        </div>
        <button
          onClick={() => onNavigate("demo_lab")}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
        >
          Open Demo Lab
        </button>
      </div>
    );
  }

  const top = diagnosis.ranked_candidates[0];
  const breakdown = diagnosis.evidence_breakdown || {};
  const ai = diagnosis.ai_explanation;

  return (
    <div className="space-y-6">
      {/* Top Root Cause Hero Verdict Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-2 border-cyan-500/80 p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-xs font-mono font-bold uppercase tracking-wider">
                Ranked Root Cause #1
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Causal Deterministic Engine
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400">
                {top.type === "database" ? <Database className="w-7 h-7" /> : <Server className="w-7 h-7" />}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {top.name}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Service ID: <span className="text-cyan-400">{top.service}</span> &bull; Type: <span className="capitalize">{top.type}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Evidence Score Pill */}
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shrink-0">
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Evidence Score
              </div>
              <div className="text-3xl font-extrabold text-cyan-400 font-mono">
                {diagnosis.confidence_score}<span className="text-sm font-normal text-slate-500">/100</span>
              </div>
            </div>
            <div className="w-16 h-16 rounded-full bg-cyan-950/80 border-2 border-cyan-500 flex items-center justify-center text-xs font-bold text-cyan-300 font-mono">
              {diagnosis.confidence_score}%
            </div>
          </div>
        </div>

        {/* Score Breakdown Bars */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400">Anomaly Timing</span>
              <span className="text-cyan-400 font-bold">+{breakdown.anomaly_timing || 0} / 35</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full"
                style={{ width: `${((breakdown.anomaly_timing || 0) / 35) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400">DAG Depth</span>
              <span className="text-cyan-400 font-bold">+{breakdown.topological_depth || 0} / 30</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full"
                style={{ width: `${((breakdown.topological_depth || 0) / 30) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400">Trace Error Origin</span>
              <span className="text-cyan-400 font-bold">+{breakdown.trace_error_origin || 0} / 20</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full"
                style={{ width: `${((breakdown.trace_error_origin || 0) / 20) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400">Deployment Correlation</span>
              <span className="text-cyan-400 font-bold">+{breakdown.deployment_correlation || 0} / 15</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full"
                style={{ width: `${((breakdown.deployment_correlation || 0) / 15) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Failure Propagation Chain Flow */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Failure Cascade Propagation Chain
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          TraceRoute traced the cascade path from deepest initiating root up through the upstream dependency tree to public ingress:
        </p>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {diagnosis.failure_chain.map((serviceId, index) => {
            const isRoot = index === 0;
            const isEdge = index === diagnosis.failure_chain.length - 1;

            return (
              <React.Fragment key={serviceId}>
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 font-mono ${
                    isRoot
                      ? "bg-rose-950/80 border-rose-600 text-rose-200 shadow-lg shadow-rose-950/50"
                      : isEdge
                      ? "bg-amber-950/80 border-amber-600 text-amber-200"
                      : "bg-slate-950 border-slate-800 text-slate-300"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <span className="font-bold block">{serviceId}</span>
                    <span className="text-[10px] text-slate-400 block">
                      {isRoot ? "ROOT INITIATOR" : isEdge ? "PUBLIC INGRESS" : "INTERMEDIARY"}
                    </span>
                  </div>
                </div>

                {index < diagnosis.failure_chain.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Associated Deployment / Git Commit Card (if applicable) */}
      {diagnosis.correlated_deployment && (
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Associated Deployment Correlation
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              Suspected Change
            </span>
          </div>

          {/* Sound Engineering Disclaimer */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-950/30 border border-amber-900/60 text-xs text-amber-300/90 mb-3">
            <Info className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Note: Temporal correlation alone does not guarantee causality. Correlation score (+15) reflects deployment within 4 minutes of anomaly onset.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Service / Version</span>
              <span className="text-white font-bold">{diagnosis.correlated_deployment.service} ({diagnosis.correlated_deployment.version})</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Commit Hash</span>
              <span className="text-cyan-400 font-bold">{diagnosis.correlated_deployment.commit_id}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Author</span>
              <span className="text-slate-200 font-bold">{diagnosis.correlated_deployment.author}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Deployed At</span>
              <span className="text-slate-200 font-bold">{new Date(diagnosis.correlated_deployment.deployed_at).toLocaleTimeString()}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            Commit Description: <span className="text-slate-300">{diagnosis.correlated_deployment.description}</span>
          </p>
        </div>
      )}

      {/* Concrete Telemetry Evidence & AI Explainer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Why This Root Cause Concrete Evidence */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>Why This Root Cause? Concrete Telemetry Evidence</span>
          </h3>

          <div className="space-y-2 text-xs">
            {diagnosis.evidence_reasons.map((reason, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-md bg-cyan-950 text-cyan-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                  ✓
                </span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Explainer Narrative */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>AI Incident Explanation & Synthesis</span>
          </h3>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-3">
            <p className="text-slate-200 leading-relaxed font-medium">
              {ai?.executive_summary}
            </p>
            <div className="pt-2 border-t border-slate-900 text-slate-400 space-y-1.5 whitespace-pre-line text-[11px] font-mono leading-relaxed">
              {ai?.technical_narrative}
            </div>
          </div>

          <button
            onClick={() => onNavigate("recovery")}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-600/20"
          >
            <span>Proceed to Recovery & Verification</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
