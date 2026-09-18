"use client";

import React, { useState, useEffect } from "react";
import {
  SystemStatus,
  TopologyData,
  TelemetryData
} from "../types";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  SkipForward,
  SkipBack,
  Clock,
  Server,
  AlertTriangle,
  Layers,
  ArrowRight,
  Activity,
  CheckCircle2,
  Film
} from "lucide-react";

interface ReplayViewProps {
  status: SystemStatus | null;
  topology: TopologyData | null;
  onNavigate: (tab: string) => void;
}

interface ReplayStep {
  stepIndex: number;
  timestampOffset: string;
  stageName: string;
  description: string;
  nodeStatuses: Record<string, { status: "HEALTHY" | "WARNING" | "CRITICAL"; latency: number; errorRate: number }>;
  activeLogs: Array<{ service: string; level: string; message: string }>;
}

const REPLAY_SCENARIOS: Record<string, ReplayStep[]> = {
  database_failure: [
    {
      stepIndex: 0,
      timestampOffset: "T - 30s",
      stageName: "Nominal Cluster Baseline",
      description: "All services operating within normal latency and zero error rates.",
      nodeStatuses: {
        "api-gateway": { status: "HEALTHY", latency: 18, errorRate: 0 },
        "order-service": { status: "HEALTHY", latency: 24, errorRate: 0 },
        "payment-service": { status: "HEALTHY", latency: 32, errorRate: 0 },
        "inventory-service": { status: "HEALTHY", latency: 15, errorRate: 0 },
        "payment-db": { status: "HEALTHY", latency: 4, errorRate: 0 },
        "stock-db": { status: "HEALTHY", latency: 3, errorRate: 0 }
      },
      activeLogs: [
        { service: "payment-db", level: "INFO", message: "HikariCP pool active: 45/150 connections" },
        { service: "payment-service", level: "INFO", message: "Processed transaction tx_98431 successfully in 31ms" }
      ]
    },
    {
      stepIndex: 1,
      timestampOffset: "T + 0s",
      stageName: "Root Failure: Database Pool Exhaustion",
      description: "PostgreSQL max_connections reached 100% capacity (150/150). Client connection acquire timeouts begin.",
      nodeStatuses: {
        "api-gateway": { status: "HEALTHY", latency: 22, errorRate: 0 },
        "order-service": { status: "HEALTHY", latency: 30, errorRate: 0 },
        "payment-service": { status: "WARNING", latency: 450, errorRate: 5 },
        "inventory-service": { status: "HEALTHY", latency: 16, errorRate: 0 },
        "payment-db": { status: "CRITICAL", latency: 1200, errorRate: 85 },
        "stock-db": { status: "HEALTHY", latency: 3, errorRate: 0 }
      },
      activeLogs: [
        { service: "payment-db", level: "ERROR", message: "FATAL: remaining connection slots are reserved for non-replication superuser connections" },
        { service: "payment-service", level: "WARN", message: "ConnectionAcquisitionTimeoutException: pool exhausted after 30000ms" }
      ]
    },
    {
      stepIndex: 2,
      timestampOffset: "T + 5s",
      stageName: "Cascade Propagation: Payment Thread Block",
      description: "Payment Service Tomcat worker threads exhaust waiting on DB connection checkout. Inbound RPCs queue up.",
      nodeStatuses: {
        "api-gateway": { status: "HEALTHY", latency: 45, errorRate: 0 },
        "order-service": { status: "WARNING", latency: 850, errorRate: 25 },
        "payment-service": { status: "CRITICAL", latency: 2400, errorRate: 90 },
        "inventory-service": { status: "HEALTHY", latency: 17, errorRate: 0 },
        "payment-db": { status: "CRITICAL", latency: 1800, errorRate: 98 },
        "stock-db": { status: "HEALTHY", latency: 3, errorRate: 0 }
      },
      activeLogs: [
        { service: "payment-service", level: "ERROR", message: "ThreadPoolExhaustion: 200/200 worker threads BLOCKED on database acquire" },
        { service: "order-service", level: "WARN", message: "Upstream HTTP 504 received from payment-service; initiating retry #1" }
      ]
    },
    {
      stepIndex: 3,
      timestampOffset: "T + 10s",
      stageName: "Catastrophic Blast: Ingress Circuit Trip",
      description: "Order Service cascades latency to API Gateway. Gateway trips circuit breaker with 502 Bad Gateway to end users.",
      nodeStatuses: {
        "api-gateway": { status: "CRITICAL", latency: 2800, errorRate: 100 },
        "order-service": { status: "CRITICAL", latency: 2600, errorRate: 100 },
        "payment-service": { status: "CRITICAL", latency: 2500, errorRate: 100 },
        "inventory-service": { status: "HEALTHY", latency: 18, errorRate: 0 },
        "payment-db": { status: "CRITICAL", latency: 2000, errorRate: 100 },
        "stock-db": { status: "HEALTHY", latency: 4, errorRate: 0 }
      },
      activeLogs: [
        { service: "api-gateway", level: "ERROR", message: "CircuitBreaker TRIP: /api/v1/checkout failure rate 100% > threshold 50%" },
        { service: "api-gateway", level: "ERROR", message: "HTTP 502 Bad Gateway returned to client 198.51.100.42" }
      ]
    }
  ]
};

export function ReplayView({ status, topology, onNavigate }: ReplayViewProps) {
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string>("database_failure");
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const steps = REPLAY_SCENARIOS[selectedScenarioKey] || REPLAY_SCENARIOS.database_failure;
  const currentStep = steps[currentStepIndex] || steps[0];

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      const intervalMs = Math.round(3000 / playbackSpeed);
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, steps.length]);

  const nodes = topology?.nodes || [
    { id: "api-gateway", name: "API Gateway", x: 400, y: 70 },
    { id: "order-service", name: "Order Service", x: 260, y: 190 },
    { id: "inventory-service", name: "Inventory Service", x: 540, y: 190 },
    { id: "payment-service", name: "Payment Service", x: 260, y: 330 },
    { id: "stock-db", name: "Stock Database", x: 540, y: 330 },
    { id: "payment-db", name: "Payment Database", x: 260, y: 460 }
  ];

  const edges = topology?.edges || [
    { source: "api-gateway", target: "order-service" },
    { source: "api-gateway", target: "inventory-service" },
    { source: "order-service", target: "payment-service" },
    { source: "inventory-service", target: "stock-db" },
    { source: "payment-service", target: "payment-db" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-tl-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-mono">
              <Film className="w-5 h-5 text-tl-cyan" />
              Incident Replay & Blast Propagation Studio
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-tl-elevated border border-tl-border text-slate-300 font-bold">
              STEP {currentStepIndex + 1} OF {steps.length}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Replay cascading microservice failures chronologically to inspect how latency and errors propagate upstream across dependencies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("sandbox")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tl-green/20 border border-tl-green/40 text-xs text-tl-green hover:bg-tl-green/30 transition font-mono font-medium"
          >
            <span>Jump to Recovery Sandbox</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Playback Controls & Scrubber */}
      <div className="bg-tl-card border border-tl-border rounded-xl p-4 backdrop-blur space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main Play / Step Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStepIndex(0)}
              className="p-2 rounded-lg bg-tl-bg border border-tl-border text-slate-300 hover:text-white transition"
              title="Reset to Start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentStepIndex((p) => Math.max(0, p - 1))}
              disabled={currentStepIndex === 0}
              className="p-2 rounded-lg bg-tl-bg border border-tl-border text-slate-300 hover:text-white disabled:opacity-40 transition"
              title="Step Backward"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded-lg bg-tl-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition flex items-center gap-1.5"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? "Pause Replay" : "Play Incident"}</span>
            </button>
            <button
              onClick={() => setCurrentStepIndex((p) => Math.min(steps.length - 1, p + 1))}
              disabled={currentStepIndex === steps.length - 1}
              className="p-2 rounded-lg bg-tl-bg border border-tl-border text-slate-300 hover:text-white disabled:opacity-40 transition"
              title="Step Forward"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400 text-[11px] uppercase">Speed:</span>
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                  playbackSpeed === spd
                    ? "bg-tl-violet text-white"
                    : "bg-tl-bg border border-tl-border text-slate-400 hover:text-slate-200"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Step Scrubber Bar */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {steps.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentStepIndex(idx);
                setIsPlaying(false);
              }}
              className={`p-2 rounded-lg border text-left font-mono transition ${
                currentStepIndex === idx
                  ? "bg-tl-cyan/15 border-tl-cyan text-tl-cyan"
                  : idx < currentStepIndex
                  ? "bg-tl-bg border-slate-700 text-slate-300"
                  : "bg-tl-bg/50 border-tl-border text-slate-500"
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold">STEP {idx + 1}</span>
                <span>{s.timestampOffset}</span>
              </div>
              <div className="text-[11px] font-bold truncate mt-0.5">{s.stageName}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Replay Visualization Canvas & Step Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Topology Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-tl-card border border-tl-border rounded-xl p-5 backdrop-blur flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-tl-border pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Server className="w-4 h-4 text-tl-cyan" />
              Dynamic Topology Snapshot &bull; {currentStep.timestampOffset}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-tl-elevated text-slate-300">
              {currentStep.stageName}
            </span>
          </div>

          {/* SVG Canvas */}
          <div className="relative w-full h-[380px] bg-tl-bg/90 rounded-xl border border-tl-border overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 800 520">
              {/* Edges */}
              {edges.map((e, idx) => {
                const sNode = nodes.find((n) => n.id === e.source);
                const tNode = nodes.find((n) => n.id === e.target);
                if (!sNode || !tNode) return null;

                const tStatus = currentStep.nodeStatuses[tNode.id]?.status || "HEALTHY";
                const isCrit = tStatus === "CRITICAL";
                const isWarn = tStatus === "WARNING";

                return (
                  <line
                    key={idx}
                    x1={sNode.x}
                    y1={sNode.y + 25}
                    x2={tNode.x}
                    y2={tNode.y - 25}
                    stroke={isCrit ? "#F43F5E" : isWarn ? "#F59E0B" : "#22D3EE"}
                    strokeWidth={isCrit ? "3" : "2"}
                    strokeDasharray={isCrit ? "5 4" : "none"}
                    opacity={isCrit ? 1 : 0.6}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => {
                const nodeData = currentStep.nodeStatuses[node.id] || { status: "HEALTHY", latency: 20, errorRate: 0 };
                const isCrit = nodeData.status === "CRITICAL";
                const isWarn = nodeData.status === "WARNING";

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x - 80}, ${node.y - 25})`}
                    className="transition-all duration-500"
                  >
                    <rect
                      width="160"
                      height="50"
                      rx="8"
                      className={`transition-colors duration-500 ${
                        isCrit
                          ? "fill-rose-950/90 stroke-tl-coral stroke-2"
                          : isWarn
                          ? "fill-amber-950/90 stroke-tl-amber stroke-2"
                          : "fill-tl-card stroke-tl-border stroke"
                      }`}
                    />
                    <text
                      x="12"
                      y="20"
                      className="fill-slate-100 font-bold text-xs font-mono"
                    >
                      {node.name}
                    </text>
                    <text
                      x="12"
                      y="37"
                      className={`text-[10px] font-mono ${
                        isCrit ? "fill-tl-coral font-bold" : isWarn ? "fill-tl-amber" : "fill-slate-400"
                      }`}
                    >
                      {nodeData.latency}ms &bull; {nodeData.errorRate}% err
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
            <span>Color coding updates live as cascade propagation spreads.</span>
            <span className="text-tl-cyan">Step {currentStepIndex + 1} / {steps.length}</span>
          </div>
        </div>

        {/* Step Details & Emitted Logs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Step Detail Card */}
          <div className="bg-tl-card border border-tl-border rounded-xl p-5 backdrop-blur space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-tl-cyan font-bold flex items-center justify-between">
              <span>Step Anatomy</span>
              <span>{currentStep.timestampOffset}</span>
            </div>

            <div className="text-base font-bold text-slate-100">
              {currentStep.stageName}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {currentStep.description}
            </p>
          </div>

          {/* Emitted Trace Logs at this Step */}
          <div className="bg-tl-card border border-tl-border rounded-xl p-5 backdrop-blur space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between border-b border-tl-border pb-2">
              <span>Captured Log Telemetry</span>
              <span className="text-[10px] text-slate-500">{currentStep.activeLogs.length} events</span>
            </div>

            <div className="space-y-2 font-mono text-[11px]">
              {currentStep.activeLogs.map((log, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-tl-bg border border-tl-border space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                      log.level === "ERROR"
                        ? "bg-rose-950 text-tl-coral border border-rose-800"
                        : log.level === "WARN"
                        ? "bg-amber-950 text-tl-amber border border-amber-800"
                        : "bg-slate-800 text-slate-300"
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-slate-400 font-bold">{log.service}</span>
                  </div>
                  <p className="text-slate-200">{log.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Jump Actions */}
          <div className="p-4 rounded-xl bg-tl-card border border-tl-border space-y-2">
            <button
              onClick={() => onNavigate("why_now")}
              className="w-full py-2 px-3 rounded-lg bg-tl-violet/20 hover:bg-tl-violet/30 border border-tl-violet/50 text-tl-violet text-xs font-mono font-bold transition flex items-center justify-center gap-1.5"
            >
              <span>Inspect Temporal Trigger (Why Now?)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
