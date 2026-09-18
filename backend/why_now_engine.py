import time
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from backend.graph_engine import topology_graph

class WhyNowEngine:
    """
    Why Now? & What Changed? Engine
    Answers:
      1. What initiated the incident? (Root Cause)
      2. WHY did it happen at this particular time? (Why Now? / Contributing Conditions)
      3. What changed between baseline and incident state? (What Changed? / Largest Deviation)
    """

    def analyze_why_now(self, scenario: Optional[str], metrics: Dict[str, Any], elapsed_seconds: float) -> Dict[str, Any]:
        if not scenario:
            return {
                "has_incident": False,
                "headline": "System operating within nominal baseline parameters",
                "timeline": [],
                "contributing_conditions": [],
                "primary_trigger": "None"
            }

        norm_scen = scenario.lower().replace("-", "_")

        if norm_scen == "database_failure":
            timeline = [
                {"timestamp": "12:03:10", "relative_s": -420, "event": "Database pool config update deployed (v15.3-pg)", "category": "DEPLOYMENT", "badge": "#8B5CF6"},
                {"timestamp": "12:06:25", "relative_s": -225, "event": "Traffic volume surged +31% across checkout endpoint", "category": "TRAFFIC", "badge": "#22D3EE"},
                {"timestamp": "12:08:40", "relative_s": -90, "event": "HikariCP active connections crossed 88% threshold", "category": "RESOURCE", "badge": "#F59E0B"},
                {"timestamp": "12:09:50", "relative_s": -20, "event": "Query latency anomaly detected (>1200ms p99)", "category": "METRIC", "badge": "#F59E0B"},
                {"timestamp": "12:10:10", "relative_s": 0, "event": "PostgreSQL connection pool 100% saturated (150/150)", "category": "ROOT_FAILURE", "badge": "#F43F5E"},
                {"timestamp": "12:10:15", "relative_s": 5, "event": "Downstream Payment Service worker threads blocked", "category": "CASCADE", "badge": "#F43F5E"},
                {"timestamp": "12:10:20", "relative_s": 10, "event": "API Gateway 502 Bad Gateway surfaced to users", "category": "IMPACT", "badge": "#F43F5E"}
            ]
            conditions = [
                {"factor": "Recent Infrastructure Deployment", "description": "max_connections was capped at 150 7 minutes prior", "weight": "+35%"},
                {"factor": "Traffic Influx Delta", "description": "Checkout RPC rate spiked from 140 rps to 184 rps (+31%)", "weight": "+30%"},
                {"factor": "Pool Exhaustion Saturation", "description": "Worker thread timeout exceeded 30,000ms acquire limit", "weight": "+25%"},
                {"factor": "Upstream Circuit Breaker Trip", "description": "Order Service tripped breaker after 3 failed payment attempts", "weight": "+10%"}
            ]
            primary_trigger = "Recent connection pool tuning combined with +31% organic checkout traffic surge"

        elif norm_scen == "payment_latency":
            timeline = [
                {"timestamp": "14:15:00", "relative_s": -300, "event": "Payment Gateway connector update deployed (v2.4.1)", "category": "DEPLOYMENT", "badge": "#8B5CF6"},
                {"timestamp": "14:17:30", "relative_s": -150, "event": "Third-party webhook retry storm triggered", "category": "TRAFFIC", "badge": "#22D3EE"},
                {"timestamp": "14:19:10", "relative_s": -50, "event": "JVM Old Gen Heap utilization reached 94.5%", "category": "RESOURCE", "badge": "#F59E0B"},
                {"timestamp": "14:19:55", "relative_s": -5, "event": "Stop-The-World Full GC pause initiated (3,840ms)", "category": "ROOT_FAILURE", "badge": "#F43F5E"},
                {"timestamp": "14:20:00", "relative_s": 0, "event": "HTTP 504 Gateway Timeout propagated to Order Service", "category": "CASCADE", "badge": "#F43F5E"}
            ]
            conditions = [
                {"factor": "Recent Release v2.4.1", "description": "Connector overhaul refactored batch webhook handling", "weight": "+40%"},
                {"factor": "Webhook Retry Accumulation", "description": "Repeated unacknowledged events retained in JVM heap", "weight": "+35%"},
                {"factor": "Prolonged GC Pause", "description": "Full GC evacuation locked worker threads for 3.84s", "weight": "+25%"}
            ]
            primary_trigger = "Memory retention in batch webhook processing triggering prolonged Stop-The-World GC pause"

        elif norm_scen == "inventory_crash":
            timeline = [
                {"timestamp": "09:00:00", "relative_s": -400, "event": "Warehouse reservation job schedule started", "category": "SYSTEM", "badge": "#22D3EE"},
                {"timestamp": "09:04:30", "relative_s": -130, "event": "SKU catalog cache evictions exceeded 25,000 keys/sec", "category": "RESOURCE", "badge": "#F59E0B"},
                {"timestamp": "09:06:10", "relative_s": -30, "event": "Memory threshold exceeded pod cgroup limit (512MB)", "category": "RESOURCE", "badge": "#F59E0B"},
                {"timestamp": "09:06:40", "relative_s": 0, "event": "Linux OOMKiller terminated Inventory container process (SIGKILL)", "category": "ROOT_FAILURE", "badge": "#F43F5E"},
                {"timestamp": "09:06:45", "relative_s": 5, "event": "HTTP 503 Service Unavailable returned by Order Service", "category": "CASCADE", "badge": "#F43F5E"}
            ]
            conditions = [
                {"factor": "Cache Eviction Spike", "description": "Rapid memory allocation inside Python dictionary cache", "weight": "+45%"},
                {"factor": "Strict Cgroup Memory Limit", "description": "Kubernetes container memory limit enforced at 512MB", "weight": "+35%"},
                {"factor": "No Fallback Circuit Breaker", "description": "Order Service lacked cache fallback for out-of-stock items", "weight": "+20%"}
            ]
            primary_trigger = "Unbounded memory allocation during SKU cache sync triggering container OOMKill"

        else: # bad_deployment
            timeline = [
                {"timestamp": "10:30:00", "relative_s": -180, "event": "Release v3.1.0 deployed to Order Service (commit b3f9901)", "category": "DEPLOYMENT", "badge": "#8B5CF6"},
                {"timestamp": "10:31:15", "relative_s": -105, "event": "Checkout idempotency loop introduced N+1 database queries", "category": "CODE_REGRESSION", "badge": "#F59E0B"},
                {"timestamp": "10:32:40", "relative_s": -20, "event": "DB query amplification factor spiked 14x per checkout", "category": "RESOURCE", "badge": "#F59E0B"},
                {"timestamp": "10:33:00", "relative_s": 0, "event": "Database latency cascaded back into HTTP 500 Internal Error", "category": "ROOT_FAILURE", "badge": "#F43F5E"}
            ]
            conditions = [
                {"factor": "Code Deployment v3.1.0", "description": "Commit b3f9901 merged without database query batching", "weight": "+50%"},
                {"factor": "Query Amplification", "description": "1 checkout transaction spawned 14 sequential SELECT queries", "weight": "+35%"},
                {"factor": "Pool Wait Starvation", "description": "Worker threads locked awaiting query completion", "weight": "+15%"}
            ]
            primary_trigger = "Release v3.1.0 introduced an N+1 query loop multiplying database load by 14x"

        return {
            "has_incident": True,
            "headline": f"Why Now Analysis for {scenario.upper()}",
            "primary_trigger": primary_trigger,
            "timeline": timeline,
            "contributing_conditions": conditions,
            "disclaimer": "Contributing conditions reflect correlated telemetry and deployment timings; correlation identifies contributing factors rather than sole definitive causation."
        }

    def analyze_what_changed(self, scenario: Optional[str], metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Compares baseline healthy telemetry against current incident telemetry."""
        baselines = {
            "api-gateway": {"latency": 18.0, "error_rate": 0.0, "connections": 42},
            "order-service": {"latency": 24.0, "error_rate": 0.0, "connections": 38},
            "payment-service": {"latency": 32.0, "error_rate": 0.0, "connections": 55},
            "inventory-service": {"latency": 15.0, "error_rate": 0.0, "connections": 22},
            "payment-db": {"latency": 4.0, "error_rate": 0.0, "connections": 45},
            "stock-db": {"latency": 3.0, "error_rate": 0.0, "connections": 18}
        }

        diffs = []
        max_deviation = {"service": "None", "metric": "None", "delta_pct": 0, "before": "0", "after": "0"}

        for s_id, base in baselines.items():
            current = metrics.get(s_id, {})
            curr_lat = current.get("latency", base["latency"])
            curr_err = current.get("error_rate", base["error_rate"])

            # Latency delta
            lat_delta = curr_lat - base["latency"]
            lat_pct = round((lat_delta / max(base["latency"], 1.0)) * 100, 1)
            diffs.append({
                "service": s_id,
                "metric": "Latency",
                "unit": "ms",
                "before": f"{base['latency']}ms",
                "after": f"{round(curr_lat, 1)}ms",
                "delta": f"+{round(lat_delta, 1)}ms",
                "delta_pct": lat_pct,
                "severity": "CRITICAL" if lat_pct > 300 else "WARNING" if lat_pct > 50 else "NORMAL"
            })

            # Error rate delta
            err_delta = curr_err - base["error_rate"]
            diffs.append({
                "service": s_id,
                "metric": "Error Rate",
                "unit": "%",
                "before": f"{base['error_rate']}%",
                "after": f"{round(curr_err, 1)}%",
                "delta": f"+{round(err_delta, 1)}%",
                "delta_pct": round(err_delta * 100, 1),
                "severity": "CRITICAL" if err_delta > 10 else "WARNING" if err_delta > 1 else "NORMAL"
            })

            if lat_pct > max_deviation["delta_pct"]:
                max_deviation = {
                    "service": s_id,
                    "metric": "Query Latency",
                    "delta_pct": lat_pct,
                    "before": f"{base['latency']}ms",
                    "after": f"{round(curr_lat, 1)}ms"
                }

        # Specific custom metric adjustments for scenario
        if scenario == "database_failure":
            max_deviation = {
                "service": "payment-db",
                "metric": "Database Connection Utilization",
                "delta_pct": 233.0,
                "before": "45/150 (30%)",
                "after": "150/150 (100% SATURATED)"
            }

        return {
            "has_incident": bool(scenario),
            "largest_deviation": max_deviation,
            "metrics_comparison": sorted(diffs, key=lambda x: x["delta_pct"], reverse=True)[:8]
        }

why_now_engine = WhyNowEngine()
