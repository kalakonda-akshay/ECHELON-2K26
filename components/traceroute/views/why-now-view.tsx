"use client";

import React, { useState, useEffect } from "react";
import {
  WhyNowData,
  WhatChangedData,
  ChangeAnalysisResult,
  SystemStatus
} from "../types";
import { TraceRootAPI } from "../api";
import {
  Clock,
  GitCommit,
  TrendingUp,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Cpu,
  Database,
  Radio
} from "lucide-react";

interface WhyNowViewProps {
  status: SystemStatus | null;
  onNavigate: (tab: string) => void;
}

export function WhyNowView({ status, onNavigate }: WhyNowViewProps) {
  const [whyNow, setWhyNow] = useState<WhyNowData | null>(null);
  const [whatChanged, setWhatChanged] = useState<WhatChangedData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Change risk simulator state
  const [testService, setTestService] = useState<string>("payment-service");
  const [testVersion, setTestVersion] = useState<string>("v2.4.2");
  const [testChangeType, setTestChangeType] = useState<string>("config");
  const [changeRisk, setChangeRisk] = useState<ChangeAnalysisResult | null>(null);
  const [evaluatingRisk, setEvaluatingRisk] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      const [wn, wc] = await Promise.all([
        TraceRootAPI.getWhyNow(),
        TraceRootAPI.getWhatChanged()
      ]);
      setWhyNow(wn);
      setWhatChanged(wc);
    } catch (e) {
      console.error("Failed to load why-now data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [status?.active_scenario]);

  const handleEvaluateRisk = async () => {
    setEvaluatingRisk(true);
    try {
      const res = await TraceRootAPI.analyzeChange(testService, testVersion, testChangeType, "Pre-deployment risk assessment");
      setChangeRisk(res);
    } catch (e) {
      console.error("Failed to analyze change risk", e);
    } finally {
      setEvaluatingRisk(false);
    }
  };

  const isIncident = Boolean(status?.active_scenario);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tl-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-mono">
              <Clock className="w-5 h-5 text-tl-cyan" />
              Why Now? & What Changed?
            </h2>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
              isIncident
                ? "bg-rose-950/80 text-tl-coral border border-rose-800"
                : "bg-emerald-950/80 text-tl-green border border-emerald-800"
            }`}>
              {isIncident ? "Anomaly Divergence Active" : "Nominal Baseline"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Isolating the temporal tipping point and state divergence deltas that transformed latent fragility into a cascading failure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tl-card border border-tl-border text-xs text-slate-300 hover:text-white transition font-mono"
          >
            <RefreshCw className="w-3.5 h-3.5 text-tl-cyan" />
            <span>Refresh State</span>
          </button>
          <button
            onClick={() => onNavigate("causal_graph")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tl-violet/20 border border-tl-violet/50 text-xs text-tl-violet hover:bg-tl-violet/30 transition font-mono font-medium"
          >
            <span>Causal Incident Graph</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary Trigger & Contributing Factors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Primary Trigger & Contributing Factors (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Primary Trigger Banner */}
          <div className="bg-tl-card border border-tl-border rounded-xl p-5 backdrop-blur relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-tl-cyan/5 rounded-full blur-2xl pointer-events-none" />
            <div className="text-[11px] font-mono uppercase tracking-wider text-tl-cyan font-semibold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Primary Temporal Trigger (Why Now?)
            </div>
            <div className="text-base font-bold text-slate-100 mt-2">
              {whyNow?.primary_trigger || "System running nominal baseline; no trigger event active."}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Unlike a simple root cause label, TraceRoot identifies the dynamic convergence of multiple environmental factors that precipitated the failure at this specific timestamp.
            </p>
          </div>

          {/* Contributing Conditions */}
          <div className="bg-tl-card border border-tl-border rounded-xl p-5 backdrop-blur space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
              <span>Contributing Confluence Factors</span>
              <span className="text-slate-500 font-normal">{whyNow?.contributing_conditions.length || 0} factors analyzed</span>
            </div>

            {whyNow && whyNow.contributing_conditions.length > 0 ? (
              <div className="space-y-2.5">
                {whyNow.contributing_conditions.map((cond, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-tl-bg/80 border border-tl-border flex items-start justify-between gap-3 hover:border-tl-cyan/40 transition"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-200">{cond.factor}</div>
                      <div className="text-[11px] text-slate-400 font-sans">{cond.description}</div>
                    </div>
                    <div className="px-2 py-1 rounded bg-tl-elevated border border-tl-border text-[11px] font-mono font-bold text-tl-cyan whitespace-nowrap">
                      {cond.weight} weight
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 font-mono">
                No active contributing anomalies detected.
              </div>
            )}
          </div>
        </div>

        {/* Right: Largest Deviation Highlight (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-tl-card border border-tl-border rounded-xl p-5 backdrop-blur space-y-4">
            <div className="text-[11px] font-mono uppercase tracking-wider text-tl-coral font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Largest State Deviation (What Changed?)
            </div>

            {whatChanged && whatChanged.has_incident ? (
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-300 font-semibold uppercase">
                    {whatChanged.largest_deviation.service}
                  </span>
                  <span className="text-xs font-mono font-bold text-tl-coral bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                    +{whatChanged.largest_deviation.delta_pct}% SKEW
                  </span>
                </div>

                <div className="text-lg font-bold text-slate-100">
                  {whatChanged.largest_deviation.metric}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rose-900/40 text-xs font-mono">
                  <div className="p-2 rounded bg-tl-bg/60 border border-tl-border">
                    <span className="text-[10px] text-slate-500 block uppercase">Baseline (T-30m)</span>
                    <span className="text-slate-300 font-bold">{whatChanged.largest_deviation.before}</span>
                  </div>
                  <div className="p-2 rounded bg-rose-950/60 border border-rose-800/80">
                    <span className="text-[10px] text-rose-400 block uppercase">Incident State</span>
                    <span className="text-tl-coral font-bold">{whatChanged.largest_deviation.after}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 font-mono rounded-xl bg-tl-bg/60 border border-tl-border">
                <CheckCircle2 className="w-6 h-6 text-tl-green mx-auto mb-2 opacity-60" />
                All metric vectors are within ±5% of established baseline.
              </div>
            )}

            <div className="p-3 rounded-lg bg-tl-elevated border border-tl-border text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-200">Continuous Baseline Comparison:</div>
              <p>
                TraceRoot continuously compares live telemetry against a rolling 30-minute statistical profile. Any metric deviating beyond 3σ is flagged as an active divergence.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pre-Incident Sequence & Timeline */}
      <div className="bg-tl-card border border-tl-border rounded-xl p-5 backdrop-blur space-y-4">
        <div className="flex items-center justify-between border-b border-tl-border pb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-tl-violet" />
            Chronological Temporal Sequence & Cascade Progression
          </span>
          <span className="text-[11px] font-mono text-slate-400">Relative to failure origin (T-0)</span>
        </div>

        {whyNow && whyNow.timeline.length > 0 ? (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-tl-border">
            {whyNow.timeline.map((item, idx) => {
              const isOrigin = item.relative_s === 0;
              const isPre = item.relative_s < 0;
              return (
                <div key={idx} className="relative group">
                  {/* Timeline dot */}
                  <span
                    className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-tl-card ${
                      isOrigin
                        ? "bg-tl-coral ring-4 ring-rose-950"
                        : isPre
                        ? "bg-tl-violet"
                        : "bg-tl-cyan"
                    }`}
                  />

                  <div className="p-3 rounded-lg bg-tl-bg/70 border border-tl-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-700 transition">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-400 w-16">
                        {item.timestamp}
                      </span>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border"
                        style={{
                          backgroundColor: `${item.badge}20`,
                          borderColor: `${item.badge}60`,
                          color: item.badge
                        }}
                      >
                        {item.category}
                      </span>
                      <span className="text-xs text-slate-200 font-medium">
                        {item.event}
                      </span>
                    </div>

                    <span className={`text-xs font-mono font-bold ${
                      isOrigin ? "text-tl-coral" : isPre ? "text-slate-400" : "text-tl-cyan"
                    }`}>
                      {item.relative_s === 0 ? "T = 0s (ORIGIN)" : item.relative_s < 0 ? `${item.relative_s}s` : `+${item.relative_s}s`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            No incident timeline active. System running nominal baseline.
          </div>
        )}
      </div>

      {/* Baseline vs Incident State Comparison Table */}
      <div className="bg-tl-card border border-tl-border rounded-xl p-5 backdrop-blur space-y-4">
        <div className="flex items-center justify-between border-b border-tl-border pb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-tl-cyan" />
            Comprehensive State Deviation Matrix
          </span>
          <span className="text-[11px] font-mono text-slate-500">Telemetry Delta Inspection</span>
        </div>

        {whatChanged && whatChanged.metrics_comparison.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-tl-border text-slate-400 text-[10px] uppercase">
                  <th className="pb-2">Service</th>
                  <th className="pb-2">Metric</th>
                  <th className="pb-2">Baseline</th>
                  <th className="pb-2">Incident State</th>
                  <th className="pb-2">Delta</th>
                  <th className="pb-2">Deviation</th>
                  <th className="pb-2 text-right">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tl-border/60">
                {whatChanged.metrics_comparison.map((row, idx) => (
                  <tr key={idx} className="hover:bg-tl-elevated/40 transition">
                    <td className="py-2.5 font-bold text-slate-200">{row.service}</td>
                    <td className="py-2.5 text-slate-300">{row.metric}</td>
                    <td className="py-2.5 text-slate-400">{row.before}</td>
                    <td className="py-2.5 font-semibold text-slate-100">{row.after}</td>
                    <td className="py-2.5 text-slate-300">{row.delta || "N/A"}</td>
                    <td className="py-2.5">
                      <span className={`font-bold ${
                        row.delta_pct > 100
                          ? "text-tl-coral"
                          : row.delta_pct > 30
                          ? "text-tl-amber"
                          : "text-tl-green"
                      }`}>
                        +{row.delta_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        row.severity === "CRITICAL"
                          ? "bg-rose-950 text-tl-coral border border-rose-800"
                          : row.severity === "WARNING"
                          ? "bg-amber-950 text-tl-amber border border-amber-800"
                          : "bg-slate-800 text-slate-300"
                      }`}>
                        {row.severity || "NORMAL"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500 font-mono">
            No telemetry deviation data available.
          </div>
        )}
      </div>

      {/* Pre-Deployment Change Risk Sandbox */}
      <div className="bg-tl-card border border-tl-border rounded-xl p-5 backdrop-blur space-y-4">
        <div className="flex items-center justify-between border-b border-tl-border pb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-tl-amber" />
            Pre-Deployment Change Risk Analyzer
          </span>
          <span className="text-[11px] font-mono text-slate-500">Proactive Failure Prevention</span>
        </div>

        <p className="text-xs text-slate-400">
          Simulate prospective code, config, or schema changes before pushing to staging or production. TraceRoot evaluates downstream topology depth and criticality to estimate blast risk.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Target Service</label>
            <select
              value={testService}
              onChange={(e) => setTestService(e.target.value)}
              className="w-full bg-tl-bg border border-tl-border rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-tl-cyan"
            >
              <option value="payment-service">payment-service</option>
              <option value="order-service">order-service</option>
              <option value="api-gateway">api-gateway</option>
              <option value="inventory-service">inventory-service</option>
              <option value="payment-db">payment-db</option>
              <option value="stock-db">stock-db</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Change Type</label>
            <select
              value={testChangeType}
              onChange={(e) => setTestChangeType(e.target.value)}
              className="w-full bg-tl-bg border border-tl-border rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-tl-cyan"
            >
              <option value="config">Configuration Tuning</option>
              <option value="schema">Database Migration / Schema</option>
              <option value="code">Application Logic Deploy</option>
              <option value="dependency">Library / SDK Upgrade</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Release Version</label>
            <input
              type="text"
              value={testVersion}
              onChange={(e) => setTestVersion(e.target.value)}
              className="w-full bg-tl-bg border border-tl-border rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-tl-cyan"
              placeholder="e.g. v2.4.2"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleEvaluateRisk}
              disabled={evaluatingRisk}
              className="w-full py-2 px-3 rounded-lg bg-tl-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition flex items-center justify-center gap-1.5"
            >
              {evaluatingRisk ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5" />
              )}
              <span>Evaluate Risk</span>
            </button>
          </div>
        </div>

        {/* Change Risk Result */}
        {changeRisk && (
          <div className="p-4 rounded-xl bg-tl-bg border border-tl-border mt-3 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-tl-border pb-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-bold">Analysis for {changeRisk.service_id} ({changeRisk.version})</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  changeRisk.risk_level === "HIGH"
                    ? "bg-rose-950 text-tl-coral border border-rose-800"
                    : changeRisk.risk_level === "MEDIUM"
                    ? "bg-amber-950 text-tl-amber border border-amber-800"
                    : "bg-emerald-950 text-tl-green border border-emerald-800"
                }`}>
                  {changeRisk.risk_level} RISK ({changeRisk.risk_score}/100)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Criticality Tier: <strong>{changeRisk.criticality_tier}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Impacted Downstream Dependents ({changeRisk.downstream_impact_count}):</span>
                <div className="flex flex-wrap gap-1.5">
                  {changeRisk.impacted_services.length > 0 ? (
                    changeRisk.impacted_services.map((svc, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-tl-elevated text-slate-300 border border-tl-border text-[10px]">
                        {svc}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-[11px]">No downstream dependents</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase block mb-1">Pre-Deployment Guardrails:</span>
                <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                  {changeRisk.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
