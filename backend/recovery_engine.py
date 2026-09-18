import uuid
import json
import time
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from backend.simulator import simulator
from backend.database import get_db

# Baseline targets for verification comparisons
BASELINE_TARGETS = {
    "gateway_p99_max_ms": 150.0,
    "error_rate_target_pct": 0.0,
    "max_pool_usage_pct": 60.0
}

class RecoveryEngine:
    def __init__(self):
        self.last_recovery_record: Optional[Dict[str, Any]] = None

    def get_recommendation(self, scenario: Optional[str], initiator: Optional[str]) -> Dict[str, Any]:
        """Provides context-appropriate recovery plan for every failure scenario."""
        if not scenario:
            return {
                "available": False,
                "action_id": None,
                "action_name": "No Action Required",
                "description": "System operating nominally. All service health probes green.",
                "risk_impact": "None",
                "target_service": None,
                "command": "echo 'System Healthy'"
            }

        scenario = scenario.lower().replace("-", "_")

        plans = {
            "database_failure": {
                "action_id": "act-db-reset",
                "action_name": "Reset Database Connection Pool & Terminate Idle Connections",
                "target_service": "payment-db",
                "description": "Executes pg_terminate_backend on idle transactions and increases HikariCP connection pool headroom. Clears pool lock contention.",
                "risk_impact": "LOW — Gracefully flushes 34 idle connections. Active transactions preserved. Zero downtime.",
                "command": "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle'; RESTART POOL;",
                "expected_recovery_time_s": 2.0
            },
            "payment_latency": {
                "action_id": "act-pay-restart",
                "action_name": "Restart Payment Service Pod & Reset JVM Heap",
                "target_service": "payment-service",
                "description": "Triggers rolling zero-downtime container restart with updated G1GC JVM parameters (-Xmx4g -XX:+UseG1GC). Clears memory pressure.",
                "risk_impact": "LOW — Traffic seamlessly routed to surviving replicas during rolling restart.",
                "command": "kubectl rollout restart deployment/payment-service -n production",
                "expected_recovery_time_s": 2.5
            },
            "inventory_crash": {
                "action_id": "act-inv-restart",
                "action_name": "Restart Inventory Service & Increase Memory Limits",
                "target_service": "inventory-service",
                "description": "Re-spawns inventory-service container with increased cgroup memory ceiling (from 512Mi to 1.5Gi) to permanently prevent OOMKilled crashes.",
                "risk_impact": "MEDIUM — Restores service from DOWN to HEALTHY. Warm-up cache populated in 1.5s.",
                "command": "kubectl set resources deployment/inventory-service --limits=memory=1536Mi && kubectl rollout undo deployment/inventory-service",
                "expected_recovery_time_s": 2.0
            },
            "bad_deployment": {
                "action_id": "act-rollback-v240",
                "action_name": "Rollback Payment Service to v2.4.0 (commit e4d120a)",
                "target_service": "payment-service",
                "description": "Rolls back payment-service from faulty v2.4.1 (commit a8f3b9c) to stable release v2.4.0 (commit e4d120a), removing the unindexed N+1 query loop.",
                "risk_impact": "MEDIUM — Reverts schema query contract to previous stable build. 0 data loss guaranteed.",
                "command": "git revert a8f3b9c --no-edit && kubectl rollout undo deployment/payment-service",
                "expected_recovery_time_s": 3.0
            }
        }

        plan = plans.get(scenario, plans["database_failure"])
        plan["available"] = True
        return plan

    def execute_recovery(self, action_id: str, approved_by: str = "oncall-sre@acme.corp") -> Dict[str, Any]:
        """Applies the approved remediation to modify actual simulator state."""
        current_scenario = simulator.active_scenario
        current_incident = simulator.active_incident_id
        start_ts = simulator.scenario_start_time

        if not current_scenario:
            return {"success": False, "message": "No active incident to recover."}

        # Modify actual simulator state
        simulator.apply_recovery()

        now_str = datetime.now(timezone.utc).isoformat()
        rec_id = f"REC-{uuid.uuid4().hex[:8]}"

        self.last_recovery_record = {
            "recovery_id": rec_id,
            "incident_id": current_incident,
            "scenario": current_scenario,
            "action_id": action_id,
            "approved_by": approved_by,
            "started_at": datetime.fromtimestamp(start_ts, tz=timezone.utc).isoformat() if start_ts else now_str,
            "executed_at": now_str
        }

        # Record in SQLite recoveries table
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO recoveries VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (rec_id, current_incident, action_id, approved_by, "EXECUTING", "PENDING_VERIFICATION", now_str, json.dumps({"scenario": current_scenario}))
        )
        db.commit()
        db.close()

        return {
            "success": True,
            "recovery_id": rec_id,
            "incident_id": current_incident,
            "action_id": action_id,
            "executed_at": now_str,
            "status": "EXECUTED",
            "message": "Remediation command dispatched. Actual simulator state mutated. Verification required."
        }

    def verify(self) -> Dict[str, Any]:
        """
        Runs post-recovery health checks:
        1. Check affected services status
        2. Check latency against baseline
        3. Check error rate against baseline
        4. Check dependency calls (synthetic transaction waterfall)
        5. Compare values against baseline across entire cluster
        Only when all pass is RECOVERY VERIFIED declared and persisted in history.
        """
        # Complete the recovery transition in the simulator state
        sim_res = simulator.complete_recovery()

        # Fetch fresh live telemetry post-recovery
        tick = simulator.tick()
        metrics = tick["current_metrics"]
        latest_trace = tick["latest_trace"]

        checks = []

        # Probe 1: Affected Services Health Check
        unhealthy_nodes = [s for s, m in metrics.items() if m.get("status") != "HEALTHY"]
        c1_passed = len(unhealthy_nodes) == 0
        checks.append({
            "name": "Affected Services Status Verification",
            "service": "all-services",
            "target": "All 6 services HEALTHY",
            "actual": f"{len(unhealthy_nodes)} unhealthy nodes ({', '.join(unhealthy_nodes) if unhealthy_nodes else 'All 6 Healthy'})",
            "passed": c1_passed
        })

        # Probe 2: Latency Against Baseline Target (< 150ms p99)
        gw = metrics.get("api-gateway", {})
        p99 = gw.get("p99_latency_ms", gw.get("latency", 20.0))
        c2_passed = p99 < BASELINE_TARGETS["gateway_p99_max_ms"]
        checks.append({
            "name": "Ingress & Downstream Latency vs SLA Baseline",
            "service": "api-gateway",
            "target": f"p99 < {BASELINE_TARGETS['gateway_p99_max_ms']}ms",
            "actual": f"p99 latency: {p99}ms",
            "passed": c2_passed
        })

        # Probe 3: Error Rate Against Baseline Target (0.0%)
        max_err = max(m.get("error_rate", m.get("error_rate_pct", 0.0)) for m in metrics.values())
        c3_passed = max_err == BASELINE_TARGETS["error_rate_target_pct"]
        checks.append({
            "name": "Cluster-Wide Error Rate vs Baseline",
            "service": "all-services",
            "target": "Error rate == 0.0%",
            "actual": f"Max cluster error rate: {max_err}%",
            "passed": c3_passed
        })

        # Probe 4: Dependency Calls & Synthetic Transaction Waterfall
        trace_ok = bool(latest_trace and latest_trace.get("status") == "OK" and latest_trace.get("status_code") == 200)
        checks.append({
            "name": "End-to-End Synthetic Dependency Call Probing",
            "service": "dependency-graph",
            "target": "Full waterfall status 200 OK across all spans",
            "actual": f"Transaction Status: {latest_trace.get('status')} (HTTP {latest_trace.get('status_code')})",
            "passed": trace_ok
        })

        # Probe 5: Infrastructure Connection Pool & Resource Comparison
        db_m = metrics.get("payment-db", {})
        pool_usage = db_m.get("pool_usage_pct", 20.0) or 20.0
        c5_passed = pool_usage < BASELINE_TARGETS["max_pool_usage_pct"]
        checks.append({
            "name": "Database Connection Pool Saturation vs Baseline",
            "service": "payment-db",
            "target": f"Pool usage < {BASELINE_TARGETS['max_pool_usage_pct']}%",
            "actual": f"Pool usage: {pool_usage}%",
            "passed": c5_passed
        })

        all_passed = all(c["passed"] for c in checks)
        verdict = "RECOVERY VERIFIED" if all_passed else "RECOVERY NOT VERIFIED — CONTINUE INVESTIGATION"

        # -------------------------------------------------------------
        # Store Completed Incident in SQLite History with all 9 fields
        # -------------------------------------------------------------
        now_str = datetime.now(timezone.utc).isoformat()
        if all_passed and self.last_recovery_record:
            rec = self.last_recovery_record
            inc_id = rec.get("incident_id") or f"INC-{uuid.uuid4().hex[:4].upper()}"
            scenario = rec.get("scenario", "DATABASE_FAILURE")
            started_at = rec.get("started_at", now_str)

            # Look up metadata based on scenario
            symptom_map = {
                "database_failure": "502 Bad Gateway",
                "payment_latency": "504 Gateway Timeout",
                "inventory_crash": "503 Service Unavailable",
                "bad_deployment": "500 Internal Server Error"
            }
            s_key = scenario.lower().replace("-", "_")
            symptom = symptom_map.get(s_key, "502 Bad Gateway")

            initiator_map = {
                "database_failure": "payment-db",
                "payment_latency": "payment-service",
                "inventory_crash": "inventory-service",
                "bad_deployment": "payment-service"
            }
            initiating_svc = initiator_map.get(s_key, "payment-db")

            evidence_items = [
                f"{initiating_svc} anomaly occurred first in incident timeline",
                "Cascaded upstream through intermediate service dependencies",
                "Verified 0% error rate across all nodes after remediation",
                "Synthetic transaction waterfall succeeded with HTTP 200 OK"
            ]

            assoc_deploy = None
            if s_key == "bad_deployment":
                assoc_deploy = json.dumps({"commit_id": "a8f3b9c", "version": "v2.4.1", "service": "payment-service"})

            recovery_action_name = self.get_recommendation(s_key, initiating_svc).get("action_name", "Remediation Playbook")

            try:
                db = get_db()
                cursor = db.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO incidents (
                        id, started_at, symptom, initiating_service, evidence,
                        associated_deployment, recovery_action, verification_result,
                        resolved_at, duration_seconds, scenario, status, title,
                        summary, severity, failure_chain
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    inc_id,
                    started_at,
                    symptom,
                    initiating_svc,
                    json.dumps(evidence_items),
                    assoc_deploy,
                    recovery_action_name,
                    verdict,
                    now_str,
                    int(time.time() - (datetime.fromisoformat(started_at.replace("Z", "+00:00")).timestamp() if "T" in started_at else time.time())),
                    scenario,
                    "RESOLVED",
                    f"{initiating_svc} Incident ({scenario})",
                    f"Remediation executed: {recovery_action_name}. Verification passed all 5 health checks.",
                    "P0_CRITICAL",
                    json.dumps([initiating_svc, "order-service", "api-gateway"])
                ))
                db.commit()
                db.close()
            except Exception as e:
                print("Error saving incident to history:", e)

        return {
            "verified": all_passed,
            "verdict": verdict,
            "badge_color": "emerald" if all_passed else "rose",
            "timestamp": now_str,
            "checks": checks,
            "summary": "All 5 post-recovery health checks passed. Cluster telemetry returned to nominal baseline." if all_passed else "One or more post-recovery checks failed."
        }

recovery_engine = RecoveryEngine()
