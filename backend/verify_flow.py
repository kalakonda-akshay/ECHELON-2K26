import urllib.request
import json
import time

BASE = "http://127.0.0.1:8000"

def post(path, data=None):
    if data is None:
        data = {}
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def get(path):
    req = urllib.request.Request(f"{BASE}{path}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def test_full_pipeline():
    print("==================================================")
    print("TraceRoot AI — End-to-End System Verification")
    print("==================================================")

    # 1. Baseline status
    s0 = get("/api/status")
    print(f"[STEP 1] Baseline status: {s0['system_health']} (Active: {s0['active_scenario']})")

    # 2. Inject db_failure
    print("[STEP 2] Injecting 'db_failure' scenario...")
    inj = post("/api/demo/inject", {"scenario": "db_failure"})
    s1 = get("/api/status")
    print(f"         Status: {s1['system_health']} | Incident ID: {s1['active_incident_id']}")
    assert s1["system_health"] == "CRITICAL", "Health should be CRITICAL"

    # 3. Fetch Diagnosis (Deterministic Engine + AI Explainer)
    print("[STEP 3] Fetching Root Cause Diagnosis...")
    diag = get("/api/diagnosis")
    initiator = diag.get("initiating_service")
    confidence = diag.get("confidence_score")
    candidates = diag.get("ranked_candidates", [])
    top = candidates[0] if candidates else {}
    print(f"         Initiator: {initiator} (Confidence: {confidence}%)")
    print(f"         Top Scored: {top.get('name')} (Score: {top.get('score')}/100)")
    assert initiator == "payment-db", f"Expected payment-db but got {initiator}"

    # 4. Adaptive Investigation Steps
    print("[STEP 4] Fetching Adaptive Evidence Investigation...")
    invest = get("/api/investigation")
    steps = invest.get("steps", [])
    print(f"         Total investigative steps: {len(steps)}")
    for s in steps:
        print(f"         - Step {s['step']}: [{s['target_service']}] {s['title']}")
    assert len(steps) >= 4, "Investigation should have at least 4 steps"

    # 5. Recovery Recommendation
    print("[STEP 5] Fetching Recovery Recommendation...")
    rec = get("/api/recovery/recommendation")
    action = rec.get("recommended_action", {})
    action_id = rec.get("action_id")
    print(f"         Action: {action.get('name')} | Risk: {rec.get('risk_level')}")
    print(f"         Command: {action.get('command')}")

    # 6. Human Approval
    print("[STEP 6] Simulating SRE Human Approval...")
    appr = post("/api/recovery/approve", {
        "action_id": action_id,
        "approved_by": "lead-sre@TraceRoot.internal"
    })
    print(f"         Approval response: {appr.get('message')}")
    assert appr.get("success") is True, "Approval should succeed"

    # 7. Five-Gate Verification
    print("[STEP 7] Running Recovery Verification...")
    verif = get("/api/recovery/verify")
    print(f"         Verdict: {verif.get('verdict')} (Health: {verif.get('overall_health')})")
    for check in verif.get("checks", []):
        print(f"         - Check: {check.get('name')}: {check.get('status')} ({check.get('actual')})")
    assert verif.get("verdict") == "RECOVERY VERIFIED", "Verification must return RECOVERY VERIFIED"

    # 8. Reset
    print("[STEP 8] Resetting Cluster to Baseline...")
    rst = post("/api/demo/reset")
    s_final = get("/api/status")
    print(f"         Final Cluster Status: {s_final['system_health']} (Max Error: {s_final['cluster_max_error_rate_pct']}%)")
    assert s_final["system_health"] == "HEALTHY", "Cluster should be healthy after reset"

    print("==================================================")
    print(">>> ALL 8 VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_full_pipeline()
