import os
import json
import uuid
import time
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from backend.database import get_db
from backend.project_analyzer import project_analyzer
from backend.secure_extractor import secure_extractor

class ProjectManager:
    """
    Manages multi-project lifecycle states in TraceRoute AI:
      - Mode 1: FoodDelivery-Demo (Built-in simulated microservices)
      - Mode 2: Uploaded/Connected User Projects
    Provides 3 bundled test fixtures and normalizes ingested external telemetry.
    """

    def __init__(self):
        self._in_memory_projects: Dict[str, Dict[str, Any]] = {}
        self._telemetry_buffers: Dict[str, Dict[str, Any]] = {}
        self._init_fixtures()

    def _init_fixtures(self):
        """Creates 3 pre-built safe project fixtures so users/judges can test project onboarding instantly."""
        # 1. MyShop Multi-Service Docker Compose
        self.sample_myshop = {
            "id": "sample-myshop-microservices",
            "name": "MyShop E-Commerce Microservices",
            "type": "SAMPLE_PROJECT",
            "architecture_type": "MICROSERVICES",
            "languages": ["Python", "TypeScript", "SQL"],
            "frameworks": ["FastAPI", "Express", "PostgreSQL"],
            "databases": ["PostgreSQL"],
            "total_services": 5,
            "total_routes": 18,
            "total_dependencies": 6,
            "status": "INTEGRATION_REQUIRED",
            "capability_level": "LEVEL 1: STATIC PROJECT ANALYSIS",
            "readiness": {
                "readiness_percentage": 65,
                "status_label": "INTEGRATION REQUIRED",
                "missing_count": 2,
                "checklist": [
                    {"item": "Microservice Boundaries Discovered", "status": "PASSED", "score": 20, "details": "5 microservices cataloged (Gateway, Order, Payment, Inventory, Postgres)."},
                    {"item": "API Routes & Endpoints Mapped", "status": "PASSED", "score": 20, "details": "18 HTTP routes identified across service handlers."},
                    {"item": "Container Topology Defined", "status": "PASSED", "score": 15, "details": "docker-compose.yml defines multi-container network links."},
                    {"item": "Distributed Tracing Configured", "status": "ACTION_REQUIRED", "score": 0, "details": "OpenTelemetry SDK not detected. TraceRoute integration required."},
                    {"item": "Metrics Exporter Active", "status": "ACTION_REQUIRED", "score": 0, "details": "Prometheus exporter not detected."},
                    {"item": "Liveness / Health Probe Endpoint", "status": "PASSED", "score": 10, "details": "Discovered standard /health endpoint."}
                ]
            },
            "services": [
                {"id": "api-gateway", "name": "API Gateway", "framework": "FastAPI", "port": 8000, "tier": "gateway", "language": "Python", "description": "Public reverse proxy & authentication"},
                {"id": "order-service", "name": "Order Service", "framework": "FastAPI", "port": 8001, "tier": "application", "language": "Python", "description": "Checkout state machine & order saga"},
                {"id": "payment-service", "name": "Payment Service", "framework": "Express", "port": 8002, "tier": "application", "language": "TypeScript", "description": "Stripe/PayPal processor & token vault"},
                {"id": "inventory-service", "name": "Inventory Service", "framework": "FastAPI", "port": 8003, "tier": "application", "language": "Python", "description": "Warehouse SKU catalog & reservations"},
                {"id": "postgres-db", "name": "PostgreSQL Database", "framework": "PostgreSQL", "port": 5432, "tier": "data", "language": "SQL", "description": "Primary transactional ACID storage"}
            ],
            "dependencies": [
                {"source": "api-gateway", "target": "order-service", "confidence": "CONFIRMED", "evidence": "Declared in docker-compose depends_on: [order-service]"},
                {"source": "order-service", "target": "payment-service", "confidence": "CONFIRMED", "evidence": "Declared in docker-compose depends_on: [payment-service]"},
                {"source": "order-service", "target": "inventory-service", "confidence": "CONFIRMED", "evidence": "Declared in docker-compose depends_on: [inventory-service]"},
                {"source": "payment-service", "target": "postgres-db", "confidence": "CONFIRMED", "evidence": "Declared in docker-compose depends_on: [postgres-db]"},
                {"source": "inventory-service", "target": "postgres-db", "confidence": "LIKELY", "evidence": "SQL connection string references postgres-db:5432"}
            ],
            "routes": [
                {"method": "POST", "path": "/api/v1/orders", "file": "services/order/routes.py", "framework": "FastAPI"},
                {"method": "GET", "path": "/api/v1/orders/{id}", "file": "services/order/routes.py", "framework": "FastAPI"},
                {"method": "POST", "path": "/api/v1/payments/charge", "file": "services/payment/router.ts", "framework": "Express"},
                {"method": "GET", "path": "/api/v1/inventory/check", "file": "services/inventory/routes.py", "framework": "FastAPI"},
                {"method": "GET", "path": "/health", "file": "services/gateway/main.py", "framework": "FastAPI"}
            ],
            "topology": {
                "nodes": [
                    {"id": "api-gateway", "name": "API Gateway", "framework": "FastAPI", "port": 8000, "tier": "gateway", "x": 400, "y": 70, "status": "HEALTHY", "latency": 22.0, "p50_latency_ms": 22.0, "p99_latency_ms": 48.0, "error_rate": 0.0, "error_rate_pct": 0.0, "rps": 180, "cpu_pct": 20.0, "description": "Public reverse proxy"},
                    {"id": "order-service", "name": "Order Service", "framework": "FastAPI", "port": 8001, "tier": "application", "x": 400, "y": 210, "status": "HEALTHY", "latency": 25.0, "p50_latency_ms": 25.0, "p99_latency_ms": 52.0, "error_rate": 0.0, "error_rate_pct": 0.0, "rps": 140, "cpu_pct": 24.0, "description": "Order saga coordinator"},
                    {"id": "payment-service", "name": "Payment Service", "framework": "Express", "port": 8002, "tier": "application", "x": 230, "y": 340, "status": "HEALTHY", "latency": 32.0, "p50_latency_ms": 32.0, "p99_latency_ms": 65.0, "error_rate": 0.0, "error_rate_pct": 0.0, "rps": 95, "cpu_pct": 28.0, "description": "Payment authorization"},
                    {"id": "inventory-service", "name": "Inventory Service", "framework": "FastAPI", "port": 8003, "tier": "application", "x": 570, "y": 340, "status": "HEALTHY", "latency": 18.0, "p50_latency_ms": 18.0, "p99_latency_ms": 38.0, "error_rate": 0.0, "error_rate_pct": 0.0, "rps": 110, "cpu_pct": 16.0, "description": "Stock catalog & reservation"},
                    {"id": "postgres-db", "name": "PostgreSQL Database", "framework": "PostgreSQL", "port": 5432, "tier": "data", "x": 230, "y": 480, "status": "HEALTHY", "latency": 4.5, "p50_latency_ms": 4.5, "p99_latency_ms": 12.0, "error_rate": 0.0, "error_rate_pct": 0.0, "rps": 240, "cpu_pct": 32.0, "description": "Persistent transactional storage"}
                ],
                "edges": [
                    {"source": "api-gateway", "target": "order-service", "protocol": "HTTP / REST", "timeout_ms": 2500, "status": "HEALTHY", "confidence": "CONFIRMED", "evidence": "docker-compose depends_on"},
                    {"source": "order-service", "target": "payment-service", "protocol": "HTTP / REST", "timeout_ms": 2000, "status": "HEALTHY", "confidence": "CONFIRMED", "evidence": "docker-compose depends_on"},
                    {"source": "order-service", "target": "inventory-service", "protocol": "HTTP / REST", "timeout_ms": 1500, "status": "HEALTHY", "confidence": "CONFIRMED", "evidence": "docker-compose depends_on"},
                    {"source": "payment-service", "target": "postgres-db", "protocol": "TCP / SQL", "timeout_ms": 1000, "status": "HEALTHY", "confidence": "CONFIRMED", "evidence": "docker-compose depends_on"}
                ]
            },
            "integration_plan": project_analyzer._generate_integration_plan("sample-myshop-microservices", ["Python", "TypeScript"], ["FastAPI", "Express"], [
                {"id": "api-gateway"}, {"id": "order-service"}, {"id": "payment-service"}, {"id": "inventory-service"}
            ])
        }

        # 2. FastAPI Order Service
        self.sample_fastapi = {
            "id": "sample-fastapi-service",
            "name": "FastAPI Order Service",
            "type": "SAMPLE_PROJECT",
            "architecture_type": "BACKEND_SERVICE",
            "languages": ["Python"],
            "frameworks": ["FastAPI", "SQLite"],
            "databases": ["SQLite"],
            "total_services": 2,
            "total_routes": 7,
            "total_dependencies": 1,
            "status": "INTEGRATION_REQUIRED",
            "capability_level": "LEVEL 1: STATIC PROJECT ANALYSIS",
            "readiness": {
                "readiness_percentage": 70,
                "status_label": "INTEGRATION REQUIRED",
                "missing_count": 2,
                "checklist": [
                    {"item": "Microservice Boundaries Discovered", "status": "PASSED", "score": 20, "details": "FastAPI backend service cataloged."},
                    {"item": "API Routes & Endpoints Mapped", "status": "PASSED", "score": 20, "details": "7 HTTP routes discovered in router.py."},
                    {"item": "Container Topology Defined", "status": "WARNING", "score": 0, "details": "Dockerfile discovered; standalone container."},
                    {"item": "Distributed Tracing Configured", "status": "ACTION_REQUIRED", "score": 0, "details": "OpenTelemetry SDK not detected."},
                    {"item": "Metrics Exporter Active", "status": "ACTION_REQUIRED", "score": 0, "details": "Prometheus exporter required."},
                    {"item": "Liveness / Health Probe Endpoint", "status": "PASSED", "score": 10, "details": "Discovered /health probe."}
                ]
            },
            "services": [
                {"id": "fastapi-order", "name": "FastAPI Order Service", "framework": "FastAPI", "port": 8000, "tier": "application", "language": "Python", "description": "Order processing API"},
                {"id": "sqlite-db", "name": "SQLite Datastore", "framework": "SQLite", "port": 0, "tier": "data", "language": "SQL", "description": "Local embedded database"}
            ],
            "dependencies": [
                {"source": "fastapi-order", "target": "sqlite-db", "confidence": "CONFIRMED", "evidence": "Local sqlite3 file connection"}
            ],
            "routes": [
                {"method": "GET", "path": "/health", "file": "main.py", "framework": "FastAPI"},
                {"method": "POST", "path": "/orders", "file": "routes/orders.py", "framework": "FastAPI"},
                {"method": "GET", "path": "/orders/{id}", "file": "routes/orders.py", "framework": "FastAPI"}
            ],
            "topology": {
                "nodes": [
                    {"id": "fastapi-order", "name": "FastAPI Order Service", "framework": "FastAPI", "port": 8000, "tier": "application", "x": 400, "y": 140, "status": "HEALTHY", "latency": 19.5, "p50_latency_ms": 19.5, "p99_latency_ms": 38.0, "error_rate": 0.0, "error_rate_pct": 0.0, "rps": 150, "cpu_pct": 14.0, "description": "FastAPI application"},
                    {"id": "sqlite-db", "name": "SQLite Datastore", "framework": "SQLite", "port": 0, "tier": "data", "x": 400, "y": 360, "status": "HEALTHY", "latency": 2.1, "p50_latency_ms": 2.1, "p99_latency_ms": 6.0, "error_rate": 0.0, "error_rate_pct": 0.0, "rps": 150, "cpu_pct": 8.0, "description": "Embedded storage"}
                ],
                "edges": [
                    {"source": "fastapi-order", "target": "sqlite-db", "protocol": "SQL / File", "timeout_ms": 500, "status": "HEALTHY", "confidence": "CONFIRMED", "evidence": "SQL driver"}
                ]
            },
            "integration_plan": project_analyzer._generate_integration_plan("sample-fastapi-service", ["Python"], ["FastAPI"], [{"id": "fastapi-order"}])
        }

        # 3. Express Payment Gateway
        self.sample_express = {
            "id": "sample-express-payment",
            "name": "Express Payment API",
            "type": "SAMPLE_PROJECT",
            "architecture_type": "BACKEND_SERVICE",
            "languages": ["TypeScript", "JavaScript"],
            "frameworks": ["Express", "Redis"],
            "databases": ["Redis"],
            "total_services": 2,
            "total_routes": 6,
            "total_dependencies": 1,
            "status": "INTEGRATION_REQUIRED",
            "capability_level": "LEVEL 1: STATIC PROJECT ANALYSIS",
            "readiness": {
                "readiness_percentage": 70,
                "status_label": "INTEGRATION REQUIRED",
                "missing_count": 2,
                "checklist": [
                    {"item": "Microservice Boundaries Discovered", "status": "PASSED", "score": 20, "details": "Node/Express backend service cataloged."},
                    {"item": "API Routes & Endpoints Mapped", "status": "PASSED", "score": 20, "details": "6 HTTP endpoints found in src/routes/payment.ts."},
                    {"item": "Container Topology Defined", "status": "WARNING", "score": 0, "details": "Dockerfile discovered."},
                    {"item": "Distributed Tracing Configured", "status": "ACTION_REQUIRED", "score": 0, "details": "OpenTelemetry SDK not detected."},
                    {"item": "Metrics Exporter Active", "status": "ACTION_REQUIRED", "score": 0, "details": "Prometheus exporter required."},
                    {"item": "Liveness / Health Probe Endpoint", "status": "PASSED", "score": 10, "details": "Discovered /healthz probe."}
                ]
            },
            "services": [
                {"id": "express-payment", "name": "Express Payment API", "framework": "Express", "port": 3000, "tier": "application", "language": "TypeScript", "description": "Payment authorization gateway"},
                {"id": "redis-cache", "name": "Redis Token Cache", "framework": "Redis", "port": 6379, "tier": "data", "language": "In-Memory", "description": "Idempotency key & token store"}
            ],
            "dependencies": [
                {"source": "express-payment", "target": "redis-cache", "confidence": "CONFIRMED", "evidence": "ioredis client in src/db/redis.ts"}
            ],
            "routes": [
                {"method": "GET", "path": "/healthz", "file": "src/index.ts", "framework": "Express"},
                {"method": "POST", "path": "/api/charge", "file": "src/routes/payment.ts", "framework": "Express"},
                {"method": "POST", "path": "/api/refund", "file": "src/routes/payment.ts", "framework": "Express"}
            ],
            "topology": {
                "nodes": [
                    {"id": "express-payment", "name": "Express Payment API", "framework": "Express", "port": 3000, "tier": "application", "x": 400, "y": 140, "status": "HEALTHY", "latency": 28.0, "p50_latency_ms": 28.0, "p99_latency_ms": 55.0, "error_rate": 0.0, "error_rate_pct": 0.0, "rps": 130, "cpu_pct": 22.0, "description": "Express application"},
                    {"id": "redis-cache", "name": "Redis Token Cache", "framework": "Redis", "port": 6379, "tier": "data", "x": 400, "y": 360, "status": "HEALTHY", "latency": 1.2, "p50_latency_ms": 1.2, "p99_latency_ms": 3.5, "error_rate": 0.0, "error_rate_pct": 0.0, "rps": 280, "cpu_pct": 12.0, "description": "In-memory cache"}
                ],
                "edges": [
                    {"source": "express-payment", "target": "redis-cache", "protocol": "TCP / Redis", "timeout_ms": 500, "status": "HEALTHY", "confidence": "CONFIRMED", "evidence": "ioredis connection"}
                ]
            },
            "integration_plan": project_analyzer._generate_integration_plan("sample-express-payment", ["TypeScript"], ["Express"], [{"id": "express-payment"}])
        }

        # Cache sample projects in memory
        self._in_memory_projects[self.sample_myshop["id"]] = self.sample_myshop
        self._in_memory_projects[self.sample_fastapi["id"]] = self.sample_fastapi
        self._in_memory_projects[self.sample_express["id"]] = self.sample_express

    def list_projects(self) -> List[Dict[str, Any]]:
        """Returns all registered projects (Demo + Samples + Uploaded)."""
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM projects ORDER BY created_at DESC")
        db_projects = [dict(r) for r in cursor.fetchall()]
        db.close()

        # Format list summary
        projects_list = [
            {
                "id": "FoodDelivery-Demo",
                "name": "FoodDelivery-Demo",
                "type": "DEMO",
                "status": "LIVE_SIMULATION",
                "architecture_type": "MICROSERVICES",
                "services_count": 6,
                "routes_count": 12,
                "readiness_pct": 100,
                "description": "Built-in distributed microservices simulator with time-delayed failure cascades and controlled recovery.",
                "is_active_demo": True
            }
        ]

        # Add sample projects
        for p_id in [self.sample_myshop["id"], self.sample_fastapi["id"], self.sample_express["id"]]:
            p = self._in_memory_projects[p_id]
            projects_list.append({
                "id": p["id"],
                "name": p["name"],
                "type": p["type"],
                "status": p["status"],
                "architecture_type": p["architecture_type"],
                "services_count": p["total_services"],
                "routes_count": p["total_routes"],
                "readiness_pct": p["readiness"]["readiness_percentage"],
                "description": f"Pre-configured sample codebase ({', '.join(p['frameworks'])})"
            })

        # Add user-uploaded projects from database
        for r in db_projects:
            if r["id"] not in [p["id"] for p in projects_list]:
                projects_list.append({
                    "id": r["id"],
                    "name": r["name"],
                    "type": r["type"],
                    "status": r["status"],
                    "architecture_type": r.get("architecture_type", "MICROSERVICES"),
                    "services_count": r.get("services_count", 1),
                    "routes_count": r.get("routes_count", 0),
                    "readiness_pct": r.get("readiness_pct", 50),
                    "description": "User-uploaded application project"
                })

        return projects_list

    def get_project_dir(self, project_id: str) -> str:
        p_dir = os.path.join(secure_extractor.base_workspace_dir, project_id)
        os.makedirs(p_dir, exist_ok=True)
        return p_dir

    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Returns complete project details, architecture, topology, and readiness."""
        if project_id in self._in_memory_projects:
            return self._in_memory_projects[project_id]

        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        row = cursor.fetchone()
        db.close()

        if not row:
            return None

        r = dict(row)
        analysis_data = json.loads(r.get("analysis_data", "{}"))
        topology_data = json.loads(r.get("topology_data", "{}"))

        return {
            "id": r["id"],
            "name": r["name"],
            "type": r["type"],
            "status": r["status"],
            "architecture_type": r.get("architecture_type", "MICROSERVICES"),
            "languages": json.loads(r.get("languages", "[]")),
            "frameworks": json.loads(r.get("frameworks", "[]")),
            "databases": json.loads(r.get("databases", "[]")),
            "total_services": r.get("services_count", 1),
            "total_routes": r.get("routes_count", 0),
            "total_dependencies": len(analysis_data.get("dependencies", [])),
            "readiness": analysis_data.get("readiness", {}),
            "services": analysis_data.get("services", []),
            "routes": analysis_data.get("routes", []),
            "dependencies": analysis_data.get("dependencies", []),
            "topology": topology_data,
            "integration_plan": analysis_data.get("integration_plan", {}),
            "original_filename": analysis_data.get("original_filename", f"{r['name'].lower().replace(' ', '-')}.zip"),
            "capability_level": "LEVEL 1: STATIC PROJECT ANALYSIS"
        }

    def import_zip_archive(self, zip_file, filename: str) -> Dict[str, Any]:
        """Safely extracts and analyzes an uploaded project ZIP file."""
        proj_id = f"proj-{uuid.uuid4().hex[:8]}"
        proj_name = os.path.splitext(filename)[0].replace("-", " ").replace("_", " ").title()

        # Step 1: Secure extraction
        extract_result = secure_extractor.extract_zip(zip_file, proj_id)

        # Step 2: Static project discovery
        analysis = project_analyzer.analyze_project(
            project_dir=extract_result["effective_root"],
            project_id=proj_id,
            project_name=proj_name
        )

        analysis["sensitive_files_detected"] = extract_result["sensitive_files_detected"]
        analysis["skipped_directories"] = extract_result["skipped_directories"]
        analysis["original_filename"] = filename

        # Step 2.5: Seed isolated workspace in RepairEngine (original/, working/, reports/, output/)
        try:
            from backend.repair_engine import repair_engine
            repair_engine.get_workspace_paths(proj_id, extract_result["effective_root"])
            repair_engine.analyze_project_issues(proj_id, extract_result["effective_root"], proj_name, filename)
        except Exception:
            pass

        # Step 3: Persist project in SQLite
        db = get_db()
        cursor = db.cursor()
        now_str = datetime.now(timezone.utc).isoformat()

        cursor.execute(
            """
            INSERT OR REPLACE INTO projects (
                id, name, type, status, architecture_type, languages, frameworks,
                services_count, routes_count, databases, readiness_pct, created_at,
                analysis_data, topology_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                proj_id,
                proj_name,
                "USER_UPLOAD",
                analysis["status"],
                analysis["architecture_type"],
                json.dumps(analysis["languages"]),
                json.dumps(analysis["frameworks"]),
                analysis["total_services"],
                analysis["total_routes"],
                json.dumps(analysis["databases"]),
                analysis["readiness"]["readiness_percentage"],
                now_str,
                json.dumps(analysis),
                json.dumps(analysis["topology"])
            )
        )
        db.commit()
        db.close()

        # Save to memory cache
        self._in_memory_projects[proj_id] = analysis

        return analysis

    def load_sample_project(self, sample_id: str) -> Dict[str, Any]:
        """Loads one of the 3 pre-built sample fixtures."""
        if sample_id == "sample-myshop-microservices":
            return self.sample_myshop
        elif sample_id == "sample-fastapi-service":
            return self.sample_fastapi
        elif sample_id == "sample-express-payment":
            return self.sample_express
        else:
            return self.sample_myshop

    def ingest_telemetry(self, project_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Accepts external telemetry (logs, metrics, traces, health) for connected projects,
        normalizes it into TraceRoute unified model, and updates the project status.
        """
        proj = self.get_project(project_id)
        if not proj:
            return {"status": "ERROR", "message": f"Project {project_id} not found."}

        # Update project status to CONNECTED / MONITORING
        proj["status"] = "CONNECTED"
        if project_id in self._in_memory_projects:
            self._in_memory_projects[project_id]["status"] = "CONNECTED"

        buffer = self._telemetry_buffers.setdefault(project_id, {"traces": [], "metrics": {}, "logs": []})

        # Normalize metrics or traces if provided
        if "metrics" in payload:
            for s_id, m_val in payload["metrics"].items():
                buffer["metrics"][s_id] = {
                    "service": s_id,
                    "latency": m_val.get("latency", 20.0),
                    "error_rate": m_val.get("error_rate", 0.0),
                    "status": "HEALTHY" if m_val.get("error_rate", 0.0) < 5 else "CRITICAL"
                }

        if "spans" in payload or "trace_id" in payload:
            buffer["traces"].append(payload)

        return {
            "status": "INGESTED",
            "project_id": project_id,
            "project_status": "CONNECTED",
            "message": "Telemetry received and normalized into TraceRoute intelligence pipeline."
        }

    def delete_project(self, project_id: str) -> Dict[str, Any]:
        """Cleans up project records and temporary workspace."""
        if project_id in ["FoodDelivery-Demo", self.sample_myshop["id"], self.sample_fastapi["id"], self.sample_express["id"]]:
            return {"status": "SKIPPED", "message": "Cannot delete built-in demo or sample fixtures."}

        db = get_db()
        cursor = db.cursor()
        cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        db.commit()
        db.close()

        if project_id in self._in_memory_projects:
            del self._in_memory_projects[project_id]

        secure_extractor.cleanup_workspace(project_id)

        return {"status": "DELETED", "project_id": project_id}

project_manager = ProjectManager()
