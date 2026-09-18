"use client";

import React, { useState } from "react";
import {
  SystemStatus,
  TopologyData,
  TelemetryData,
  Diagnosis,
  EarlyWarningData,
  InvestigationStep,
  RecoveryPlan,
  AdaptiveAnalysis
} from "../types";
import { TelemetryCharts } from "../telemetry-charts";
import { LiveIncidentStory } from "../live-incident-story";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Database,
  FileText,
  GitCommit,
  Play,
  Radio,
  Server,
  ShieldAlert,
  Sliders,
  Sparkles,
  Wrench,
  Zap
} from "lucide-react";

interface OverviewViewProps {
  status: SystemStatus | null;
  topology: TopologyData | null;
  telemetry: TelemetryData | null;
  diagnosis: Diagnosis | null;
  earlyWarning?: EarlyWarningData | null;
  investigationSteps?: InvestigationStep[];
  recoveryPlan?: RecoveryPlan | null;
  adaptiveData?: AdaptiveAnalysis | null;
  isPresentationMode?: boolean;
  onNavigate: (tab: string) => void;
}

// 6 Microservice Nodes for Distributed Topology
const DEFAULT_TOPOLOGY_NODES = [
  { id: "api-gateway", name: "API Gateway", x: 400, y: 60, defaultLatency: 11.5, defaultErrorRate: 0 },
  { id: "order-service", name: "Order Service", x: 400, y: 190, defaultLatency: 25.3, defaultErrorRate: 0 },
  { id: "payment-service", name: "Payment Service", x: 230, y: 330, defaultLatency: 33.7, defaultErrorRate: 0 },
  { id: "inventory-service", name: "Inventory Service", x: 570, y: 330, defaultLatency: 15.5, defaultErrorRate: 0 },
  { id: "payment-db", name: "Payment Database", x: 230, y: 470, defaultLatency: 3.9, defaultErrorRate: 0 },
  { id: "stock-db", name: "Stock Database", x: 570, y: 470, defaultLatency: 3.2, defaultErrorRate: 0 }
];

const DEFAULT_TOPOLOGY_EDGES = [
  { source: "api-gateway", target: "order-service" },
  { source: "order-service", target: "payment-service" },
  { source: "order-service", target: "inventory-service" },
  { source: "payment-service", target: "payment-db" },
  { source: "inventory-service", target: "stock-db" }
];

// Mini SVG sparkline generator for latency & error rates
function MiniSparkline({
  data,
  color,
  width = 46,
  height = 14
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 1;
  const usableHeight = height - padding * 2;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - padding - ((val - min) / range) * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0 opacity-85">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(" ")}
      />
    </svg>
  );
}

export function OverviewView({
  status,
  topology,
  telemetry,
  diagnosis,
  earlyWarning,
  investigationSteps,
  recoveryPlan,
  adaptiveData,
  isPresentationMode,
  onNavigate
}: OverviewViewProps) {
  const [selectedService, setSelectedService] = useState<string>("api-gateway");
  const [centerTab, setCenterTab] = useState<"topology" | "story">("topology");
  const isIncident = Boolean(status?.active_scenario);

  // Merge live telemetry & topology onto the 6 cards
  const effectiveNodes = DEFAULT_TOPOLOGY_NODES.map((defNode) => {
    const liveNode = topology?.nodes?.find((n) => n.id === defNode.id);
    return {
      ...defNode,
      ...(liveNode || {}),
      x: liveNode?.x ?? defNode.x,
      y: liveNode?.y ?? defNode.y,
      name: liveNode?.name || defNode.name,
      status: liveNode?.status || "HEALTHY",
      latency: liveNode?.latency ?? liveNode?.p50_latency_ms ?? defNode.defaultLatency,
      error_rate: liveNode?.error_rate ?? liveNode?.error_rate_pct ?? defNode.defaultErrorRate
    };
  });

  const effectiveEdges = DEFAULT_TOPOLOGY_EDGES.map((defEdge) => {
    const liveEdge = topology?.edges?.find(
      (e) => e.source === defEdge.source && e.target === defEdge.target
    );
    const targetNode = effectiveNodes.find((n) => n.id === defEdge.target);
    const isCrit = liveEdge?.status === "CRITICAL" || targetNode?.status === "CRITICAL" || targetNode?.status === "DOWN";
    return {
      ...defEdge,
      status: isCrit ? "CRITICAL" : "HEALTHY"
    };
  });

  // --- DERIVE VALUES FOR THE 6 SRE SUMMARY CARDS ---

  // 1. Service state breakdown
  const criticalCount = effectiveNodes.filter(n => n.status === "CRITICAL" || n.status === "DOWN").length;
  const degradedCount = effectiveNodes.filter(n => n.status === "WARNING" || n.status === "DEGRADED").length;
  const totalServices = effectiveNodes.length || 6;
  const healthyCount = Math.max(0, totalServices - criticalCount - degradedCount);

  // 2. System Health calculation
  let calculatedHealth: "HEALTHY" | "DEGRADED" | "CRITICAL" = "HEALTHY";
  let healthColor = "text-tl-green";
  let healthDotClass = "bg-tl-green";
  let healthSupportingText = "All critical paths operational";

  if (criticalCount > 0 || status?.system_health === "CRITICAL") {
    calculatedHealth = "CRITICAL";
    healthColor = "text-tl-coral";
    healthDotClass = "bg-tl-coral animate-pulse";
    healthSupportingText = "Critical path affected";
  } else if (degradedCount > 0 || status?.system_health === "DEGRADED") {
    calculatedHealth = "DEGRADED";
    healthColor = "text-tl-amber";
    healthDotClass = "bg-tl-amber";
    healthSupportingText = "Critical path affected";
  } else {
    calculatedHealth = "HEALTHY";
    healthColor = "text-tl-green";
    healthDotClass = "bg-tl-green";
    healthSupportingText = "All critical paths operational";
  }

  // 3. Active Incidents calculation
  const incidentSupportingText = isIncident
    ? (status?.active_scenario === "DATABASE_FAILURE"
        ? "SEV-1 • Checkout failure"
        : status?.active_scenario === "PAYMENT_LATENCY"
        ? "SEV-1 • Gateway timeout"
        : status?.active_scenario === "INVENTORY_CRASH"
        ? "SEV-2 • Stock sync crash"
        : status?.active_scenario === "BAD_DEPLOYMENT"
        ? "SEV-1 • v2.4.1 canary fault"
        : diagnosis?.incident?.symptom ? `SEV-1 • ${diagnosis.incident.symptom}` : "SEV-1 • Active Incident")
    : "No open incidents";

  // 4. P95 Latency calculation & sparkline
  const p95Val = status?.cluster_avg_latency_ms ?? 18;
  const isLatencyWarn = p95Val > 100;
  const isLatencyCrit = p95Val > 300;
  const latencyColor = isLatencyCrit ? "text-tl-coral" : isLatencyWarn ? "text-tl-amber" : "text-tl-cyan";

  const apiGwHistory = telemetry?.metrics_history?.["api-gateway"] || [];
  const recentLatencyPoints: number[] = apiGwHistory.length >= 4
    ? apiGwHistory.slice(-7).map(m => m.p95_latency_ms || m.p50_latency_ms || 18)
    : (isIncident
        ? [18, 24, 65, 180, 420, p95Val]
        : [17, 18, 16, 19, 17, 18]);

  // 5. Error Rate calculation & sparkline
  const errorRateVal = status?.cluster_max_error_rate_pct ?? 0.0;
  const isErrorWarn = errorRateVal > 0.2;
  const isErrorCrit = errorRateVal > 5.0;
  const errorColor = isErrorCrit ? "text-tl-coral" : isErrorWarn ? "text-tl-amber" : "text-tl-green";

  const recentErrorPoints: number[] = apiGwHistory.length >= 4
    ? apiGwHistory.slice(-7).map(m => m.error_rate_pct || 0)
    : (isIncident
        ? [0, 0, 1.5, 4.2, 8.6, errorRateVal]
        : [0, 0.1, 0, 0.2, 0.1, errorRateVal]);

  // 6. Failure Risk calculation
  let calculatedRisk: "LOW" | "ELEVATED" | "HIGH" | "CRITICAL" = "LOW";
  let riskColor = "text-tl-green";
  let riskSupportingText = "No significant degradation";

  if (isIncident || status?.system_health === "CRITICAL" || criticalCount > 0 || earlyWarning?.severity === "SLA_BREACHED") {
    calculatedRisk = "CRITICAL";
    riskColor = "text-tl-coral";
    riskSupportingText = "Active cascade detected";
  } else if (
    earlyWarning?.severity === "ELEVATED_RISK" ||
    earlyWarning?.failure_risk_level === "HIGH" ||
    status?.system_health === "DEGRADED" ||
    degradedCount > 0
  ) {
    calculatedRisk = "HIGH";
    riskColor = "text-tl-amber";
    riskSupportingText = earlyWarning?.indicators?.[0]?.warning || earlyWarning?.degradation_trend || "DB saturation rising";
  } else if (
    earlyWarning?.has_early_warning ||
    earlyWarning?.severity === "EARLY_WARNING" ||
    (earlyWarning?.indicators_count && earlyWarning.indicators_count > 0)
  ) {
    calculatedRisk = "ELEVATED";
    riskColor = "text-amber-400";
    riskSupportingText = earlyWarning?.indicators?.[0]?.warning || "Early anomaly detected";
  } else {
    calculatedRisk = "LOW";
    riskColor = "text-tl-green";
    riskSupportingText = "No significant degradation";
  }

  // --- DERIVE DECISION ROOM STATE & DATA ---
  const confidenceScore = diagnosis?.confidence_score ?? (isIncident ? 88 : 94);
  const isSufficient = adaptiveData?.is_sufficient ?? (confidenceScore >= 85);
  const isDegraded = Boolean((earlyWarning?.has_early_warning || degradedCount > 0) && !isIncident);
  const isRecovering = Boolean(status?.is_recovering);
  const isResolved = Boolean(status?.resolved_incident);

  let decisionState: string = "HEALTHY";

  if (isResolved) {
    decisionState = "RESOLVED";
  } else if (isRecovering) {
    decisionState = "VERIFYING";
  } else if (recoveryPlan?.available) {
    decisionState = "AWAITING_APPROVAL";
  } else if (isIncident) {
    if (confidenceScore >= 85 || isSufficient) {
      decisionState = "ROOT_CAUSE_IDENTIFIED";
    } else {
      decisionState = "INVESTIGATING";
    }
  } else if (earlyWarning?.has_early_warning) {
    decisionState = earlyWarning.severity === "ELEVATED_RISK" || status?.system_health === "DEGRADED"
      ? "DEGRADING"
      : "EARLY_WARNING";
  } else {
    decisionState = "HEALTHY";
  }

  const successRate = (100 - (status?.cluster_max_error_rate_pct || 0)).toFixed(2);
  const correlatedDep = diagnosis?.correlated_deployment;
  const isCorrelatedChange = Boolean(isIncident);
  const depService = correlatedDep?.service || "Payment Service";
  const depVersion = correlatedDep?.version || "v2.4.1";
  const depCommit = correlatedDep?.commit_id || "a8f3b9c";
  const depDescription = correlatedDep?.description || "database-client.ts (connection pool max_size reduced)";

  return (
    <div className="space-y-6">
      {/* 1. Top Section: EXACT 6 SRE Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* CARD 1 — SYSTEM HEALTH */}
        <div className="bg-tl-card border border-tl-border rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:border-slate-700 hover:bg-[#1A2540] shadow-sm min-h-[106px]">
          <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
            <span>SYSTEM HEALTH</span>
            <Activity className={`w-3.5 h-3.5 ${healthColor}`} />
          </div>
          <div className="my-1 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${healthDotClass}`} />
            <span className={`text-xl font-bold font-mono tracking-tight ${healthColor}`}>
              {calculatedHealth}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 truncate">
            {healthSupportingText}
          </div>
        </div>

        {/* CARD 2 — ACTIVE INCIDENTS */}
        <div
          onClick={() => onNavigate(isIncident ? "adaptive" : "investigation")}
          className="bg-tl-card border border-tl-border rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:border-slate-700 hover:bg-[#1A2540] shadow-sm min-h-[106px] cursor-pointer group"
          title="Click to view active incident investigation"
        >
          <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
            <span>ACTIVE INCIDENTS</span>
            <AlertOctagon className={`w-3.5 h-3.5 ${isIncident ? "text-tl-coral" : "text-slate-400 group-hover:text-slate-300"}`} />
          </div>
          <div className="my-1 flex items-baseline gap-2">
            <span className={`text-xl font-bold font-mono tracking-tight ${isIncident ? "text-tl-coral" : "text-slate-100"}`}>
              {isIncident ? 1 : 0}
            </span>
            {isIncident && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-950/90 text-tl-coral border border-rose-800 font-bold">
                OPEN
              </span>
            )}
          </div>
          <div className={`text-[10px] font-mono truncate ${isIncident ? "text-rose-400 font-semibold" : "text-slate-400"}`}>
            {incidentSupportingText}
          </div>
        </div>

        {/* CARD 3 — SERVICES */}
        <div
          onClick={() => onNavigate("topology")}
          className="bg-tl-card border border-tl-border rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:border-slate-700 hover:bg-[#1A2540] shadow-sm min-h-[106px] cursor-pointer group"
          title="Click to inspect service topology"
        >
          <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
            <span>SERVICES</span>
            <Server className="w-3.5 h-3.5 text-tl-cyan group-hover:text-cyan-300" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5 font-mono">
            <span className={`text-xl font-bold tracking-tight ${criticalCount > 0 ? "text-tl-coral" : degradedCount > 0 ? "text-tl-amber" : "text-slate-100"}`}>
              {healthyCount}
            </span>
            <span className="text-xs text-slate-500 font-semibold">/ {totalServices}</span>
          </div>
          <div className="text-[10px] font-mono flex items-center gap-1.5 truncate">
            {criticalCount === 0 && degradedCount === 0 ? (
              <span className="text-slate-400">All services operational</span>
            ) : (
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-tl-green flex items-center gap-0.5">● {healthyCount}</span>
                {degradedCount > 0 && <span className="text-tl-amber flex items-center gap-0.5 font-semibold">● {degradedCount}</span>}
                {criticalCount > 0 && <span className="text-tl-coral flex items-center gap-0.5 font-semibold">● {criticalCount}</span>}
              </div>
            )}
          </div>
        </div>

        {/* CARD 4 — P95 LATENCY */}
        <div className="bg-tl-card border border-tl-border rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:border-slate-700 hover:bg-[#1A2540] shadow-sm min-h-[106px]">
          <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
            <span>P95 LATENCY</span>
            <MiniSparkline
              data={recentLatencyPoints}
              color={isLatencyCrit ? "#F43F5E" : isLatencyWarn ? "#F59E0B" : "#22D3EE"}
              width={46}
              height={14}
            />
          </div>
          <div className="my-1 flex items-baseline gap-1 font-mono">
            <span className={`text-xl font-bold tracking-tight ${latencyColor}`}>
              {p95Val}
            </span>
            <span className="text-xs text-slate-400 font-medium">ms</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 truncate">
            {isLatencyWarn ? (
              <span className={isLatencyCrit ? "text-tl-coral font-semibold" : "text-tl-amber font-semibold"}>
                &uarr; Above SLO
              </span>
            ) : (
              <span>Target &lt; 100 ms</span>
            )}
          </div>
        </div>

        {/* CARD 5 — ERROR RATE */}
        <div className="bg-tl-card border border-tl-border rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:border-slate-700 hover:bg-[#1A2540] shadow-sm min-h-[106px]">
          <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
            <span>ERROR RATE</span>
            <MiniSparkline
              data={recentErrorPoints}
              color={isErrorCrit ? "#F43F5E" : isErrorWarn ? "#F59E0B" : "#22C55E"}
              width={46}
              height={14}
            />
          </div>
          <div className="my-1 flex items-baseline gap-1 font-mono">
            <span className={`text-xl font-bold tracking-tight ${errorColor}`}>
              {errorRateVal.toFixed(1)}%
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 truncate">
            {isErrorWarn ? (
              <span className={isErrorCrit ? "text-tl-coral font-semibold" : "text-tl-amber font-semibold"}>
                &uarr; {(errorRateVal - 0.2).toFixed(1)}pp above baseline
              </span>
            ) : (
              <span>Baseline 0.2%</span>
            )}
          </div>
        </div>

        {/* CARD 6 — FAILURE RISK */}
        <div className="bg-tl-card border border-tl-border rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:border-slate-700 hover:bg-[#1A2540] shadow-sm min-h-[106px]">
          <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
            <span>FAILURE RISK</span>
            <ShieldAlert className={`w-3.5 h-3.5 ${riskColor}`} />
          </div>
          <div className="my-1 flex items-center gap-1.5 font-mono">
            <span className={`text-xl font-bold tracking-tight ${riskColor}`}>
              {calculatedRisk}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 truncate">
            <span className={calculatedRisk === "CRITICAL" ? "text-tl-coral font-medium" : calculatedRisk === "HIGH" ? "text-tl-amber font-medium" : "text-slate-400"}>
              {riskSupportingText}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Area: 6-Card Live Topology (8 cols) & Active Incident Panel (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* TraceRoute AI Decision Room (8 cols) */}
        <div className="lg:col-span-8 bg-[#10172A] border border-[#26344D] rounded-xl p-5 backdrop-blur flex flex-col justify-between space-y-4 shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#26344D] pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#8B5CF6]" />
                  TRACEROUTE AI DECISION ROOM
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/60 text-[#22C55E] border border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#94A3B8] mt-0.5">
                Observability intelligence for faster, safer incident resolution
              </p>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="text-[11px] font-mono text-slate-500 hidden md:inline">
                Turning telemetry into action
              </span>
              <button
                onClick={() => onNavigate("topology")}
                className="text-[11px] text-[#22D3EE] hover:text-cyan-300 font-medium flex items-center gap-1 transition font-mono px-2.5 py-1 rounded bg-[#161F35] border border-[#26344D] hover:border-[#22D3EE]/50 shadow-sm"
              >
                <span>Interactive DAG View</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 2 x 2 Decision Room Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 flex-1">
            {/* CARD 1: CURRENT STATE */}
            <div
              className={`bg-[#161F35] border rounded-lg p-4 flex flex-col justify-between transition-all ${
                isIncident
                  ? "border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.06)]"
                  : isDegraded
                  ? "border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.06)]"
                  : "border-[#26344D] hover:border-[#22C55E]/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#26344D]/70">
                  <div className="flex items-center gap-1.5">
                    <Activity
                      className={`w-3.5 h-3.5 ${
                        isIncident
                          ? "text-[#F43F5E]"
                          : isDegraded
                          ? "text-[#F59E0B]"
                          : "text-[#22C55E]"
                      }`}
                    />
                    <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-300">
                      CURRENT STATE
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#94A3B8]">
                    Real-time view of your system
                  </span>
                </div>

                {/* Banner */}
                <div
                  className={`p-2.5 rounded-md border font-mono ${
                    isIncident
                      ? "bg-rose-950/40 border-rose-800/70 text-rose-200"
                      : isDegraded
                      ? "bg-amber-950/40 border-amber-800/70 text-amber-200"
                      : isRecovering
                      ? "bg-cyan-950/40 border-cyan-800/70 text-cyan-200"
                      : isResolved
                      ? "bg-emerald-950/40 border-emerald-800/70 text-emerald-200"
                      : "bg-emerald-950/30 border-emerald-800/50 text-emerald-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold flex items-center gap-1.5 ${
                        isIncident
                          ? "text-[#F43F5E]"
                          : isDegraded
                          ? "text-[#F59E0B]"
                          : isRecovering
                          ? "text-[#22D3EE]"
                          : "text-[#22C55E]"
                      }`}
                    >
                      {isIncident
                        ? "🔴 INCIDENT ACTIVE"
                        : isRecovering
                        ? "⚡ RECOVERY IN PROGRESS"
                        : isResolved
                        ? "✓ SYSTEM RECOVERED"
                        : isDegraded
                        ? "⚠ SYSTEM DEGRADING"
                        : "✓ SYSTEM STABLE"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] mt-1 line-clamp-1">
                    {isIncident
                      ? diagnosis?.incident?.symptom ||
                        (status?.active_scenario
                          ? status.active_scenario.replace(/_/g, " ")
                          : "Checkout reliability affected")
                      : isRecovering
                      ? "Remediation executing in target cluster"
                      : isResolved
                      ? "Verification confirmed, SLOs restored"
                      : isDegraded
                      ? `${degradedCount || 1} services showing abnormal behavior`
                      : "All services operating normally"}
                  </p>
                </div>
              </div>

              {/* 3 Compact Live Metrics */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#26344D]/70 text-center font-mono">
                <div className="bg-[#10172A]/70 rounded p-1.5 border border-[#26344D]/50">
                  <div className="text-[13px] font-bold text-[#F8FAFC]">
                    {healthyCount} / {totalServices}
                  </div>
                  <div className="text-[9px] text-[#94A3B8] uppercase">Services Healthy</div>
                </div>
                <div className="bg-[#10172A]/70 rounded p-1.5 border border-[#26344D]/50">
                  <div
                    className={`text-[13px] font-bold ${
                      isIncident ? "text-[#F43F5E]" : "text-[#F8FAFC]"
                    }`}
                  >
                    {isIncident ? 1 : 0}
                  </div>
                  <div className="text-[9px] text-[#94A3B8] uppercase">Active Incidents</div>
                </div>
                <div className="bg-[#10172A]/70 rounded p-1.5 border border-[#26344D]/50">
                  <div className="text-[13px] font-bold text-[#22C55E]">
                    {successRate}%
                  </div>
                  <div className="text-[9px] text-[#94A3B8] uppercase">Successful Reqs</div>
                </div>
              </div>
            </div>

            {/* CARD 2: AI ASSESSMENT */}
            <div className="bg-[#161F35] border border-[#26344D] hover:border-[#8B5CF6]/40 rounded-lg p-4 flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#26344D]/70">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-300">
                      AI ASSESSMENT
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#94A3B8]">
                    What TraceRoute understands right now
                  </span>
                </div>

                {!isIncident && !isDegraded ? (
                  /* Healthy state */
                  <div className="space-y-3 font-mono">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#22C55E]">
                      <Check className="w-3.5 h-3.5" />
                      <span>No action required</span>
                      <span className="text-[10px] font-normal text-[#94A3B8] ml-auto">
                        No abnormal patterns detected
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div>
                        <div className="flex justify-between text-[10px] text-[#94A3B8] mb-1">
                          <span>System Stability</span>
                          <span className="text-[#F8FAFC] font-semibold">96%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#10172A] rounded-full overflow-hidden border border-[#26344D]">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-[#22C55E] rounded-full"
                            style={{ width: "96%" }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-[#94A3B8] mb-1">
                          <span>Evidence Confidence</span>
                          <span className="text-[#F8FAFC] font-semibold">94%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#10172A] rounded-full overflow-hidden border border-[#26344D]">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-[#8B5CF6] rounded-full"
                            style={{ width: "94%" }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-[#94A3B8] mb-1">
                          <span>Baseline Coverage</span>
                          <span className="text-[#F8FAFC] font-semibold">92%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#10172A] rounded-full overflow-hidden border border-[#26344D]">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-[#22D3EE] rounded-full"
                            style={{ width: "92%" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Incident / Degraded state */
                  <div className="space-y-2.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        TRACE LENS ASSESSMENT
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          confidenceScore >= 85
                            ? "bg-emerald-950/70 border-emerald-800 text-[#22C55E]"
                            : "bg-amber-950/70 border-amber-800 text-[#F59E0B]"
                        }`}
                      >
                        {confidenceScore >= 85 ? "● ROOT CAUSE IDENTIFIED" : "● INVESTIGATING"}
                      </span>
                    </div>

                    {/* Leading Candidates */}
                    <div className="space-y-1.5 pt-0.5">
                      {diagnosis?.ranked_candidates && diagnosis.ranked_candidates.length > 0 ? (
                        diagnosis.ranked_candidates.slice(0, 2).map((cand, idx) => (
                          <div key={cand.service || idx} className="space-y-0.5">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-200 font-medium truncate">
                                {cand.name || cand.service}
                              </span>
                              <span className="text-[#8B5CF6] font-bold">
                                {Math.round(cand.score || 0)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-[#10172A] rounded-full overflow-hidden border border-[#26344D]">
                              <div
                                className="h-full bg-gradient-to-r from-violet-600 to-[#8B5CF6] rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.max(10, cand.score || 50))}%`
                                }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-200 font-medium">
                              {diagnosis?.initiating_service_name || "Payment Database"}
                            </span>
                            <span className="text-[#8B5CF6] font-bold">{confidenceScore}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#10172A] rounded-full overflow-hidden border border-[#26344D]">
                            <div
                              className="h-full bg-gradient-to-r from-violet-600 to-[#8B5CF6] rounded-full"
                              style={{ width: `${confidenceScore}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Evidence Status & Next Needed */}
                    <div className="pt-2 border-t border-[#26344D]/70 flex items-center justify-between text-[10px]">
                      <span className="text-[#94A3B8]">Evidence Status:</span>
                      <span
                        className={`font-bold ${
                          isSufficient ? "text-[#22C55E]" : "text-[#F59E0B]"
                        }`}
                      >
                        {isSufficient ? "SUFFICIENT" : "INSUFFICIENT"} ({confidenceScore}%)
                      </span>
                    </div>
                    <div className="text-[10px] text-[#94A3B8] truncate">
                      <span>Next evidence: </span>
                      <span className="text-slate-200 font-medium">
                        {adaptiveData?.next_best_evidence?.action_title || "Payment → Database trace"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CARD 3: RECENT CHANGE */}
            <div
              className={`bg-[#161F35] border rounded-lg p-4 flex flex-col justify-between transition-all ${
                isCorrelatedChange
                  ? "border-amber-500/40 hover:border-amber-500/60"
                  : "border-[#26344D] hover:border-[#22D3EE]/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#26344D]/70">
                  <div className="flex items-center gap-1.5">
                    <GitCommit
                      className={`w-3.5 h-3.5 ${
                        isCorrelatedChange ? "text-[#F59E0B]" : "text-[#22D3EE]"
                      }`}
                    />
                    <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-300">
                      RECENT CHANGE
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#94A3B8]">
                    Deployments & configs
                  </span>
                </div>

                {isCorrelatedChange ? (
                  /* Correlated incident change */
                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F59E0B] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        CORRELATED CHANGE
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-800 text-[#F59E0B]">
                        UNDER INVESTIGATION
                      </span>
                    </div>

                    <div className="bg-[#10172A]/70 rounded p-2 border border-[#26344D]/60 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-100 font-semibold">
                          {depService} {depVersion}
                        </span>
                        <span className="text-[#22D3EE] font-mono text-[10px]">
                          commit {depCommit}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#94A3B8] flex items-center gap-2">
                        <span>Deployed: 10:38:42</span>
                        <span>•</span>
                        <span>Anomaly: 10:41:03</span>
                        <span>•</span>
                        <span className="text-amber-400 font-medium">Diff: 2m 21s</span>
                      </div>
                      <div className="text-[10px] text-slate-300 truncate pt-0.5 border-t border-[#26344D]/50">
                        {depDescription}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Healthy / Nominal change */
                  <div className="space-y-2.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#22C55E]">
                        <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                        <span>Nominal Release</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-[#22C55E]">
                        STABLE
                      </span>
                    </div>

                    <div className="bg-[#10172A]/70 rounded p-2 border border-[#26344D]/60 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-100 font-semibold">v2.3.0</span>
                        <span className="text-[#94A3B8] text-[10px]">18 minutes ago</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Changed: <span className="text-slate-200">payment-service</span>,{" "}
                        <span className="text-slate-200">order-service</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Zero regression detected across canary fleet
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2.5 mt-2 border-t border-[#26344D]/70 flex justify-end">
                <button
                  onClick={() => onNavigate("deployments")}
                  className="text-[11px] font-mono text-[#22D3EE] hover:text-cyan-300 font-medium flex items-center gap-1 transition"
                >
                  <span>{isCorrelatedChange ? "INSPECT DEPLOYMENT" : "VIEW ALL CHANGES"}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* CARD 4: NEXT BEST ACTION */}
            <div className="bg-[#161F35] border border-[#26344D] hover:border-[#8B5CF6]/40 rounded-lg p-4 flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#26344D]/70">
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-300">
                      NEXT BEST ACTION
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#94A3B8]">
                    Recommended by TraceRoute
                  </span>
                </div>

                {/* State-Driven Content */}
                {decisionState === "HEALTHY" ? (
                  <div className="space-y-2.5 font-mono text-xs">
                    <div>
                      <div className="text-xs font-bold text-[#22D3EE] flex items-center gap-1.5">
                        <Play className="w-3 h-3 fill-[#22D3EE]" />
                        <span>Continue Monitoring</span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">
                        System is healthy and within normal parameters.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] text-slate-300">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Check className="w-3 h-3 shrink-0" />
                        <span className="text-slate-300">Topology mapped</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Check className="w-3 h-3 shrink-0" />
                        <span className="text-slate-300">Telemetry live</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Check className="w-3 h-3 shrink-0" />
                        <span className="text-slate-300">Baseline established</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Check className="w-3 h-3 shrink-0" />
                        <span className="text-slate-300">No risks detected</span>
                      </div>
                    </div>
                  </div>
                ) : decisionState === "EARLY_WARNING" || decisionState === "DEGRADING" ? (
                  <div className="space-y-2 font-mono text-xs">
                    <div className="text-xs font-bold text-[#F59E0B] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>INSPECT ABNORMAL SIGNAL</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      {earlyWarning?.preventative_recommendation ||
                        "Database saturation is rising before SLO impact."}
                    </p>
                    <div className="text-[10px] text-slate-400 bg-[#10172A]/70 p-2 rounded border border-[#26344D]/60">
                      Preventative action available before transaction failure cascade.
                    </div>
                  </div>
                ) : decisionState === "INVESTIGATING" || decisionState === "INCIDENT_DETECTED" ? (
                  <div className="space-y-2 font-mono text-xs">
                    <div className="text-xs font-bold text-[#8B5CF6] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>COLLECT EVIDENCE</span>
                    </div>
                    <div className="bg-[#10172A]/70 p-2 rounded border border-[#26344D]/60 space-y-1">
                      <div className="text-[10px] text-slate-400">
                        Inspect:{" "}
                        <span className="text-slate-200 font-semibold">
                          {adaptiveData?.next_best_evidence?.action_title ||
                            "Payment → Database trace"}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Reason:{" "}
                        <span className="text-slate-300">
                          {adaptiveData?.next_best_evidence?.rationale ||
                            "This evidence can distinguish between the two leading hypotheses."}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : decisionState === "ROOT_CAUSE_IDENTIFIED" ? (
                  <div className="space-y-2 font-mono text-xs">
                    <div className="text-xs font-bold text-[#22D3EE] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>SIMULATE RECOVERY</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      Root cause evidence is sufficient. Recommended next step:
                    </p>
                    <div className="text-[10px] text-slate-200 bg-[#10172A]/70 p-2 rounded border border-[#26344D]/60 font-semibold">
                      Open SafeOps Recovery Sandbox to simulate hotfix safely
                    </div>
                  </div>
                ) : decisionState === "RECOVERY_SIMULATED" || decisionState === "AWAITING_APPROVAL" ? (
                  <div className="space-y-2 font-mono text-xs">
                    <div className="text-xs font-bold text-[#F59E0B] flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>REVIEW RECOVERY PLAN</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      Simulation completed. Engineer approval required.
                    </p>
                    <div className="text-[10px] text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-800/60 font-medium">
                      ✓ Zero projected blast radius. Ready for authorization.
                    </div>
                  </div>
                ) : decisionState === "RECOVERING" || decisionState === "VERIFYING" ? (
                  <div className="space-y-2 font-mono text-xs">
                    <div className="text-xs font-bold text-[#22D3EE] flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      <span>VERIFY RECOVERY</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      Checking whether services returned to baseline.
                    </p>
                    <div className="text-[10px] text-slate-300 bg-[#10172A]/70 p-2 rounded border border-[#26344D]/60">
                      Synthetics & health checks executing in sandbox verification loop.
                    </div>
                  </div>
                ) : (
                  /* RESOLVED */
                  <div className="space-y-2 font-mono text-xs">
                    <div className="text-xs font-bold text-[#22C55E] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>INCIDENT RESOLVED</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      Recovery verified successfully. Memory archived.
                    </p>
                    <div className="text-[10px] text-slate-300 bg-[#10172A]/70 p-2 rounded border border-[#26344D]/60">
                      Post-incident causal chain & resolution added to Incident Memory.
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Action Button */}
              <div className="pt-2.5 mt-2 border-t border-[#26344D]/70 flex justify-end">
                {decisionState === "HEALTHY" ? (
                  <button
                    onClick={() => onNavigate("telemetry")}
                    className="text-[11px] font-mono text-[#22D3EE] hover:text-cyan-300 font-medium flex items-center gap-1 transition"
                  >
                    <span>VIEW TELEMETRY</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : decisionState === "EARLY_WARNING" || decisionState === "DEGRADING" ? (
                  <button
                    onClick={() => onNavigate("adaptive")}
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 flex items-center gap-1.5 transition"
                  >
                    <span>VIEW SIGNAL</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : decisionState === "INVESTIGATING" || decisionState === "INCIDENT_DETECTED" ? (
                  <button
                    onClick={() => onNavigate("adaptive")}
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded bg-[#8B5CF6]/20 text-violet-300 border border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/30 flex items-center gap-1.5 transition"
                  >
                    <span>COLLECT EVIDENCE</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : decisionState === "ROOT_CAUSE_IDENTIFIED" ? (
                  <button
                    onClick={() => onNavigate("sandbox")}
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded bg-[#22D3EE]/20 text-cyan-300 border border-[#22D3EE]/40 hover:bg-[#22D3EE]/30 flex items-center gap-1.5 transition"
                  >
                    <span>OPEN SAFEOPS</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : decisionState === "RECOVERY_SIMULATED" || decisionState === "AWAITING_APPROVAL" ? (
                  <button
                    onClick={() => onNavigate("sandbox")}
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded bg-[#22C55E]/20 text-emerald-300 border border-[#22C55E]/40 hover:bg-[#22C55E]/30 flex items-center gap-1.5 transition"
                  >
                    <span>REVIEW & APPROVE</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : decisionState === "RECOVERING" || decisionState === "VERIFYING" ? (
                  <button
                    onClick={() => onNavigate("sandbox")}
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded bg-[#22D3EE]/20 text-cyan-300 border border-[#22D3EE]/40 hover:bg-[#22D3EE]/30 flex items-center gap-1.5 transition"
                  >
                    <span>VIEW VERIFICATION</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate("history")}
                    className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded bg-[#22C55E]/20 text-emerald-300 border border-[#22C55E]/40 hover:bg-[#22C55E]/30 flex items-center gap-1.5 transition"
                  >
                    <span>VIEW INCIDENT REPORT</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Incident Panel (4 cols) */}
        <div className="lg:col-span-4 bg-tl-card border border-tl-border rounded-xl p-5 backdrop-blur flex flex-col justify-between space-y-4 shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-tl-border pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-tl-coral" />
                Active Incident Context
              </span>
              {isIncident && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-tl-coral border border-rose-800 font-bold">
                  P0 SEVERITY
                </span>
              )}
            </div>

            {isIncident ? (
              <div className="mt-4 space-y-3">
                {/* Incident ID and Symptom */}
                <div className="p-3 rounded-lg bg-tl-bg border border-tl-border space-y-1 font-mono text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>INCIDENT IDENTIFIER</span>
                    <span className="text-tl-coral font-bold">OPEN</span>
                  </div>
                  <div className="text-sm font-bold text-tl-coral">{status?.active_incident_id}</div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    Symptom: <strong className="text-slate-100">{diagnosis?.incident?.symptom || "502 Bad Gateway"}</strong>
                  </div>
                </div>

                {/* Leading Root Cause Candidate & Evidence Strength */}
                <div className="p-3 rounded-lg bg-tl-bg border border-tl-border space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 uppercase">Leading Root Cause:</span>
                    <span className="text-[10px] font-bold text-tl-green bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                      {diagnosis?.confidence_score || 100}% SCORE
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-tl-cyan" />
                    <span>{diagnosis?.initiating_service_name || "Payment Database"}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Evidence Strength:</span>
                      <span className="font-bold text-tl-violet">SUFFICIENT (High Precision)</span>
                    </div>
                    <div className="w-full h-1.5 bg-tl-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-tl-violet rounded-full transition-all duration-500"
                        style={{ width: `${diagnosis?.confidence_score || 89}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Cascade Stage */}
                <div className="p-3 rounded-lg bg-tl-bg border border-tl-border space-y-1 font-mono text-xs">
                  <div className="text-[10px] text-slate-500 uppercase">Cascade Progression Stage:</div>
                  <div className="text-slate-200 text-[11px] font-semibold">
                    {status?.cascade_stage || "Propagating upstream along critical path"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-14 text-center space-y-2 text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-tl-green mx-auto opacity-60" />
                <p className="font-bold text-slate-200">No active incidents.</p>
                <p className="text-[11px] text-slate-500 font-mono">All 6 services operating within nominal latency thresholds and zero errors.</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-tl-border space-y-2">
            <button
              onClick={() => onNavigate("adaptive")}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-tl-cyan hover:bg-cyan-400 text-slate-950 text-xs font-bold font-mono transition shadow-sm"
            >
              <span>Investigate Adaptive Steps</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate("repair_lab")}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 text-xs font-semibold font-mono border border-purple-500/30 transition shadow-sm"
                title="Trace runtime failure back to source repository in Project Repair Lab"
              >
                <Wrench className="w-3.5 h-3.5 text-purple-400" />
                <span>Trace to Code</span>
              </button>
              <button
                onClick={() => onNavigate("sandbox")}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-tl-elevated hover:bg-slate-700 text-slate-200 text-xs font-semibold font-mono border border-tl-border transition"
              >
                <Sliders className="w-3.5 h-3.5 text-tl-green" />
                <span>SafeOps</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom: Real-Time Charts & Live Event Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Charts (8 cols) */}
        <div className="lg:col-span-8 bg-tl-card border border-tl-border rounded-xl p-5 backdrop-blur space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-tl-border pb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-tl-cyan" />
              Real-Time Latency & Error Rate &bull; {selectedService}
            </span>
            <span className="text-[10px] font-mono text-slate-500">Live 3-second polling</span>
          </div>

          {telemetry && (
            <TelemetryCharts
              metricsHistory={telemetry.metrics_history}
              selectedService={selectedService}
            />
          )}
        </div>

        {/* Live Event Stream (4 cols) */}
        <div className="lg:col-span-4 bg-tl-card border border-tl-border rounded-xl p-5 backdrop-blur flex flex-col justify-between space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-tl-border pb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-tl-violet" />
              Live Telemetry Event Stream
            </span>
            <span className="text-[10px] font-mono text-slate-500">Captured logs</span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] font-mono text-[11px] pr-1">
            {(telemetry?.recent_logs || []).slice(0, 5).map((log, idx) => (
              <div
                key={idx}
                className="p-2 rounded bg-tl-bg border border-tl-border space-y-0.5"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span
                    className={`px-1 rounded uppercase font-bold ${
                      log.level === "ERROR"
                        ? "bg-rose-950 text-tl-coral border border-rose-800"
                        : log.level === "WARN"
                        ? "bg-amber-950 text-tl-amber border border-amber-800"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="text-slate-400 font-semibold">{log.service}</span>
                </div>
                <p className="text-slate-200 truncate">{log.message}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-tl-border text-[10px] font-mono text-slate-500 text-center">
            Tracing cluster logs via OpenTelemetry collector
          </div>
        </div>
      </div>
    </div>
  );
}
