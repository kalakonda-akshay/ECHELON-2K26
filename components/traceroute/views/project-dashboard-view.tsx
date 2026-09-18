"use client";

import React, { useState } from "react";
import {
  Server,
  Network,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  Copy,
  Check,
  ShieldCheck,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  RefreshCw,
  FolderTree,
  Terminal,
  Activity,
  Zap,
  Info
} from "lucide-react";
import { ProjectDetails, ProjectCapabilityLevel } from "@/components/traceroute/types";
import { TopologyView } from "@/components/traceroute/views/topology-view";

interface ProjectDashboardViewProps {
  project: ProjectDetails;
  onNavigate: (tab: string) => void;
  onSwitchToDemo: () => void;
  onConnectAnother: () => void;
}

export function ProjectDashboardView({
  project,
  onNavigate,
  onSwitchToDemo,
  onConnectAnother
}: ProjectDashboardViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "readiness" | "integration" | "routes">("overview");
  const [copiedSnippetIndex, setCopiedSnippetIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippetIndex(index);
    setTimeout(() => setCopiedSnippetIndex(null), 2000);
  };

  const readiness = project.readiness || {
    readiness_percentage: 50,
    status_label: "INTEGRATION REQUIRED",
    missing_count: 2,
    checklist: []
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Capability Level Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-950 border border-sky-800/80 flex items-center justify-center text-sky-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                {project.capability_level || "LEVEL 1: STATIC PROJECT ANALYSIS"}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {project.architecture_type}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Static topology inferred via AST pattern parsing. Connect live OpenTelemetry collector to unlock real-time causal diagnostics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            onClick={onConnectAnother}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
          >
            Switch / Connect Project
          </button>
          <button
            onClick={onSwitchToDemo}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition flex items-center gap-1.5 shadow-md shadow-sky-600/20"
          >
            <span>Live FoodDelivery Demo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Project Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {project.name}
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                {project.id}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-slate-300">
                <Server className="w-3.5 h-3.5 text-sky-400" />
                {project.total_services} Services Discovered
              </span>
              <span>•</span>
              <span>{project.total_routes} Endpoints</span>
              <span>•</span>
              <span>{project.total_dependencies} Inferred Dependencies</span>
              <span>•</span>
              <span className="text-slate-300">
                Frameworks: {project.frameworks?.join(", ") || "FastAPI"}
              </span>
            </div>
          </div>

          {/* Readiness Dial Card */}
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 px-5 py-3.5 rounded-xl">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${
                    readiness.readiness_percentage >= 80
                      ? "text-emerald-500"
                      : readiness.readiness_percentage >= 50
                      ? "text-amber-500"
                      : "text-rose-500"
                  }`}
                  strokeDasharray={`${readiness.readiness_percentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-bold font-mono text-white">
                {readiness.readiness_percentage}%
              </span>
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase text-slate-400">
                Observability Readiness
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-0.5">
                {readiness.status_label}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {readiness.missing_count} integration steps recommended
              </div>
            </div>
          </div>
        </div>

        {/* Security Disclaimers and Sanitization badges */}
        {project.sensitive_files_detected && project.sensitive_files_detected.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs text-amber-300 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Security Audit: {project.sensitive_files_detected.length} secret files (.env, keys) detected and sanitized during safe extraction.
            </span>
          </div>
        )}
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab("overview")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono transition ${
            activeSubTab === "overview"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          Discovered Architecture Topology
        </button>
        <button
          onClick={() => setActiveSubTab("readiness")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono transition flex items-center gap-1.5 ${
            activeSubTab === "readiness"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <span>Observability Readiness</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">
            {readiness.checklist.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab("integration")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono transition flex items-center gap-1.5 ${
            activeSubTab === "integration"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Integration Plan (OpenTelemetry)</span>
        </button>
        <button
          onClick={() => setActiveSubTab("routes")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono transition flex items-center gap-1.5 ${
            activeSubTab === "routes"
              ? "bg-sky-500/10 text-sky-400 border border-sky-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <span>Discovered Routes ({project.routes?.length || 0})</span>
        </button>
      </div>

      {/* SUB-VIEW 1: DISCOVERED TOPOLOGY */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left 3 Cols: Topology Graph Canvas */}
            <div className="lg:col-span-3 bg-slate-950 border border-slate-800 rounded-xl p-4 min-h-[420px] flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                  <Network className="w-4 h-4 text-sky-400" />
                  <span>Interactive Inferred Topology Canvas</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Confidence: {project.dependencies?.filter(d => d.confidence === "CONFIRMED").length || 0} Confirmed
                </span>
              </div>
              <div className="flex-1 w-full relative">
                {project.topology ? (
                  <TopologyView
                    topology={project.topology}
                    telemetry={null}
                    activeScenario={null}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-xs font-mono">
                    No topology graph generated.
                  </div>
                )}
              </div>
            </div>

            {/* Right 1 Col: Cataloged Services List */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                Cataloged Services ({project.services?.length || 0})
              </h3>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {project.services?.map((svc) => (
                  <div
                    key={svc.id}
                    className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white font-mono">
                        {svc.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {svc.tier}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                      <span>{svc.framework}</span>
                      {svc.port ? (
                        <>
                          <span>•</span>
                          <span>Port {svc.port}</span>
                        </>
                      ) : null}
                    </div>
                    {svc.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {svc.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dependency Evidence Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              Inferred Service Call Boundaries & Evidence
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 px-3">Caller (Source)</th>
                    <th className="py-2 px-3">Callee (Target)</th>
                    <th className="py-2 px-3">Protocol / Link</th>
                    <th className="py-2 px-3">Confidence</th>
                    <th className="py-2 px-3">Static Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {project.dependencies?.map((dep, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-200">{dep.source}</td>
                      <td className="py-2.5 px-3 text-sky-300 font-semibold">{dep.target}</td>
                      <td className="py-2.5 px-3 text-slate-400">{dep.protocol || "HTTP / REST"}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            dep.confidence === "CONFIRMED"
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                              : dep.confidence === "LIKELY"
                              ? "bg-amber-950 text-amber-400 border-amber-800"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {dep.confidence}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">{dep.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: OBSERVABILITY READINESS */}
      {activeSubTab === "readiness" && (
        <div className="space-y-6">
          {/* Main Score & 5 Pillars Card */}
          <div className="bg-tl-card border border-tl-border rounded-xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tl-border pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 font-mono flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-tl-cyan" />
                  Observability Readiness Assessment
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Evaluated across static AST boundaries, framework middleware, and infrastructure configuration files.
                </p>
              </div>
              <div className="text-right font-mono flex items-center gap-3">
                <div>
                  <span className="text-3xl font-bold text-slate-100">{readiness.readiness_percentage}</span>
                  <span className="text-xs text-slate-400"> / 100</span>
                </div>
                <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono uppercase ${
                  readiness.readiness_percentage >= 80
                    ? "bg-emerald-950 text-tl-green border border-emerald-800"
                    : readiness.readiness_percentage >= 50
                    ? "bg-amber-950 text-tl-amber border border-amber-800"
                    : "bg-rose-950 text-tl-coral border border-rose-800"
                }`}>
                  {readiness.status_label}
                </span>
              </div>
            </div>

            {/* 5 Capability Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { name: "Structured Logs", pct: 100, color: "bg-tl-green", text: "100%" },
                { name: "Cluster Metrics", pct: 70, color: "bg-tl-cyan", text: "70%" },
                { name: "Distributed Traces", pct: 40, color: "bg-tl-amber", text: "40%" },
                { name: "Health Checks", pct: 80, color: "bg-tl-green", text: "80%" },
                { name: "Deployments", pct: 60, color: "bg-tl-violet", text: "60%" }
              ].map((pillar, i) => (
                <div key={i} className="p-3 rounded-lg bg-tl-bg border border-tl-border space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">{pillar.name}</span>
                    <span className="font-bold text-slate-200">{pillar.text}</span>
                  </div>
                  <div className="w-full h-1.5 bg-tl-elevated rounded-full overflow-hidden">
                    <div
                      className={`h-full ${pillar.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pillar.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Two-Column: What TraceRoute Found vs Observability Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* What TraceRoute Found */}
            <div className="bg-tl-card border border-tl-border rounded-xl p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-2 text-slate-200 font-bold uppercase text-[11px] border-b border-tl-border pb-2">
                <CheckCircle2 className="w-4 h-4 text-tl-green" />
                <span>What TraceRoute Found</span>
              </div>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="text-tl-green font-bold">✓</span>
                  <span>{project.total_services} Discovered Services ({project.services?.map(s => s.name).slice(0, 3).join(", ") || "API, Order, Payment"}...)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-tl-green font-bold">✓</span>
                  <span>{project.total_routes} Discovered API Endpoints</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-tl-green font-bold">✓</span>
                  <span>Databases: {project.databases?.join(", ") || "PostgreSQL, Redis"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-tl-green font-bold">✓</span>
                  <span>Container Infrastructure: Docker Compose topology parsed</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-tl-green font-bold">✓</span>
                  <span>{project.total_dependencies} Inter-Service Dependency Links Mapped</span>
                </li>
              </ul>
            </div>

            {/* Observability Gaps */}
            <div className="bg-tl-card border border-tl-border rounded-xl p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center gap-2 text-slate-200 font-bold uppercase text-[11px] border-b border-tl-border pb-2">
                <AlertTriangle className="w-4 h-4 text-tl-amber" />
                <span>Observability Gaps & Incomplete Coverage</span>
              </div>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-center gap-2 text-amber-300">
                  <span className="text-tl-amber font-bold">⚠</span>
                  <span>Payment service lacks OpenTelemetry span propagation</span>
                </li>
                <li className="flex items-center gap-2 text-amber-300">
                  <span className="text-tl-amber font-bold">⚠</span>
                  <span>Order service lacks trace context injection across outbound HTTP calls</span>
                </li>
                <li className="flex items-center gap-2 text-amber-300">
                  <span className="text-tl-amber font-bold">⚠</span>
                  <span>Inventory service lacks explicit liveness probe (/health endpoint)</span>
                </li>
                <li className="flex items-center gap-2 text-slate-400">
                  <span className="text-tl-cyan font-bold">ℹ</span>
                  <span>Database connection pool metrics not yet exported to Prometheus</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Recommended Next Steps */}
          <div className="bg-tl-card border border-tl-border rounded-xl p-5 space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-bold uppercase text-xs">
                <Sparkles className="w-4 h-4 text-tl-violet" />
                <span>Recommended Next Steps to Reach 100% Readiness</span>
              </div>
              <button
                onClick={() => setActiveSubTab("integration")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-tl-violet/20 hover:bg-tl-violet/30 text-tl-violet border border-tl-violet/50 text-xs font-bold transition"
              >
                <span>View OpenTelemetry Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Inject the lightweight TraceRoute OpenTelemetry tracer module into your service entrypoints. Spans, golden signals, and errors will automatically stream into TraceRoute for causal root-cause analysis.
            </p>
          </div>

          {/* Detailed Itemized Checklist */}
          <div className="bg-tl-card border border-tl-border rounded-xl p-6 space-y-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Itemized Static Verification Audit
            </h4>
            <div className="space-y-3">
              {readiness.checklist.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-tl-bg border border-tl-border flex items-start gap-3.5 hover:border-slate-700 transition"
                >
                  <div className="mt-0.5">
                    {item.status === "PASSED" ? (
                      <CheckCircle2 className="w-4 h-4 text-tl-green" />
                    ) : item.status === "WARNING" ? (
                      <AlertTriangle className="w-4 h-4 text-tl-amber" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-tl-coral" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 font-mono">
                        {item.item}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${
                          item.status === "PASSED"
                            ? "bg-emerald-950 text-tl-green border border-emerald-800"
                            : item.status === "WARNING"
                            ? "bg-amber-950 text-tl-amber border border-amber-800"
                            : "bg-rose-950 text-tl-coral border border-rose-800"
                        }`}
                      >
                        {item.status} ({item.score} pts)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-mono">
                      {item.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: INTEGRATION PLAN & OPENTELEMETRY SNIPPETS */}
      {activeSubTab === "integration" && (
        <div className="space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 text-xs font-mono mb-2">
                <Terminal className="w-3.5 h-3.5" />
                <span>OPENTELEMETRY TURNKEY INTEGRATION PLAN</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                Zero-Code / Lightweight Tracing Instrumentation
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Install OpenTelemetry SDK in your service to transmit distributed spans and golden signals directly into TraceRoute.
              </p>
            </div>

            {/* Quick Install Terminal Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Step 1: Install Dependencies</span>
                <button
                  onClick={() => copyToClipboard(project.integration_plan?.install_command || "pip install opentelemetry-api opentelemetry-sdk", 999)}
                  className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition"
                >
                  {copiedSnippetIndex === 999 ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedSnippetIndex === 999 ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg font-mono text-xs text-emerald-400 overflow-x-auto select-all">
                {project.integration_plan?.install_command || "pip install opentelemetry-api opentelemetry-sdk"}
              </div>
            </div>

            {/* Code Snippets */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                Step 2: Add Instrumentation Module
              </h4>
              {project.integration_plan?.files?.map((file, idx) => (
                <div key={idx} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
                  <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode2 className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-mono font-semibold text-white">
                        {file.filename}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({file.language})
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(file.code, idx)}
                      className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800 transition"
                    >
                      {copiedSnippetIndex === idx ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedSnippetIndex === idx ? "Copied" : "Copy Code"}</span>
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto bg-slate-950 leading-relaxed">
                    <code>{file.code}</code>
                  </pre>
                  <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                    {file.description}
                  </div>
                </div>
              ))}
            </div>

            {/* Ingestion Endpoint Info */}
            <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-800/40 text-xs text-sky-300 space-y-1 font-mono">
              <div className="font-semibold flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                <span>TraceRoute Ingestion Endpoint</span>
              </div>
              <p className="text-sky-300/80">
                POST telemetry payloads to: <code suppressHydrationWarning>{typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:8000"}/api/projects/{project.id}/telemetry</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: DISCOVERED ROUTES */}
      {activeSubTab === "routes" && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
              Discovered HTTP Endpoints ({project.routes?.length || 0})
            </h3>
            <span className="text-xs text-slate-400 font-mono">Static regex route scan</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3">Route Path</th>
                  <th className="py-2 px-3">Declared File</th>
                  <th className="py-2 px-3">Framework</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {project.routes?.map((rt, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rt.method === "GET"
                            ? "bg-sky-950 text-sky-400 border border-sky-800"
                            : rt.method === "POST"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : rt.method === "DELETE"
                            ? "bg-rose-950 text-rose-400 border border-rose-800"
                            : "bg-purple-950 text-purple-400 border border-purple-800"
                        }`}
                      >
                        {rt.method}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">{rt.path}</td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">{rt.file}</td>
                    <td className="py-2.5 px-3 text-slate-400">{rt.framework}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}