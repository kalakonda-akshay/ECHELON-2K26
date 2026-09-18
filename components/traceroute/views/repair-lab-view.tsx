"use client";

import React, { useState, useEffect } from "react";
import {
  Wrench,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  Download,
  RefreshCw,
  FileCode2,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap,
  Info,
  Sliders,
  History,
  GitCommit,
  Clock,
  Terminal,
  FileCheck2,
  FileWarning,
  Bug,
  HelpCircle,
  X
} from "lucide-react";
import {
  ProjectRepairIssue,
  ProjectHealthReport,
  MakeItRunResult,
  MakeItRunStep,
  TraceToCodeResult
} from "../types";
import { TraceRouteAPI } from "../api";

interface RepairLabViewProps {
  projectId?: string;
  projectName?: string;
  onNavigate?: (tab: string) => void;
  activeIncidentId?: string | null;
}

export function RepairLabView({
  projectId = "FoodDelivery-Demo",
  projectName = "FoodBridge Application",
  onNavigate,
  activeIncidentId
}: RepairLabViewProps) {
  const [report, setReport] = useState<ProjectHealthReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedIssue, setSelectedIssue] = useState<ProjectRepairIssue | null>(null);
  const [isFixModalOpen, setIsFixModalOpen] = useState<boolean>(false);
  const [isMakeItRunActive, setIsMakeItRunActive] = useState<boolean>(false);
  const [makeItRunResult, setMakeItRunResult] = useState<MakeItRunResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [traceToCode, setTraceToCode] = useState<TraceToCodeResult | null>(null);
  const [isApplyingPatch, setIsApplyingPatch] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [customPatchText, setCustomPatchText] = useState<string>("");
  const [isEditingCustomPatch, setIsEditingCustomPatch] = useState<boolean>(false);

  useEffect(() => {
    loadReport();
    if (activeIncidentId) {
      loadTraceToCode(activeIncidentId);
    }
  }, [projectId, activeIncidentId]);

  async function loadReport() {
    setIsLoading(true);
    try {
      const data = await TraceRouteAPI.getRepairIssues(projectId);
      setReport(data);
    } catch (err) {
      console.error("Failed to load repair issues:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTraceToCode(incidentId: string) {
    try {
      const res = await TraceRouteAPI.traceIncidentToCode(projectId, incidentId);
      setTraceToCode(res);
    } catch (err) {
      console.error("Failed to trace incident to code:", err);
    }
  }

  async function handleApproveFix(issue: ProjectRepairIssue) {
    setIsApplyingPatch(true);
    try {
      const patch = isEditingCustomPatch ? customPatchText : undefined;
      await TraceRouteAPI.applyRepairPatch(projectId, issue.id, patch);
      await loadReport();
      setIsFixModalOpen(false);
      setSelectedIssue(null);
      setIsEditingCustomPatch(false);
    } catch (err) {
      console.error("Failed to apply patch:", err);
    } finally {
      setIsApplyingPatch(false);
    }
  }

  async function handleRollbackFix(issueId: string) {
    try {
      await TraceRouteAPI.rollbackRepairPatch(projectId, issueId);
      await loadReport();
    } catch (err) {
      console.error("Failed to rollback patch:", err);
    }
  }

  async function handleMakeItRun() {
    setIsMakeItRunActive(true);
    try {
      const result = await TraceRouteAPI.makeItRun(projectId);
      setMakeItRunResult(result);
      if (result.state) {
        setReport(result.state);
      }
    } catch (err) {
      console.error("Make It Run error:", err);
    } finally {
      setIsMakeItRunActive(false);
    }
  }

  function handleExportZip() {
    setIsExporting(true);
    try {
      const url = TraceRouteAPI.getRepairedZipDownloadUrl(projectId);
      window.open(url, "_blank");
    } finally {
      setTimeout(() => setIsExporting(false), 2000);
    }
  }

  const issues = report?.issues || [];
  const filteredIssues = issues.filter((iss) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "AUTO_FIXABLE") return iss.repairability === "AUTO_FIXABLE";
    if (activeFilter === "REVIEW_REQUIRED") return iss.repairability === "REVIEW_REQUIRED";
    if (activeFilter === "MANUAL") return iss.repairability === "MANUAL";
    return iss.category === activeFilter;
  });

  const beforeAfter = report?.before_after || {
    health_score_before: 82,
    health_score_after: report?.health_score || 82,
    build_before: "WARNING",
    build_after: report?.build_readiness || "WARNING",
    issues_before: report?.total_issues || 0,
    issues_after: issues.filter(i => !i.applied).length,
    observability_before: "PARTIAL",
    observability_after: "READY"
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-[#161F35] to-slate-900 border border-[#26344D] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-white/10">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Project Repair Lab
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  ISOLATED SANDBOX
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Detect → Explain → Patch → Validate
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadReport}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Validate</span>
          </button>

          <button
            onClick={handleMakeItRun}
            disabled={isMakeItRunActive || issues.every(i => i.applied)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold font-mono shadow-lg shadow-emerald-600/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isMakeItRunActive ? "animate-spin" : ""}`} />
            <span>{isMakeItRunActive ? "Running Iterative Repairs..." : "Make It Run"}</span>
          </button>

          <button
            onClick={handleExportZip}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold font-mono shadow-lg shadow-sky-600/25 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Repaired ZIP</span>
          </button>
        </div>
      </div>

      {/* Trace to Code Banner (if linked from active incident) */}
      {traceToCode && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-900/60 border border-rose-700/60 text-rose-300 shrink-0">
              <Bug className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-300 uppercase tracking-wider font-mono">
                  RUNTIME FAILURE LINKED TO SOURCE CODE:
                </span>
                <span className="text-xs text-white font-semibold">{traceToCode.incident_name}</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Suspected cause: {traceToCode.suspected_cause}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-slate-400">
                <span>File: <code className="text-rose-300 bg-rose-950/80 px-1 py-0.5 rounded">{traceToCode.file}:{traceToCode.line}</code></span>
                <span>•</span>
                <span>Symbol: <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded">{traceToCode.symbol}</code></span>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[11px] font-mono text-rose-400 bg-rose-950/80 px-2 py-1 rounded border border-rose-800/60">
              Evidence-Correlated
            </span>
          </div>
        </div>
      )}

      {/* Top 5 SRE Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Project Health */}
        <div className="p-4 rounded-xl bg-[#161F35] border border-[#26344D] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
            <span>Project Health</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {report?.health_score || 82}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 100</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${report?.health_score || 82}%` }}
            />
          </div>
        </div>

        {/* Card 2: Issues Found */}
        <div className="p-4 rounded-xl bg-[#161F35] border border-[#26344D] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
            <span>Issues Found</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-300">
              {report?.total_issues || 0}
            </span>
            <span className="text-xs text-slate-400 font-mono">detected</span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            {issues.filter(i => i.applied).length} resolved in working copy
          </p>
        </div>

        {/* Card 3: Auto-Fixable (Level 1) */}
        <div className="p-4 rounded-xl bg-[#161F35] border border-[#26344D] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
            <span>Auto-Fixable</span>
            <Zap className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-sky-400">
              {report?.auto_fixable_count || 0}
            </span>
            <span className="text-xs text-slate-400 font-mono">Level 1 Safe</span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Deterministic AST & config fixes
          </p>
        </div>

        {/* Card 4: Review Required (Level 2) */}
        <div className="p-4 rounded-xl bg-[#161F35] border border-[#26344D] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
            <span>Review Required</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-indigo-300">
              {report?.review_required_count || 0}
            </span>
            <span className="text-xs text-slate-400 font-mono">Level 2</span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Route & networking contracts
          </p>
        </div>

        {/* Card 5: Validation Status */}
        <div className="p-4 rounded-xl bg-[#161F35] border border-[#26344D] space-y-2 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase tracking-wider">
            <span>Validation Status</span>
            {report?.validation_status === "PASSED" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Clock className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-lg font-bold font-mono ${report?.validation_status === "PASSED" ? "text-emerald-400" : "text-amber-400"}`}>
              {report?.validation_status || "PENDING"}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Build: <span className="text-white font-semibold">{report?.build_readiness || "PASSED"}</span>
          </p>
        </div>
      </div>

      {/* Before vs After Comparison & Make-It-Run Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Before vs After Card */}
        <div className="p-5 rounded-xl bg-[#161F35] border border-[#26344D] space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-sky-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                Before vs After Verification
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60">
              AUDIT COMPARISON
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Before */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-rose-400">
                ORIGINAL UPLOAD
              </span>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Health:</span>
                  <span className="text-white font-semibold">{beforeAfter.health_score_before}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Build:</span>
                  <span className={`font-semibold ${beforeAfter.build_before === "PASSED" ? "text-emerald-400" : "text-rose-400"}`}>
                    {beforeAfter.build_before}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Issues:</span>
                  <span className="text-amber-400 font-semibold">{beforeAfter.issues_before}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Telemetry:</span>
                  <span className="text-slate-300 font-semibold">{beforeAfter.observability_before}</span>
                </div>
              </div>
            </div>

            {/* After */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-emerald-800/40 space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                VERIFIED COPY
              </span>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Health:</span>
                  <span className="text-emerald-400 font-bold">{beforeAfter.health_score_after}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Build:</span>
                  <span className="text-emerald-400 font-bold">{beforeAfter.build_after}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Issues:</span>
                  <span className="text-emerald-400 font-bold">{beforeAfter.issues_after}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Telemetry:</span>
                  <span className="text-emerald-400 font-bold">{beforeAfter.observability_after}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Patches are isolated in the working copy. Original source remains untouched.</span>
          </div>
        </div>

        {/* Iterative Make It Run Execution Panel */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#161F35] border border-[#26344D] space-y-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                  Iterative Repair & Validation Loop
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                BOUNDED ITERATIONS • AUTO-ROLLBACK
              </span>
            </div>

            {/* Stepper Progress */}
            <div className="mt-4 space-y-2.5 max-h-[180px] overflow-y-auto pr-2">
              {makeItRunResult?.steps ? (
                makeItRunResult.steps.map((st, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs font-mono p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    {st.status === "PASSED" || st.status === "COMPLETED" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : st.status === "WARNING" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="text-slate-200 flex-1 truncate">{st.title}</span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      st.status === "PASSED" || st.status === "COMPLETED"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                        : "bg-amber-950 text-amber-400 border border-amber-800/60"
                    }`}>
                      {st.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-lg bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-1">
                  <p className="text-xs font-mono text-slate-400">
                    Click &quot;Make It Run&quot; to iteratively resolve blockers, apply safe patches, and validate.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Candidate fixes: {report?.auto_fixable_count || 0} Auto-Fixable • {report?.review_required_count || 0} Review Required
                  </p>
                </div>
              )}
            </div>
          </div>

          {makeItRunResult?.outcome && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {makeItRunResult.outcome}
              </span>
              <span className="text-slate-400">
                {makeItRunResult.applied_fixes_count} patches verified
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Issues Catalog Header & Category Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
              <Bug className="w-4 h-4 text-sky-400" />
              Detected Issues ({filteredIssues.length})
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Classified by repairability and architectural risk level
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "All Issues" },
              { id: "AUTO_FIXABLE", label: "Auto-Fixable (L1)" },
              { id: "REVIEW_REQUIRED", label: "Review Required (L2)" },
              { id: "MANUAL", label: "Engineer Review (L3)" },
              { id: "API_ROUTING", label: "API / Routing" },
              { id: "CONFIGURATION", label: "Config" },
              { id: "DEPENDENCIES", label: "Dependencies" },
              { id: "DATABASE", label: "Database" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition ${
                  activeFilter === f.id
                    ? "bg-sky-500 text-white font-semibold shadow-sm"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Issues List */}
        <div className="space-y-3">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={`p-4 rounded-xl border transition-all ${
                issue.applied
                  ? "bg-emerald-950/20 border-emerald-800/40"
                  : issue.severity === "CRITICAL"
                  ? "bg-rose-950/20 border-rose-800/50 hover:border-rose-700"
                  : "bg-[#161F35] border-[#26344D] hover:border-slate-700"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Severity Badge */}
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      issue.severity === "CRITICAL"
                        ? "bg-rose-950 text-rose-300 border border-rose-800"
                        : issue.severity === "HIGH"
                        ? "bg-orange-950 text-orange-300 border border-orange-800"
                        : "bg-slate-800 text-slate-300"
                    }`}>
                      {issue.severity}
                    </span>

                    {/* Repairability Level Badge */}
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      issue.repairability === "AUTO_FIXABLE"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        : issue.repairability === "REVIEW_REQUIRED"
                        ? "bg-sky-950 text-sky-300 border border-sky-800"
                        : "bg-purple-950 text-purple-300 border border-purple-800"
                    }`}>
                      {issue.repairability === "AUTO_FIXABLE" ? "LEVEL 1: AUTO-FIX" : issue.repairability === "REVIEW_REQUIRED" ? "LEVEL 2: REVIEW REQ" : "LEVEL 3: MANUAL"}
                    </span>

                    {/* Category Pill */}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
                      {issue.category}
                    </span>

                    <span className="text-xs font-bold text-white font-mono">
                      {issue.title}
                    </span>

                    <span className="text-xs font-mono text-slate-400">
                      ({issue.id})
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                    <span>File: <code className="text-sky-300 bg-slate-900 px-1.5 py-0.5 rounded">{issue.file}:{issue.line}</code></span>
                    {issue.affected_services?.length > 0 && (
                      <>
                        <span>•</span>
                        <span>Impacts: <span className="text-slate-300">{issue.affected_services.join(", ")}</span></span>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {issue.evidence}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {issue.applied ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Patched & Verified
                      </span>
                      <button
                        onClick={() => handleRollbackFix(issue.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
                      >
                        Rollback
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setSelectedIssue(issue);
                          setIsFixModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-xs font-mono font-semibold transition shadow-sm"
                      >
                        <FileCode2 className="w-3.5 h-3.5" />
                        <span>View Fix</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredIssues.length === 0 && (
            <div className="p-8 rounded-xl bg-[#161F35] border border-[#26344D] text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-white font-mono">No Issues in this Category</h3>
              <p className="text-xs text-slate-400">All checks for this category have passed.</p>
            </div>
          )}
        </div>
      </div>

      {/* View Fix & Patch Modal */}
      {isFixModalOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-[#26344D] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60">
                    {selectedIssue.id}
                  </span>
                  <h3 className="text-base font-bold text-white font-mono">
                    {selectedIssue.title}
                  </h3>
                </div>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  Target: <code className="text-sky-300">{selectedIssue.file}:{selectedIssue.line}</code>
                </p>
              </div>
              <button
                onClick={() => setIsFixModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 flex-1">
              {/* Diff View */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="font-bold uppercase tracking-wider">Unified Patch Diff</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded">Isolated Working Copy</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs overflow-x-auto space-y-1">
                  {selectedIssue.diff.split("\n").map((line, idx) => (
                    <div
                      key={idx}
                      className={
                        line.startsWith("+")
                          ? "text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded"
                          : line.startsWith("-")
                          ? "text-rose-400 bg-rose-950/40 px-1 py-0.5 rounded"
                          : "text-slate-400 px-1"
                      }
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              {/* Why This Change */}
              <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-800/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-sky-300 uppercase tracking-wider">
                  <Info className="w-4 h-4" />
                  <span>Why This Change?</span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {selectedIssue.why_this_change}
                </p>
              </div>

              {/* Risk & Validation Plan */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                    Architectural Risk
                  </span>
                  <p className={`text-xs font-mono font-bold ${
                    selectedIssue.risk === "LOW" ? "text-emerald-400" : selectedIssue.risk === "MEDIUM" ? "text-amber-400" : "text-rose-400"
                  }`}>
                    {selectedIssue.risk} RISK
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                    Validation Method
                  </span>
                  <p className="text-xs font-mono text-slate-300">
                    {selectedIssue.validation_method}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                onClick={() => setIsFixModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
              >
                Reject / Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApproveFix(selectedIssue)}
                  disabled={isApplyingPatch}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold shadow-lg shadow-emerald-600/30 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isApplyingPatch ? "Applying & Validating..." : "Approve & Apply Fix"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
