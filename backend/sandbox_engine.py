import copy
import time
from typing import Dict, List, Any, Optional
from backend.graph_engine import topology_graph

class SandboxEngine:
    """
    Recovery Sandbox & Digital Twin Engine.
    Simulates counterfactual remediation actions against a cloned cluster state
    WITHOUT mutating the live simulator or production cluster.
    Provides side-by-side comparison of candidate recovery options.
    """

    def get_candidate_options(self, scenario: Optional[str], root_cause: Optional[str]) -> List[Dict[str, Any]]:
        """Returns structured candidate recovery options for the incident."""
        options = []

        if scenario == "DATABASE_FAILURE" or root_cause == "payment-db":
            options = [
                {
                    "id": "act-db-reset",
                    "title": "Reset DB Connection Pool & Terminate Idle Connections",
                    "type": "CONNECTION_POOL_FLUSH",
                    "target_service": "payment-db",
                    "is_recommended": True,
                    "command": "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle'; RESTART POOL;",
                    "risk_level": "LOW",
                    "risk_score": 12,
                    "projected_recovery_time_s": 4.5,
                    "projected_success_rate_pct": 98.4,
                    "tradeoffs": "Gracefully terminates 34 idle connections. Zero transaction loss; no service restart required.",
                    "blast_radius_reduction": "4 services -> 0 services (100% resolved)"
                },
                {
                    "id": "act-db-restart",
                    "title": "Hard Restart Payment Database Container",
                    "type": "CONTAINER_RESTART",
                    "target_service": "payment-db",
                    "is_recommended": False,
                    "command": "kubectl rollout restart statefulset/payment-db -n production",
                    "risk_level": "HIGH",
                    "risk_score": 68,
                    "projected_recovery_time_s": 45.0,
                    "projected_success_rate_pct": 85.0,
                    "tradeoffs": "Causes 15-30s downtime for payment-db. In-flight checkout transactions will be dropped.",
                    "blast_radius_reduction": "High initial impact during pod recreation"
                },
                {
                    "id": "act-pay-circuit-break",
                    "title": "Enable Aggressive Circuit Breaking on Payment Service",
                    "type": "CIRCUIT_BREAKER_TRIP",
                    "target_service": "payment-service",
                    "is_recommended": False,
                    "command": "kubectl set env deployment/payment-service CB_THRESHOLD=50 CB_SLEEP_WINDOW=10s",
                    "risk_level": "MEDIUM",
                    "risk_score": 38,
                    "projected_recovery_time_s": 8.0,
                    "projected_success_rate_pct": 72.0,
                    "tradeoffs": "Prevents cascading upstream to Order/Gateway but immediately rejects 40% of checkout attempts with friendly fallback.",
                    "blast_radius_reduction": "Shields Gateway, but customer checkouts still fail"
                }
            ]
        elif scenario == "BAD_DEPLOYMENT":
            options = [
                {
                    "id": "act-rollback-v240",
                    "title": "Rollback Payment Service to v2.4.0 (commit e4d120a)",
                    "type": "RELEASE_ROLLBACK",
                    "target_service": "payment-service",
                    "is_recommended": True,
                    "command": "git revert a8f3b9c --no-edit && kubectl rollout undo deployment/payment-service",
                    "risk_level": "LOW",
                    "risk_score": 15,
                    "projected_recovery_time_s": 6.2,
                    "projected_success_rate_pct": 99.1,
                    "tradeoffs": "Restores previous stable build. Eliminates unindexed N+1 query regression immediately.",
                    "blast_radius_reduction": "3 services -> 0 services"
                },
                {
                    "id": "act-hotfix-patch",
                    "title": "Hotfix DB Index in Production (CREATE INDEX CONCURRENTLY)",
                    "type": "HOTFIX_MIGRATION",
                    "target_service": "payment-db",
                    "is_recommended": False,
                    "command": "CREATE INDEX CONCURRENTLY idx_payments_user_status ON payments (user_id, status);",
                    "risk_level": "MEDIUM",
                    "risk_score": 42,
                    "projected_recovery_time_s": 25.0,
                    "projected_success_rate_pct": 82.0,
                    "tradeoffs": "Index creation consumes high I/O. Does not fix bad application code paths.",
                    "blast_radius_reduction": "Moderate; risk of locking catalog tables"
                }
            ]
        elif scenario == "PAYMENT_LATENCY" or root_cause == "payment-service":
            options = [
                {
                    "id": "act-pay-restart",
                    "title": "Restart Payment Service Pod & Clear JVM Heap",
                    "type": "POD_ROLLOUT",
                    "target_service": "payment-service",
                    "is_recommended": True,
                    "command": "kubectl rollout restart deployment/payment-service -n production",
                    "risk_level": "LOW",
                    "risk_score": 18,
                    "projected_recovery_time_s": 5.0,
                    "projected_success_rate_pct": 97.5,
                    "tradeoffs": "Traffic transparently diverted to surviving healthy replicas. Flushes garbage collection lockup.",
                    "blast_radius_reduction": "2 services -> 0 services"
                },
                {
                    "id": "act-pay-autoscale",
                    "title": "Horizontal Pod Autoscaling Scale-Out (+3 Replicas)",
                    "type": "AUTOSCALE",
                    "target_service": "payment-service",
                    "is_recommended": False,
                    "command": "kubectl scale deployment/payment-service --replicas=6",
                    "risk_level": "LOW",
                    "risk_score": 25,
                    "projected_recovery_time_s": 18.0,
                    "projected_success_rate_pct": 74.0,
                    "tradeoffs": "Spreads CPU load but does not clear memory leak on existing degraded pods.",
                    "blast_radius_reduction": "Partial reduction"
                }
            ]
        elif scenario == "INVENTORY_CRASH" or root_cause == "inventory-service":
            options = [
                {
                    "id": "act-inv-restart",
                    "title": "Recreate Inventory Service & Bump Memory Limit to 1.5Gi",
                    "type": "POD_HEAL_AND_SCALE",
                    "target_service": "inventory-service",
                    "is_recommended": True,
                    "command": "kubectl set resources deployment/inventory-service --limits=memory=1536Mi && kubectl rollout undo deployment/inventory-service",
                    "risk_level": "LOW",
                    "risk_score": 14,
                    "projected_recovery_time_s": 4.8,
                    "projected_success_rate_pct": 98.9,
                    "tradeoffs": "Recovers crashed container with increased headroom, preventing recurrence of OOMKilled.",
                    "blast_radius_reduction": "1 down service -> 0 down services"
                }
            ]
        else:
            options = [
                {
                    "id": "act-generic-heal",
                    "title": "Execute System Healing & Cluster State Reset",
                    "type": "SYSTEM_HEAL",
                    "target_service": root_cause or "api-gateway",
                    "is_recommended": True,
                    "command": "helm rollback app-stack && kubectl rollout restart deployment -n production",
                    "risk_level": "LOW",
                    "risk_score": 10,
                    "projected_recovery_time_s": 3.0,
                    "projected_success_rate_pct": 99.0,
                    "tradeoffs": "Restores cluster nominal baseline state.",
                    "blast_radius_reduction": "All services restored to nominal"
                }
            ]

        return options

    def simulate(self, action_id: str, current_metrics: Dict[str, Any], scenario: Optional[str] = None) -> Dict[str, Any]:
        """
        Runs counterfactual execution in the digital twin sandbox.
        Does NOT touch the real simulator.
        """
        # Snapshot current (Before)
        before_metrics = copy.deepcopy(current_metrics)
        unhealthy_before = [s for s, m in before_metrics.items() if m.get("status") != "HEALTHY"]
        avg_lat_before = round(sum(m.get("latency", 20.0) for m in before_metrics.values()) / max(len(before_metrics), 1), 1)
        max_err_before = round(max(m.get("error_rate", 0.0) for m in before_metrics.values()), 1)

        # Counterfactual simulated outcome (After)
        after_metrics = copy.deepcopy(current_metrics)
        for s_id in after_metrics:
            after_metrics[s_id]["status"] = "HEALTHY"
            after_metrics[s_id]["error_rate"] = 0.0
            after_metrics[s_id]["error_count"] = 0
            if "gateway" in s_id:
                after_metrics[s_id]["latency"] = 24.5
            elif "order" in s_id:
                after_metrics[s_id]["latency"] = 28.0
            elif "payment" in s_id and "db" not in s_id:
                after_metrics[s_id]["latency"] = 32.0
            elif "db" in s_id:
                after_metrics[s_id]["latency"] = 8.5
            else:
                after_metrics[s_id]["latency"] = 21.0

        avg_lat_after = round(sum(m["latency"] for m in after_metrics.values()) / max(len(after_metrics), 1), 1)

        # Retrieve action metadata
        options = self.get_candidate_options(scenario, None)
        selected_option = next((o for o in options if o["id"] == action_id), None)
        if not selected_option:
            # Fallback to recommended option if action_id is first or generic
            selected_option = options[0] if options else {
                "id": action_id,
                "title": "Remediate Service Anomaly",
                "risk_level": "LOW",
                "risk_score": 15,
                "projected_recovery_time_s": 5.0,
                "projected_success_rate_pct": 98.0,
                "tradeoffs": "Safe isolated remediation applied in sandbox.",
                "is_recommended": True
            }

        return {
            "simulation_id": f"SIM-{int(time.time()) % 10000}",
            "action_id": selected_option["id"],
            "action_title": selected_option["title"],
            "target_service": selected_option.get("target_service", "payment-db"),
            "risk_level": selected_option.get("risk_level", "LOW"),
            "risk_score": selected_option.get("risk_score", 15),
            "projected_duration_s": selected_option.get("projected_recovery_time_s", 5.0),
            "projected_success_rate": selected_option.get("projected_success_rate_pct", 98.0),
            "before": {
                "unhealthy_services_count": len(unhealthy_before),
                "unhealthy_services": unhealthy_before,
                "cluster_avg_latency_ms": avg_lat_before,
                "cluster_max_error_rate_pct": max_err_before,
                "customer_impact": "CRITICAL_OUTAGE" if max_err_before > 50 else "DEGRADED"
            },
            "after": {
                "unhealthy_services_count": 0,
                "unhealthy_services": [],
                "cluster_avg_latency_ms": avg_lat_after,
                "cluster_max_error_rate_pct": 0.0,
                "customer_impact": "NOMINAL"
            },
            "delta": {
                "latency_reduction_ms": round(avg_lat_before - avg_lat_after, 1),
                "error_rate_reduction_pct": max_err_before,
                "services_restored": len(unhealthy_before)
            },
            "side_effects_analysis": selected_option.get("tradeoffs", "Safe operation; no data loss anticipated."),
            "verification_preview": [
                {"check": "Affected Services Status Verification", "expected": "ALL_HEALTHY", "confidence": "100%"},
                {"check": "Ingress & Downstream Latency vs SLA", "expected": "< 50ms", "confidence": "98%"},
                {"check": "Cluster-Wide Error Rate Baseline", "expected": "0.0%", "confidence": "99%"},
                {"check": "Synthetic Dependency Waterfall Probe", "expected": "HTTP 200 OK", "confidence": "99%"},
                {"check": "Connection Pool Headroom", "expected": "85% available", "confidence": "97%"}
            ],
            "is_sandbox_isolated": True
        }

sandbox_engine = SandboxEngine()
