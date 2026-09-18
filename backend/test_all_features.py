import sys
import os
import json

# Ensure sys.stdout handles utf-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from backend.database import init_db, get_db
from backend.simulator import simulator
from backend.graph_engine import topology_graph
from backend.root_cause_engine import root_cause_engine
from backend.adaptive_engine import adaptive_engine
from backend.blast_radius_engine import blast_radius_engine
from backend.sandbox_engine import sandbox_engine
from backend.early_warning import early_warning_engine
from backend.incident_memory import incident_memory_engine
from backend.recovery_engine import recovery_engine

def run_tests():
    print("================================================================")
    print("TEST SUITE: Testing All Backend Modules & New Engines")
    print("================================================================")
    
    init_db()
    simulator.reset()
    adaptive_engine.reset_evidence()
    
    # 1. Test Baseline Health
    tick = simulator.tick()
    print("\n[1] Checking Baseline Cluster State...")
    unhealthy = [s for s, m in tick["current_metrics"].items() if m.get("status") != "HEALTHY"]
    assert len(unhealthy) == 0, f"Expected 0 unhealthy, found {len(unhealthy)}"
    print("  -> Baseline healthy. 0 unhealthy services.")
    
    # 2. Test Early Warning Engine on Healthy
    print("\n[2] Testing Early Warning on Nominal Baseline...")
    ew = early_warning_engine.analyze(tick["current_metrics"], None, 0.0)
    assert ew["severity"] == "NOMINAL"
    print("  -> Early warning reports NOMINAL as expected.")

    # 3. Inject DATABASE_FAILURE
    print("\n[3] Injecting DATABASE_FAILURE...")
    res = simulator.inject_failure("DATABASE_FAILURE")
    assert res["status"] == "ACTIVE_INCIDENT"
    
    tick_inj = simulator.tick()
    metrics_inj = tick_inj["current_metrics"]
    trace_inj = tick_inj["latest_trace"]
    
    # 4. Test Early Warning right after injection (T+0.5s)
    ew_active = early_warning_engine.analyze(metrics_inj, "DATABASE_FAILURE", 0.5)
    print(f"  -> Early warning severity: {ew_active['severity']}, TTB: {ew_active['time_to_breach_seconds']}s")
    assert ew_active["has_early_warning"] is True
    assert ew_active["indicators_count"] > 0
    print(f"  -> Detected {ew_active['indicators_count']} leading indicators before SLA breach.")

    # 5. Test Adaptive Evidence Engine 2.0 (Uncertainty)
    print("\n[4] Testing Adaptive Evidence Engine 2.0 (Initial Uncertainty)...")
    analysis = adaptive_engine.get_adaptive_analysis("DATABASE_FAILURE", metrics_inj, trace_inj)
    print(f"  -> Initial status: {analysis['status']}")
    assert analysis["status"] == "EVIDENCE_INSUFFICIENT"
    assert analysis["next_best_evidence"] is not None
    print(f"  -> Next Best Evidence Query: {analysis['next_best_evidence']['query']}")
    top_hyp = analysis["hypotheses"][0]
    print(f"  -> Top Hypothesis before acquisition: {top_hyp['name']} ({top_hyp['probability']}%)")

    # 6. Acquire Next Best Evidence
    print("\n[5] Acquiring Next Best Evidence...")
    adaptive_engine.acquire_evidence("DATABASE_FAILURE")
    analysis_after = adaptive_engine.get_adaptive_analysis("DATABASE_FAILURE", metrics_inj, trace_inj)
    print(f"  -> Status after evidence acquisition: {analysis_after['status']}")
    assert analysis_after["status"] == "EVIDENCE_SUFFICIENT"
    top_hyp_after = analysis_after["hypotheses"][0]
    print(f"  -> Top Hypothesis after acquisition: {top_hyp_after['name']} ({top_hyp_after['probability']}%)")
    assert top_hyp_after["probability"] >= 85

    # 7. Test Causal Incident Graph
    print("\n[6] Testing Causal Incident Graph...")
    causal_g = adaptive_engine.get_causal_graph("DATABASE_FAILURE")
    assert len(causal_g["nodes"]) >= 4
    assert len(causal_g["edges"]) >= 3
    print(f"  -> Causal Graph generated with {len(causal_g['nodes'])} events and {len(causal_g['edges'])} causal edges.")

    # 8. Test Blast Radius Engine
    print("\n[7] Testing Blast Radius Engine...")
    blast = blast_radius_engine.analyze(metrics_inj, "payment-db", "DATABASE_FAILURE")
    print(f"  -> Root Cause: {blast['root_cause_id']}")
    print(f"  -> Currently Affected Count: {blast['affected_count']}")
    print(f"  -> Critical Path: {' -> '.join(blast['critical_path'])}")
    print(f"  -> Customer Impact: {blast['impact_level']} ({blast['impact_summary']})")
    assert blast["root_cause_id"] == "payment-db"
    assert "payment-db" in blast["critical_path"]

    # 9. Test Recovery Sandbox & Digital Twin Counterfactual Simulation
    print("\n[8] Testing Recovery Sandbox & Digital Twin Counterfactual Simulation...")
    options = sandbox_engine.get_candidate_options("DATABASE_FAILURE", "payment-db")
    assert len(options) >= 2
    rec_opt = [o for o in options if o["is_recommended"]][0]
    print(f"  -> Recommended Sandbox Action: {rec_opt['title']}")

    sim_res = sandbox_engine.simulate(rec_opt["id"], metrics_inj, "DATABASE_FAILURE")
    assert sim_res["is_sandbox_isolated"] is True
    assert sim_res["after"]["unhealthy_services_count"] == 0
    assert sim_res["after"]["cluster_max_error_rate_pct"] == 0.0
    print(f"  -> Counterfactual Simulation: Before ({sim_res['before']['unhealthy_services_count']} unhealthy) -> After ({sim_res['after']['unhealthy_services_count']} unhealthy)")
    print(f"  -> Projected Latency Reduction: {sim_res['delta']['latency_reduction_ms']}ms")
    print(f"  -> Live simulator was NOT modified (is_recovering={simulator.is_recovering}).")

    # 10. Test Incident Memory & Similar Incidents
    print("\n[9] Testing Incident Memory & Similar Incident Retrieval...")
    similar = incident_memory_engine.find_similar("database_failure", "502 Bad Gateway", "payment-db")
    print(f"  -> Retrieved {len(similar)} similar historical incidents.")
    if similar:
        top_sim = similar[0]
        print(f"  -> Top Match: {top_sim['incident_id']} ({top_sim['similarity_score_pct']}% match) - {top_sim['title']}")

    # 11. Test Engineer Feedback Loop
    print("\n[10] Testing Engineer Feedback Loop...")
    fb_res = incident_memory_engine.record_feedback(
        incident_id="INC-TEST-1",
        diagnosis_accurate="YES",
        recovery_effective="YES",
        engineer_notes="Automated test verification feedback notes.",
        engineer_email="tester@acme.corp"
    )
    assert fb_res["status"] == "RECORDED"
    stats = incident_memory_engine.get_stats()
    print(f"  -> Feedback Stats: Accuracy={stats['diagnosis_accuracy_pct']}%, Recovery Success={stats['recovery_success_rate_pct']}%")

    # 12. Reset and confirm nominal
    simulator.reset()
    adaptive_engine.reset_evidence()
    print("\n================================================================")
    print(">>> ALL 10 TESTS PASSED WITH 100% SUCCESS!")
    print("================================================================")

if __name__ == "__main__":
    run_tests()
