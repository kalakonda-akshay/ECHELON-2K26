import time
from typing import Dict, List, Any, Optional
from backend.graph_engine import topology_graph

class BlastRadiusEngine:
    """
    Computes blast radius and impact boundaries for active or simulated incidents.
    Categorizes microservices into:
      1. Root Cause Initiator
      2. Currently Affected (experiencing anomalies, elevated error rate, or latency)
      3. Potentially Exposed / At-Risk (reachable in dependency DAG from affected nodes)
      4. Isolated / Healthy (unaffected branches)
    Also computes critical propagation path and customer-facing business impact.
    """

    def analyze(self, metrics: Dict[str, Any], root_cause_id: Optional[str] = None, scenario: Optional[str] = None) -> Dict[str, Any]:
        # Determine root cause if not explicitly provided
        if not root_cause_id:
            if scenario == "DATABASE_FAILURE":
                root_cause_id = "payment-db"
            elif scenario == "PAYMENT_LATENCY":
                root_cause_id = "payment-service"
            elif scenario == "INVENTORY_CRASH":
                root_cause_id = "inventory-service"
            elif scenario == "BAD_DEPLOYMENT":
                root_cause_id = "payment-service"
            else:
                candidates = [s for s, m in metrics.items() if m.get("status") in ["CRITICAL", "DOWN"]]
                root_cause_id = candidates[0] if candidates else "api-gateway"

        total_services = len(metrics)
        currently_affected = []
        isolated_healthy = []

        for s_id, m in metrics.items():
            status = m.get("status", "HEALTHY")
            err = m.get("error_rate", 0.0)
            lat = m.get("latency", 20.0)
            if status != "HEALTHY" or err > 2.0 or lat > 200.0:
                currently_affected.append({
                    "service_id": s_id,
                    "name": m.get("name", s_id),
                    "status": status,
                    "error_rate": err,
                    "latency_ms": lat,
                    "is_root_cause": (s_id == root_cause_id)
                })
            else:
                isolated_healthy.append({
                    "service_id": s_id,
                    "name": m.get("name", s_id),
                    "status": status,
                    "error_rate": err,
                    "latency_ms": lat
                })

        affected_ids = {a["service_id"] for a in currently_affected}

        # Potentially exposed: healthy services that have an edge to/from affected services
        potentially_exposed = []
        for s in isolated_healthy:
            s_id = s["service_id"]
            deps = topology_graph.get_dependencies(s_id)
            callers = topology_graph.get_callers(s_id)
            if any(dep in affected_ids for dep in deps):
                potentially_exposed.append({
                    **s,
                    "exposure_reason": f"Directly depends on affected service ({', '.join(dep for dep in deps if dep in affected_ids)})"
                })
            elif any(caller in affected_ids for caller in callers):
                potentially_exposed.append({
                    **s,
                    "exposure_reason": f"Called by degraded upstream service ({', '.join(caller for caller in callers if caller in affected_ids)})"
                })

        exposed_ids = {p["service_id"] for p in potentially_exposed}
        truly_isolated = [s for s in isolated_healthy if s["service_id"] not in exposed_ids]

        # Critical path calculation from root_cause up to api-gateway
        critical_path = []
        if root_cause_id == "payment-db":
            critical_path = ["payment-db", "payment-service", "order-service", "api-gateway"]
        elif root_cause_id == "payment-service":
            critical_path = ["payment-service", "order-service", "api-gateway"]
        elif root_cause_id == "inventory-service":
            critical_path = ["inventory-service", "order-service", "api-gateway"]
        else:
            critical_path = [root_cause_id, "api-gateway"] if root_cause_id != "api-gateway" else ["api-gateway"]

        # Customer impact estimation
        gw_metric = metrics.get("api-gateway", {})
        gw_err = gw_metric.get("error_rate", 0.0)
        gw_lat = gw_metric.get("latency", 25.0)

        if gw_err > 50.0:
            impact_level = "CRITICAL_OUTAGE"
            impact_summary = "Major transaction failure; checkout flows returning HTTP 502"
        elif gw_err > 5.0 or gw_lat > 500.0:
            impact_level = "DEGRADED_EXPERIENCE"
            impact_summary = "High checkout latency and intermittent HTTP 500/504 errors"
        elif len(currently_affected) > 0:
            impact_level = "INTERNAL_AT_RISK"
            impact_summary = "Downstream dependencies anomalous; ingress circuit breaker shielding external users"
        else:
            impact_level = "NOMINAL"
            impact_summary = "All services operational within SLA limits"

        affected_pct = round((len(currently_affected) / total_services) * 100, 1) if total_services else 0.0

        return {
            "root_cause_id": root_cause_id,
            "root_cause_name": metrics.get(root_cause_id, {}).get("name", root_cause_id),
            "total_services": total_services,
            "affected_count": len(currently_affected),
            "affected_percentage": affected_pct,
            "impact_level": impact_level,
            "impact_summary": impact_summary,
            "currently_affected": currently_affected,
            "potentially_exposed": potentially_exposed,
            "isolated_healthy": truly_isolated,
            "critical_path": critical_path,
            "customer_impact": {
                "impacted_endpoints": ["POST /api/v1/checkout", "POST /api/v1/payments/charge"] if "payment" in root_cause_id or "order" in affected_ids else ["GET /api/v1/inventory"],
                "failed_transactions_pct": round(gw_err, 1),
                "gateway_latency_ms": round(gw_lat, 1),
                "estimated_affected_users_per_min": int((gw_metric.get("rps", 150) * 60) * (gw_err / 100.0)),
                "sla_breached": (gw_lat > 350.0 or gw_err > 1.0)
            }
        }

blast_radius_engine = BlastRadiusEngine()
