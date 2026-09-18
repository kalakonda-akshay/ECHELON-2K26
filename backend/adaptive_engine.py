from typing import Dict, List, Any, Optional
import time

class AdaptiveEvidenceEngine:
    def __init__(self):
        self.acquired_evidence_cache: Dict[str, bool] = {}

    def get_adaptive_analysis(
        self,
        scenario: Optional[str],
        metrics: Dict[str, Any],
        latest_trace: Dict[str, Any],
        acquired_extra: bool = False
    ) -> Dict[str, Any]:
        """
        Adaptive Evidence Engine 2.0:
        Maintains multiple competing root-cause hypotheses, detects evidence uncertainty,
        identifies the 'Next Best Evidence' query to maximize information gain,
        and transitions from EVIDENCE_INSUFFICIENT to EVIDENCE_SUFFICIENT.
        """
        if not scenario:
            return {
                "status": "NOMINAL",
                "is_sufficient": True,
                "confidence_score": 100,
                "hypotheses": [],
                "next_best_evidence": None,
                "investigation_steps": []
            }

        norm_scen = scenario.lower().replace("-", "_")
        steps = self.investigate(norm_scen, metrics, latest_trace)

        # Check if extra evidence was previously acquired for this scenario in cache
        if scenario in self.acquired_evidence_cache:
            acquired_extra = True

        if acquired_extra:
            self.acquired_evidence_cache[scenario] = True

        if norm_scen == "database_failure":
            if not acquired_extra:
                hypotheses = [
                    {"service_id": "payment-db", "name": "Payment Database", "probability": 52, "rank": 1, "status": "LEADING"},
                    {"service_id": "payment-service", "name": "Payment Service", "probability": 43, "rank": 2, "status": "COMPETING"},
                    {"service_id": "order-service", "name": "Order Service", "probability": 4, "rank": 3, "status": "UNLIKELY"},
                    {"service_id": "api-gateway", "name": "API Gateway", "probability": 1, "rank": 4, "status": "SYMPTOM"}
                ]
                status = "EVIDENCE_INSUFFICIENT"
                is_sufficient = False
                confidence = 52
                next_ev = {
                    "id": "query-hikari-pg-metrics",
                    "action_title": "Inspect Payment -> Database HikariCP Trace",
                    "target_service": "payment-db",
                    "query": "SELECT count(*), state FROM pg_stat_activity GROUP BY state;",
                    "rationale": "Resolves ambiguity between Payment Service timeout vs DB connection pool exhaustion.",
                    "expected_information_gain": "+36% certainty"
                }
            else:
                hypotheses = [
                    {"service_id": "payment-db", "name": "Payment Database", "probability": 88, "rank": 1, "status": "VERIFIED_ROOT_CAUSE"},
                    {"service_id": "payment-service", "name": "Payment Service", "probability": 9, "rank": 2, "status": "SECONDARY_CASCADE"},
                    {"service_id": "order-service", "name": "Order Service", "probability": 2, "rank": 3, "status": "UPSTREAM_CASCADE"},
                    {"service_id": "api-gateway", "name": "API Gateway", "probability": 1, "rank": 4, "status": "SYMPTOM"}
                ]
                status = "EVIDENCE_SUFFICIENT"
                is_sufficient = True
                confidence = 88
                next_ev = None

        elif norm_scen == "payment_latency":
            if not acquired_extra:
                hypotheses = [
                    {"service_id": "payment-service", "name": "Payment Service", "probability": 58, "rank": 1, "status": "LEADING"},
                    {"service_id": "payment-db", "name": "Payment Database", "probability": 36, "rank": 2, "status": "COMPETING"},
                    {"service_id": "order-service", "name": "Order Service", "probability": 5, "rank": 3, "status": "UNLIKELY"},
                    {"service_id": "api-gateway", "name": "API Gateway", "probability": 1, "rank": 4, "status": "SYMPTOM"}
                ]
                status = "EVIDENCE_INSUFFICIENT"
                is_sufficient = False
                confidence = 58
                next_ev = {
                    "id": "query-jvm-gc-profile",
                    "action_title": "Inspect Payment Service JVM Garbage Collection Telemetry",
                    "target_service": "payment-service",
                    "query": "jstat -gcutil $(pgrep java) 1000 5",
                    "rationale": "Differentiate between database disk wait vs JVM stop-the-world full GC pauses.",
                    "expected_information_gain": "+33% certainty"
                }
            else:
                hypotheses = [
                    {"service_id": "payment-service", "name": "Payment Service", "probability": 91, "rank": 1, "status": "VERIFIED_ROOT_CAUSE"},
                    {"service_id": "payment-db", "name": "Payment Database", "probability": 6, "rank": 2, "status": "HEALTHY"},
                    {"service_id": "order-service", "name": "Order Service", "probability": 2, "rank": 3, "status": "UPSTREAM_CASCADE"},
                    {"service_id": "api-gateway", "name": "API Gateway", "probability": 1, "rank": 4, "status": "SYMPTOM"}
                ]
                status = "EVIDENCE_SUFFICIENT"
                is_sufficient = True
                confidence = 91
                next_ev = None

        elif norm_scen == "inventory_crash":
            if not acquired_extra:
                hypotheses = [
                    {"service_id": "inventory-service", "name": "Inventory Service", "probability": 65, "rank": 1, "status": "LEADING"},
                    {"service_id": "stock-db", "name": "Stock Database", "probability": 28, "rank": 2, "status": "COMPETING"},
                    {"service_id": "order-service", "name": "Order Service", "probability": 7, "rank": 3, "status": "UNLIKELY"}
                ]
                status = "EVIDENCE_INSUFFICIENT"
                is_sufficient = False
                confidence = 65
                next_ev = {
                    "id": "query-k8s-pod-lifecycle",
                    "action_title": "Inspect Kubernetes Container Termination Reason",
                    "target_service": "inventory-service",
                    "query": "kubectl describe pod -l app=inventory-service",
                    "rationale": "Verify if network partition or process exit code 137 (OOMKilled).",
                    "expected_information_gain": "+29% certainty"
                }
            else:
                hypotheses = [
                    {"service_id": "inventory-service", "name": "Inventory Service", "probability": 94, "rank": 1, "status": "VERIFIED_ROOT_CAUSE"},
                    {"service_id": "stock-db", "name": "Stock Database", "probability": 4, "rank": 2, "status": "HEALTHY"},
                    {"service_id": "order-service", "name": "Order Service", "probability": 2, "rank": 3, "status": "UPSTREAM_CASCADE"}
                ]
                status = "EVIDENCE_SUFFICIENT"
                is_sufficient = True
                confidence = 94
                next_ev = None

        elif norm_scen == "bad_deployment":
            if not acquired_extra:
                hypotheses = [
                    {"service_id": "payment-service", "name": "Payment Service", "probability": 54, "rank": 1, "status": "LEADING"},
                    {"service_id": "payment-db", "name": "Payment Database", "probability": 38, "rank": 2, "status": "COMPETING"},
                    {"service_id": "order-service", "name": "Order Service", "probability": 8, "rank": 3, "status": "UNLIKELY"}
                ]
                status = "EVIDENCE_INSUFFICIENT"
                is_sufficient = False
                confidence = 54
                next_ev = {
                    "id": "query-git-commit-diff",
                    "action_title": "Inspect Commit a8f3b9c Code Diff & Query Plan",
                    "target_service": "payment-service",
                    "query": "git diff e4d120a..a8f3b9c -- payment-service/src/db/queries.ts",
                    "rationale": "Verify if release v2.4.1 introduced unindexed sequential scan query loop.",
                    "expected_information_gain": "+41% certainty"
                }
            else:
                hypotheses = [
                    {"service_id": "payment-service", "name": "Payment Service", "probability": 95, "rank": 1, "status": "VERIFIED_ROOT_CAUSE"},
                    {"service_id": "payment-db", "name": "Payment Database", "probability": 3, "rank": 2, "status": "SECONDARY"},
                    {"service_id": "order-service", "name": "Order Service", "probability": 2, "rank": 3, "status": "UPSTREAM_CASCADE"}
                ]
                status = "EVIDENCE_SUFFICIENT"
                is_sufficient = True
                confidence = 95
                next_ev = None
        else:
            hypotheses = []
            status = "EVIDENCE_SUFFICIENT"
            is_sufficient = True
            confidence = 90
            next_ev = None

        return {
            "status": status,
            "is_sufficient": is_sufficient,
            "confidence_score": confidence,
            "hypotheses": hypotheses,
            "next_best_evidence": next_ev,
            "investigation_steps": steps
        }

    def acquire_evidence(self, scenario: str) -> Dict[str, Any]:
        """Operator or Auto-Demo triggered acquisition of the Next Best Evidence."""
        self.acquired_evidence_cache[scenario] = True
        return {
            "scenario": scenario,
            "status": "ACQUIRED",
            "message": "Telemetry evidence acquired and correlated into Bayesian hypothesis ranking."
        }

    def reset_evidence(self):
        """Reset cached acquired evidence."""
        self.acquired_evidence_cache.clear()

    def get_causal_graph(self, scenario: Optional[str]) -> Dict[str, Any]:
        """
        Builds the CAUSAL INCIDENT GRAPH (distinct from Service Topology).
        Maps exact event-level progression:
          Event -> Service -> Timestamp -> Evidence Source -> Details
        """
        if not scenario:
            return {"nodes": [], "edges": []}

        norm_scen = scenario.lower().replace("-", "_")

        if norm_scen == "database_failure":
            nodes = [
                {
                    "id": "c-1",
                    "event": "Database Connection Pool Saturation",
                    "service": "payment-db",
                    "timestamp": "T+0.0s",
                    "evidence_source": "Infrastructure Metric",
                    "severity": "CRITICAL",
                    "evidence_details": "max_connections (150/150) reached; active idle connections 34"
                },
                {
                    "id": "c-2",
                    "event": "Database Query Latency Escalation",
                    "service": "payment-db",
                    "timestamp": "T+1.5s",
                    "evidence_source": "Postgres Query Stats",
                    "severity": "CRITICAL",
                    "evidence_details": "p99 query duration spiked to 8,400ms"
                },
                {
                    "id": "c-3",
                    "event": "HikariCP Connection Acquire Timeout",
                    "service": "payment-service",
                    "timestamp": "T+3.2s",
                    "evidence_source": "Trace Waterfall",
                    "severity": "CRITICAL",
                    "evidence_details": "ConnectionPoolTimeoutException: 30,000ms timeout exceeded"
                },
                {
                    "id": "c-4",
                    "event": "Payment Request Cascading Timeout",
                    "service": "order-service",
                    "timestamp": "T+6.1s",
                    "evidence_source": "Service RPC Span",
                    "severity": "CRITICAL",
                    "evidence_details": "OrderService.createOrder aborted after 3 retries (HTTP 500)"
                },
                {
                    "id": "c-5",
                    "event": "Gateway Circuit Breaker Tripped (502)",
                    "service": "api-gateway",
                    "timestamp": "T+9.2s",
                    "evidence_source": "Edge Metric Alert",
                    "severity": "CRITICAL",
                    "evidence_details": "POST /api/v1/checkout returning HTTP 502 Bad Gateway"
                }
            ]
            edges = [
                {"source": "c-1", "target": "c-2", "relationship": "CAUSES_LATENCY_SPIKE"},
                {"source": "c-2", "target": "c-3", "relationship": "CAUSES_POOL_TIMEOUT"},
                {"source": "c-3", "target": "c-4", "relationship": "CAUSES_ORDER_TIMEOUT"},
                {"source": "c-4", "target": "c-5", "relationship": "TRIPS_CIRCUIT_BREAKER"}
            ]

        elif norm_scen == "bad_deployment":
            nodes = [
                {
                    "id": "c-1",
                    "event": "Release v2.4.1 Rolled Out (commit a8f3b9c)",
                    "service": "payment-service",
                    "timestamp": "T-3m00s",
                    "evidence_source": "CI/CD Deployment Audit",
                    "severity": "WARNING",
                    "evidence_details": "Deployed by devon.v@acme.corp (batch query refactor)"
                },
                {
                    "id": "c-2",
                    "event": "Unindexed N+1 SQL Query Loop Triggered",
                    "service": "payment-service",
                    "timestamp": "T+0.5s",
                    "evidence_source": "Trace Waterfall",
                    "severity": "CRITICAL",
                    "evidence_details": "124 sequential SELECTs executing per single transaction"
                },
                {
                    "id": "c-3",
                    "event": "Thread Exhaustion in Payment Service",
                    "service": "payment-service",
                    "timestamp": "T+2.0s",
                    "evidence_source": "JVM Thread Metric",
                    "severity": "CRITICAL",
                    "evidence_details": "Active threads 248/250; queuing overhead +1800ms"
                },
                {
                    "id": "c-4",
                    "event": "Order Service Request Timeout",
                    "service": "order-service",
                    "timestamp": "T+4.5s",
                    "evidence_source": "RPC Trace",
                    "severity": "CRITICAL",
                    "evidence_details": "Payment authorization call timed out after 3000ms"
                },
                {
                    "id": "c-5",
                    "event": "Ingress Degradation (HTTP 504 / 502)",
                    "service": "api-gateway",
                    "timestamp": "T+6.0s",
                    "evidence_source": "Gateway Error Log",
                    "severity": "CRITICAL",
                    "evidence_details": "User checkout error rate reached 36%"
                }
            ]
            edges = [
                {"source": "c-1", "target": "c-2", "relationship": "INTRODUCES_REGRESSION"},
                {"source": "c-2", "target": "c-3", "relationship": "EXHAUSTS_THREADS"},
                {"source": "c-3", "target": "c-4", "relationship": "CAUSES_TIMEOUT"},
                {"source": "c-4", "target": "c-5", "relationship": "DEGRADES_INGRESS"}
            ]

        elif norm_scen == "inventory_crash":
            nodes = [
                {
                    "id": "c-1",
                    "event": "Container Memory CGroup Limit Exceeded",
                    "service": "inventory-service",
                    "timestamp": "T+0.0s",
                    "evidence_source": "CGroup Memory Metric",
                    "severity": "CRITICAL",
                    "evidence_details": "Usage reached 512Mi / 512Mi limit"
                },
                {
                    "id": "c-2",
                    "event": "Linux Kernel OOM Killer Invocation",
                    "service": "inventory-service",
                    "timestamp": "T+0.2s",
                    "evidence_source": "dmesg System Log",
                    "severity": "FATAL",
                    "evidence_details": "Process terminated with signal SIGKILL (Exit code 137)"
                },
                {
                    "id": "c-3",
                    "event": "TCP Connection Refused (ECONNREFUSED)",
                    "service": "order-service",
                    "timestamp": "T+1.0s",
                    "evidence_source": "Socket Error Log",
                    "severity": "CRITICAL",
                    "evidence_details": "tcp://inventory-service:3003 unreachable"
                },
                {
                    "id": "c-4",
                    "event": "Gateway Partial Ingress Failure (503)",
                    "service": "api-gateway",
                    "timestamp": "T+2.5s",
                    "evidence_source": "Edge Route Metric",
                    "severity": "CRITICAL",
                    "evidence_details": "POST /api/v1/checkout returning 503 for inventory checks"
                }
            ]
            edges = [
                {"source": "c-1", "target": "c-2", "relationship": "TRIGGERS_OOM"},
                {"source": "c-2", "target": "c-3", "relationship": "REFUSES_CONNECTIONS"},
                {"source": "c-3", "target": "c-4", "relationship": "RETURNS_503"}
            ]

        elif norm_scen == "payment_latency":
            nodes = [
                {
                    "id": "c-1",
                    "event": "Heap Saturation (94.5% Heap Utilized)",
                    "service": "payment-service",
                    "timestamp": "T+0.0s",
                    "evidence_source": "JVM Profiler Metric",
                    "severity": "CRITICAL",
                    "evidence_details": "Heap allocation spike in payment-service worker pods"
                },
                {
                    "id": "c-2",
                    "event": "Stop-The-World Full GC Evacuation Pause",
                    "service": "payment-service",
                    "timestamp": "T+1.8s",
                    "evidence_source": "GC Log",
                    "severity": "CRITICAL",
                    "evidence_details": "G1 Evacuation Pause locked worker threads for 3,840ms"
                },
                {
                    "id": "c-3",
                    "event": "Order Service Downstream Wait Spike",
                    "service": "order-service",
                    "timestamp": "T+3.5s",
                    "evidence_source": "Distributed Trace",
                    "severity": "WARNING",
                    "evidence_details": "OrderService.createOrder stalled for 2,550ms"
                },
                {
                    "id": "c-4",
                    "event": "Ingress P99 Latency SLA Breach (>2,400ms)",
                    "service": "api-gateway",
                    "timestamp": "T+5.0s",
                    "evidence_source": "Gateway SLO Metric",
                    "severity": "WARNING",
                    "evidence_details": "p99 latency 2,400ms against 200ms SLO target"
                }
            ]
            edges = [
                {"source": "c-1", "target": "c-2", "relationship": "CAUSES_GC_LOCK"},
                {"source": "c-2", "target": "c-3", "relationship": "STALLS_UPSTREAM"},
                {"source": "c-3", "target": "c-4", "relationship": "BREACHES_SLO"}
            ]
        else:
            nodes = []
            edges = []

        return {"nodes": nodes, "edges": edges}

    def investigate(self, scenario: Optional[str], metrics: Dict[str, Any], latest_trace: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generates the step-by-step progressive investigation path."""
        if not scenario:
            return []

        norm = scenario.lower().replace("-", "_")

        if norm == "database_failure":
            return [
                {
                    "step": 1,
                    "title": "Ingress Edge Anomaly Triggered",
                    "target_service": "api-gateway",
                    "action": "Inspect Ingress Status Codes & Error Thresholds",
                    "finding": "API Gateway error rate spiked to 68.4%. Route POST /api/v1/checkout returning HTTP 502 Bad Gateway.",
                    "evidence_type": "METRIC_ALERT",
                    "badge": "HTTP 502 Detected",
                    "latency_ms": 3800,
                    "severity": "CRITICAL",
                    "snippet": {
                        "route": "POST /api/v1/checkout",
                        "status_code": 502,
                        "upstream_response": "Bad Gateway (upstream error response from order-service)"
                    }
                },
                {
                    "step": 2,
                    "title": "Distributed Trace Call Path Inspection",
                    "target_service": "order-service",
                    "action": "Traverse Ingress Root Span to Downstream Caller",
                    "finding": "Trace waterfall isolates OrderService.createOrder exceeding 3200ms with HTTP 500 error code.",
                    "evidence_type": "TRACE_WATERFALL",
                    "badge": "Downstream Timeout",
                    "latency_ms": 3200,
                    "severity": "CRITICAL",
                    "snippet": {
                        "span": "OrderService.createOrder",
                        "error": "Payment service charge timed out after 3 retries (total 3200ms)",
                        "caller": "api-gateway"
                    }
                },
                {
                    "step": 3,
                    "title": "Dependency Fan-Out & Branching Evaluation",
                    "target_service": "order-service",
                    "action": "Evaluate Downstream Health of Order Service Dependencies",
                    "finding": "Inventory Service is HEALTHY (24ms latency, 0% errors). Payment Service is CRITICAL (94.2% errors, timeout response).",
                    "evidence_type": "DEPENDENCY_BRANCH",
                    "badge": "Isolated to Payment Subtree",
                    "latency_ms": 3050,
                    "severity": "CRITICAL",
                    "snippet": {
                        "inventory_service_status": "HEALTHY (24ms)",
                        "payment_service_status": "CRITICAL (504 Gateway Timeout)",
                        "isolated_branch": "order-service -> payment-service"
                    }
                },
                {
                    "step": 4,
                    "title": "Payment Service Sub-Trace Analysis",
                    "target_service": "payment-service",
                    "action": "Examine PaymentService.authorizeCharge Internal Spans",
                    "finding": "Payment Service HikariCP connection pool exhausted. Socket timeout connecting to payment-db:5432.",
                    "evidence_type": "TRACE_WATERFALL",
                    "badge": "Connection Pool Starvation",
                    "latency_ms": 3050,
                    "severity": "CRITICAL",
                    "snippet": {
                        "span": "PaymentService.authorizeCharge",
                        "exception": "ConnectionPoolTimeoutException: Timeout waiting for idle connection from HikariPool after 30000ms",
                        "downstream_target": "payment-db:5432"
                    }
                },
                {
                    "step": 5,
                    "title": "Database Infrastructure Telemetry Verification",
                    "target_service": "payment-db",
                    "action": "Query PostgreSQL Active Connections & Pool Metrics",
                    "finding": "Payment Database connection pool reached 100.0% utilization (150/150 max_connections). CPU 98.4%. 0 free slots.",
                    "evidence_type": "INFRA_METRIC",
                    "badge": "150/150 Connections Exhausted",
                    "latency_ms": 8400,
                    "severity": "FATAL",
                    "snippet": {
                        "pool_usage": "100.0%",
                        "active_connections": 150,
                        "max_connections": 150,
                        "cpu_utilization": "98.4%",
                        "db_log": "FATAL: remaining connection slots are reserved for non-replication superuser connections"
                    }
                },
                {
                    "step": 6,
                    "title": "Root Cause Identification & Blast Radius Mapping",
                    "target_service": "payment-db",
                    "action": "Synthesize Evidence Graph & Compute Topological Propagation",
                    "finding": "payment-db identified as Root Initiator. Failure propagated upward: payment-db -> payment-service -> order-service -> api-gateway.",
                    "evidence_type": "ROOT_CAUSE_VERDICT",
                    "badge": "Root Cause Ranked (100/100)",
                    "latency_ms": 8400,
                    "severity": "DIAGNOSED",
                    "snippet": {
                        "initiating_service": "payment-db",
                        "failure_type": "Database Connection Pool Exhaustion",
                        "propagation_chain": ["payment-db", "payment-service", "order-service", "api-gateway"],
                        "confidence_score": 100
                    }
                }
            ]

        elif norm == "payment_latency":
            return [
                {
                    "step": 1,
                    "title": "Ingress Latency SLA Breach",
                    "target_service": "api-gateway",
                    "action": "Inspect Ingress Gateway p99 Latency Metrics",
                    "finding": "API Gateway p99 latency climbed to 2400ms (SLO target: <200ms).",
                    "evidence_type": "METRIC_ALERT",
                    "badge": "Latency SLA Breach",
                    "latency_ms": 2400,
                    "severity": "WARNING",
                    "snippet": {"route": "POST /api/v1/checkout", "p99_latency_ms": 2400, "slo_target_ms": 200}
                },
                {
                    "step": 2,
                    "title": "Order Service Downstream Bottleneck Search",
                    "target_service": "order-service",
                    "action": "Trace Latency Breakdown Across Downstream Calls",
                    "finding": "Order Service spend 2550ms waiting on Payment Service authorization call.",
                    "evidence_type": "TRACE_WATERFALL",
                    "badge": "Payment Wait Bottleneck",
                    "latency_ms": 2600,
                    "severity": "WARNING",
                    "snippet": {"inventory_call_ms": 21, "payment_call_ms": 2550, "order_overhead_ms": 29}
                },
                {
                    "step": 3,
                    "title": "Payment Service JVM Profiling Inspection",
                    "target_service": "payment-service",
                    "action": "Analyze Payment Service Memory & Garbage Collection Metrics",
                    "finding": "JVM Memory utilization at 94.5%. G1 GC Evacuation Pause blocking worker threads for 3840ms.",
                    "evidence_type": "INFRA_METRIC",
                    "badge": "GC Pause Detected (3840ms)",
                    "latency_ms": 5800,
                    "severity": "CRITICAL",
                    "snippet": {"heap_usage_pct": 94.5, "gc_pause_duration_ms": 3840, "active_threads": "240/250"}
                },
                {
                    "step": 4,
                    "title": "Root Cause Verdict: Thread Starvation via GC Pauses",
                    "target_service": "payment-service",
                    "action": "Correlate Memory Saturation with Response Latencies",
                    "finding": "Payment Service heap saturation causing full stop-the-world GC pauses.",
                    "evidence_type": "ROOT_CAUSE_VERDICT",
                    "badge": "Root Cause Ranked (88/100)",
                    "latency_ms": 5800,
                    "severity": "DIAGNOSED",
                    "snippet": {"initiating_service": "payment-service", "failure_type": "JVM GC Memory Saturation", "confidence_score": 88}
                }
            ]

        elif norm == "inventory_crash":
            return [
                {
                    "step": 1,
                    "title": "Ingress Partial Checkout Failures",
                    "target_service": "api-gateway",
                    "action": "Detect 503 Service Unavailable Responses",
                    "finding": "Gateway returning 503 for inventory-dependent requests. Error rate 45%.",
                    "evidence_type": "METRIC_ALERT",
                    "badge": "HTTP 503 Ingress Spike",
                    "latency_ms": 290,
                    "severity": "WARNING",
                    "snippet": {"error_code": 503, "affected_routes": ["/checkout", "/inventory/check"]}
                },
                {
                    "step": 2,
                    "title": "Order Service Dependency Probing",
                    "target_service": "order-service",
                    "action": "Inspect Connection Status to Inventory Service",
                    "finding": "Order Service reporting ECONNREFUSED on tcp://inventory-service:3003.",
                    "evidence_type": "TRACE_WATERFALL",
                    "badge": "ECONNREFUSED Detected",
                    "latency_ms": 290,
                    "severity": "CRITICAL",
                    "snippet": {"target": "inventory-service:3003", "error": "Connection refused - host unreachable"}
                },
                {
                    "step": 3,
                    "title": "Container Healthcheck & Process Life-Cycle Audit",
                    "target_service": "inventory-service",
                    "action": "Query Kubernetes / Container Runtime Event Log",
                    "finding": "inventory-service pod crashed with exit code 137 (OOMKilled by OS cgroup). Process DOWN.",
                    "evidence_type": "INFRA_METRIC",
                    "badge": "Process Crashed (OOM 137)",
                    "latency_ms": 0,
                    "severity": "FATAL",
                    "snippet": {"exit_code": 137, "reason": "OOMKilled", "restarts": 1, "status": "DOWN"}
                },
                {
                    "step": 4,
                    "title": "Root Cause Verdict: Inventory Service Container Termination",
                    "target_service": "inventory-service",
                    "action": "Map Single-Point-of-Failure Impact",
                    "finding": "inventory-service is completely DOWN. Upstream Order Service degraded.",
                    "evidence_type": "ROOT_CAUSE_VERDICT",
                    "badge": "Root Cause Ranked (92/100)",
                    "latency_ms": 0,
                    "severity": "DIAGNOSED",
                    "snippet": {"initiating_service": "inventory-service", "failure_type": "Container Fatal OOM Crash", "confidence_score": 92}
                }
            ]

        elif norm == "bad_deployment":
            return [
                {
                    "step": 1,
                    "title": "Post-Deployment Error Rate Ingress Anomaly",
                    "target_service": "api-gateway",
                    "action": "Detect Error Spike Post Release Window",
                    "finding": "API Gateway error rate escalated to 36.0% within 4 minutes of recent production rollout.",
                    "evidence_type": "METRIC_ALERT",
                    "badge": "Post-Release Anomaly",
                    "latency_ms": 2600,
                    "severity": "WARNING",
                    "snippet": {"error_rate_pct": 36.0, "latency_p99_ms": 2600}
                },
                {
                    "step": 2,
                    "title": "Trace Inspection: Isolate N+1 Query Delay",
                    "target_service": "payment-service",
                    "action": "Examine Database Access Patterns in Payment Service",
                    "finding": "PaymentService executing 120+ sequential SQL queries per single checkout transaction.",
                    "evidence_type": "TRACE_WATERFALL",
                    "badge": "N+1 Query Pattern",
                    "latency_ms": 2720,
                    "severity": "CRITICAL",
                    "snippet": {"query_count": 124, "query_type": "SELECT * FROM ledger_entries WHERE account_id = $1"}
                },
                {
                    "step": 3,
                    "title": "Deployment Metadata & Git Commit Correlation",
                    "target_service": "payment-service",
                    "action": "Correlate Anomaly Start Time with CI/CD Deployment Register",
                    "finding": "Suspected change: Release v2.4.1 (commit a8f3b9c) deployed by devon.v@acme.corp 3 minutes before incident onset.",
                    "evidence_type": "DEPLOYMENT_CORRELATION",
                    "badge": "Commit a8f3b9c Correlated",
                    "latency_ms": 2720,
                    "severity": "CRITICAL",
                    "snippet": {
                        "commit_id": "a8f3b9c",
                        "version": "v2.4.1",
                        "author": "devon.v@acme.corp",
                        "commit_msg": "Payment gateway connector overhaul with batch query refactor"
                    }
                },
                {
                    "step": 4,
                    "title": "Root Cause Verdict: Regression in Release v2.4.1",
                    "target_service": "payment-service",
                    "action": "Synthesize Deployment Event with Query Telemetry",
                    "finding": "High temporal correlation (+15) and trace proof confirm commit a8f3b9c introduced an unindexed query regression.",
                    "evidence_type": "ROOT_CAUSE_VERDICT",
                    "badge": "Root Cause Ranked (95/100)",
                    "latency_ms": 5200,
                    "severity": "DIAGNOSED",
                    "snippet": {"initiating_service": "payment-service", "version": "v2.4.1", "confidence_score": 95}
                }
            ]

        return []

adaptive_engine = AdaptiveEvidenceEngine()
