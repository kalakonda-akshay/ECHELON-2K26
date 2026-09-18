"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  SystemStatus,
  TopologyData,
  TelemetryData,
  Diagnosis,
  EarlyWarningData,
  InvestigationStep,
  RecoveryPlan,
  AdaptiveAnalysis
} from "./types";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  ExternalLink,
  FastForward,
  FileCode,
  FileText,
  Flame,
  GitCommit,
  Info,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap
} from "lucide-react";

export interface StoryEvent {
  id: string;
  timestamp: string;
  service: string;
  serviceName: string;
  category: "HEALTHY" | "ANOMALY" | "DEGRADATION" | "FAILURE" | "IMPACT" | "INVESTIGATION" | "RECOVERY" | "VERIFICATION";
  priority: "P0" | "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
  title: string;
  description: string;
  metricBefore?: string;
  metricAfter?: string;
  metricLabel?: string;
  evidenceType?: string;
  rawEvidence?: string;
  chapterIndex: number;
  timeDeltaText?: string;
}

export interface StoryChapter {
  id: string;
  number: string;
  name: string;
  description: string;
}

const STORY_CHAPTERS: StoryChapter[] = [
  { id: "signal", number: "01", name: "FIRST SIGNAL", description: "Initial telemetry deviation" },
  { id: "cascade", number: "02", name: "CASCADE BEGINS", description: "Delay propagates upstream" },
  { id: "failure", number: "03", name: "SERVICE FAILURE", description: "Dependency timeout / error" },
  { id: "impact", number: "04", name: "CUSTOMER IMPACT", description: "Edge gateway response 5xx" },
  { id: "investigation", number: "05", name: "INVESTIGATION", description: "Evidence engine triage" },
  { id: "recovery", number: "06", name: "RECOVERY", description: "SafeOps mitigation applied" },
  { id: "verification", number: "07", name: "VERIFICATION", description: "System health restored" }
];

interface LiveIncidentStoryProps {
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

export function LiveIncidentStory({
  status,
  topology,
  telemetry,
  diagnosis,
  earlyWarning,
  investigationSteps = [],
  recoveryPlan,
  adaptiveData,
  isPresentationMode = false,
  onNavigate
}: LiveIncidentStoryProps) {
  const [expandedRawId, setExpandedRawId] = useState<string | null>(null);
  const [replayActive, setReplayActive] = useState<boolean>(false);
  const [replayStep, setReplayStep] = useState<number>(0);
  const [replaySpeed, setReplaySpeed] = useState<1 | 2>(1);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const timelineEndRef = useRef<HTMLDivElement>(null);

  const isIncident = Boolean(status?.active_scenario);
  const scenario = status?.active_scenario?.toUpperCase() || null;
  const isRecovering = Boolean(status?.is_recovering);
  const isResolved = !isIncident && Boolean(status?.resolved_incident);

  // Derive Current Lifecycle State for the Header Badge
  const storyState = useMemo(() => {
    if (isRecovering) return { label: "RECOVERING", color: "bg-tl-cyan text-slate-950 border-cyan-400" };
    if (isResolved) return { label: "RESOLVED", color: "bg-emerald-950 text-tl-green border-emerald-800" };
    if (!isIncident) {
      if (earlyWarning?.has_early_warning) return { label: "DEGRADATION DETECTED", color: "bg-amber-950 text-tl-amber border-amber-800" };
      return { label: "NORMAL", color: "bg-emerald-950/80 text-tl-green border-emerald-800" };
    }
    // In Incident
    if (status?.cascade_stage?.toLowerCase().includes("customer") || (status?.cluster_max_error_rate_pct || 0) > 10) {
      return { label: "CUSTOMER IMPACT", color: "bg-rose-950 text-tl-coral border-rose-800 animate-pulse" };
    }
    if (diagnosis?.confidence_score && diagnosis.confidence_score >= 80) {
      return { label: "ROOT CAUSE IDENTIFIED", color: "bg-purple-950 text-tl-violet border-purple-800" };
    }
    if (investigationSteps.length > 0) {
      return { label: "INVESTIGATING", color: "bg-purple-950 text-tl-violet border-purple-800" };
    }
    return { label: "INCIDENT DEVELOPING", color: "bg-amber-950 text-tl-amber border-amber-800" };
  }, [isIncident, isRecovering, isResolved, status, diagnosis, investigationSteps, earlyWarning]);

  // Construct Chronological Story Events based on ACTUAL scenario and telemetry
  const allEvents: StoryEvent[] = useMemo(() => {
    const baseTime = "20:41:";
    const sec = (n: number) => `${baseTime}${n < 10 ? "0" + n : n}`;

    // -------------------------------------------------------------
    // 1. HEALTHY BASELINE SCENARIO (No Incident Active)
    // -------------------------------------------------------------
    if (!isIncident) {
      return [
        {
          id: "h1",
          timestamp: sec(2),
          service: "api-gateway",
          serviceName: "API Gateway",
          category: "HEALTHY",
          priority: "P6",
          title: "API Gateway Request Received",
          description: "Edge proxy accepted inbound customer traffic. TLS handshake & route resolution nominal.",
          metricLabel: "Hop Latency",
          metricBefore: "14 ms",
          metricAfter: "18 ms",
          evidenceType: "Gateway Ingress Access Log",
          rawEvidence: 'GET /api/v1/checkout HTTP/2 200 OK - client: 192.168.1.104 time: 0.018s',
          chapterIndex: 0,
          timeDeltaText: "+18 ms"
        },
        {
          id: "h2",
          timestamp: sec(8),
          service: "order-service",
          serviceName: "Order Service",
          category: "HEALTHY",
          priority: "P6",
          title: "Order Request Completed",
          description: "Cart items validated, checkout transaction registered in order state machine.",
          metricLabel: "Execution Time",
          metricBefore: "22 ms",
          metricAfter: "24 ms",
          evidenceType: "OpenTelemetry Distributed Span",
          rawEvidence: 'span_id: ord-901 span_name: "order.checkout_saga" status: OK duration_ms: 24',
          chapterIndex: 0,
          timeDeltaText: "+24 ms"
        },
        {
          id: "h3",
          timestamp: sec(15),
          service: "payment-service",
          serviceName: "Payment Service",
          category: "HEALTHY",
          priority: "P6",
          title: "Payment Completed Successfully",
          description: "Tokenized payment authorization approved with zero retry loops.",
          metricLabel: "gRPC Call Latency",
          metricBefore: "28 ms",
          metricAfter: "29 ms",
          evidenceType: "Payment Service Ledger Trace",
          rawEvidence: 'POST /v1/charge - status: 200 AUTHORIZED token: tok_visa_4242 latency: 29ms',
          chapterIndex: 0,
          timeDeltaText: "+29 ms"
        },
        {
          id: "h4",
          timestamp: sec(21),
          service: "payment-db",
          serviceName: "Payment Database",
          category: "HEALTHY",
          priority: "P6",
          title: "Database Responded Within Baseline",
          description: "ACID commit written to primary database table. HikariCP connection pool healthy.",
          metricLabel: "Query Latency",
          metricBefore: "3.8 ms",
          metricAfter: "4.0 ms",
          evidenceType: "HikariCP Connection Pool",
          rawEvidence: 'HikariPool-1 - Active: 2/10, Idle: 8, Waiting: 0. Query: COMMIT; 4ms',
          chapterIndex: 0
        }
      ];
    }

    // -------------------------------------------------------------
    // 2. ACTIVE INCIDENT SCENARIOS
    // -------------------------------------------------------------
    const events: StoryEvent[] = [];

    // Scenario A: DATABASE_FAILURE / DB_POOL_EXHAUSTION
    if (scenario?.includes("DATA") || scenario?.includes("DB")) {
      events.push({
        id: "db-1",
        timestamp: sec(1),
        service: "payment-db",
        serviceName: "Payment Database",
        category: "ANOMALY",
        priority: "P2",
        title: "DATABASE BEGINS DEGRADING",
        description: "Response latency moved outside normal range. Connection slots rapidly filling up under load.",
        metricLabel: "Query Latency",
        metricBefore: "4.0 ms",
        metricAfter: "3,200 ms",
        evidenceType: "HikariCP Connection Pool Saturation",
        rawEvidence: "FATAL: remaining connection slots reserved for non-replication superuser connections (max_connections=150 exhausted)",
        chapterIndex: 0,
        timeDeltaText: "+3 seconds"
      });

      events.push({
        id: "db-2",
        timestamp: sec(4),
        service: "payment-service",
        serviceName: "Payment Service",
        category: "DEGRADATION",
        priority: "P3",
        title: "PAYMENT IS WAITING",
        description: "Payment worker threads are waiting longer for Database responses as the pool starves.",
        metricLabel: "Service Latency",
        metricBefore: "32 ms",
        metricAfter: "2,800 ms",
        evidenceType: "Distributed Trace Waterfall",
        rawEvidence: "ConnectionPoolTimeoutException: Timeout waiting for idle connection from HikariPool after 30000ms",
        chapterIndex: 1,
        timeDeltaText: "TIMEOUT"
      });

      events.push({
        id: "db-3",
        timestamp: sec(7),
        service: "payment-service",
        serviceName: "Payment Service",
        category: "FAILURE",
        priority: "P1",
        title: "PAYMENT REQUEST FAILED",
        description: "Database dependency did not respond within configured 5,000ms timeout threshold.",
        metricLabel: "Error Rate",
        metricBefore: "0.0%",
        metricAfter: "94.2%",
        evidenceType: "OpenTelemetry Span Error Status",
        rawEvidence: "gRPC StatusCode.DEADLINE_EXCEEDED: /v1/charge timed out waiting for downstream postgres:5432",
        chapterIndex: 2,
        timeDeltaText: "+2 seconds"
      });

      events.push({
        id: "db-4",
        timestamp: sec(9),
        service: "order-service",
        serviceName: "Order Service",
        category: "FAILURE",
        priority: "P1",
        title: "ORDER CANNOT COMPLETE",
        description: "Order Service cannot complete checkout orchestration because Payment Service rejected the charge.",
        metricLabel: "Order Error Rate",
        metricBefore: "0.0%",
        metricAfter: "78.6%",
        evidenceType: "Circuit Breaker Tripped Event",
        rawEvidence: "PaymentGatewayTimeout: POST http://payment-service:3002/v1/charge timed out after 2000ms. Retry 3/3 exhausted.",
        chapterIndex: 2,
        timeDeltaText: "+2 seconds"
      });

      events.push({
        id: "db-5",
        timestamp: sec(11),
        service: "api-gateway",
        serviceName: "API Gateway",
        category: "IMPACT",
        priority: "P0",
        title: "CUSTOMER IMPACT: 502 BAD GATEWAY",
        description: "Public API Gateway returned 502 Bad Gateway to shoppers attempting to checkout.",
        metricLabel: "Cluster Error Rate",
        metricBefore: "0.0%",
        metricAfter: `${status?.cluster_max_error_rate_pct || 48.2}%`,
        evidenceType: "Ingress HTTP Gateway Access Log",
        rawEvidence: "HTTP 502 Bad Gateway - Upstream order-service returned 504 Gateway Timeout on /api/v1/orders",
        chapterIndex: 3,
        timeDeltaText: "+1 second"
      });
    }

    // Scenario B: PAYMENT_LATENCY
    else if (scenario?.includes("PAYMENT") || scenario?.includes("LATENCY")) {
      events.push({
        id: "pay-1",
        timestamp: sec(2),
        service: "payment-service",
        serviceName: "Payment Service",
        category: "ANOMALY",
        priority: "P2",
        title: "PAYMENT PROCESSOR DEGRADATION",
        description: "Downstream external payment gateway authorization latency jumped 15x over nominal SLA.",
        metricLabel: "P95 Latency",
        metricBefore: "32 ms",
        metricAfter: "2,400 ms",
        evidenceType: "Egress HTTP Client Telemetry",
        rawEvidence: "WARN: payment gateway response delayed. p95=2400ms exceeding 500ms target",
        chapterIndex: 0,
        timeDeltaText: "+3 seconds"
      });

      events.push({
        id: "pay-2",
        timestamp: sec(5),
        service: "order-service",
        serviceName: "Order Service",
        category: "DEGRADATION",
        priority: "P3",
        title: "ORDER WORKERS QUEUED",
        description: "Order Service worker pool saturated waiting for payment authorization callbacks.",
        metricLabel: "Order Queue Depth",
        metricBefore: "2 items",
        metricAfter: "148 items",
        evidenceType: "JVM Worker Pool Metrics",
        rawEvidence: "ThreadPoolExecutor: active=50, max=50, queue=148. Downstream payment blocking worker threads",
        chapterIndex: 1,
        timeDeltaText: "TIMEOUT"
      });

      events.push({
        id: "pay-3",
        timestamp: sec(8),
        service: "order-service",
        serviceName: "Order Service",
        category: "FAILURE",
        priority: "P1",
        title: "CHECKOUT TIMEOUT CASCADE",
        description: "Checkout requests began timing out after 3,000ms SLA breach on authorization.",
        metricLabel: "Error Rate",
        metricBefore: "0.0%",
        metricAfter: "62.5%",
        evidenceType: "Distributed Trace Waterfall",
        rawEvidence: "TimeoutException: Order checkout step timed out after 3000ms waiting for Payment Service",
        chapterIndex: 2,
        timeDeltaText: "+2 seconds"
      });

      events.push({
        id: "pay-4",
        timestamp: sec(10),
        service: "api-gateway",
        serviceName: "API Gateway",
        category: "IMPACT",
        priority: "P0",
        title: "CUSTOMER LATENCY & 504 TIMEOUTS",
        description: "Customer checkout attempts hung for 3+ seconds before dropping with 504 Gateway Timeout.",
        metricLabel: "P95 Latency",
        metricBefore: "18 ms",
        metricAfter: "3,100 ms",
        evidenceType: "Edge Gateway Status Codes",
        rawEvidence: "HTTP 504 Gateway Timeout - client aborted or timeout reached on POST /api/checkout",
        chapterIndex: 3,
        timeDeltaText: "+1 second"
      });
    }

    // Scenario C: INVENTORY_CRASH
    else if (scenario?.includes("INVENTORY") || scenario?.includes("CRASH")) {
      events.push({
        id: "inv-1",
        timestamp: sec(1),
        service: "inventory-service",
        serviceName: "Inventory Service",
        category: "FAILURE",
        priority: "P1",
        title: "INVENTORY SERVICE PROCESS TERMINATED",
        description: "Container process exited abruptly with exit code 137 (OOMKilled) during SKU reconciliation.",
        metricLabel: "Pod Replicas",
        metricBefore: "3/3 Healthy",
        metricAfter: "0/3 Ready",
        evidenceType: "Kubernetes Pod Lifecycle Event",
        rawEvidence: "Pod inventory-service-7f4c9 killed: Exit Code 137 (OOMKilled) - Memory limit 512Mi exceeded",
        chapterIndex: 0,
        timeDeltaText: "+1 second"
      });

      events.push({
        id: "inv-2",
        timestamp: sec(2),
        service: "order-service",
        serviceName: "Order Service",
        category: "DEGRADATION",
        priority: "P3",
        title: "STOCK RESERVATION CALLS REFUSED",
        description: "Order Service cannot verify item stock. TCP connection actively refused on port 3003.",
        metricLabel: "Connection Drop Rate",
        metricBefore: "0.0%",
        metricAfter: "100%",
        evidenceType: "TCP Socket Log (ECONNREFUSED)",
        rawEvidence: "connect ECONNREFUSED 10.244.2.19:3003 (inventory-service)",
        chapterIndex: 1,
        timeDeltaText: "IMMEDIATE"
      });

      events.push({
        id: "inv-3",
        timestamp: sec(4),
        service: "order-service",
        serviceName: "Order Service",
        category: "FAILURE",
        priority: "P1",
        title: "ORDER INVENTORY CHECK FAILED",
        description: "Inventory route marked UNHEALTHY. Circuit breaker opened to prevent hanging sockets.",
        metricLabel: "Failed Checkout Rate",
        metricBefore: "0.0%",
        metricAfter: "84.0%",
        evidenceType: "Circuit Breaker State Transition",
        rawEvidence: "CircuitBreaker [inventory-route] tripped from CLOSED to OPEN after 10 consecutive failures",
        chapterIndex: 2,
        timeDeltaText: "+2 seconds"
      });

      events.push({
        id: "inv-4",
        timestamp: sec(6),
        service: "api-gateway",
        serviceName: "API Gateway",
        category: "IMPACT",
        priority: "P0",
        title: "CUSTOMER IMPACT: 500 INTERNAL ERROR",
        description: "Shoppers cannot complete purchases because warehouse stock reservation failed.",
        metricLabel: "Customer Error Rate",
        metricBefore: "0.0%",
        metricAfter: "44.0%",
        evidenceType: "Gateway HTTP Status Aggregation",
        rawEvidence: "HTTP 500 Internal Server Error - Order failed: Inventory allocation unavailable",
        chapterIndex: 3,
        timeDeltaText: "+1 second"
      });
    }

    // Scenario D: BAD_DEPLOYMENT
    else {
      events.push({
        id: "dep-1",
        timestamp: sec(1),
        service: "order-service",
        serviceName: "Order Service",
        category: "ANOMALY",
        priority: "P4",
        title: "NEW DEPLOYMENT RELEASED (v2.4.1)",
        description: "Release commit a8f3b9c deployed to Order Service 3 minutes prior to initial deviation.",
        metricLabel: "Release Version",
        metricBefore: "v2.4.0",
        metricAfter: "v2.4.1",
        evidenceType: "CI/CD Deployment Manifest",
        rawEvidence: "DeployEvent: order-service:v2.4.1 (commit a8f3b9c) rollout completed by automated pipeline",
        chapterIndex: 0,
        timeDeltaText: "+3 minutes"
      });

      events.push({
        id: "dep-2",
        timestamp: sec(4),
        service: "order-service",
        serviceName: "Order Service",
        category: "DEGRADATION",
        priority: "P2",
        title: "ORDER SERVICE CPU & MEMORY SPIKE",
        description: "Garbage collection stop-the-world pauses introduced by unoptimized regex in v2.4.1.",
        metricLabel: "CPU Utilization",
        metricBefore: "31.0%",
        metricAfter: "89.5%",
        evidenceType: "Process Resource Telemetry",
        rawEvidence: "WARN: event loop lag 1,420ms exceeding threshold 50ms; GC pause 840ms",
        chapterIndex: 1,
        timeDeltaText: "+3 seconds"
      });

      events.push({
        id: "dep-3",
        timestamp: sec(7),
        service: "order-service",
        serviceName: "Order Service",
        category: "FAILURE",
        priority: "P1",
        title: "EVENT LOOP SATURATION",
        description: "Order Service worker process stopped processing inbound requests in timely manner.",
        metricLabel: "P95 Latency",
        metricBefore: "24 ms",
        metricAfter: "1,950 ms",
        evidenceType: "Distributed Trace Waterfall",
        rawEvidence: "HTTP 503 Service Unavailable - Order queue full, socket hangup after 2500ms",
        chapterIndex: 2,
        timeDeltaText: "+2 seconds"
      });

      events.push({
        id: "dep-4",
        timestamp: sec(9),
        service: "api-gateway",
        serviceName: "API Gateway",
        category: "IMPACT",
        priority: "P0",
        title: "CUSTOMER IMPACT: 503 SERVICE UNAVAILABLE",
        description: "Gateway dropped upstream checkout connections due to unresponsive backend pods.",
        metricLabel: "Error Rate",
        metricBefore: "0.0%",
        metricAfter: "52.0%",
        evidenceType: "Gateway Access Logs",
        rawEvidence: "HTTP 503 Service Unavailable on POST /orders (upstream backend overloaded)",
        chapterIndex: 3,
        timeDeltaText: "+1 second"
      });
    }

    // -------------------------------------------------------------
    // 3. INVESTIGATION CHAPTER (TraceRoute Adaptive Evidence Engine)
    // -------------------------------------------------------------
    events.push({
      id: "inv-step-1",
      timestamp: sec(12),
      service: "control-plane",
      serviceName: "TraceRoute AI",
      category: "INVESTIGATION",
      priority: "P5",
      title: "TRACEROUTE OPENED INVESTIGATION",
      description: `Customer symptom detected: ${diagnosis?.incident?.symptom || "502 Bad Gateway"}. Autonomous evidence collector dispatched.`,
      metricLabel: "Telemetry Stream",
      metricBefore: "Monitoring",
      metricAfter: "Tracing Active",
      evidenceType: "TraceRoute Adaptive Evidence Engine",
      rawEvidence: "Adaptive investigation triggered on P0 customer error spike. Inspecting critical path topology.",
      chapterIndex: 4,
      timeDeltaText: "+2 seconds"
    });

    events.push({
      id: "inv-step-2",
      timestamp: sec(15),
      service: "control-plane",
      serviceName: "TraceRoute AI",
      category: "INVESTIGATION",
      priority: "P5",
      title: "ROOT-CAUSE EVIDENCE CORRELATED",
      description: `First abnormal signal pinned to ${diagnosis?.initiating_service_name || "Payment Database"}. Confidence score reached ${diagnosis?.confidence_score || 94}%.`,
      metricLabel: "Confidence Score",
      metricBefore: "0%",
      metricAfter: `${diagnosis?.confidence_score || 94}%`,
      evidenceType: "Bayesian Topological Causal Graph",
      rawEvidence: `Root cause verdict: ${diagnosis?.initiating_service_name || "Payment Database"} is responsible for cascading failure. Depth=2, correlation=0.98.`,
      chapterIndex: 4,
      timeDeltaText: "+3 seconds"
    });

    // -------------------------------------------------------------
    // 4. RECOVERY & SAFEOPS CHAPTER
    // -------------------------------------------------------------
    if (recoveryPlan || isRecovering || isResolved) {
      events.push({
        id: "rec-1",
        timestamp: sec(20),
        service: "sandbox",
        serviceName: "SafeOps Sandbox",
        category: "RECOVERY",
        priority: "P5",
        title: "SAFEOPS MITIGATION SIMULATED",
        description: `Action: ${recoveryPlan?.action_name || "Scale Database Pool / Rollback Release"}. Digital twin predicted 100% service recovery.`,
        metricLabel: "Projected Recovery",
        metricBefore: "0% Health",
        metricAfter: "100% Health",
        evidenceType: "SafeOps Digital Twin Simulation",
        rawEvidence: "Sandbox execution verified: zero side effects detected. Projected recovery duration: 8 seconds.",
        chapterIndex: 5,
        timeDeltaText: "+5 seconds"
      });

      events.push({
        id: "rec-2",
        timestamp: sec(25),
        service: "control-plane",
        serviceName: "Cluster Controller",
        category: "RECOVERY",
        priority: "P5",
        title: "ENGINEER APPROVED RECOVERY APPLIED",
        description: "Remediation command safely dispatched to Kubernetes cluster control plane.",
        metricLabel: "Execution State",
        metricBefore: "Pending Approval",
        metricAfter: "Applied",
        evidenceType: "Audit Log & Kubernetes API",
        rawEvidence: "Recovery action dispatched with authorization oncall-sre@acme.corp. Awaiting pod convergence.",
        chapterIndex: 5,
        timeDeltaText: "+4 seconds"
      });
    }

    // -------------------------------------------------------------
    // 5. VERIFICATION CHAPTER
    // -------------------------------------------------------------
    if (isRecovering || isResolved) {
      events.push({
        id: "ver-1",
        timestamp: sec(31),
        service: "cluster-fleet",
        serviceName: "Cluster Fleet",
        category: "VERIFICATION",
        priority: "P5",
        title: "SYSTEM HEALTH RESTORATION VERIFIED",
        description: "All 6 microservices reporting nominal latency and zero dropped packets. Verification test suite PASSED.",
        metricLabel: "Cluster Health",
        metricBefore: "CRITICAL",
        metricAfter: "100% HEALTHY",
        evidenceType: "Automated Post-Recovery Health Checks",
        rawEvidence: "Verification completed: 6/6 services healthy. Error rate 0.0%, P95 latency 16.5ms. Incident closed.",
        chapterIndex: 6
      });
    }

    return events;
  }, [isIncident, scenario, isRecovering, isResolved, status, diagnosis, recoveryPlan, earlyWarning]);

  // Determine current active chapter index
  const activeChapterIndex = useMemo(() => {
    if (!isIncident) return 0;
    if (isResolved) return 6;
    if (isRecovering) return 5;
    if (diagnosis?.confidence_score && diagnosis.confidence_score >= 80) return 4;
    if ((status?.cluster_max_error_rate_pct || 0) > 10) return 3;
    if (status?.unhealthy_services_count && status.unhealthy_services_count > 1) return 2;
    return 1;
  }, [isIncident, isResolved, isRecovering, diagnosis, status]);

  // Visible events: filtered by selected chapter if any, or sliced during replay
  const visibleEvents = useMemo(() => {
    let list = allEvents;
    if (replayActive) {
      list = allEvents.slice(0, Math.min(replayStep + 1, allEvents.length));
    } else if (selectedChapter !== null) {
      list = allEvents.filter((e) => e.chapterIndex === selectedChapter);
    }
    return list;
  }, [allEvents, replayActive, replayStep, selectedChapter]);

  // Replay playback timer
  useEffect(() => {
    if (!replayActive) return;
    const intervalMs = replaySpeed === 2 ? 800 : 1600;
    const timer = setInterval(() => {
      setReplayStep((prev) => {
        if (prev >= allEvents.length - 1) {
          setReplayActive(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [replayActive, replaySpeed, allEvents.length]);

  function handleStartReplay() {
    setReplayStep(0);
    setReplayActive(true);
    setSelectedChapter(null);
  }

  function handleTogglePause() {
    setReplayActive((prev) => !prev);
  }

  function handleResetReplay() {
    setReplayActive(false);
    setReplayStep(allEvents.length - 1);
    setSelectedChapter(null);
  }

  return (
    <div className="bg-tl-card border border-tl-border rounded-xl p-4 sm:p-5 backdrop-blur flex flex-col justify-between space-y-4 shadow-sm">
      {/* 1. Header: Title, Subtitle, Semantic State Badge & Replay Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tl-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-tl-cyan/10 border border-tl-cyan/30 flex items-center justify-center text-tl-cyan">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              LIVE INCIDENT STORY
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${storyState.color}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {storyState.label}
              </span>
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Real-time reconstruction of system behavior &bull;{" "}
            <span className="text-slate-300 italic">
              &ldquo;From the first abnormal signal to customer impact &mdash; reconstructed live.&rdquo;
            </span>
          </p>
        </div>

        {/* Replay and Fast-Forward Controls */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          {isIncident || isResolved ? (
            <div className="flex items-center p-1 bg-tl-bg rounded-lg border border-tl-border gap-1">
              <button
                onClick={handleStartReplay}
                className="p-1.5 rounded hover:bg-tl-elevated text-slate-300 hover:text-tl-cyan transition"
                title="Restart Replay from Beginning"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleTogglePause}
                className="px-2 py-1 rounded bg-tl-elevated text-tl-cyan font-bold hover:bg-slate-700 transition flex items-center gap-1"
                title={replayActive ? "Pause Replay" : "Play Incident Replay"}
              >
                {replayActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{replayActive ? "Pause" : "Replay"}</span>
              </button>
              <button
                onClick={() => setReplaySpeed((s) => (s === 1 ? 2 : 1))}
                className="px-1.5 py-0.5 rounded text-[10px] bg-tl-card text-slate-400 hover:text-slate-200"
                title="Toggle Replay Speed"
              >
                {replaySpeed}x
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-tl-green" />
              Continuous Surveillance Active
            </span>
          )}
        </div>
      </div>

      {/* 2. Story Chapters Progression Ribbon (Interactive Stepper) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none font-mono">
        {STORY_CHAPTERS.map((ch, idx) => {
          const isPast = idx < activeChapterIndex;
          const isCurrent = idx === activeChapterIndex;
          const isSelected = selectedChapter === idx;

          return (
            <button
              key={ch.id}
              onClick={() => setSelectedChapter(selectedChapter === idx ? null : idx)}
              className={`flex-1 min-w-[100px] px-2.5 py-1.5 rounded-lg border text-left transition-all duration-200 ${
                isSelected
                  ? "bg-tl-elevated border-tl-cyan ring-1 ring-tl-cyan/40 shadow-sm"
                  : isCurrent
                  ? "bg-tl-card border-tl-cyan/60 text-slate-100"
                  : isPast
                  ? "bg-tl-bg/80 border-tl-border/80 text-slate-300"
                  : "bg-tl-bg/40 border-tl-border/40 text-slate-500 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between text-[9px]">
                <span className={isCurrent ? "text-tl-cyan font-bold" : "text-slate-400 font-semibold"}>
                  {ch.number}
                </span>
                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-tl-cyan animate-pulse" />}
              </div>
              <div className="text-[10px] font-bold truncate mt-0.5">{ch.name}</div>
            </button>
          );
        })}
      </div>

      {/* 3. Main Narrative Chronological Flow Container */}
      <div className="relative min-h-[380px] max-h-[460px] overflow-y-auto pr-2 space-y-4 font-mono select-none">
        {/* Vertical Center-Left Timeline Guide Wire */}
        <div className="absolute top-4 bottom-4 left-[21px] w-0.5 bg-gradient-to-b from-tl-cyan/40 via-tl-violet/40 to-tl-border pointer-events-none" />

        {/* Render Chronological Event Cards */}
        {visibleEvents.map((evt, idx) => {
          const isLast = idx === visibleEvents.length - 1;
          const isRawExpanded = expandedRawId === evt.id;

          // Color & Icon semantic assignments
          let icon = <CheckCircle2 className="w-3.5 h-3.5 text-tl-green" />;
          let dotColor = "border-tl-green bg-emerald-950 text-tl-green";
          let borderHighlight = "border-tl-border hover:border-tl-cyan/40";
          let badgeColor = "bg-emerald-950 text-tl-green border-emerald-800";

          if (evt.category === "IMPACT") {
            icon = <AlertOctagon className="w-3.5 h-3.5 text-tl-coral" />;
            dotColor = "border-tl-coral bg-rose-950 text-tl-coral ring-2 ring-tl-coral/30";
            borderHighlight = "border-tl-coral/60 bg-rose-950/20";
            badgeColor = "bg-rose-950 text-tl-coral border-rose-800";
          } else if (evt.category === "FAILURE") {
            icon = <Flame className="w-3.5 h-3.5 text-tl-coral" />;
            dotColor = "border-tl-coral bg-rose-950 text-tl-coral";
            borderHighlight = "border-tl-coral/40 bg-rose-950/10";
            badgeColor = "bg-rose-950 text-tl-coral border-rose-800";
          } else if (evt.category === "ANOMALY" || evt.category === "DEGRADATION") {
            icon = <AlertTriangle className="w-3.5 h-3.5 text-tl-amber" />;
            dotColor = "border-tl-amber bg-amber-950 text-tl-amber";
            borderHighlight = "border-tl-amber/50 bg-amber-950/15";
            badgeColor = "bg-amber-950 text-tl-amber border-amber-800";
          } else if (evt.category === "INVESTIGATION") {
            icon = <Sparkles className="w-3.5 h-3.5 text-tl-violet" />;
            dotColor = "border-tl-violet bg-purple-950 text-tl-violet";
            borderHighlight = "border-tl-violet/50 bg-purple-950/15";
            badgeColor = "bg-purple-950 text-tl-violet border-purple-800";
          } else if (evt.category === "RECOVERY") {
            icon = <Zap className="w-3.5 h-3.5 text-tl-cyan" />;
            dotColor = "border-tl-cyan bg-cyan-950 text-tl-cyan";
            borderHighlight = "border-tl-cyan/50 bg-cyan-950/15";
            badgeColor = "bg-cyan-950 text-tl-cyan border-cyan-800";
          }

          return (
            <div key={evt.id} className="relative pl-11 group transition-all duration-300">
              {/* Timeline Connector Dot */}
              <div
                className={`absolute left-3 top-3 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 transition-transform group-hover:scale-110 shadow-sm ${dotColor}`}
              >
                {icon}
              </div>

              {/* Event Card */}
              <div className={`p-3.5 rounded-xl bg-tl-bg border transition-all ${borderHighlight}`}>
                {/* Header: Timestamp, Category Pill, Service Badge */}
                <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{evt.timestamp}</span>
                    <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] border ${badgeColor}`}>
                      {evt.category}
                    </span>
                    <span className="text-slate-400 flex items-center gap-1 font-semibold">
                      <Server className="w-3 h-3 text-slate-500" />
                      {evt.serviceName}
                    </span>
                  </div>
                  {evt.evidenceType && (
                    <span className="text-[9px] text-slate-400 bg-tl-card px-1.5 py-0.5 rounded border border-tl-border">
                      Source: {evt.evidenceType}
                    </span>
                  )}
                </div>

                {/* Event Title */}
                <h4
                  className={`font-bold font-mono tracking-tight mt-1 ${
                    isPresentationMode ? "text-sm text-slate-100" : "text-xs text-slate-100"
                  }`}
                >
                  {evt.title}
                </h4>

                {/* Human-Readable Explanation */}
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{evt.description}</p>

                {/* Important Metric Change Pill */}
                {evt.metricBefore && evt.metricAfter && (
                  <div className="mt-2.5 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-tl-card border border-tl-border text-[11px]">
                    <span className="text-slate-400">{evt.metricLabel || "Metric"}:</span>
                    <span className="text-slate-400 font-semibold line-through">{evt.metricBefore}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span
                      className={`font-bold ${
                        evt.category === "IMPACT" || evt.category === "FAILURE"
                          ? "text-tl-coral"
                          : evt.category === "ANOMALY" || evt.category === "DEGRADATION"
                          ? "text-tl-amber"
                          : "text-tl-green"
                      }`}
                    >
                      {evt.metricAfter}
                    </span>
                  </div>
                )}

                {/* Expandable Technical Evidence Drawer */}
                {evt.rawEvidence && (
                  <div className="mt-2 pt-2 border-t border-tl-border/60">
                    <button
                      onClick={() => setExpandedRawId(isRawExpanded ? null : evt.id)}
                      className="text-[10px] text-tl-cyan hover:text-cyan-300 font-medium flex items-center gap-1 transition"
                    >
                      <span>{isRawExpanded ? "Hide Technical Evidence" : "View Raw Evidence"}</span>
                      {isRawExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    {isRawExpanded && (
                      <div className="mt-1.5 p-2 rounded bg-[#070B14] border border-tl-border text-[10px] font-mono text-slate-300 break-all overflow-x-auto">
                        <code>{evt.rawEvidence}</code>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chronological Delta Connector between cards */}
              {!isLast && (
                <div className="py-2 pl-4 flex items-center gap-2 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1 bg-tl-card/80 px-2 py-0.5 rounded-full border border-tl-border/80">
                    <ArrowDown className="w-2.5 h-2.5 text-tl-cyan" />
                    <span className="font-semibold text-slate-300">{evt.timeDeltaText || "+2s"}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 4. Healthy Calm State Banner (When System is Normal) */}
        {!isIncident && (
          <div className="my-6 p-6 rounded-xl bg-tl-bg/60 border border-tl-border text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-700/80 flex items-center justify-center text-tl-green mx-auto">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wide">SYSTEM NORMAL</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No abnormal behavior detected across the 6 microservices. Continuous synthetic probes and trace collectors
              are active.
            </p>
            <div className="text-[10px] text-slate-500 font-mono pt-1">
              TraceRoute is watching for latency threshold deviations...
            </div>
          </div>
        )}

        <div ref={timelineEndRef} />
      </div>

      {/* 5. Bottom Section: "WHAT JUST HAPPENED?" Card OR "SYSTEM NORMAL / LAST 15 MINUTES" Bar */}
      {isIncident ? (
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#10172A] to-[#161F35] border border-tl-border/90 shadow-sm space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-tl-violet" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                WHAT JUST HAPPENED?
              </span>
            </div>
            <span className="text-[10px] text-tl-violet font-semibold bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
              Evidence-Grounded Synthesis
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {scenario?.includes("DATA") || scenario?.includes("DB")
              ? "A backend database pool saturation began degrading before customer-facing errors appeared. The first abnormal signal was observed in Payment Database, followed by Payment Service threadpool starvation and Order Service timeout, ultimately causing API Gateway 502 Bad Gateway responses."
              : scenario?.includes("PAYMENT") || scenario?.includes("LATENCY")
              ? "Downstream payment processor authorization latency spiked 15x above baseline, causing Order Service worker threads to saturate waiting for payment callbacks. This propagated upstream into client checkout delays and 504 Gateway Timeouts."
              : scenario?.includes("INVENTORY") || scenario?.includes("CRASH")
              ? "The Inventory Service container was abruptly terminated due to memory exhaustion (OOMKilled). Order Service checkout requests were immediately refused, triggering circuit breakers and causing customer purchase errors."
              : "A recent deployment release (v2.4.1) introduced a high-CPU regression in Order Service. Garbage collection pauses saturated the event loop, cascading into gateway connection drops."}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-tl-border/60 text-xs">
            <span className="text-[10px] text-slate-400">
              Leading Candidate:{" "}
              <strong className="text-tl-cyan">{diagnosis?.initiating_service_name || "Payment Database"}</strong> &bull;{" "}
              Score: <strong className="text-tl-green">{diagnosis?.confidence_score || 94}%</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate("adaptive")}
                className="px-3 py-1.5 rounded-lg bg-tl-cyan hover:bg-cyan-400 text-slate-950 font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <span>Investigate Why</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigate("investigation")}
                className="px-3 py-1.5 rounded-lg bg-tl-elevated hover:bg-slate-700 text-slate-200 font-semibold transition border border-tl-border flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-tl-violet" />
                <span>View Evidence</span>
              </button>
            </div>
          </div>
        </div>
      ) : isResolved ? (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-[#10172A] border border-emerald-800/80 shadow-sm space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-tl-green" />
              <span className="text-xs font-bold uppercase tracking-wider text-tl-green">INCIDENT RESOLVED</span>
            </div>
            <span className="text-[10px] font-bold text-tl-green bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              VERIFICATION PASSED
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-tl-card/60 p-2.5 rounded-lg border border-tl-border/60">
            <div>
              <div className="text-[9px] text-slate-400">DURATION</div>
              <div className="font-bold text-slate-200">1m 32s</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400">SERVICES AFFECTED</div>
              <div className="font-bold text-slate-200">4 Microservices</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400">CUSTOMER SYMPTOM</div>
              <div className="font-bold text-tl-coral">502 Bad Gateway</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400">RECOVERY ACTION</div>
              <div className="font-bold text-tl-cyan truncate">Rollback / Pool Expansion</div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={handleStartReplay}
              className="px-3 py-1 rounded-lg bg-tl-elevated hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-tl-border transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-tl-cyan" />
              <span>Replay Story</span>
            </button>
            <button
              onClick={() => onNavigate("memory")}
              className="px-3 py-1 rounded-lg bg-tl-cyan hover:bg-cyan-400 text-slate-950 text-xs font-bold transition flex items-center gap-1"
            >
              <span>View Incident Report</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        /* Real Baseline Statistics (Last 15 Minutes) */
        <div className="p-3 bg-tl-bg/80 rounded-xl border border-tl-border font-mono text-[11px]">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Last 15 Minutes Baseline Observability</span>
            <span className="text-tl-green flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tl-green" />
              All SLO Targets Nominal
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-tl-card/60 p-2 rounded border border-tl-border/40">
              <div className="text-sm font-bold text-slate-100">127.4K</div>
              <div className="text-[9px] text-slate-400 mt-0.5">Total Requests</div>
            </div>
            <div className="bg-tl-card/60 p-2 rounded border border-tl-border/40">
              <div className="text-sm font-bold text-tl-green">0</div>
              <div className="text-[9px] text-slate-400 mt-0.5">Critical Events</div>
            </div>
            <div className="bg-tl-card/60 p-2 rounded border border-tl-border/40">
              <div className="text-sm font-bold text-slate-100">0</div>
              <div className="text-[9px] text-slate-400 mt-0.5">Active Incidents</div>
            </div>
            <div className="bg-tl-card/60 p-2 rounded border border-tl-border/40">
              <div className="text-sm font-bold text-tl-cyan">99.98%</div>
              <div className="text-[9px] text-slate-400 mt-0.5">Success Rate</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
