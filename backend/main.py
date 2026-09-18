import os
import time
from pathlib import Path

# Auto-load environment variables from .env.local or .env if present
for env_file in [Path(".env.local"), Path(".env"), Path(__file__).resolve().parent.parent / ".env.local"]:
    if env_file.is_file():
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k, v = k.strip(), v.strip()
                        if k and not os.getenv(k):
                            os.environ[k] = v
        except Exception:
            pass

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional

from backend.database import init_db, get_db
from backend.graph_engine import topology_graph
from backend.simulator import simulator
from backend.root_cause_engine import root_cause_engine
from backend.adaptive_engine import adaptive_engine
from backend.ai_explainer import ai_explainer
from backend.recovery_engine import recovery_engine
from backend.blast_radius_engine import blast_radius_engine
from backend.sandbox_engine import sandbox_engine
from backend.early_warning import early_warning_engine
from backend.incident_memory import incident_memory_engine
from backend.why_now_engine import why_now_engine
from backend.copilot_engine import copilot_engine

init_db()

app = FastAPI(
    title="TraceLens AI API",
    description="Intelligent observability and controlled-recovery platform for microservices",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScenarioRequest(BaseModel):
    scenario: str

class ApprovalRequest(BaseModel):
    action_id: str
    approved_by: Optional[str] = "oncall-sre@acme.corp"

class SimulationRequest(BaseModel):
    action_id: str
    scenario: Optional[str] = None

class FeedbackRequest(BaseModel):
    incident_id: str
    diagnosis_accurate: str
    recovery_effective: str
    engineer_notes: Optional[str] = ""
    engineer_email: Optional[str] = "oncall-sre@acme.corp"

class AcquireEvidenceRequest(BaseModel):
    scenario: Optional[str] = None

class CopilotRequest(BaseModel):
    question: str
    api_key: Optional[str] = None

class ChangeAnalysisRequest(BaseModel):
    service_id: str
    version: str
    change_type: str = "config"
    description: Optional[str] = ""

@app.get("/")
def read_root():
    return {
        "service": "TraceLens AI API",
        "tagline": "Detect. Trace. Explain. Recover. Verify.",
        "status": "ONLINE",
        "endpoints": [
            "/api/system/state",
            "/api/topology",
            "/api/telemetry",
            "/api/incidents",
            "/api/failure/inject",
            "/api/reset"
        ]
    }

# =========================================================================
# 1. System State Endpoints (/api/system/state and /api/status)
# =========================================================================
@app.get("/api/system/state")
@app.get("/api/status")
def get_system_state():
    tick = simulator.tick()
    metrics = tick["current_metrics"]
    scenario = simulator.active_scenario
    incident_id = simulator.active_incident_id

    # Compute cluster aggregate stats
    avg_latency = round(sum(m["latency"] for m in metrics.values()) / len(metrics), 1)
    max_err = round(max(m["error_rate"] for m in metrics.values()), 1)
    unhealthy = [s for s, m in metrics.items() if m["status"] != "HEALTHY"]

    system_health = "HEALTHY"
    if any(m["status"] in ["CRITICAL", "DOWN"] for m in metrics.values()):
        system_health = "CRITICAL"
    elif any(m["status"] in ["WARNING", "DEGRADED"] for m in metrics.values()):
        system_health = "DEGRADED"

    elapsed_s = 0.0
    cascade_stage = "Nominal Baseline"
    if scenario and simulator.scenario_start_time:
        elapsed_s = round(time.time() - simulator.scenario_start_time, 1)
        if scenario == "DATABASE_FAILURE":
            if elapsed_s < 3.0:
                cascade_stage = "Stage 1/4: Database pool exhausted (Database abnormal)"
            elif elapsed_s < 6.0:
                cascade_stage = "Stage 2/4: Payment service connection timeout"
            elif elapsed_s < 9.0:
                cascade_stage = "Stage 3/4: Order service retry timeout"
            else:
                cascade_stage = "Stage 4/4: Gateway circuit breaker tripped (502 Bad Gateway)"
        elif scenario == "PAYMENT_LATENCY":
            cascade_stage = "Payment service GC pause & latency spike"
        elif scenario == "INVENTORY_CRASH":
            cascade_stage = "Inventory service OOMKilled crash (Exit 137)"
        elif scenario == "BAD_DEPLOYMENT":
            cascade_stage = "Release v2.4.1 (commit a8f3b9c) unindexed N+1 query regression"

    # Clean per-service state summary
    services_summary = {}
    for s_id, m in metrics.items():
        services_summary[s_id] = {
            "name": m.get("name", s_id),
            "status": m.get("status", "HEALTHY"),
            "latency": m.get("latency", 20.0),
            "request_count": m.get("request_count", 0),
            "error_count": m.get("error_count", 0),
            "error_rate": m.get("error_rate", 0.0),
            "dependencies": m.get("dependencies", []),
            "recent_logs_count": len(m.get("recent_logs", []))
        }

    return {
        "system_health": system_health,
        "active_scenario": scenario,
        "active_incident_id": incident_id,
        "is_recovering": simulator.is_recovering,
        "elapsed_seconds": elapsed_s,
        "cascade_stage": cascade_stage,
        "unhealthy_services_count": len(unhealthy),
        "unhealthy_services": unhealthy,
        "cluster_avg_latency_ms": avg_latency,
        "cluster_max_error_rate_pct": max_err,
        "total_services": len(metrics),
        "services": services_summary,
        "timestamp": tick["timestamp"]
    }

# =========================================================================
# 2. Topology Endpoint (/api/topology)
# =========================================================================
@app.get("/api/topology")
def get_topology():
    tick = simulator.tick()
    metrics = tick["current_metrics"]
    raw_topo = topology_graph.get_topology()

    # Decorate nodes with exact requested fields
    nodes = []
    for n in raw_topo["nodes"]:
        s_id = n["id"]
        m = metrics.get(s_id, {})
        nodes.append({
            **n,
            "status": m.get("status", "HEALTHY"),
            "latency": m.get("latency", 20.0),
            "request_count": m.get("request_count", 0),
            "error_count": m.get("error_count", 0),
            "error_rate": m.get("error_rate", 0.0),
            "dependencies": m.get("dependencies", []),
            "recent_logs": m.get("recent_logs", []),
            # Chart & visual coordinates compatibility
            "p50_latency_ms": m.get("p50_latency_ms", m.get("latency", 20.0)),
            "p95_latency_ms": m.get("p95_latency_ms", 45.0),
            "p99_latency_ms": m.get("p99_latency_ms", 65.0),
            "error_rate_pct": m.get("error_rate_pct", 0.0),
            "rps": m.get("rps", 150),
            "cpu_pct": m.get("cpu_pct", 25.0)
        })

    # Decorate edges with live propagation / error status
    edges = []
    for e in raw_topo["edges"]:
        source_m = metrics.get(e["source"], {})
        target_m = metrics.get(e["target"], {})
        edge_status = "HEALTHY"
        if target_m.get("status") in ["CRITICAL", "DOWN"] or source_m.get("status") in ["CRITICAL", "DOWN"]:
            edge_status = "CRITICAL"
        elif target_m.get("status") in ["WARNING", "DEGRADED"] or source_m.get("status") in ["WARNING", "DEGRADED"]:
            edge_status = "WARNING"

        edges.append({
            **e,
            "status": edge_status,
            "latency_ms": target_m.get("latency", 25.0)
        })

    return {"nodes": nodes, "edges": edges}

# =========================================================================
# 3. Telemetry Endpoint (/api/telemetry)
# =========================================================================
@app.get("/api/telemetry")
def get_telemetry():
    tick = simulator.tick()
    return {
        "current_metrics": tick["current_metrics"],
        "metrics_history": simulator.metrics_history,
        "recent_logs": simulator.logs_buffer[:30],
        "recent_traces": simulator.recent_traces[:8]
    }

# =========================================================================
# 4. Incidents Endpoint (/api/incidents and /api/history)
# =========================================================================
@app.get("/api/incidents")
@app.get("/api/history")
def get_incidents():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM incidents ORDER BY started_at DESC")
    incs = [dict(row) for row in cursor.fetchall()]
    db.close()

    # Prepend active live incident if one is running
    if simulator.active_scenario and simulator.active_incident_id:
        active_rec = {
            "id": simulator.active_incident_id,
            "title": f"Live Incident: {simulator.active_scenario}",
            "scenario": simulator.active_scenario,
            "initiating_service": "payment-db" if "DATABASE" in simulator.active_scenario else "payment-service",
            "status": "OPEN",
            "severity": "P0_CRITICAL",
            "started_at": datetime_from_ts(simulator.scenario_start_time),
            "resolved_at": None,
            "post_mortem": "Active cascading incident currently under investigation."
        }
        return [active_rec] + incs
    return incs

def datetime_from_ts(ts):
    if not ts:
        return None
    from datetime import datetime, timezone
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()

# =========================================================================
# 5. Failure Injection Endpoints (/api/failure/inject and /api/demo/inject)
# =========================================================================
@app.post("/api/failure/inject")
@app.post("/api/demo/inject")
def inject_failure(req: ScenarioRequest):
    res = simulator.inject_failure(req.scenario)
    return res

# =========================================================================
# 6. Reset Endpoints (/api/reset and /api/demo/reset)
# =========================================================================
@app.post("/api/reset")
@app.post("/api/demo/reset")
def reset_cluster():
    res = simulator.reset()
    adaptive_engine.reset_evidence()
    return res

# =========================================================================
# Investigation, Diagnosis, Recovery & Deployments
# =========================================================================
@app.get("/api/investigation")
def get_investigation():
    tick = simulator.tick()
    scenario = simulator.active_scenario
    steps = adaptive_engine.investigate(scenario, tick["current_metrics"], tick["latest_trace"])
    return {
        "scenario": scenario,
        "incident_id": simulator.active_incident_id,
        "total_steps": len(steps),
        "steps": steps
    }

@app.get("/api/diagnosis")
@app.get("/api/root-cause")
def get_diagnosis():
    tick = simulator.tick()
    scenario = simulator.active_scenario
    metrics = tick["current_metrics"]
    trace = tick["latest_trace"]

    diagnosis = root_cause_engine.analyze(metrics, trace, scenario)
    steps = adaptive_engine.investigate(scenario, metrics, trace)
    explanation = ai_explainer.explain(diagnosis, steps)

    return {
        **diagnosis,
        "ai_explanation": explanation
    }

@app.get("/api/recovery/recommendation")
def get_recovery_recommendation():
    scenario = simulator.active_scenario
    tick = simulator.tick()
    diag = root_cause_engine.analyze(tick["current_metrics"], tick["latest_trace"], scenario)
    initiator = diag.get("initiating_service")
    rec = recovery_engine.get_recommendation(scenario, initiator)
    return rec

@app.post("/api/recovery/approve")
def approve_recovery(req: ApprovalRequest):
    res = recovery_engine.execute_recovery(req.action_id, req.approved_by or "oncall-sre@acme.corp")
    return res

@app.get("/api/recovery/verify")
def verify_recovery():
    ver = recovery_engine.verify()
    return ver

@app.get("/api/deployments")
def list_deployments():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM deployments ORDER BY deployed_at DESC")
    deps = [dict(row) for row in cursor.fetchall()]
    db.close()
    return deps

# =========================================================================
# Blast Radius Endpoint (/api/blast-radius)
# =========================================================================
@app.get("/api/blast-radius")
def get_blast_radius():
    tick = simulator.tick()
    metrics = tick["current_metrics"]
    scenario = simulator.active_scenario
    diag = root_cause_engine.analyze(metrics, tick["latest_trace"], scenario)
    initiator = diag.get("initiating_service")
    return blast_radius_engine.analyze(metrics, initiator, scenario)

# =========================================================================
# Early Warning Endpoint (/api/early-warning)
# =========================================================================
@app.get("/api/early-warning")
def get_early_warning():
    tick = simulator.tick()
    metrics = tick["current_metrics"]
    scenario = simulator.active_scenario
    elapsed = 0.0
    if scenario and simulator.scenario_start_time:
        elapsed = time.time() - simulator.scenario_start_time
    return early_warning_engine.analyze(metrics, scenario, elapsed)

# =========================================================================
# Causal Incident Graph Endpoint (/api/causal-graph)
# =========================================================================
@app.get("/api/causal-graph")
def get_causal_graph():
    scenario = simulator.active_scenario
    return adaptive_engine.get_causal_graph(scenario)

# =========================================================================
# Adaptive Evidence Engine 2.0 (/api/investigation/adaptive)
# =========================================================================
@app.get("/api/investigation/adaptive")
def get_adaptive_investigation():
    tick = simulator.tick()
    scenario = simulator.active_scenario
    metrics = tick["current_metrics"]
    trace = tick["latest_trace"]
    return adaptive_engine.get_adaptive_analysis(scenario, metrics, trace)

@app.post("/api/investigation/acquire-evidence")
def acquire_next_best_evidence(req: AcquireEvidenceRequest):
    scenario = req.scenario or simulator.active_scenario or "database_failure"
    return adaptive_engine.acquire_evidence(scenario)

# =========================================================================
# Recovery Sandbox & Digital Twin (/api/recovery/options & /api/recovery/simulate)
# =========================================================================
@app.get("/api/recovery/options")
def get_recovery_options():
    scenario = simulator.active_scenario
    tick = simulator.tick()
    diag = root_cause_engine.analyze(tick["current_metrics"], tick["latest_trace"], scenario)
    initiator = diag.get("initiating_service")
    return sandbox_engine.get_candidate_options(scenario, initiator)

@app.post("/api/recovery/simulate")
def simulate_recovery_sandbox(req: SimulationRequest):
    tick = simulator.tick()
    scenario = req.scenario or simulator.active_scenario
    return sandbox_engine.simulate(req.action_id, tick["current_metrics"], scenario)

# =========================================================================
# Incident Memory & Engineer Feedback Loop (/api/memory/similar & /api/feedback)
# =========================================================================
@app.get("/api/memory/similar")
def get_similar_incidents():
    scenario = simulator.active_scenario
    tick = simulator.tick()
    diag = root_cause_engine.analyze(tick["current_metrics"], tick["latest_trace"], scenario)
    initiator = diag.get("initiating_service")
    symptom = diag.get("incident", {}).get("symptom", "502 Bad Gateway")
    return incident_memory_engine.find_similar(scenario, symptom, initiator)

@app.post("/api/feedback")
def submit_engineer_feedback(req: FeedbackRequest):
    return incident_memory_engine.record_feedback(
        req.incident_id,
        req.diagnosis_accurate,
        req.recovery_effective,
        req.engineer_notes or "",
        req.engineer_email or "oncall-sre@acme.corp"
    )

@app.get("/api/feedback/stats")
def get_engineer_feedback_stats():
    return incident_memory_engine.get_stats()

# =========================================================================
# Service Criticality, Why Now, What Changed, Copilot & Change Risk
# =========================================================================
@app.get("/api/services/criticality")
def get_service_criticality():
    """Retrieve service criticality tiers, downstream dependent counts, and critical paths."""
    return topology_graph.get_service_criticality()

@app.get("/api/investigation/why-now")
def get_why_now():
    """Analyze temporal trigger factors and contributing conditions leading up to failure."""
    tick = simulator.tick()
    metrics = tick["current_metrics"]
    scenario = simulator.active_scenario
    elapsed_s = 0.0
    if scenario and simulator.scenario_start_time:
        elapsed_s = round(time.time() - simulator.scenario_start_time, 1)
    return why_now_engine.analyze_why_now(scenario, metrics, elapsed_s)

@app.get("/api/investigation/what-changed")
def get_what_changed():
    """Compute state deviation deltas between nominal baseline and active incident state."""
    tick = simulator.tick()
    metrics = tick["current_metrics"]
    scenario = simulator.active_scenario
    return why_now_engine.analyze_what_changed(scenario, metrics)

@app.post("/api/copilot/query")
def copilot_query(req: CopilotRequest):
    """Query incident-aware SRE Copilot grounded in telemetry, causal graphs, and evidence."""
    tick = simulator.tick()
    metrics = tick["current_metrics"]
    trace = tick["latest_trace"]
    scenario = simulator.active_scenario
    elapsed_s = round(time.time() - simulator.scenario_start_time, 1) if scenario and simulator.scenario_start_time else 0.0

    diagnosis = root_cause_engine.analyze(metrics, trace, scenario)
    initiator = diagnosis.get("initiating_service")
    blast = blast_radius_engine.analyze(metrics, initiator, scenario)
    why_now = why_now_engine.analyze_why_now(scenario, metrics, elapsed_s)
    recovery = sandbox_engine.get_candidate_options(scenario, initiator)
    inc = diagnosis.get("incident") or {}
    symptom = inc.get("symptom", "502 Bad Gateway")
    similar = incident_memory_engine.find_similar(scenario, symptom, initiator)

    return copilot_engine.answer_query(
        question=req.question,
        scenario=scenario,
        diagnosis=diagnosis,
        blast_radius=blast,
        why_now=why_now,
        recovery=recovery,
        similar_incidents=similar,
        api_key=req.api_key
    )

@app.post("/api/deployments/analyze-change")
def analyze_change(req: ChangeAnalysisRequest):
    """Pre-deployment change risk estimation using service criticality and blast radius topology."""
    crit_map = topology_graph.get_service_criticality()
    crit = crit_map.get(req.service_id, {})
    tier = crit.get("criticality_tier", "MEDIUM")
    downstreams = crit.get("downstream_dependents", [])

    risk_score = 30
    if tier == "CRITICAL":
        risk_score += 45
    elif tier == "HIGH":
        risk_score += 30
    elif tier == "MEDIUM":
        risk_score += 15

    if req.change_type in ["schema", "config"]:
        risk_score += 15

    risk_level = "HIGH" if risk_score >= 70 else "MEDIUM" if risk_score >= 40 else "LOW"

    recommendations = [
        f"Deploy canary release to <= 10% traffic for {req.service_id}",
        f"Closely monitor downstream dependents: {', '.join(downstreams[:3]) if downstreams else 'API Gateway'}",
        "Ensure database connection pool headroom before applying change"
    ]

    return {
        "service_id": req.service_id,
        "version": req.version,
        "change_type": req.change_type,
        "risk_score": min(risk_score, 95),
        "risk_level": risk_level,
        "criticality_tier": tier,
        "downstream_impact_count": len(downstreams),
        "impacted_services": downstreams,
        "recommendations": recommendations
    }

from fastapi import FastAPI, HTTPException, UploadFile, File
from backend.project_manager import project_manager

# =========================================================================
# Multi-Project Observability & Static Analysis Endpoints
# =========================================================================
@app.get("/api/projects")
def list_projects():
    """List all registered projects (Demo, sample fixtures, and uploaded projects)."""
    return project_manager.list_projects()

@app.get("/api/projects/{project_id}")
def get_project(project_id: str):
    """Retrieve full project architecture, topology, readiness and discovery data."""
    proj = project_manager.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")
    return proj

@app.post("/api/projects/upload")
async def upload_project_zip(file: UploadFile = File(...)):
    """Safely upload and inspect a project ZIP archive with path-traversal guardrails."""
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip archives are supported for project upload.")
    
    contents = await file.read()
    try:
        analysis = project_manager.import_zip_archive(contents, file.filename)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to extract and analyze archive: {str(e)}")

@app.post("/api/projects/sample/{sample_id}")
def load_sample_project(sample_id: str):
    """1-click load pre-packaged sample project fixtures."""
    try:
        return project_manager.load_sample_project(sample_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@app.get("/api/projects/{project_id}/topology")
def get_project_topology(project_id: str):
    """Get graph topology of discovered services and dependency confidence scores."""
    proj = project_manager.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj.get("topology", {})

@app.get("/api/projects/{project_id}/readiness")
def get_project_readiness(project_id: str):
    """Get observability readiness score and itemized checklist."""
    proj = project_manager.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj.get("readiness", {})

@app.get("/api/projects/{project_id}/integration-plan")
def get_project_integration_plan(project_id: str):
    """Get copy-paste OpenTelemetry integration code snippets and steps."""
    proj = project_manager.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj.get("integration_plan", {})

@app.post("/api/projects/{project_id}/telemetry")
def ingest_project_telemetry(project_id: str, payload: Dict[str, Any]):
    """Ingest live external telemetry and normalize into TraceLens engine format."""
    return project_manager.ingest_telemetry(project_id, payload)

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str):
    """Remove an uploaded project workspace."""
    success = project_manager.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete demo or system fixture.")
    return {"status": "DELETED", "project_id": project_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
