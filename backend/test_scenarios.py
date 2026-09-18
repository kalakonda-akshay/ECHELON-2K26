import time
import urllib.request
import json
import sys

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

def test_simulator_and_endpoints():
    print("==================================================================")
    print("TEST SUITE: Microservice Simulator & Failure Injection System")
    print("==================================================================")

    # -------------------------------------------------------------
    # 1. TEST RESET ENDPOINTS & BASELINE STATE
    # -------------------------------------------------------------
    print("\n[TEST 1] Testing Reset Endpoint (POST /api/reset)...")
    reset_res = post("/api/reset")
    print(f"  Reset response: {reset_res}")
    assert reset_res["status"] == "HEALTHY", "Expected status HEALTHY on reset"

    print("\n[TEST 2] Testing System State Endpoint (GET /api/system/state)...")
    state = get("/api/system/state")
    print(f"  System Health: {state['system_health']}")
    print(f"  Total Services: {state['total_services']}")
    print(f"  Unhealthy Services Count: {state['unhealthy_services_count']}")
    assert state["system_health"] == "HEALTHY", "Expected baseline system health to be HEALTHY"
    assert state["unhealthy_services_count"] == 0, "Expected 0 unhealthy services on baseline"
    assert len(state["services"]) == 6, f"Expected 6 services, found {len(state['services'])}"

    # -------------------------------------------------------------
    # 2. TEST TOPOLOGY & PER-SERVICE ATTRIBUTES
    # -------------------------------------------------------------
    print("\n[TEST 3] Testing Topology Endpoint (GET /api/topology)...")
    topo = get("/api/topology")
    nodes = {n["id"]: n for n in topo["nodes"]}
    assert len(nodes) == 6, f"Expected 6 nodes, got {len(nodes)}"

    # Verify dependency structure:
    # Gateway -> Order -> Payment -> Database
    # Order -> Inventory -> Stock Database
    print("  Verifying dependency structure:")
    print(f"  - Gateway dependencies: {nodes['api-gateway']['dependencies']}")
    print(f"  - Order dependencies:   {nodes['order-service']['dependencies']}")
    print(f"  - Payment dependencies: {nodes['payment-service']['dependencies']}")
    print(f"  - Inventory dependencies: {nodes['inventory-service']['dependencies']}")
    print(f"  - Database dependencies: {nodes['payment-db']['dependencies']}")
    print(f"  - Stock DB dependencies: {nodes['stock-db']['dependencies']}")

    assert nodes["api-gateway"]["dependencies"] == ["order-service"], "Gateway must depend on Order"
    assert "payment-service" in nodes["order-service"]["dependencies"], "Order must depend on Payment"
    assert "inventory-service" in nodes["order-service"]["dependencies"], "Order must depend on Inventory"
    assert nodes["payment-service"]["dependencies"] == ["payment-db"], "Payment must depend on Database"
    assert nodes["inventory-service"]["dependencies"] == ["stock-db"], "Inventory must depend on Stock DB"
    assert nodes["payment-db"]["dependencies"] == [], "Database must have no dependencies"
    assert nodes["stock-db"]["dependencies"] == [], "Stock Database must have no dependencies"

    # Verify each service maintains the 7 required fields:
    # status, latency, request_count, error_count, error_rate, dependencies, recent_logs
    print("  Verifying required per-service state attributes:")
    required_fields = ["status", "latency", "request_count", "error_count", "error_rate", "dependencies", "recent_logs"]
    for s_id, node in nodes.items():
        for field in required_fields:
            assert field in node, f"Service {s_id} missing required field '{field}'"
        print(f"  - [{node['name']}]: status={node['status']}, latency={node['latency']}ms, reqs={node['request_count']}, errors={node['error_count']}, rate={node['error_rate']}%, deps={node['dependencies']}")

    # -------------------------------------------------------------
    # 3. TEST TELEMETRY ENDPOINT
    # -------------------------------------------------------------
    print("\n[TEST 4] Testing Telemetry Endpoint (GET /api/telemetry)...")
    telem = get("/api/telemetry")
    assert "current_metrics" in telem, "Telemetry must contain current_metrics"
    assert "metrics_history" in telem, "Telemetry must contain metrics_history"
    assert "recent_logs" in telem, "Telemetry must contain recent_logs"
    assert "recent_traces" in telem, "Telemetry must contain recent_traces"
    print(f"  Current Metrics Count: {len(telem['current_metrics'])}")
    print(f"  Recent Logs Count: {len(telem['recent_logs'])}")
    print(f"  Recent Traces Count: {len(telem['recent_traces'])}")

    # -------------------------------------------------------------
    # 4. TEST INCIDENTS ENDPOINT
    # -------------------------------------------------------------
    print("\n[TEST 5] Testing Incidents Endpoint (GET /api/incidents)...")
    incs = get("/api/incidents")
    print(f"  Retrieved {len(incs)} incidents from audit log.")
    assert isinstance(incs, list), "Expected list of incidents"

    # -------------------------------------------------------------
    # 5. TEST REALISTIC TIME-DELAYED CASCADE ON DATABASE_FAILURE
    # -------------------------------------------------------------
    print("\n[TEST 6] Testing Realistic Time-Delayed Cascade: DATABASE_FAILURE...")
    print("  Injecting scenario: DATABASE_FAILURE via POST /api/failure/inject...")
    inj_res = post("/api/failure/inject", {"scenario": "DATABASE_FAILURE"})
    print(f"  Injection response: {inj_res['scenario']} | Incident: {inj_res['incident_id']}")
    assert inj_res["scenario"] == "DATABASE_FAILURE"

    # Stage 1 Verification: t = 0.5s (Database Abnormal only)
    print("  [Stage 1 (t ~ 0.5s)]: Testing that ONLY Database is degraded...")
    time.sleep(0.5)
    s1 = get("/api/topology")
    n1 = {n["id"]: n for n in s1["nodes"]}
    print(f"    payment-db:     status={n1['payment-db']['status']}, error_rate={n1['payment-db']['error_rate']}%")
    print(f"    payment-service: status={n1['payment-service']['status']}, error_rate={n1['payment-service']['error_rate']}%")
    print(f"    order-service:   status={n1['order-service']['status']}, error_rate={n1['order-service']['error_rate']}%")
    print(f"    api-gateway:     status={n1['api-gateway']['status']}, error_rate={n1['api-gateway']['error_rate']}%")
    print(f"    inventory-service: status={n1['inventory-service']['status']}")

    assert n1["payment-db"]["status"] == "CRITICAL", "Database must be CRITICAL in Stage 1"
    assert n1["payment-service"]["status"] == "HEALTHY", "Payment MUST NOT be marked red instantly in Stage 1"
    assert n1["order-service"]["status"] == "HEALTHY", "Order MUST NOT be marked red instantly in Stage 1"
    assert n1["api-gateway"]["status"] == "HEALTHY", "Gateway MUST NOT be marked red instantly in Stage 1"
    assert n1["inventory-service"]["status"] == "HEALTHY", "Inventory must remain HEALTHY"
    assert n1["stock-db"]["status"] == "HEALTHY", "Stock DB must remain HEALTHY"

    # Stage 2 Verification: t = 3.5s (Payment timeout propagates)
    print("  [Stage 2 (t ~ 3.5s)]: Waiting for Payment service timeout propagation...")
    time.sleep(3.0)
    s2 = get("/api/topology")
    n2 = {n["id"]: n for n in s2["nodes"]}
    print(f"    payment-db:     status={n2['payment-db']['status']}")
    print(f"    payment-service: status={n2['payment-service']['status']}, error_rate={n2['payment-service']['error_rate']}%")
    print(f"    order-service:   status={n2['order-service']['status']}")
    print(f"    api-gateway:     status={n2['api-gateway']['status']}")
    assert n2["payment-service"]["status"] == "CRITICAL", "Payment service must be CRITICAL in Stage 2"
    assert n2["api-gateway"]["status"] != "CRITICAL", "Gateway must not yet be CRITICAL in Stage 2"

    # Stage 3 Verification: t = 6.5s (Order timeout propagates)
    print("  [Stage 3 (t ~ 6.5s)]: Waiting for Order service retry timeout propagation...")
    time.sleep(3.0)
    s3 = get("/api/topology")
    n3 = {n["id"]: n for n in s3["nodes"]}
    print(f"    order-service:   status={n3['order-service']['status']}, error_rate={n3['order-service']['error_rate']}%")
    print(f"    api-gateway:     status={n3['api-gateway']['status']}")
    assert n3["order-service"]["status"] == "CRITICAL", "Order service must be CRITICAL in Stage 3"

    # Stage 4 Verification: t = 9.5s (Gateway 502 Bad Gateway / Full cascade)
    print("  [Stage 4 (t ~ 9.5s)]: Waiting for Gateway 502 circuit breaker...")
    time.sleep(3.0)
    s4 = get("/api/topology")
    n4 = {n["id"]: n for n in s4["nodes"]}
    print(f"    api-gateway:     status={n4['api-gateway']['status']}, error_rate={n4['api-gateway']['error_rate']}%, latency={n4['api-gateway']['latency']}ms")
    print(f"    inventory-service: status={n4['inventory-service']['status']}")
    print(f"    stock-db:        status={n4['stock-db']['status']}")
    assert n4["api-gateway"]["status"] == "CRITICAL", "Gateway must be CRITICAL (502) in Stage 4"
    assert n4["inventory-service"]["status"] == "HEALTHY", "Inventory MUST remain HEALTHY throughout DB cascade"
    assert n4["stock-db"]["status"] == "HEALTHY", "Stock DB MUST remain HEALTHY throughout DB cascade"

    # Check system state cascade stage text
    sys_state = get("/api/system/state")
    print(f"  Final Cascade Stage Reported: '{sys_state['cascade_stage']}'")
    assert "Stage 4" in sys_state["cascade_stage"], "Expected Stage 4 in cascade_stage"

    # -------------------------------------------------------------
    # 6. TEST RESET RESTORES 100% HEALTH
    # -------------------------------------------------------------
    print("\n[TEST 7] Testing Reset from Failure (POST /api/reset)...")
    post("/api/reset")
    restored_state = get("/api/system/state")
    print(f"  Post-reset Health: {restored_state['system_health']}, Unhealthy: {restored_state['unhealthy_services_count']}")
    assert restored_state["system_health"] == "HEALTHY"
    assert restored_state["unhealthy_services_count"] == 0

    # -------------------------------------------------------------
    # 7. TEST REMAINING 3 SCENARIOS
    # -------------------------------------------------------------
    for scenario_name in ["PAYMENT_LATENCY", "INVENTORY_CRASH", "BAD_DEPLOYMENT"]:
        print(f"\n[TEST] Testing Deterministic Scenario: {scenario_name}...")
        post("/api/failure/inject", {"scenario": scenario_name})
        time.sleep(0.5)
        st = get("/api/system/state")
        assert st["active_scenario"] == scenario_name, f"Expected {scenario_name} active"
        print(f"  Scenario {scenario_name} active, System Health: {st['system_health']}, Stage: {st['cascade_stage']}")
        post("/api/reset")

    print("\n==================================================================")
    print(">>> ALL MICROSERVICE SIMULATOR & ENDPOINT TESTS PASSED (100%)!")
    print("==================================================================")

if __name__ == "__main__":
    try:
        test_simulator_and_endpoints()
    except Exception as e:
        print(f"\nTEST FAILED: {e}", file=sys.stderr)
        sys.exit(1)
