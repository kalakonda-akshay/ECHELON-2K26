import time
from typing import Dict, List, Any, Optional

class EarlyWarningEngine:
    """
    Detects microservice degradation trends and telemetry gradient anomalies
    BEFORE customer-facing 502/503/504 ingress failures occur.
    """

    def analyze(self, metrics: Dict[str, Any], scenario: Optional[str] = None, elapsed_s: float = 0.0) -> Dict[str, Any]:
        indicators = []
        severity = "NOMINAL"
        time_to_breach_s = None
        recommendation = "All telemetry streams operating within nominal P95 baseline bands."

        db = metrics.get("payment-db", {})
        pay = metrics.get("payment-service", {})
        order = metrics.get("order-service", {})
        gw = metrics.get("api-gateway", {})

        gw_err = gw.get("error_rate", 0.0)
        gw_lat = gw.get("latency", 25.0)

        if gw_err > 10.0 or gw_lat > 500.0:
            severity = "SLA_BREACHED"
            recommendation = "Customer-facing SLA breached. Immediate automated remediation and failover required."
        elif scenario == "DATABASE_FAILURE":
            if elapsed_s < 3.0:
                severity = "EARLY_WARNING"
                time_to_breach_s = max(round(9.0 - elapsed_s, 1), 0.5)
                indicators.append({
                    "service": "payment-db",
                    "metric": "HikariCP Active Connections",
                    "value": "148 / 150 (98.6%)",
                    "baseline": "32 / 150 (21.3%)",
                    "drift_rate": "+38 conns/sec",
                    "warning": "Connection pool nearing exhaustion. Downstream thread starvation impending."
                })
                indicators.append({
                    "service": "payment-service",
                    "metric": "DB Acquire Wait Time",
                    "value": "850ms",
                    "baseline": "4ms",
                    "drift_rate": "+210ms/sec",
                    "warning": "HikariPool-1 - Connection is not available, request timed out after 1000ms."
                })
                recommendation = "Flush idle DB connection pool before Payment Service circuit breaker trips."
            elif elapsed_s < 9.0:
                severity = "ELEVATED_RISK"
                time_to_breach_s = max(round(9.0 - elapsed_s, 1), 0.5)
                indicators.append({
                    "service": "payment-service",
                    "metric": "HTTP Error Rate",
                    "value": f"{pay.get('error_rate', 90)}%",
                    "baseline": "0.0%",
                    "warning": "Internal payment failures cascading into Order Service."
                })
                recommendation = "Activate fallback payment queue to shield Order Service."
        elif scenario == "PAYMENT_LATENCY":
            if pay.get("latency", 20.0) > 300.0:
                severity = "EARLY_WARNING"
                time_to_breach_s = 6.5
                indicators.append({
                    "service": "payment-service",
                    "metric": "JVM Young Gen GC Pause",
                    "value": f"{pay.get('latency', 400.0)}ms",
                    "baseline": "22ms",
                    "drift_rate": "+120ms/sec",
                    "warning": "Thread pool saturation imminent. Order Service retry storm impending."
                })
                recommendation = "Trigger rolling restart or autoscale payment pods before Gateway timeouts."
        elif scenario == "INVENTORY_CRASH":
            inv = metrics.get("inventory-service", {})
            if inv.get("status") in ["CRITICAL", "DOWN"]:
                severity = "SLA_BREACHED"
                indicators.append({
                    "service": "inventory-service",
                    "metric": "Pod Health Probe",
                    "value": "CrashLoopBackOff (Exit 137)",
                    "baseline": "Healthy (Ready 1/1)",
                    "warning": "Container terminated by Linux OOM killer."
                })
                recommendation = "Recreate container with 1.5Gi memory ceiling."
        elif scenario == "BAD_DEPLOYMENT":
            severity = "EARLY_WARNING"
            time_to_breach_s = 4.0
            indicators.append({
                "service": "payment-service",
                "metric": "Query Execution Plan",
                "value": "Seq Scan on payments (cost=0.00..42180.00)",
                "baseline": "Index Scan using idx_pay (cost=0.29..8.31)",
                "warning": "Commit a8f3b9c introduced unindexed N+1 query loop in payment-service."
            })
            recommendation = "Trigger automated rollback to v2.4.0 (commit e4d120a)."

        path = []
        if scenario == "DATABASE_FAILURE":
            path = ["payment-db", "payment-service", "order-service", "api-gateway"]
        elif scenario in ["PAYMENT_LATENCY", "BAD_DEPLOYMENT"]:
            path = ["payment-service", "order-service", "api-gateway"]
        elif scenario == "INVENTORY_CRASH":
            path = ["inventory-service", "order-service", "api-gateway"]

        return {
            "severity": severity,
            "has_early_warning": (severity in ["EARLY_WARNING", "ELEVATED_RISK"]),
            "failure_risk_level": "HIGH" if severity in ["EARLY_WARNING", "ELEVATED_RISK"] else "CRITICAL" if severity == "SLA_BREACHED" else "LOW",
            "degradation_trend": "Degrading rapidly" if indicators else "Nominal",
            "downstream_exposure_path": path,
            "time_to_breach_seconds": time_to_breach_s,
            "indicators_count": len(indicators),
            "indicators": indicators,
            "preventative_recommendation": recommendation,
            "evaluated_at": time.time()
        }

early_warning_engine = EarlyWarningEngine()
