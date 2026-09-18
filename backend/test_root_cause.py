import time
import urllib.request
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def post(path: str, data: dict = None) -> dict:
    if data is None:
        data = {}
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get(path: str) -> dict:
    req = urllib.request.Request(f"{BASE_URL}{path}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def test_root_cause_scenarios():
    print("==================================================================")
    print("TEST SUITE: TraceRoute Root-Cause & Adaptive Evidence Engine")
    print("==================================================================")

    # Scenarios to test with their deterministic expected outcomes
    test_cases = [
        {
            "scenario": "DATABASE_FAILURE",
            "expected_symptom": "502 Bad Gateway",
            "expected_service": "Database",
            "expected_service_id": "payment-db",
            "expected_failure_type": "Connection Failure",
            "expected_propagation": "Database → Payment → Order → Gateway",
            "expected_propagation_path": ["Database", "Payment", "Order", "Gateway"],
            "key_evidence_substr": "connection pool exhausted"
        },
        {
            "scenario": "PAYMENT_LATENCY",
            "expected_symptom": "504 Gateway Timeout",
            "expected_service": "Payment",
            "expected_service_id": "payment-service",
            "expected_failure_type": "Latency Degradation / GC Pause",
            "expected_propagation": "Payment → Order → Gateway",
            "expected_propagation_path": ["Payment", "Order", "Gateway"],
            "key_evidence_substr": "JVM GC pause"
        },
        {
            "scenario": "INVENTORY_CRASH",
            "expected_symptom": "503 Service Unavailable",
            "expected_service": "Inventory",
            "expected_service_id": "inventory-service",
            "expected_failure_type": "Process Crash / OOMKilled",
            "expected_propagation": "Inventory → Order → Gateway",
            "expected_propagation_path": ["Inventory", "Order", "Gateway"],
            "key_evidence_substr": "OOMKilled"
        },
        {
            "scenario": "BAD_DEPLOYMENT",
            "expected_symptom": "500 Internal Server Error",
            "expected_service": "Payment",
            "expected_service_id": "payment-service",
            "expected_failure_type": "Deployment Regression (N+1 Query)",
            "expected_propagation": "Payment → Database → Order → Gateway",
            "expected_propagation_path": ["Payment", "Database", "Order", "Gateway"],
            "key_evidence_substr": "a8f3b9c"
        }
    ]

    for tc in test_cases:
        scenario = tc["scenario"]
        print(f"\n------------------------------------------------------------------")
        print(f"RUNNING SCENARIO: {scenario}")
        print(f"------------------------------------------------------------------")

        # 1. Reset cluster to clean baseline
        post("/api/reset")
        time.sleep(0.2)

        # 2. Inject failure scenario
        print(f"  [1] Injecting scenario [{scenario}]...")
        inj = post("/api/failure/inject", {"scenario": scenario})
        assert inj["scenario"] == scenario, f"Expected {scenario}, got {inj['scenario']}"

        # Allow ticks to register
        time.sleep(0.5)

        # 3. Query the Root-Cause and Adaptive Evidence Engine
        print("  [2] Querying Root-Cause Engine (GET /api/root-cause)...")
        res = get("/api/root-cause")

        # Assert Incident details
        assert "incident" in res, "Missing 'incident' key in response"
        inc = res["incident"]
        print(f"      Incident Symptom: '{inc['symptom']}' (Visible on: {inc['user_visible_service']})")
        assert inc["symptom"] == tc["expected_symptom"], f"Expected symptom '{tc['expected_symptom']}', got '{inc['symptom']}'"

        # Assert Progressive Investigation
        assert "investigation" in res, "Missing 'investigation' list in response"
        investigation = res["investigation"]
        print(f"  [3] Progressive Investigation Steps ({len(investigation)} recorded):")
        for i, step in enumerate(investigation, 1):
            print(f"      {i}. {step}")
        assert len(investigation) >= 3, f"Expected at least 3 investigation steps, found {len(investigation)}"

        # Assert Root Cause
        assert "rootCause" in res, "Missing 'rootCause' key in response"
        rc = res["rootCause"]
        print(f"  [4] Identified Root Cause:")
        print(f"      Service:      {rc['service']} ({rc['service_id']})")
        print(f"      Failure Type: {rc['failureType']}")
        print(f"      Score:        {rc['score']}/100")
        assert rc["service"] == tc["expected_service"], f"Expected service '{tc['expected_service']}', got '{rc['service']}'"
        assert rc["service_id"] == tc["expected_service_id"], f"Expected service ID '{tc['expected_service_id']}', got '{rc['service_id']}'"
        assert rc["failureType"] == tc["expected_failure_type"], f"Expected failure type '{tc['expected_failure_type']}', got '{rc['failureType']}'"
        assert rc["score"] >= 50.0, f"Expected high confidence score (>=50.0), got {rc['score']}"

        # Assert Explainable Score Breakdown
        assert "scoreBreakdown" in rc, "Missing 'scoreBreakdown' inside rootCause"
        sb = rc["scoreBreakdown"]
        print(f"      Score Breakdown:")
        print(f"        • Timing Score:            {sb.get('timing_score')} pts")
        print(f"        • Topology Score:          {sb.get('topology_score')} pts")
        print(f"        • Trace Score:             {sb.get('trace_score')} pts")
        print(f"        • Latency Deviation Score: {sb.get('latency_deviation_score')} pts")
        print(f"        • Error Deviation Score:   {sb.get('error_deviation_score')} pts")
        print(f"        • Deployment Score:        {sb.get('deployment_score')} pts")
        for field in ["timing_score", "topology_score", "trace_score", "latency_deviation_score", "error_deviation_score"]:
            assert field in sb, f"Missing score breakdown component: {field}"

        # Assert Failure Propagation Path
        assert "propagation" in res, "Missing 'propagation' in response"
        propagation = res["propagation"]
        print(f"  [5] Failure Propagation Path:")
        print(f"      {propagation}")
        assert propagation == tc["expected_propagation"], f"Expected propagation '{tc['expected_propagation']}', got '{propagation}'"

        # Assert Supporting Evidence
        assert "evidence" in res, "Missing 'evidence' list in response"
        evidence = res["evidence"]
        print(f"  [6] Supporting Evidence Statements ({len(evidence)} items):")
        for ev in evidence:
            print(f"        • {ev}")
        assert len(evidence) >= 4, f"Expected at least 4 evidence statements, found {len(evidence)}"
        assert any(tc["key_evidence_substr"] in ev for ev in evidence), f"Expected key evidence substring '{tc['key_evidence_substr']}' in evidence"

        # Assert Ranked Candidates
        assert "rankedCandidates" in res, "Missing 'rankedCandidates' in response"
        candidates = res["rankedCandidates"]
        print(f"  [7] Ranked Candidates:")
        for idx, c in enumerate(candidates, 1):
            print(f"      #{idx} {c['name']} ({c['service']}): {c['score']} pts")
        assert len(candidates) > 0, "Expected at least 1 candidate"
        assert candidates[0]["service"] == tc["expected_service_id"], f"Expected #{tc['expected_service']} to be ranked #1"

        print(f"  >>> Scenario [{scenario}] PASSED PERFECTLY!")

    # 4. Final Reset
    post("/api/reset")
    final_state = get("/api/system/state")
    assert final_state["system_health"] == "HEALTHY", "Expected baseline after test suite"

    print("\n==================================================================")
    print(">>> ALL FOUR FAILURE SCENARIOS DETERMINISTICALLY VERIFIED (100%)!")
    print("==================================================================")

if __name__ == "__main__":
    try:
        test_root_cause_scenarios()
    except Exception as e:
        print(f"\nROOT CAUSE TEST SUITE FAILED: {e}", file=sys.stderr)
        sys.exit(1)
