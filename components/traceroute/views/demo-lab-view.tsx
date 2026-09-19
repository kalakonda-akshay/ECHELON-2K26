"use client";

import React, { useState, useEffect, useRef } from "react";
import { TraceRootAPI } from "../api";
import {
  Flame,
  Database,
  Clock,
  Skull,
  GitCommit,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Play,
  Pause,
  SkipForward,
  MonitorPlay,
  Radio,
  Sliders,
  Check
} from "lucide-react";

interface DemoLabViewProps {
  onScenarioInjected: () => void;
  onReset: () => void;
  onNavigate: (tab: string) => void;
}

export function DemoLabView({ onScenarioInjected, onReset, onNavigate }: DemoLabViewProps) {
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);

  // Auto Demo State
  const [autoDemoActive, setAutoDemoActive] = useState(false);
  const [autoDemoPaused, setAutoDemoPaused] = useState(false);
  const [demoStepIndex, setDemoStepIndex] = useState(0);
  const [countdown, setCountdown] = useState(6);

  const autoDemoSteps = [
    {
      id: "step-1",
      title: "1. Nominal Cluster Baseline",
      desc: "System is 100% healthy. All 6 services operating within nominal SLO thresholds.",
      tab: "overview",
      duration: 5,
      action: async () => {
        await TraceRootAPI.resetDemo();
      }
    },
    {
      id: "step-2",
      title: "2. Early Warning & Anomaly Inception",
      desc: "Injecting DATABASE_FAILURE. Database connection pool begins saturation before user-visible 502.",
      tab: "overview",
      duration: 6,
      action: async () => {
        await TraceRootAPI.injectScenario("DATABASE_FAILURE");
      }
    },
    {
      id: "step-3",
      title: "3. Cascade Propagation Over Time",
      desc: "Failure cascades upstream: payment-db -> payment-service timeout -> order-service -> gateway 502.",
      tab: "overview",
      duration: 6,
      action: async () => {}
    },
    {
      id: "step-4",
      title: "4. Adaptive Investigation (Uncertainty)",
      desc: "TraceRoot maintains competing hypotheses: Database 52% vs Payment 43% (EVIDENCE INSUFFICIENT).",
      tab: "adaptive",
      duration: 6,
      action: async () => {}
    },
    {
      id: "step-5",
      title: "5. Information-Gain Evidence Acquisition",
      desc: "Next Best Evidence triggered: acquiring HikariCP telemetry to eliminate ambiguity.",
      tab: "adaptive",
      duration: 6,
      action: async () => {
        await TraceRootAPI.acquireEvidence("DATABASE_FAILURE");
      }
    },
    {
      id: "step-6",
      title: "6. Causal Incident Graph",
      desc: "Event-level DAG generated: event by event timestamp and evidence correlation.",
      tab: "causal_graph",
      duration: 6,
      action: async () => {}
    },
    {
      id: "step-7",
      title: "7. Blast Radius Analysis",
      desc: "Reachability calculation: Root Cause, Currently Affected, and Potentially Exposed nodes.",
      tab: "blast_radius",
      duration: 6,
      action: async () => {}
    },
    {
      id: "step-8",
      title: "8. Recovery Sandbox Counterfactual Simulation",
      desc: "Simulating candidate pool reset in Digital Twin without touching live cluster.",
      tab: "sandbox",
      duration: 6,
      action: async () => {
        await TraceRootAPI.simulateRecovery("act-db-reset", "DATABASE_FAILURE");
      }
    },
    {
      id: "step-9",
      title: "9. Human Approval & Live Cluster Remediation",
      desc: "Operator approves recovery. Live simulator mutated and 5-gate probes executed.",
      tab: "sandbox",
      duration: 6,
      action: async () => {
        await TraceRootAPI.approveRecovery("act-db-reset");
      }
    },
    {
      id: "step-10",
      title: "10. Automated Verification Complete",
      desc: "All 5 post-recovery checks PASSED against baseline. Verdict: RECOVERY VERIFIED.",
      tab: "sandbox",
      duration: 6,
      action: async () => {
        await TraceRootAPI.verifyRecovery();
      }
    }
  ];

  // Auto demo timer tick
  useEffect(() => {
    if (!autoDemoActive || autoDemoPaused) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Advance step
          if (demoStepIndex < autoDemoSteps.length - 1) {
            const nextIdx = demoStepIndex + 1;
            setDemoStepIndex(nextIdx);
            const nextStep = autoDemoSteps[nextIdx];
            nextStep.action();
            onNavigate(nextStep.tab);
            return nextStep.duration;
          } else {
            // Finished
            setAutoDemoActive(false);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoDemoActive, autoDemoPaused, demoStepIndex]);

  async function startAutoDemo() {
    setAutoDemoActive(true);
    setAutoDemoPaused(false);
    setDemoStepIndex(0);
    setCountdown(autoDemoSteps[0].duration);
    await autoDemoSteps[0].action();
    onNavigate(autoDemoSteps[0].tab);
  }

  function stopAutoDemo() {
    setAutoDemoActive(false);
    setAutoDemoPaused(false);
    onReset();
  }

  async function handleInject(scenario: string, name: string) {
    setLoadingScenario(scenario);
    try {
      await TraceRootAPI.injectScenario(scenario);
      setActiveMessage(`Successfully injected: ${name}. Watch the cascade detection and investigation progress!`);
      onScenarioInjected();
    } catch (err: any) {
      setActiveMessage(`Error injecting: ${err.message}`);
    } finally {
      setLoadingScenario(null);
    }
  }

  const currentDemoStep = autoDemoSteps[demoStepIndex];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-orange-950/60 border-2 border-amber-500/80 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400">
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold uppercase tracking-wider">
                Hackathon Live Demonstration Control Room
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                Microservice Chaos & Failure Injection Lab
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Inject deterministic failure scenarios or run the automated hands-free presentation player for judging.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!autoDemoActive ? (
              <button
                onClick={startAutoDemo}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-orange-950/40"
              >
                <MonitorPlay className="w-4 h-4" />
                <span>Launch Auto Demo Presentation</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoDemoPaused(!autoDemoPaused)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                >
                  {autoDemoPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{autoDemoPaused ? "Resume" : "Pause"}</span>
                </button>
                <button
                  onClick={stopAutoDemo}
                  className="px-3 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-rose-800"
                >
                  Stop Auto Demo
                </button>
              </div>
            )}

            <button
              onClick={onReset}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 transition border border-slate-700 whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Auto Demo Active Progress Bar */}
        {autoDemoActive && (
          <div className="mt-5 p-4 rounded-xl bg-slate-950 border border-amber-500/60 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-amber-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                AUTO DEMO STEP {demoStepIndex + 1} / {autoDemoSteps.length}: {currentDemoStep.title}
              </span>
              <span className="text-slate-400">
                Next transition in: <strong className="text-white">{countdown}s</strong>
              </span>
            </div>

            <p className="text-xs text-slate-300 font-sans">{currentDemoStep.desc}</p>

            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-400 h-full transition-all duration-300"
                style={{ width: `${((demoStepIndex + 1) / autoDemoSteps.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {activeMessage && !autoDemoActive && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950/90 border border-amber-500/50 text-xs font-mono text-amber-300 flex items-center justify-between">
            <span>{activeMessage}</span>
            <button
              onClick={() => onNavigate("investigation")}
              className="px-3 py-1 rounded bg-amber-500 text-slate-950 font-bold text-[11px] hover:bg-amber-400 transition"
            >
              Inspect Adaptive Steps &rarr;
            </button>
          </div>
        )}
      </div>

      {/* 4 Interactive Deterministic Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scenario 1: Database Failure */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  1. Database Connection Failure
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-900">
                P0 &bull; Critical
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              PostgreSQL connection pool max_connections (150/150) exhausted. Cascades upward: Payment Service connection timeout &rarr; Order Service RPC timeout &rarr; Gateway 502 Bad Gateway.
            </p>
            <div className="font-mono text-[11px] text-slate-400 space-y-1 pt-1">
              <div>&bull; Initiator: <code className="text-rose-300">payment-db</code></div>
              <div>&bull; Ingress Symptom: <code className="text-amber-300">HTTP 502 Bad Gateway</code></div>
              <div>&bull; Playbook: Reset connection pool &amp; terminate idle sockets</div>
            </div>
          </div>

          <button
            onClick={() => handleInject("DATABASE_FAILURE", "Database Connection Failure")}
            disabled={loadingScenario !== null}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Inject Database Failure</span>
          </button>
        </div>

        {/* Scenario 2: Payment Latency */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  2. Payment Service Latency Spike
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-900">
                P1 &bull; Degraded
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Stop-the-world JVM G1GC evacuation pause locks worker threads for 3800ms. Database remains healthy. Order Service retries cascade into Gateway 504.
            </p>
            <div className="font-mono text-[11px] text-slate-400 space-y-1 pt-1">
              <div>&bull; Initiator: <code className="text-amber-300">payment-service</code></div>
              <div>&bull; Ingress Symptom: <code className="text-amber-300">HTTP 504 Gateway Timeout</code></div>
              <div>&bull; Playbook: Pod rolling restart &amp; JVM heap clear</div>
            </div>
          </div>

          <button
            onClick={() => handleInject("PAYMENT_LATENCY", "Payment Latency Spike")}
            disabled={loadingScenario !== null}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Inject Payment Latency Spike</span>
          </button>
        </div>

        {/* Scenario 3: Inventory Crash */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                  <Skull className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  3. Inventory Service OOM Crash
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-900">
                P0 &bull; Critical Down
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Container exceeds 512Mi memory limit. Linux kernel invokes OOM killer (Exit 137). Order Service gets ECONNREFUSED. Gateway returns 503 for checkout.
            </p>
            <div className="font-mono text-[11px] text-slate-400 space-y-1 pt-1">
              <div>&bull; Initiator: <code className="text-red-300">inventory-service</code></div>
              <div>&bull; Ingress Symptom: <code className="text-amber-300">HTTP 503 Service Unavailable</code></div>
              <div>&bull; Playbook: Recreate container &amp; bump memory ceiling to 1.5Gi</div>
            </div>
          </div>

          <button
            onClick={() => handleInject("INVENTORY_CRASH", "Inventory Service Crash")}
            disabled={loadingScenario !== null}
            className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Inject Inventory Service Crash</span>
          </button>
        </div>

        {/* Scenario 4: Bad Deployment */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                  <GitCommit className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  4. Bad Deployment Regression
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-900">
                P1 &bull; CI/CD Regression
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Release v2.4.1 (commit a8f3b9c) introduced an unindexed sequential scan SQL loop in Payment Service. Database locks trigger Gateway 500 error flood.
            </p>
            <div className="font-mono text-[11px] text-slate-400 space-y-1 pt-1">
              <div>&bull; Correlated Commit: <code className="text-purple-300">a8f3b9c (v2.4.1)</code></div>
              <div>&bull; Ingress Symptom: <code className="text-amber-300">HTTP 500 Internal Server Error</code></div>
              <div>&bull; Playbook: Automated Git rollback to v2.4.0 (commit e4d120a)</div>
            </div>
          </div>

          <button
            onClick={() => handleInject("BAD_DEPLOYMENT", "Bad Deployment Regression")}
            disabled={loadingScenario !== null}
            className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Inject Bad Deployment Regression</span>
          </button>
        </div>
      </div>
    </div>
  );
}
