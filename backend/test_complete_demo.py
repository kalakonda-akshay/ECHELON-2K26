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

def run_complete_demo_test():
    print("==================================================================")
    print("DEMO VERIFICATION: TraceRoute End-to-End Controlled Recovery Suite")
    print("==================================================================")

    # -------------------------------------------------------------
    # 1. BASELINE: HEALTHY CLUSTER
    # -------------------------------------------------------------
    print("\n[STEP 1: HEALTHY] Resetting cluster and asserting healthy baseline...")
    post("/api/reset")
    s0 = get("/api/system/state")
    print(f"  Cluster Health: {s0['system_health']} (0 errors, max_error={s0['cluster_max_error_rate_pct']}%)")
    assert s0["system_health"] == "HEALTHY", "Expected baseline to be HEALTHY"
    assert s0["unhealthy_services_count"] == 0, "Expected 0 unhealthy services"

    # -------------------------------------------------------------
    # 2. INJECT DATABASE FAILURE
    # -------------------------------------------------------------
    print("\n[STEP 2: INJECT DATABASE FAILURE] Injecting DATABASE_FAILURE via POST /api/failure/inject...")
    inj = post("/api/failure/inject", {"scenario": "DATABASE_FAILURE"})
    inc_id = inj["incident_id"]
    print(f"  Failure injected! Active incident: {inc_id}")
    assert inj["scenario"] == "DATABASE_FAILURE"

    # -------------------------------------------------------------
    # 3. CASCADE OVER TIME
    # -------------------------------------------------------------
    print("\n[STEP 3: CASCADE OVER TIME] Observing sequential cascade propagation...")
    # Stage 1: t=0.5s -> Database abnormal
    time.sleep(0.5)
    t1 = get("/api/topology")
    nodes1 = {n["id"]: n for n in t1["nodes"]}
    print(f"  t=0.5s: payment-db={nodes1['payment-db']['status']}, payment-service={nodes1['payment-service']['status']}, order-service={nodes1['order-service']['status']}")
    assert nodes1["payment-db"]["status"] == "CRITICAL", "Database must be CRITICAL at stage 1"
    assert nodes1["payment-service"]["status"] == "HEALTHY", "Payment must not be red yet"

    # Stage 2: t=3.5s -> Payment timeout
    time.sleep(3.0)
    t2 = get("/api/topology")
    nodes2 = {n["id"]: n for n in t2["nodes"]}
    print(f"  t=3.5s: payment-service={nodes2['payment-service']['status']} (error_rate={nodes2['payment-service']['error_rate']}%)")
    assert nodes2["payment-service"]["status"] == "CRITICAL", "Payment must be CRITICAL at stage 2"

    # Stage 3: t=6.5s -> Order timeout
    time.sleep(3.0)
    t3 = get("/api/topology")
    nodes3 = {n["id"]: n for n in t3["nodes"]}
    print(f"  t=6.5s: order-service={nodes3['order-service']['status']} (error_rate={nodes3['order-service']['error_rate']}%)")
    assert nodes3["order-service"]["status"] == "CRITICAL", "Order must be CRITICAL at stage 3"

    # Stage 4: t=9.5s -> Gateway 502 Bad Gateway
    time.sleep(3.0)
    t4 = get("/api/topology")
    nodes4 = {n["id"]: n for n in t4["nodes"]}
    print(f"  t=9.5s: api-gateway={nodes4['api-gateway']['status']} (error_rate={nodes4['api-gateway']['error_rate']}%, latency={nodes4['api-gateway']['latency']}ms)")
    assert nodes4["api-gateway"]["status"] == "CRITICAL", "Gateway must be CRITICAL (502) at stage 4"
    assert nodes4["inventory-service"]["status"] == "HEALTHY", "Inventory must remain healthy"
    assert nodes4["stock-db"]["status"] == "HEALTHY", "Stock DB must remain healthy"

    # -------------------------------------------------------------
    # 4. DETECT: CASCADE ALERT
    # -------------------------------------------------------------
    print("\n[STEP 4: DETECT] Checking cluster alert and cascade detection...")
    st = get("/api/system/state")
    print(f"  Cluster Health: {st['system_health']} | Stage: {st['cascade_stage']}")
    assert st["system_health"] == "CRITICAL"
    assert "Stage 4" in st["cascade_stage"]

    # -------------------------------------------------------------
    # 5. INVESTIGATE: PROGRESSIVE CAUSAL EVIDENCE
    # -------------------------------------------------------------
    print("\n[STEP 5: INVESTIGATE] Fetching progressive investigation steps...")
    diag = get("/api/root-cause")
    investigation = diag["investigation"]
    print(f"  Total investigation steps recorded: {len(investigation)}")
    for i, s in enumerate(investigation, 1):
        print(f"    {i}. {s}")
    assert len(investigation) >= 4, "Expected at least 4 investigation steps"

    # -------------------------------------------------------------
    # 6. ROOT CAUSE DETERMINATION (NO LLM)
    # -------------------------------------------------------------
    print("\n[STEP 6: ROOT CAUSE] Deterministic root cause isolation...")
    rc = diag["rootCause"]
    print(f"  Identified Root Cause: {rc['service']} ({rc['service_id']})")
    print(f"  Failure Mode:          {rc['failureType']}")
    print(f"  Confidence Score:      {rc['score']}/100")
    print(f"  Score Breakdown:       {rc['scoreBreakdown']}")
    assert rc["service"] == "Database", f"Expected Database, got {rc['service']}"
    assert rc["service_id"] == "payment-db", f"Expected payment-db, got {rc['service_id']}"
    assert rc["failureType"] == "Connection Failure"
    assert rc["score"] >= 80.0

    # -------------------------------------------------------------
    # 7. EVIDENCE & PROPAGATION
    # -------------------------------------------------------------
    print("\n[STEP 7: EVIDENCE & PROPAGATION] Validating propagation path and evidence...")
    propagation = diag["propagation"]
    evidence = diag["evidence"]
    print(f"  Propagation Chain: {propagation}")
    print(f"  Supporting Evidence ({len(evidence)} statements):")
    for ev in evidence:
        print(f"    • {ev}")
    assert propagation == "Database → Payment → Order → Gateway"
    assert any("connection pool exhausted" in ev for ev in evidence)

    # -------------------------------------------------------------
    # 8. RECOMMEND RECOVERY
    # -------------------------------------------------------------
    print("\n[STEP 8: RECOMMEND RECOVERY] Fetching context-aware remediation playbook...")
    rec = get("/api/recovery/recommendation")
    print(f"  Action Name:    {rec['action_name']}")
    print(f"  Target Service: {rec['target_service']}")
    print(f"  Command:        {rec['command']}")
    print(f"  Risk Impact:    {rec['risk_impact']}")
    assert rec["action_id"] == "act-db-reset"
    assert rec["target_service"] == "payment-db"

    # -------------------------------------------------------------
    # 9. APPROVE RECOVERY (HUMAN-IN-THE-LOOP)
    # -------------------------------------------------------------
    print("\n[STEP 9: APPROVE] Authorizing recovery playbook as oncall-sre@acme.corp...")
    appr = post("/api/recovery/approve", {
        "action_id": rec["action_id"],
        "approved_by": "oncall-sre@acme.corp"
    })
    print(f"  Approval Response: {appr['message']}")
    assert appr["success"] is True

    # -------------------------------------------------------------
    # 10. EXECUTE RECOVERY (STATE MUTATION)
    # -------------------------------------------------------------
    print("\n[STEP 10: EXECUTE] Checking simulator state transition during recovery...")
    st_rec = get("/api/system/state")
    print(f"  Simulator is_recovering: {st_rec['is_recovering']}")
    assert st_rec["is_recovering"] is True

    # -------------------------------------------------------------
    # 11. VERIFY RECOVERY (5-GATE PROBES)
    # -------------------------------------------------------------
    print("\n[STEP 11: VERIFY] Running post-recovery health probes...")
    ver = get("/api/recovery/verify")
    print(f"  Verdict: {ver['verdict']}")
    print("  Verification Checks:")
    for chk in ver["checks"]:
        print(f"    - {chk['name']}: {'PASSED ✓' if chk['passed'] else 'FAILED ✗'} ({chk['actual']})")
        assert chk["passed"] is True, f"Check '{chk['name']}' failed!"
    assert ver["verdict"] == "RECOVERY VERIFIED", "Expected RECOVERY VERIFIED"

    # -------------------------------------------------------------
    # 12. HEALTHY BASELINE RESTORED
    # -------------------------------------------------------------
    print("\n[STEP 12: HEALTHY] Validating cluster restored to 100% baseline...")
    s_final = get("/api/system/state")
    print(f"  Final System Health: {s_final['system_health']} (Unhealthy nodes: {s_final['unhealthy_services_count']})")
    assert s_final["system_health"] == "HEALTHY"
    assert s_final["unhealthy_services_count"] == 0

    # -------------------------------------------------------------
    # 13. AUDIT TRAIL PERSISTENCE (ALL 9 REQUIRED FIELDS)
    # -------------------------------------------------------------
    print("\n[STEP 13: INCIDENT HISTORY] Verifying completed incident stored in SQLite with all 9 fields...")
    history = get("/api/incidents")
    matching = [h for h in history if h.get("id") == inc_id or h.get("scenario") == "DATABASE_FAILURE"]
    assert len(matching) > 0, "Expected resolved incident to be persisted in SQLite"
    stored_inc = matching[0]

    required_keys = [
        ("id", "incident ID"),
        ("started_at", "start time"),
        ("symptom", "symptom"),
        ("initiating_service", "initiating service"),
        ("evidence", "evidence"),
        ("recovery_action", "recovery action"),
        ("verification_result", "verification result"),
        ("resolved_at", "resolution time")
    ]
    for key, label in required_keys:
        val = stored_inc.get(key)
        assert val is not None and val != "", f"Missing required history field: {label} ({key})"
        print(f"  • {label:20}: {val}")

    print("\n==================================================================")
    print(">>> 100% COMPLETE DEMO SEQUENCE VERIFIED AND PASSED!")
    print("==================================================================")

if __name__ == "__main__":
    try:
        run_complete_demo_test()
    except Exception as e:
        print(f"\nDEMO TEST FAILED: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
