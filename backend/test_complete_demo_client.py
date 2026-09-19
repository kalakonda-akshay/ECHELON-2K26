import time
import json
import sys
from fastapi.testclient import TestClient
from backend.main import app

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

client = TestClient(app)

def post(path: str, data: dict = None) -> dict:
    res = client.post(path, json=data or {})
    return res.json()

def get(path: str) -> dict:
    res = client.get(path)
    return res.json()

def run_complete_demo_test():
    print("==================================================================")
    print("DEMO VERIFICATION: TraceRoot End-to-End Controlled Recovery Suite")
    print("==================================================================")

    # 1. BASELINE
    print("\n[STEP 1: HEALTHY] Resetting cluster and asserting healthy baseline...")
    post("/api/reset")
    s0 = get("/api/system/state")
    print(f"  Cluster Health: {s0['system_health']} (0 errors, max_error={s0['cluster_max_error_rate_pct']}%)")
    assert s0["system_health"] == "HEALTHY"

    # 2. INJECT
    print("\n[STEP 2: INJECT DATABASE FAILURE] Injecting DATABASE_FAILURE via POST /api/failure/inject...")
    inj = post("/api/failure/inject", {"scenario": "DATABASE_FAILURE"})
    inc_id = inj["incident_id"]
    print(f"  Failure injected! Active incident: {inc_id}")
    assert inj["scenario"] == "DATABASE_FAILURE"

    # 3. CASCADE OVER TIME
    print("\n[STEP 3: CASCADE OVER TIME] Observing sequential cascade propagation...")
    time.sleep(0.5)
    t1 = get("/api/topology")
    nodes1 = {n["id"]: n for n in t1["nodes"]}
    assert nodes1["payment-db"]["status"] == "CRITICAL"
    print(f"  Stage 1: payment-db={nodes1['payment-db']['status']}")

    time.sleep(3.0)
    t2 = get("/api/topology")
    nodes2 = {n["id"]: n for n in t2["nodes"]}
    assert nodes2["payment-service"]["status"] == "CRITICAL"
    print(f"  Stage 2: payment-service={nodes2['payment-service']['status']}")

    time.sleep(3.0)
    t3 = get("/api/topology")
    nodes3 = {n["id"]: n for n in t3["nodes"]}
    assert nodes3["order-service"]["status"] == "CRITICAL"
    print(f"  Stage 3: order-service={nodes3['order-service']['status']}")

    time.sleep(3.0)
    t4 = get("/api/topology")
    nodes4 = {n["id"]: n for n in t4["nodes"]}
    assert nodes4["api-gateway"]["status"] == "CRITICAL"
    print(f"  Stage 4: api-gateway={nodes4['api-gateway']['status']}")

    # 4. INVESTIGATE & ROOT CAUSE
    print("\n[STEP 5: INVESTIGATE] Fetching progressive investigation steps...")
    diag = get("/api/root-cause")
    rc = diag["rootCause"]
    print(f"  Root Cause: {rc['service']} ({rc['service_id']}) score={rc['score']}")
    assert rc["service_id"] == "payment-db"
    assert rc["score"] >= 80.0

    # 5. RECOMMEND & APPROVE
    print("\n[STEP 8: RECOVERY] Recommending and approving remediation...")
    rec = get("/api/recovery/recommendation")
    appr = post("/api/recovery/approve", {
        "action_id": rec["action_id"],
        "approved_by": "oncall-sre@acme.corp"
    })
    assert appr["success"] is True

    # 6. VERIFY
    print("\n[STEP 11: VERIFY] Running post-recovery health probes...")
    ver = get("/api/recovery/verify")
    print(f"  Verdict: {ver['verdict']}")
    assert ver["verdict"] == "RECOVERY VERIFIED"

    # 7. FINAL BASELINE
    s_final = get("/api/system/state")
    assert s_final["system_health"] == "HEALTHY"
    print("  Cluster returned to HEALTHY nominal state.")

    # 8. INCIDENT HISTORY AUDIT
    print("\n[STEP 13: INCIDENT HISTORY] Verifying completed incident persisted in SQLite...")
    history = get("/api/incidents")
    matching = [h for h in history if h.get("id") == inc_id or h.get("scenario") == "DATABASE_FAILURE"]
    assert len(matching) > 0
    print("  Audit entry confirmed in SQLite.")

    print("\n==================================================================")
    print(">>> 100% COMPLETE DEMO SEQUENCE VERIFIED AND PASSED!")
    print("==================================================================")

if __name__ == "__main__":
    run_complete_demo_test()