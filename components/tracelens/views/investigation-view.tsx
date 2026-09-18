"use client";

import React, { useState } from "react";
import { InvestigationStep } from "../types";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowDown,
  Layers,
  Activity,
  Server,
  Database,
  GitCommit,
  Terminal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldAlert
} from "lucide-react";

interface InvestigationViewProps {
  steps: InvestigationStep[];
  scenario: string | null;
  incidentId: string | null;
  onNavigate: (tab: string) => void;
}

export function InvestigationView({ steps, scenario, incidentId, onNavigate }: InvestigationViewProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  if (!scenario || steps.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <Search className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Adaptive Evidence Engine Standing By</h3>
          <p className="text-xs text-slate-400 mt-1">
            Zero active incidents detected. When an incident or cascade triggers, the adaptive engine will autonomously follow the causal dependency chain from Ingress down to the root cause.
          </p>
        </div>
        <button
          onClick={() => onNavigate("demo_lab")}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
        >
          Inject a Demo Failure Scenario
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/40 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Adaptive Evidence Investigation Stream
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {steps.length} Steps Completed
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              The engine strategically isolates root causes by navigating causal graph edges rather than dumping raw logs.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate("root_cause")}
          className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-md whitespace-nowrap"
        >
          View Ranked Root Cause
        </button>
      </div>

      {/* Investigation Stepper Timeline */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-blue-500 before:to-emerald-500">
        {steps.map((step) => {
          const isExpanded = expandedStep === step.step;
          const isLast = step.step === steps.length;

          return (
            <div key={step.step} className="relative">
              {/* Timeline Bullet Node */}
              <div
                className={`absolute -left-[30px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono border shadow-md ${
                  isLast
                    ? "bg-emerald-500 border-emerald-400 text-slate-950 ring-4 ring-emerald-950"
                    : "bg-slate-900 border-cyan-400 text-cyan-300"
                }`}
              >
                {step.step}
              </div>

              {/* Step Card */}
              <div
                className={`rounded-2xl border transition-all shadow-xl overflow-hidden ${
                  isLast
                    ? "bg-slate-900/95 border-emerald-500/60 shadow-emerald-950/20"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Header */}
                <div
                  onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                  className="p-4 flex items-start justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                        {step.evidence_type.replace("_", " ")}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-cyan-400">
                        {step.target_service}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          step.severity === "CRITICAL" || step.severity === "FATAL"
                            ? "bg-rose-950/80 text-rose-300 border border-rose-800"
                            : step.severity === "DIAGNOSED"
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                            : "bg-amber-950/80 text-amber-300 border border-amber-800"
                        }`}
                      >
                        {step.badge}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{step.title}</h4>
                    <p className="text-xs text-slate-400 font-medium">{step.action}</p>
                  </div>

                  <button className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 mt-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Finding */}
                <div className="px-4 pb-4">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300">
                    <span className="font-semibold text-slate-200">Finding: </span>
                    {step.finding}
                  </div>

                  {/* Expanded Telemetry Evidence Snippet */}
                  {isExpanded && (
                    <div className="mt-3 space-y-2 text-xs font-mono">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Inspected Telemetry Payload
                      </div>
                      <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 overflow-x-auto text-[11px] leading-relaxed">
                        {JSON.stringify(step.snippet, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
