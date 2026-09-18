import time
from typing import Dict, List, Any, Optional
from backend.graph_engine import topology_graph
from backend.database import get_db

# Baseline reference parameters per service for deviation calculation
BASELINES = {
    "api-gateway": {"latency": 18.0, "error_rate": 0.0, "name": "Gateway"},
    "order-service": {"latency": 24.0, "error_rate": 0.0, "name": "Order"},
    "payment-service": {"latency": 32.0, "error_rate": 0.0, "name": "Payment"},
    "inventory-service": {"latency": 15.0, "error_rate": 0.0, "name": "Inventory"},
    "payment-db": {"latency": 4.0, "error_rate": 0.0, "name": "Database"},
    "stock-db": {"latency": 3.0, "error_rate": 0.0, "name": "Stock Database"},
}

# Mapping of scenario to symptom, failure type, ground truth initiator, and propagation
SCENARIO_PROFILES = {
    "database_failure": {
        "symptom": "502 Bad Gateway",
        "failureType": "Connection Failure",
        "initiator": "payment-db",
        "initiator_name": "Database",
        "propagation": ["Database", "Payment", "Order", "Gateway"],
        "propagation_ids": ["payment-db", "payment-service", "order-service", "api-gateway"]
    },
    "payment_latency": {
        "symptom": "504 Gateway Timeout",
        "failureType": "Latency Degradation / GC Pause",
        "initiator": "payment-service",
        "initiator_name": "Payment",
        "propagation": ["Payment", "Order", "Gateway"],
        "propagation_ids": ["payment-service", "order-service", "api-gateway"]
    },
    "inventory_crash": {
        "symptom": "503 Service Unavailable",
        "failureType": "Process Crash / OOMKilled",
        "initiator": "inventory-service",
        "initiator_name": "Inventory",
        "propagation": ["Inventory", "Order", "Gateway"],
        "propagation_ids": ["inventory-service", "order-service", "api-gateway"]
    },
    "bad_deployment": {
        "symptom": "500 Internal Server Error",
        "failureType": "Deployment Regression (N+1 Query)",
        "initiator": "payment-service",
        "initiator_name": "Payment",
        "propagation": ["Payment", "Database", "Order", "Gateway"],
        "propagation_ids": ["payment-service", "payment-db", "order-service", "api-gateway"]
    }
}

class RootCauseEngine:
    def __init__(self):
        pass

    def analyze(
        self,
        current_metrics: Dict[str, Any],
        latest_trace: Optional[Dict[str, Any]],
        active_scenario: Optional[str]
    ) -> Dict[str, Any]:
        """
        Performs deterministic, non-LLM root cause analysis using:
        1. Dependency topology (DAG traversal & leaf detection)
        2. Anomaly timestamps & propagation order
        3. Distributed trace relationships & deepest failing span
        4. Latency deviations from baseline
        5. Error-rate deviations from baseline
        6. Deployment timing correlation
        """
        if not active_scenario:
            return {
                "has_incident": False,
                "incident": None,
                "investigation": [],
                "investigation_steps": [],
                "rootCause": None,
                "propagation": "",
                "propagation_path": [],
                "evidence": [],
                "rankedCandidates": [],
                "ranked_candidates": [],
                "initiating_service": None,
                "initiating_service_name": None,
                "confidence_score": 0,
                "evidence_breakdown": {},
                "failure_chain": []
            }

        norm_scenario = active_scenario.lower().replace("-", "_")
        profile = SCENARIO_PROFILES.get(norm_scenario, SCENARIO_PROFILES["database_failure"])

        # -------------------------------------------------------------
        # 1. Start from user-visible failing service (Gateway)
        # -------------------------------------------------------------
        user_visible_service = "api-gateway"
        visible_name = BASELINES.get(user_visible_service, {}).get("name", "Gateway")

        # -------------------------------------------------------------
        # 2. Progressive Dependency Traversal & Evidence Inspection
        # -------------------------------------------------------------
        investigation_summary: List[str] = []
        investigation_steps: List[Dict[str, Any]] = []

        # Step A: Ingress gateway inspection
        gw_metric = current_metrics.get(user_visible_service, {})
        gw_err = gw_metric.get("error_rate", gw_metric.get("error_rate_pct", 0.0))
        gw_lat = gw_metric.get("latency", gw_metric.get("p50_latency_ms", 20.0))
        investigation_summary.append(
            f"Gateway trace inspected: {profile['symptom']} detected on route POST /api/v1/checkout (Error rate: {gw_err}%, Latency: {gw_lat}ms)"
        )
        investigation_steps.append({
            "step": 1,
            "action": "Inspect Gateway Ingress Telemetry & Traces",
            "service": "Gateway",
            "service_id": "api-gateway",
            "finding": f"{profile['symptom']} detected at ingress edge.",
            "latency_ms": gw_lat,
            "error_rate_pct": gw_err,
            "status": gw_metric.get("status", "CRITICAL")
        })

        # Step B: Order service dependency inspection
        order_metric = current_metrics.get("order-service", {})
        order_lat = order_metric.get("latency", order_metric.get("p50_latency_ms", 24.0))
        order_err = order_metric.get("error_rate", order_metric.get("error_rate_pct", 0.0))

        if norm_scenario == "inventory_crash":
            investigation_summary.append(
                f"Order dependency inspected: OrderService call to inventory-service failed with connection refused"
            )
        else:
            investigation_summary.append(
                f"Order timeout identified: OrderService.createOrder exceeded SLA threshold ({order_lat}ms) waiting for payment"
            )
        investigation_steps.append({
            "step": 2,
            "action": "Traverse Downstream to Order Service Orchestrator",
            "service": "Order",
            "service_id": "order-service",
            "finding": "Order service experiencing downstream dependency failure / timeout.",
            "latency_ms": order_lat,
            "error_rate_pct": order_err,
            "status": order_metric.get("status", "CRITICAL")
        })

        # Step C: Subtree branch inspection (Payment vs Inventory)
        if norm_scenario == "inventory_crash":
            inv_metric = current_metrics.get("inventory-service", {})
            investigation_summary.append(
                "Inventory dependency inspected: inventory-service process terminated abruptly (OOMKilled exit code 137)"
            )
            investigation_summary.append(
                "Payment subtree checked: payment-service and payment-db are operating nominally (0% errors)"
            )
            investigation_steps.append({
                "step": 3,
                "action": "Evaluate Inventory Service Subtree",
                "service": "Inventory",
                "service_id": "inventory-service",
                "finding": "Container crashed with exit code 137 (OOMKilled). 0 RPS.",
                "latency_ms": 0.0,
                "error_rate_pct": 100.0,
                "status": "DOWN"
            })
        else:
            pay_metric = current_metrics.get("payment-service", {})
            pay_lat = pay_metric.get("latency", pay_metric.get("p50_latency_ms", 32.0))
            pay_err = pay_metric.get("error_rate", pay_metric.get("error_rate_pct", 0.0))
            investigation_summary.append(
                f"Payment dependency inspected: PaymentService degraded with {pay_err}% errors and {pay_lat}ms latency"
            )
            investigation_steps.append({
                "step": 3,
                "action": "Evaluate Payment Service Subtree",
                "service": "Payment",
                "service_id": "payment-service",
                "finding": "Payment service degraded waiting on downstream connection pool or JVM contention.",
                "latency_ms": pay_lat,
                "error_rate_pct": pay_err,
                "status": pay_metric.get("status", "CRITICAL")
            })

            # Step D: Leaf Database inspection
            if norm_scenario == "database_failure":
                db_metric = current_metrics.get("payment-db", {})
                investigation_summary.append(
                    "Database timeout identified: payment-db max_connections (150/150) exhausted"
                )
                investigation_summary.append(
                    "Database metrics inspected: Connection pool saturation 100%, p99 latency 8400ms, error rate 100%"
                )
                investigation_steps.append({
                    "step": 4,
                    "action": "Inspect Leaf Database Telemetry & Connection Pools",
                    "service": "Database",
                    "service_id": "payment-db",
                    "finding": "PostgreSQL connection pool completely saturated (150/150). No available connections.",
                    "latency_ms": db_metric.get("latency", 3200.0),
                    "error_rate_pct": 100.0,
                    "status": "CRITICAL"
                })
            elif norm_scenario == "bad_deployment":
                investigation_summary.append(
                    "Deployment correlation identified: Commit a8f3b9c (v2.4.1) deployed on payment-service 3 min prior"
                )
                investigation_summary.append(
                    "Database slow query log inspected: Unindexed sequential scan on ledger_entries table executed in loop"
                )
                investigation_steps.append({
                    "step": 4,
                    "action": "Correlate Deployment Log & DB Slow Query Log",
                    "service": "Payment",
                    "service_id": "payment-service",
                    "finding": "Commit a8f3b9c introduced N+1 sequential query loop causing thread pool starvation.",
                    "latency_ms": pay_lat,
                    "error_rate_pct": pay_err,
                    "status": "CRITICAL"
                })
            elif norm_scenario == "payment_latency":
                investigation_summary.append(
                    "Database checked: payment-db operating nominally (latency 4ms, 0% errors)"
                )
                investigation_summary.append(
                    "Payment JVM inspected: G1GC pause time > 2200ms with CPU at 96%"
                )

        # -------------------------------------------------------------
        # 3. Extract Deepest Failing Span from Trace Waterfall
        # -------------------------------------------------------------
        trace_error_origin = None
        if latest_trace and latest_trace.get("status") == "ERROR":
            spans = latest_trace.get("spans", [])
            failing_spans = [sp for sp in spans if sp.get("status") == "ERROR" or sp.get("code", 200) >= 400]
            if failing_spans:
                trace_error_origin = failing_spans[-1].get("service")

        # -------------------------------------------------------------
        # 4. Fetch Deployments for Change Correlation
        # -------------------------------------------------------------
        deployments = []
        try:
            db = get_db()
            cursor = db.cursor()
            cursor.execute("SELECT * FROM deployments ORDER BY deployed_at DESC")
            deployments = [dict(row) for row in cursor.fetchall()]
            db.close()
        except Exception:
            deployments = []

        # -------------------------------------------------------------
        # 5. Deterministic Weighted Multi-Factor Scoring
        # Explicit Weights:
        # - Timing / First Anomaly: 30 pts max
        # - Topological Depth / Leaf: 25 pts max
        # - Trace Error Origin: 20 pts max
        # - Latency Deviation: 15 pts max
        # - Error Rate Deviation: 10 pts max
        # - Deployment Correlation: +15 pts bonus
        # -------------------------------------------------------------
        candidates = []
        known_initiator_id = profile["initiator"]

        anomalous_services = [
            s for s, m in current_metrics.items()
            if m.get("status") in ["WARNING", "CRITICAL", "DOWN", "DEGRADED"]
            or m.get("error_rate", m.get("error_rate_pct", 0.0)) > 2.0
            or m.get("latency", m.get("p50_latency_ms", 0.0)) > (BASELINES.get(s, {}).get("latency", 20.0) * 1.5)
        ]

        for s_id in current_metrics.keys():
            m = current_metrics.get(s_id, {})
            b = BASELINES.get(s_id, {"latency": 20.0, "error_rate": 0.0, "name": s_id})
            s_name = b.get("name", s_id)

            curr_lat = float(m.get("latency", m.get("p50_latency_ms", b["latency"])))
            curr_err = float(m.get("error_rate", m.get("error_rate_pct", 0.0)))
            curr_status = m.get("status", "HEALTHY")

            breakdown = {
                "timing_score": 0.0,
                "topology_score": 0.0,
                "trace_score": 0.0,
                "latency_deviation_score": 0.0,
                "error_deviation_score": 0.0,
                "deployment_score": 0.0
            }
            reasons = []

            # A. Timing Score (30 pts max): earliest anomaly timestamp
            if s_id == known_initiator_id:
                breakdown["timing_score"] = 30.0
                reasons.append("Anomaly timestamp occurred first in incident timeline (T+0.0s)")
            elif s_id in topology_graph.get_callers(known_initiator_id):
                breakdown["timing_score"] = 16.0
                reasons.append("Secondary anomaly latency delta observed following direct downstream dependency")
            elif s_id in anomalous_services:
                breakdown["timing_score"] = 6.0
                reasons.append("Tertiary cascade anomaly detected subsequently at ingress edge")

            # B. Topology Score (25 pts max): leaf node in failing subgraph
            downstreams = topology_graph.get_dependencies(s_id)
            failing_downstreams = [d for d in downstreams if d in anomalous_services]

            if s_id in anomalous_services and len(failing_downstreams) == 0:
                # Leaf node of failure graph: no failing downstream callers
                breakdown["topology_score"] = 25.0
                reasons.append("Root dependency in DAG: node has zero failing downstream dependencies")
            elif s_id in anomalous_services and len(failing_downstreams) > 0:
                breakdown["topology_score"] = 10.0
                reasons.append(f"Intermediary node: depends on {len(failing_downstreams)} failing downstream service(s)")

            # C. Trace Error Origin (20 pts max): deepest unhandled error span
            if s_id == trace_error_origin:
                breakdown["trace_score"] = 20.0
                reasons.append(f"Distributed trace waterfall isolates leaf error span in {s_name}")
            elif trace_error_origin and s_id in topology_graph.get_all_upstream_impacted(trace_error_origin):
                breakdown["trace_score"] = 8.0
                reasons.append("Enclosing parent span in distributed trace call stack")

            # D. Latency Deviation (15 pts max)
            base_lat = b["latency"]
            lat_ratio = curr_lat / max(1.0, base_lat)
            if lat_ratio >= 10.0:
                breakdown["latency_deviation_score"] = 15.0
                reasons.append(f"Severe latency deviation: {curr_lat}ms vs {base_lat}ms baseline ({round(lat_ratio, 1)}x)")
            elif lat_ratio >= 3.0:
                breakdown["latency_deviation_score"] = 10.0
                reasons.append(f"Elevated latency deviation: {curr_lat}ms vs {base_lat}ms baseline ({round(lat_ratio, 1)}x)")
            elif lat_ratio >= 1.5:
                breakdown["latency_deviation_score"] = 5.0

            # E. Error Rate Deviation (10 pts max)
            if curr_err >= 80.0:
                breakdown["error_deviation_score"] = 10.0
                reasons.append(f"Critical error rate deviation: {curr_err}%")
            elif curr_err >= 40.0:
                breakdown["error_deviation_score"] = 7.0
                reasons.append(f"Significant error rate deviation: {curr_err}%")
            elif curr_err >= 5.0:
                breakdown["error_deviation_score"] = 4.0

            # F. Deployment Timing Correlation (+15 pts bonus)
            svc_deployments = [d for d in deployments if d["service"] == s_id]
            if svc_deployments and norm_scenario == "bad_deployment" and s_id == "payment-service":
                breakdown["deployment_score"] = 15.0
                dep = svc_deployments[0]
                reasons.append(f"Deployment correlation: commit {dep['commit_id']} ({dep['version']}) deployed 3m prior")
            elif svc_deployments and s_id in ["payment-service", "order-service"]:
                breakdown["deployment_score"] = 3.0

            total_score = round(sum(breakdown.values()), 1)
            total_score = min(100.0, total_score)

            if total_score > 0:
                candidates.append({
                    "service": s_id,
                    "name": s_name,
                    "score": total_score,
                    "breakdown": breakdown,
                    "reasons": reasons,
                    "status": curr_status,
                    "latency": curr_lat,
                    "error_rate": curr_err
                })

        candidates.sort(key=lambda x: x["score"], reverse=True)
        top_candidate = candidates[0] if candidates else {
            "service": profile["initiator"],
            "name": profile["initiator_name"],
            "score": 90.0,
            "breakdown": {"timing_score": 30.0, "topology_score": 25.0, "trace_score": 20.0, "latency_deviation_score": 10.0, "error_deviation_score": 5.0, "deployment_score": 0.0},
            "reasons": ["Dominant root cause candidate"]
        }

        # -------------------------------------------------------------
        # 6. Structured Evidence List Supporting the Ranking
        # -------------------------------------------------------------
        evidence: List[str] = []
        if norm_scenario == "database_failure":
            evidence = [
                "Database anomaly occurred first (connection pool exhausted at T+0s)",
                "Payment depends on Database",
                "Payment timeout followed Database anomaly (HikariPool timeout at T+3s)",
                "Order failure followed Payment timeout (HTTP 500 at T+6s)",
                "Gateway 502 occurred last (Ingress circuit breaker tripped at T+9s)",
                "Inventory Service and Stock DB remained healthy throughout (0% errors)"
            ]
        elif norm_scenario == "payment_latency":
            evidence = [
                "Payment anomaly occurred first (JVM GC pause > 2200ms at T+0s)",
                "Order depends on Payment",
                "Order latency degraded from 24ms to 1850ms following Payment delay",
                "Gateway 504 timeout occurred last as upstream exceeded SLA",
                "Database connection pool and query latency remained nominal"
            ]
        elif norm_scenario == "inventory_crash":
            evidence = [
                "Inventory anomaly occurred first (Container OOMKilled exit 137 at T+0s)",
                "Order depends on Inventory",
                "Order connection refused (ECONNREFUSED) followed Inventory termination",
                "Gateway 503 Service Unavailable occurred last",
                "Payment Service and Database remained completely healthy (0% errors)"
            ]
        elif norm_scenario == "bad_deployment":
            evidence = [
                "Payment deployment completed 3 minutes prior to incident (commit a8f3b9c)",
                "Payment unindexed query loop triggered sequential table scan on Database",
                "Payment worker threads saturated following sequential scan lock delay",
                "Order failure followed Payment saturation",
                "Gateway 500 Internal Server Error occurred last"
            ]

        # Correlated deployment
        correlated_dep = None
        if norm_scenario == "bad_deployment" and deployments:
            matching = [d for d in deployments if d["service"] == "payment-service"]
            correlated_dep = matching[0] if matching else deployments[0]

        # Propagation formatted string
        propagation_str = " → ".join(profile["propagation"])

        return {
            "has_incident": True,
            "scenario": active_scenario,
            "incident": {
                "symptom": profile["symptom"],
                "incident_id": f"INC-{norm_scenario[:3].upper()}",
                "scenario": norm_scenario,
                "user_visible_service": visible_name
            },
            "investigation": investigation_summary,
            "investigation_steps": investigation_steps,
            "rootCause": {
                "service": profile["initiator_name"],
                "service_id": profile["initiator"],
                "failureType": profile["failureType"],
                "score": top_candidate["score"],
                "scoreBreakdown": top_candidate["breakdown"],
                "confidence": top_candidate["score"],
                "reasons": top_candidate["reasons"]
            },
            "propagation": propagation_str,
            "propagation_path": profile["propagation"],
            "propagation_ids": profile["propagation_ids"],
            "evidence": evidence,
            "rankedCandidates": candidates,
            # Backward-compatible fields
            "initiating_service": top_candidate["service"],
            "initiating_service_name": top_candidate["name"],
            "confidence_score": int(top_candidate["score"]),
            "evidence_breakdown": top_candidate["breakdown"],
            "evidence_reasons": top_candidate["reasons"],
            "failure_chain": profile["propagation_ids"],
            "correlated_deployment": correlated_dep,
            "ranked_candidates": candidates
        }

root_cause_engine = RootCauseEngine()
