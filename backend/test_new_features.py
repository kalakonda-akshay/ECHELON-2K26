from fastapi.testclient import TestClient
from backend.main import app

def test_new_features():
    client = TestClient(app)
    
    # 1. Reset cluster
    r = client.post("/api/reset")
    assert r.status_code == 200
    
    # 2. Test Service Criticality
    r = client.get("/api/services/criticality")
    assert r.status_code == 200
    crit = r.json()
    assert "payment-db" in crit
    assert crit["payment-db"]["criticality_tier"] in ["CRITICAL", "HIGH"]
    print("[OK] /api/services/criticality verified:", len(crit), "services assessed")
    
    # 3. Test Why Now & What Changed (Nominal)
    r = client.get("/api/investigation/why-now")
    assert r.status_code == 200
    wn = r.json()
    assert wn["has_incident"] is False
    print("[OK] /api/investigation/why-now nominal verified")
    
    r = client.get("/api/investigation/what-changed")
    assert r.status_code == 200
    wc = r.json()
    assert wc["has_incident"] is False
    print("[OK] /api/investigation/what-changed nominal verified")
    
    # 4. Inject Failure and re-test Why Now & What Changed
    client.post("/api/failure/inject", json={"scenario": "database_failure"})
    
    r = client.get("/api/investigation/why-now")
    assert r.status_code == 200
    wn = r.json()
    assert wn["has_incident"] is True
    assert len(wn["timeline"]) > 0
    assert len(wn["contributing_conditions"]) > 0
    print("[OK] /api/investigation/why-now incident verified:", wn["primary_trigger"])
    
    r = client.get("/api/investigation/what-changed")
    assert r.status_code == 200
    wc = r.json()
    assert wc["has_incident"] is True
    assert wc["largest_deviation"]["delta_pct"] > 0
    print("[OK] /api/investigation/what-changed incident verified:", wc["largest_deviation"])
    
    # 5. Test Copilot Queries
    queries = [
        "Why is checkout failing?",
        "What changed before the incident?",
        "Show strongest evidence",
        "Which services are affected?",
        "Have we seen this before?",
        "What are our recovery options?"
    ]
    for q in queries:
        r = client.post("/api/copilot/query", json={"question": q})
        assert r.status_code == 200
        ans = r.json()
        assert len(ans["answer"]) > 10
        assert len(ans["evidence_citations"]) > 0
        print(f"[OK] Copilot query '{q}' -> {ans['confidence']} confidence, {len(ans['evidence_citations'])} citations")
        
    # 6. Test Change Risk Analysis
    r = client.post("/api/deployments/analyze-change", json={
        "service_id": "payment-db",
        "version": "v15.4-pg",
        "change_type": "schema",
        "description": "Add payment index"
    })
    assert r.status_code == 200
    risk = r.json()
    assert "risk_score" in risk
    assert risk["risk_level"] in ["LOW", "MEDIUM", "HIGH"]
    assert len(risk["recommendations"]) > 0
    print("[OK] /api/deployments/analyze-change verified:", risk["risk_level"], f"({risk['risk_score']}/100)")
    
    # 7. Clean reset
    client.post("/api/reset")
    print("\n>>> ALL NEW ADVANCED FEATURES FULLY VERIFIED AND PASSING!")

if __name__ == "__main__":
    test_new_features()
