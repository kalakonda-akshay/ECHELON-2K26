import os
import re
import json
from typing import Dict, List, Any, Optional
from backend.secure_extractor import BLOCKED_DIR_NAMES

class ProjectAnalyzer:
    """
    Static analysis engine for user-uploaded codebases.
    Discovers:
      - Languages, frameworks, and databases
      - Docker Compose multi-service architecture
      - Microservices, ports, and configuration
      - API route definitions
      - Service-to-service dependencies with confidence levels (CONFIRMED, LIKELY, UNRESOLVED)
      - Observability readiness score & OpenTelemetry instrumentation plan
    """

    def analyze_project(self, project_dir: str, project_id: str, project_name: Optional[str] = None) -> Dict[str, Any]:
        if not project_name:
            project_name = os.path.basename(project_dir)
            if project_name.startswith("proj-") or not project_name:
                project_name = "Imported Application"

        # 1. Inspect directory structure
        files_by_ext = {}
        all_relative_files = []
        for root, dirs, files in os.walk(project_dir):
            # Ignore hidden or build dirs
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ["node_modules", "dist", "build", "__pycache__", "venv", ".venv"]]
            for f in files:
                rel_path = os.path.relpath(os.path.join(root, f), project_dir).replace("\\", "/")
                all_relative_files.append(rel_path)
                ext = os.path.splitext(f)[1].lower()
                files_by_ext.setdefault(ext, []).append(rel_path)

        # 2. Framework & Language Discovery
        languages = set()
        frameworks = set()
        databases = set()

        if ".py" in files_by_ext or "requirements.txt" in all_relative_files or "pyproject.toml" in all_relative_files:
            languages.add("Python")
        if ".js" in files_by_ext or ".jsx" in files_by_ext or "package.json" in all_relative_files:
            languages.add("JavaScript")
        if ".ts" in files_by_ext or ".tsx" in files_by_ext:
            languages.add("TypeScript")
        if ".go" in files_by_ext:
            languages.add("Go")
        if ".java" in files_by_ext:
            languages.add("Java")

        # Inspect package.json / requirements.txt for libraries
        requirements_content = ""
        for req_file in all_relative_files:
            if os.path.basename(req_file) == "requirements.txt":
                try:
                    with open(os.path.join(project_dir, req_file), "r", encoding="utf-8", errors="ignore") as rf:
                        requirements_content += rf.read().lower() + "\n"
                except Exception:
                    pass

        package_json_deps = set()
        for pkg_file in all_relative_files:
            if os.path.basename(pkg_file) == "package.json":
                try:
                    with open(os.path.join(project_dir, pkg_file), "r", encoding="utf-8", errors="ignore") as pf:
                        pkg_data = json.load(pf)
                        deps = {**pkg_data.get("dependencies", {}), **pkg_data.get("devDependencies", {})}
                        package_json_deps.update(k.lower() for k in deps.keys())
                except Exception:
                    pass

        # Detect Python frameworks
        if "fastapi" in requirements_content:
            frameworks.add("FastAPI")
        if "flask" in requirements_content:
            frameworks.add("Flask")
        if "django" in requirements_content:
            frameworks.add("Django")

        # Also inspect Python source files directly if requirements.txt is absent
        if not frameworks and ".py" in files_by_ext:
            for py_f in files_by_ext[".py"][:15]:
                try:
                    with open(os.path.join(project_dir, py_f), "r", encoding="utf-8", errors="ignore") as pf:
                        c_lower = pf.read().lower()
                        if "from fastapi" in c_lower or "import fastapi" in c_lower:
                            frameworks.add("FastAPI")
                        if "from flask" in c_lower or "import flask" in c_lower:
                            frameworks.add("Flask")
                        if "from django" in c_lower or "import django" in c_lower:
                            frameworks.add("Django")
                except Exception:
                    pass

        # Detect Node frameworks
        if "express" in package_json_deps:
            frameworks.add("Express")
        if "next" in package_json_deps:
            frameworks.add("Next.js")
        if "nest" in package_json_deps or "@nestjs/core" in package_json_deps:
            frameworks.add("NestJS")

        # Detect Databases
        db_indicators = {
            "PostgreSQL": ["psycopg2", "asyncpg", "pg", "postgres"],
            "MySQL": ["mysql", "mysql2", "pymysql"],
            "MongoDB": ["mongodb", "mongoose", "pymongo"],
            "Redis": ["redis", "ioredis"],
            "SQLite": ["sqlite3", "aiosqlite"]
        }
        all_dep_text = requirements_content + " " + " ".join(package_json_deps)
        for db_name, idcs in db_indicators.items():
            if any(idx in all_dep_text for idx in idcs):
                databases.add(db_name)

        # 3. Docker Compose & Multi-Service Discovery
        discovered_services: List[Dict[str, Any]] = []
        discovered_dependencies: List[Dict[str, Any]] = []
        compose_found = False

        compose_candidates = ["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"]
        compose_path = None
        for c in compose_candidates:
            if c in all_relative_files:
                compose_path = os.path.join(project_dir, c)
                compose_found = True
                break

        if compose_path:
            discovered_services, discovered_dependencies = self._parse_docker_compose(compose_path, project_dir)

        # If no docker compose or few services found, inspect folder-level microservices
        if len(discovered_services) <= 1:
            folder_services = self._discover_folder_services(project_dir, all_relative_files)
            if folder_services:
                discovered_services = folder_services

        # Fallback: if still 0 services, treat whole repository as single primary service
        if not discovered_services:
            primary_framework = list(frameworks)[0] if frameworks else "REST Service"
            primary_lang = list(languages)[0] if languages else "General"
            discovered_services.append({
                "id": "main-service",
                "name": project_name,
                "framework": primary_framework,
                "language": primary_lang,
                "port": 8000,
                "tier": "application",
                "source_dir": "/",
                "description": f"Main application service ({primary_framework})"
            })

        # Add discovered databases as dedicated topology nodes
        for db in list(databases):
            db_id = f"{db.lower()}-db"
            if not any(s["id"] == db_id for s in discovered_services):
                discovered_services.append({
                    "id": db_id,
                    "name": f"{db} Database",
                    "framework": db,
                    "language": "SQL / Store",
                    "port": 5432 if db == "PostgreSQL" else 6379 if db == "Redis" else 3306,
                    "tier": "data",
                    "source_dir": None,
                    "description": f"Persistent {db} datastore"
                })

        # 4. Route Discovery
        discovered_routes = self._discover_routes(project_dir, files_by_ext)

        # 5. Service-to-Service Dependency Inference (Code Scan)
        inferred_deps = self._infer_code_dependencies(project_dir, files_by_ext, discovered_services)
        for dep in inferred_deps:
            if not any(d["source"] == dep["source"] and d["target"] == dep["target"] for d in discovered_dependencies):
                discovered_dependencies.append(dep)

        # Attach database dependencies if application calls database
        for svc in discovered_services:
            if svc.get("tier") != "data":
                for db in list(databases):
                    db_id = f"{db.lower()}-db"
                    if not any(d["source"] == svc["id"] and d["target"] == db_id for d in discovered_dependencies):
                        discovered_dependencies.append({
                            "source": svc["id"],
                            "target": db_id,
                            "confidence": "LIKELY",
                            "evidence": f"{svc['name']} references {db} driver in dependencies."
                        })

        # 6. Observability Readiness Evaluation
        readiness = self._evaluate_readiness(
            services=discovered_services,
            routes=discovered_routes,
            compose_found=compose_found,
            dependencies_text=all_dep_text,
            all_files=all_relative_files
        )

        # 7. Generate Project Topology Graph
        topology = self._build_topology_graph(discovered_services, discovered_dependencies)

        # 8. Generate OpenTelemetry Integration Plan
        integration_plan = self._generate_integration_plan(
            project_id=project_id,
            languages=list(languages),
            frameworks=list(frameworks),
            services=discovered_services
        )

        architecture_type = "MICROSERVICES" if len(discovered_services) >= 3 else "MONOLITH" if len(discovered_services) == 1 else "MULTI_SERVICE"

        return {
            "id": project_id,
            "name": project_name,
            "project_id": project_id,
            "project_name": project_name,
            "architecture_type": architecture_type,
            "languages": sorted(list(languages)),
            "frameworks": sorted(list(frameworks)),
            "databases": sorted(list(databases)),
            "total_services": len(discovered_services),
            "total_routes": len(discovered_routes),
            "total_dependencies": len(discovered_dependencies),
            "services": discovered_services,
            "routes": discovered_routes[:50],  # sample 50
            "dependencies": discovered_dependencies,
            "readiness": readiness,
            "topology": topology,
            "integration_plan": integration_plan,
            "status": "STATIC_ANALYSIS",
            "capability_level": "LEVEL 1: STATIC PROJECT ANALYSIS"
        }

    def _parse_docker_compose(self, compose_path: str, project_dir: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        services = []
        dependencies = []

        try:
            with open(compose_path, "r", encoding="utf-8", errors="ignore") as cf:
                content = cf.read()
        except Exception:
            return services, dependencies

        # Lightweight YAML regex parser (avoids external pyyaml dependency requirement)
        service_blocks = re.findall(r"\n\s{2}([a-zA-Z0-9_-]+):\s*\n", content)
        if not service_blocks:
            # Try top-level services:
            service_blocks = re.findall(r"\n\s*([a-zA-Z0-9_-]+):\s*\n", content)

        # Find service sections
        lines = content.split("\n")
        current_svc = None
        svc_details: Dict[str, Dict[str, Any]] = {}

        in_services = False
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("services:"):
                in_services = True
                continue

            # Check service name (indented 2 spaces)
            match_svc = re.match(r"^ {2}([a-zA-Z0-9_-]+):", line)
            if in_services and match_svc:
                current_svc = match_svc.group(1)
                svc_details[current_svc] = {
                    "id": current_svc,
                    "name": current_svc.replace("-", " ").title(),
                    "ports": [],
                    "depends_on": [],
                    "image": None,
                    "build": None
                }
                continue

            if current_svc and in_services:
                # Ports
                port_match = re.search(r"['\"]?(\d{2,5}):(\d{2,5})['\"]?", line)
                if port_match and "ports" in line or (port_match and stripped.startswith("-")):
                    svc_details[current_svc]["ports"].append(int(port_match.group(1)))

                # Image
                if stripped.startswith("image:"):
                    svc_details[current_svc]["image"] = stripped.split(":", 1)[1].strip()

                # Depends on
                if stripped.startswith("- ") and "depends_on" in content:
                    dep_cand = stripped.replace("-", "").strip()
                    if dep_cand in svc_details:
                        svc_details[current_svc]["depends_on"].append(dep_cand)

        for s_id, s_data in svc_details.items():
            port = s_data["ports"][0] if s_data["ports"] else 8000
            image = s_data["image"] or ""
            tier = "data" if any(db in s_id.lower() or db in image.lower() for db in ["db", "postgres", "redis", "mysql", "mongo"]) else "gateway" if "gateway" in s_id.lower() or "ingress" in s_id.lower() else "application"
            
            framework = "PostgreSQL" if "postgres" in image or "db" in s_id else "Redis" if "redis" in image else "FastAPI / Node"
            
            services.append({
                "id": s_id,
                "name": s_data["name"],
                "framework": framework,
                "language": "Database" if tier == "data" else "Python / TypeScript",
                "port": port,
                "tier": tier,
                "source_dir": f"/{s_id}",
                "description": f"Docker Compose container ({s_id})"
            })

            # Add depends_on links
            for dep in s_data["depends_on"]:
                dependencies.append({
                    "source": s_id,
                    "target": dep,
                    "confidence": "CONFIRMED",
                    "evidence": f"Declared explicitly in docker-compose.yml 'depends_on: {dep}'"
                })

        # Infer standard gateway -> service links if gateway exists
        gw = next((s for s in services if s["tier"] == "gateway"), None)
        if gw:
            for s in services:
                if s["tier"] == "application" and s["id"] != gw["id"]:
                    if not any(d["source"] == gw["id"] and d["target"] == s["id"] for d in dependencies):
                        dependencies.append({
                            "source": gw["id"],
                            "target": s["id"],
                            "confidence": "LIKELY",
                            "evidence": f"Ingress Gateway routes traffic downstream to {s['name']}"
                        })

        return services, dependencies

    def _discover_folder_services(self, project_dir: str, all_files: List[str]) -> List[Dict[str, Any]]:
        services = []
        top_dirs = [d for d in os.listdir(project_dir) if os.path.isdir(os.path.join(project_dir, d)) and not d.startswith(".") and d not in BLOCKED_DIR_NAMES]

        base_port = 8000
        for idx, d in enumerate(top_dirs):
            dir_files = [f for f in all_files if f.startswith(d + "/")]
            has_py = any(f.endswith(".py") for f in dir_files)
            has_js = any(f.endswith((".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs")) or "package.json" in f for f in dir_files)
            has_docker = any("dockerfile" in f.lower() for f in dir_files)
            has_manifest = any("requirements.txt" in f or "go.mod" in f or "pom.xml" in f or "cargo.toml" in f for f in dir_files)

            if has_py or has_js or has_docker or has_manifest or len(dir_files) > 0:
                tier = "gateway" if any(k in d.lower() for k in ["gateway", "ingress", "proxy"]) else "data" if any(k in d.lower() for k in ["db", "data", "redis", "postgres", "mongo"]) else "application"
                framework = "Next.js / React" if any("next" in f or "react" in f for f in dir_files) else "Express / Node" if has_js else "FastAPI" if has_py else "Service Module"
                services.append({
                    "id": d,
                    "name": d.replace("-", " ").replace("_", " ").title(),
                    "framework": framework,
                    "language": "Python" if has_py else "JavaScript/TypeScript" if has_js else "General",
                    "port": base_port + idx,
                    "tier": tier,
                    "source_dir": f"/{d}",
                    "description": f"Discovered microservice module in /{d}"
                })

        return services

    def _discover_routes(self, project_dir: str, files_by_ext: Dict[str, List[str]]) -> List[Dict[str, Any]]:
        routes = []
        # Python FastAPI / Flask route patterns
        fastapi_pattern = re.compile(r'@(?:app|router|bp)\.(get|post|put|delete|patch|options|head)\s*\(\s*["\']([^"\']+)["\']', re.IGNORECASE)
        flask_route_pattern = re.compile(r'@(?:app|router|bp)\.route\s*\(\s*["\']([^"\']+)["\'](?:.*?methods\s*=\s*\[([^\]]+)\])?', re.IGNORECASE)
        django_route_pattern = re.compile(r'(?:path|re_path)\s*\(\s*["\']([^"\']+)["\']', re.IGNORECASE)
        # Express route regex
        express_route_pattern = re.compile(r'(?:app|router)\.(get|post|put|delete|patch|use|all)\s*\(\s*["\']([^"\']+)["\']', re.IGNORECASE)
        # Spring Boot Java route regex
        spring_route_pattern = re.compile(r'@(Get|Post|Put|Delete|Patch|Request)Mapping\s*\(\s*(?:value\s*=\s*)?["\']([^"\']+)["\']', re.IGNORECASE)

        # 1. Python source files (FastAPI, Flask, Django)
        for py_file in files_by_ext.get(".py", [])[:50]:
            try:
                with open(os.path.join(project_dir, py_file), "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    # FastAPI
                    for method, path in fastapi_pattern.findall(content):
                        routes.append({
                            "method": method.upper(),
                            "path": path,
                            "file": py_file,
                            "framework": "FastAPI"
                        })
                    # Flask
                    for path, methods_str in flask_route_pattern.findall(content):
                        if methods_str:
                            for m in re.findall(r'["\']([a-zA-Z]+)["\']', methods_str):
                                routes.append({
                                    "method": m.upper(),
                                    "path": path,
                                    "file": py_file,
                                    "framework": "Flask"
                                })
                        else:
                            routes.append({
                                "method": "GET",
                                "path": path,
                                "file": py_file,
                                "framework": "Flask"
                            })
                    # Django
                    if "urlpatterns" in content:
                        for path in django_route_pattern.findall(content):
                            routes.append({
                                "method": "ANY",
                                "path": "/" + path.lstrip("/"),
                                "file": py_file,
                                "framework": "Django"
                            })
            except Exception:
                pass

        # 2. JavaScript / TypeScript files (Express, NestJS, Next.js)
        for js_file in (files_by_ext.get(".js", []) + files_by_ext.get(".ts", []) + files_by_ext.get(".tsx", []))[:50]:
            # Next.js App Router route.ts/route.js files
            if re.search(r'app[/\\].*[/\\ ]route\.[jt]s$', js_file):
                route_path = "/" + re.sub(r'^.*app[/\\ ]', '', os.path.dirname(js_file)).replace("\\", "/")
                routes.append({
                    "method": "ANY",
                    "path": route_path if route_path != "/" else "/api",
                    "file": js_file,
                    "framework": "Next.js App Router"
                })
                continue
            # Next.js Pages router pages/api/...
            if "pages/api" in js_file.replace("\\", "/"):
                clean_p = "/" + re.sub(r'^.*pages/', '', js_file).replace("\\", "/").rsplit(".", 1)[0]
                routes.append({
                    "method": "ANY",
                    "path": clean_p,
                    "file": js_file,
                    "framework": "Next.js API Route"
                })
                continue

            try:
                with open(os.path.join(project_dir, js_file), "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    matches = express_route_pattern.findall(content)
                    for method, path in matches:
                        routes.append({
                            "method": method.upper() if method.lower() != "use" else "ALL",
                            "path": path,
                            "file": js_file,
                            "framework": "Express"
                        })
            except Exception:
                pass

        # 3. Java files (Spring Boot)
        for java_file in files_by_ext.get(".java", [])[:30]:
            try:
                with open(os.path.join(project_dir, java_file), "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    matches = spring_route_pattern.findall(content)
                    for m_type, path in matches:
                        method = m_type.upper() if m_type.lower() != "request" else "ALL"
                        routes.append({
                            "method": method,
                            "path": path,
                            "file": java_file,
                            "framework": "Spring Boot"
                        })
            except Exception:
                pass

        return routes

    def _infer_code_dependencies(self, project_dir: str, files_by_ext: Dict[str, List[str]], services: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        deps = []
        svc_ids = [s["id"] for s in services]

        call_pattern = re.compile(r'https?://([a-zA-Z0-9_-]+)(?::(\d+))?', re.IGNORECASE)
        env_pattern = re.compile(r'(?:process\.env|os\.environ|os\.getenv)\.([A-Z0-9_]+)', re.IGNORECASE)
        db_client_patterns = {
            "postgres-db": re.compile(r'(?:psycopg2|asyncpg|create_engine\(.*postgres|new Pool\(|pgClient)', re.IGNORECASE),
            "redis-db": re.compile(r'(?:ioredis|redis\.createClient|redis\.Redis\(|StrictRedis)', re.IGNORECASE),
            "mongo-db": re.compile(r'(?:mongoose\.connect|MongoClient\(|pymongo)', re.IGNORECASE),
            "mysql-db": re.compile(r'(?:mysql\.createConnection|pymysql\.connect)', re.IGNORECASE),
        }
        queue_patterns = {
            "kafka-broker": re.compile(r'(?:KafkaClient|kafka\.Producer|KafkaProducer|kafkajs)', re.IGNORECASE),
            "rabbitmq-broker": re.compile(r'(?:amqplib|pika\.BlockingConnection|pika\.ConnectionParameters)', re.IGNORECASE),
        }

        for ext in [".py", ".js", ".ts", ".java"]:
            for f_rel in files_by_ext.get(ext, [])[:50]:
                source_svc = next((s["id"] for s in services if s.get("source_dir") and f_rel.startswith(s["source_dir"].strip("/") + "/")), None)
                if not source_svc:
                    source_svc = services[0]["id"] if services else "main-service"

                try:
                    with open(os.path.join(project_dir, f_rel), "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()

                        # 1. Direct HTTP URL calls
                        for host, port_str in call_pattern.findall(content):
                            target = host.lower()
                            if target in svc_ids and target != source_svc:
                                deps.append({
                                    "source": source_svc,
                                    "target": target,
                                    "confidence": "CONFIRMED",
                                    "evidence": f"Direct HTTP client in {f_rel} calls http://{target}"
                                })

                        # 2. Environment variable references (e.g. PAYMENT_SERVICE_URL)
                        for env_var in env_pattern.findall(content):
                            env_lower = env_var.lower()
                            for s_id in svc_ids:
                                if s_id != source_svc and s_id.replace("-", "_") in env_lower:
                                    deps.append({
                                        "source": source_svc,
                                        "target": s_id,
                                        "confidence": "LIKELY",
                                        "evidence": f"Environment variable {env_var} in {f_rel} references service {s_id}"
                                    })

                        # 3. Database client connections
                        for db_id, pattern in db_client_patterns.items():
                            if any(s["id"] == db_id for s in services) and pattern.search(content):
                                deps.append({
                                    "source": source_svc,
                                    "target": db_id,
                                    "confidence": "CONFIRMED",
                                    "evidence": f"Database client instantiation in {f_rel} connects to {db_id}"
                                })

                        # 4. Message broker connections
                        for q_id, pattern in queue_patterns.items():
                            if any(s["id"] == q_id for s in services) and pattern.search(content):
                                deps.append({
                                    "source": source_svc,
                                    "target": q_id,
                                    "confidence": "CONFIRMED",
                                    "evidence": f"Message queue client in {f_rel} publishes/subscribes to {q_id}"
                                })
                except Exception:
                    pass

        return deps

    def _evaluate_readiness(self, services: List[Dict[str, Any]], routes: List[Dict[str, Any]], compose_found: bool, dependencies_text: str, all_files: List[str]) -> Dict[str, Any]:
        checklist = []
        score = 0

        # Check 1: Services Discovered (20 pts)
        if len(services) >= 1:
            score += 20
            checklist.append({
                "item": "Microservice Boundaries Discovered",
                "status": "PASSED",
                "score": 20,
                "details": f"{len(services)} microservices cataloged across project structure."
            })
        else:
            checklist.append({
                "item": "Microservice Boundaries Discovered",
                "status": "INCOMPLETE",
                "score": 0,
                "details": "No modular service boundaries identified."
            })

        # Check 2: API Endpoints Discovered (20 pts)
        if len(routes) >= 1:
            score += 20
            checklist.append({
                "item": "API Routes & Endpoints Mapped",
                "status": "PASSED",
                "score": 20,
                "details": f"{len(routes)} HTTP endpoints statically discovered."
            })
        else:
            checklist.append({
                "item": "API Routes & Endpoints Mapped",
                "status": "WARNING",
                "score": 5,
                "details": "No explicit REST route annotations identified."
            })

        # Check 3: Docker Orchestration (15 pts)
        if compose_found:
            score += 15
            checklist.append({
                "item": "Container Topology Defined",
                "status": "PASSED",
                "score": 15,
                "details": "docker-compose.yml defines multi-container network links."
            })
        else:
            checklist.append({
                "item": "Container Topology Defined",
                "status": "WARNING",
                "score": 0,
                "details": "No docker-compose.yml found; topology inferred from directory layout."
            })

        # Check 4: Distributed Tracing Instrumentation (20 pts)
        has_otel = "opentelemetry" in dependencies_text or "jaeger" in dependencies_text
        if has_otel:
            score += 20
            checklist.append({
                "item": "Distributed Tracing Configured",
                "status": "PASSED",
                "score": 20,
                "details": "OpenTelemetry SDK discovered in project dependencies."
            })
        else:
            checklist.append({
                "item": "Distributed Tracing Configured",
                "status": "ACTION_REQUIRED",
                "score": 0,
                "details": "OpenTelemetry SDK not detected. TraceRoute integration package required."
            })

        # Check 5: Metrics Exporter (15 pts)
        has_metrics = "prometheus" in dependencies_text or "statsd" in dependencies_text
        if has_metrics:
            score += 15
            checklist.append({
                "item": "Metrics Exporter Active",
                "status": "PASSED",
                "score": 15,
                "details": "Prometheus or StatsD metrics client discovered."
            })
        else:
            checklist.append({
                "item": "Metrics Exporter Active",
                "status": "ACTION_REQUIRED",
                "score": 0,
                "details": "Prometheus metrics exporter not found."
            })

        # Check 6: Healthcheck Endpoint (10 pts)
        has_health = any(r["path"] in ["/health", "/healthz", "/status", "/ping"] for r in routes)
        if has_health:
            score += 10
            checklist.append({
                "item": "Liveness / Health Probe Endpoint",
                "status": "PASSED",
                "score": 10,
                "details": "Discovered standard healthcheck endpoint."
            })
        else:
            checklist.append({
                "item": "Liveness / Health Probe Endpoint",
                "status": "WARNING",
                "score": 0,
                "details": "No /health or /healthz probe endpoint found."
            })

        return {
            "readiness_percentage": min(score, 100),
            "status_label": "READY FOR MONITORING" if score >= 85 else "INTEGRATION REQUIRED",
            "checklist": checklist,
            "missing_count": sum(1 for c in checklist if c["status"] == "ACTION_REQUIRED")
        }

    def _build_topology_graph(self, services: List[Dict[str, Any]], dependencies: List[Dict[str, Any]]) -> Dict[str, Any]:
        nodes = []
        n = len(services)

        # Compute dynamic visual coordinates for canvas
        tier_positions = {
            "gateway": (400, 60),
            "application": [(230, 220), (570, 220), (400, 360), (230, 360)],
            "data": [(230, 480), (570, 480)]
        }

        app_idx = 0
        data_idx = 0

        for s in services:
            tier = s.get("tier", "application")
            if tier == "gateway":
                x, y = 400, 70
            elif tier == "data":
                x, y = tier_positions["data"][min(data_idx, len(tier_positions["data"]) - 1)]
                data_idx += 1
            else:
                x, y = tier_positions["application"][min(app_idx, len(tier_positions["application"]) - 1)]
                app_idx += 1

            nodes.append({
                "id": s["id"],
                "name": s["name"],
                "framework": s.get("framework", "Service"),
                "language": s.get("language", "General"),
                "port": s.get("port", 8000),
                "tier": tier,
                "x": x,
                "y": y,
                "status": "HEALTHY",
                "latency": 22.0,
                "p50_latency_ms": 22.0,
                "p99_latency_ms": 48.0,
                "error_rate": 0.0,
                "error_rate_pct": 0.0,
                "rps": 120,
                "cpu_pct": 18.0,
                "description": s.get("description", "Discovered application service")
            })

        edges = []
        for d in dependencies:
            edges.append({
                "source": d["source"],
                "target": d["target"],
                "protocol": "HTTP / REST",
                "timeout_ms": 2000,
                "status": "HEALTHY",
                "confidence": d.get("confidence", "LIKELY"),
                "evidence": d.get("evidence", "Discovered call relationship")
            })

        return {"nodes": nodes, "edges": edges}

    def _generate_integration_plan(self, project_id: str, languages: List[str], frameworks: List[str], services: List[Dict[str, Any]]) -> Dict[str, Any]:
        collector_url = f"http://127.0.0.1:8000/api/projects/{project_id}/telemetry"

        python_snippet = f'''# traceroute_instrumentation.py
# Auto-generated by TraceRoute AI for {project_id}
from opentargets import opentelemetry
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

def instrument_app(app, service_name="{services[0]['id'] if services else 'my-service'}"):
    provider = TracerProvider()
    processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="{collector_url}"))
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)
    
    # Auto-instrument FastAPI application
    FastAPIInstrumentor.instrument_app(app, tracer_provider=provider)
    print(f"[TraceRoute AI] Telemetry active for {{service_name}} -> {collector_url}")
'''

        node_snippet = f'''// traceroute_tracer.js
// Auto-generated by TraceRoute AI for {project_id}
const {{ NodeSDK }} = require('@opentelemetry/sdk-node');
const {{ getNodeAutoInstrumentations }} = require('@opentelemetry/auto-instrumentations-node');
const {{ OTLPTraceExporter }} = require('@opentelemetry/exporter-trace-otlp-http');

const sdk = new NodeSDK({{
  traceExporter: new OTLPTraceExporter({{
    url: '{collector_url}',
  }}),
  instrumentations: [getNodeAutoInstrumentations()]
}});

sdk.start();
console.log('[TraceRoute AI] OpenTelemetry instrumentation initialized for {project_id}');
'''

        files = [
            {
                "filename": "traceroute_instrumentation.py",
                "language": "Python",
                "code": python_snippet,
                "description": "Python FastAPI OpenTelemetry provider configuration transmitting spans to TraceRoute collector."
            },
            {
                "filename": "traceroute_tracer.js",
                "language": "JavaScript",
                "code": node_snippet,
                "description": "Node/Express OpenTelemetry tracing hook transmitting spans to TraceRoute collector."
            }
        ]

        return {
            "collector_endpoint": collector_url,
            "install_command": "pip install opentelemetry-api opentelemetry-sdk opentelemetry-instrumentation-fastapi opentelemetry-exporter-otlp",
            "frameworks_detected": frameworks,
            "languages_detected": languages,
            "target_services": [{"id": s.get("id", "app")} for s in services],
            "suggested_package_managers": ["pip", "npm"],
            "files": files,
            "next_steps": [
                "Install OpenTelemetry SDK in your project container",
                "Import traceroute_instrumentation and call instrument_app(app)",
                "Deploy service and observe live spans in TraceRoute topology"
            ],
            "snippets": {
                "python_fastapi": python_snippet,
                "node_express": node_snippet
            }
        }

project_analyzer = ProjectAnalyzer()
