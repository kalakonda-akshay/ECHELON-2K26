from typing import Dict, List, Any, Optional

class AIIncidentExplainer:
    def __init__(self):
        pass

    def explain(self, diagnosis: Dict[str, Any], steps: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generates structured SRE-grade root cause analysis and technical explanations."""
        if not diagnosis.get("has_incident"):
            return {
                "headline": "System Operating in Baseline Health",
                "executive_summary": "All microservices, dependencies, and data stores are within nominal SLO thresholds. Zero active incidents or cascading degradation detected.",
                "why_root_cause": [],
                "telemetry_evidence": [],
                "technical_narrative": "Continuously monitoring ingress traffic, trace spans, and database connection pools."
            }

        initiator = diagnosis.get("initiating_service")
        initiator_name = diagnosis.get("initiating_service_name", initiator)
        score = diagnosis.get("confidence_score", 0)
        chain = diagnosis.get("failure_chain", [])
        reasons = diagnosis.get("evidence_reasons", [])
        deployment = diagnosis.get("correlated_deployment")
        scenario = diagnosis.get("scenario")

        chain_str = " ➔ ".join(chain) if chain else "Isolated"

        # Construct deterministic SRE technical explanation
        if scenario == "database_failure":
            headline = f"Critical Cascade Originating from {initiator_name}: Connection Pool Saturation"
            summary = (
                f"TraceLens identified {initiator_name} as the root failure source with an evidence score of {score}/100. "
                f"The PostgreSQL connection pool reached 100% capacity (150/150 max_connections), causing socket timeouts "
                f"in Payment Service. This cascaded up to Order Service retries, ultimately manifesting as HTTP 502 Bad Gateway "
                f"errors at the API Gateway."
            )
            narrative = (
                f"1. Telemetry recorded 150 active client connections against {initiator_name}, saturating the configured pool limit.\n"
                f"2. Payment Service worker threads blocked for >30000ms attempting to acquire idle connections from HikariCP.\n"
                f"3. Order Service's internal circuit breaker tripped after 3 consecutive 2000ms charge request timeouts.\n"
                f"4. API Gateway surfaced HTTP 502 Bad Gateway across all user checkout transactions."
            )

        elif scenario == "payment_latency":
            headline = f"Severe Latency Degradation Originating in {initiator_name}: JVM GC Pause"
            summary = (
                f"TraceLens identified {initiator_name} as the root latency initiator with an evidence score of {score}/100. "
                f"A prolonged JVM garbage collection pause (3840ms G1 Evacuation) locked worker threads and exceeded "
                f"the 2000ms upstream SLA threshold, degrading checkout throughput."
            )
            narrative = (
                f"1. Memory heap utilization on {initiator_name} reached 94.5%, triggering an emergency full GC cycle.\n"
                f"2. Worker thread processing froze for 3840ms, causing incoming Order Service requests to back up in queue.\n"
                f"3. Order Service experienced downstream timeouts, propagating warning-level latency spikes to the ingress gateway."
            )

        elif scenario == "inventory_crash":
            headline = f"Single Point of Failure Crash: {initiator_name} Container Termination"
            summary = (
                f"TraceLens isolated {initiator_name} as the root cause with an evidence score of {score}/100. "
                f"The container process terminated abruptly (exit code 137, OOMKilled), causing immediate socket connection "
                f"refusals and cascading into partial checkout order rejections."
            )
            narrative = (
                f"1. {initiator_name} memory cgroup exceeded limits and was terminated by the Linux OOM killer.\n"
                f"2. Order Service received ECONNREFUSED on tcp://inventory-service:3003 during reservation checks.\n"
                f"3. Ingress gateway responded with HTTP 503 Service Unavailable for stock reservation endpoints."
            )

        elif scenario == "bad_deployment":
            commit_id = deployment.get("commit_id", "a8f3b9c") if deployment else "a8f3b9c"
            version = deployment.get("version", "v2.4.1") if deployment else "v2.4.1"
            headline = f"Performance Regression Associated with Deployment {version} ({commit_id})"
            summary = (
                f"TraceLens detected an unindexed query regression in {initiator_name} with an evidence score of {score}/100. "
                f"Suspected change: Release {version} (commit {commit_id}) deployed 3 minutes prior introduced a sequential table scan "
                f"that exhausted database IOPS and cascaded across dependent order services."
            )
            narrative = (
                f"1. Release {version} deployed commit {commit_id} to production.\n"
                f"2. Query profiler captured sequential scans on ledger_entries averaging 2450ms per transaction.\n"
                f"3. High temporal correlation and query span execution match the exact timestamp of the onset of errors."
            )
        else:
            headline = f"Telemetry Anomaly Detected in {initiator_name}"
            summary = f"TraceLens isolated {initiator_name} with score {score}/100."
            narrative = "Incident investigation active."

        why_root_cause = reasons

        return {
            "headline": headline,
            "executive_summary": summary,
            "failure_chain": chain_str,
            "confidence_score": score,
            "why_root_cause": why_root_cause,
            "technical_narrative": narrative,
            "associated_deployment": deployment
        }

ai_explainer = AIIncidentExplainer()

if __name__ == "__main__":
    from backend.simulator import simulator
    from backend.root_cause_engine import root_cause_engine
    from backend.adaptive_engine import adaptive_engine
    simulator.inject_failure("database_failure")
    t = simulator.tick()
    diag = root_cause_engine.analyze(t["current_metrics"], t["latest_trace"], "database_failure")
    steps = adaptive_engine.investigate("database_failure", t["current_metrics"], t["latest_trace"])
    exp = ai_explainer.explain(diag, steps)
    print("Headline:", exp["headline"])
    print("Summary:", exp["executive_summary"])
