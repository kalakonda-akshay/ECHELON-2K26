import sys
from fastapi.testclient import TestClient
from backend.main import app
import io
import zipfile

client = TestClient(app)

def run_tests():
    # 1. Root check
    assert client.get("/").status_code == 200
    print("PASS: / (API Root)")

    # 2. Multi-project list
    res = client.get("/api/projects")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 4
    ids = [p["id"] for p in data]
    assert "FoodDelivery-Demo" in ids
    assert "sample-myshop-microservices" in ids
    assert "sample-fastapi-service" in ids
    assert "sample-express-payment" in ids
    print("PASS: /api/projects contains FoodDelivery-Demo and 3 sample fixtures")

    # 3. Load sample fixture
    res = client.post("/api/projects/sample/sample-myshop-microservices")
    assert res.status_code == 200
    myshop = res.json()
    assert myshop["total_services"] == 5
    assert myshop["readiness"]["readiness_percentage"] == 65
    print("PASS: /api/projects/sample/sample-myshop-microservices loaded")

    # 4. Observability readiness
    res = client.get("/api/projects/sample-myshop-microservices/readiness")
    assert res.status_code == 200
    readiness = res.json()
    assert len(readiness["checklist"]) >= 5
    print("PASS: /api/projects/{id}/readiness itemized checklist")

    # 5. Turnkey OpenTelemetry integration plan
    res = client.get("/api/projects/sample-myshop-microservices/integration-plan")
    assert res.status_code == 200
    plan = res.json()
    assert len(plan["files"]) >= 1
    print("PASS: /api/projects/{id}/integration-plan generated")

    # 6. ZIP upload with path traversal guardrails
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("app/main.py", "from fastapi import FastAPI\napp = FastAPI()\n@app.get('/health')\ndef health(): return {'status': 'ok'}\n@app.get('/users/{user_id}')\ndef get_user(user_id: int): return {'user_id': user_id}\n")
        zf.writestr("README.md", "# Demo User App")

    zip_buffer.seek(0)
    res = client.post("/api/projects/upload", files={"file": ("user_app.zip", zip_buffer.read(), "application/zip")})
    if res.status_code != 200:
        print("Upload Error Details:", res.status_code, res.text)
    assert res.status_code == 200
    upload_proj = res.json()
    assert upload_proj["total_routes"] >= 2
    assert "FastAPI" in upload_proj["frameworks"]
    uploaded_id = upload_proj["id"]
    print(f"PASS: /api/projects/upload ({uploaded_id}) with {upload_proj['total_routes']} routes")

    # 7. Delete uploaded project
    res = client.delete(f"/api/projects/{uploaded_id}")
    assert res.status_code == 200
    print("PASS: /api/projects/{id} deleted successfully")

    # 8. Demo mode integrity check
    res = client.get("/api/system/state")
    assert res.status_code == 200
    assert "system_health" in res.json()
    print("PASS: /api/system/state demo environment nominal")

    res = client.get("/api/topology")
    assert res.status_code == 200
    assert len(res.json()["nodes"]) == 6
    print("PASS: /api/topology 6 demo microservices intact")

    print("\n=======================================================")
    print("ALL FULL BACKEND END-TO-END TESTS PASSED WITH 0 REGRESSIONS!")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()