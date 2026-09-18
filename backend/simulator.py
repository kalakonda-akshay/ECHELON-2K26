import time
import random
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

# Service dependency mapping:
# Gateway -> Order -> Payment -> Database
# Order -> Inventory -> Stock Database
SERVICE_CONFIG = {
    "api-gateway": {
        "name": "Gateway",
        "type": "gateway",
        "dependencies": ["order-service"],
        "base_latency": 18.0,
        "base_rps": 240,
        "base_cpu": 22.0
    },
    "order-service": {
        "name": "Order",
        "type": "service",
        "dependencies": ["payment-service", "inventory-service"],
        "base_latency": 24.0,
        "base_rps": 190,
        "base_cpu": 31.0
    },
    "payment-service": {
        "name": "Payment",
        "type": "service",
        "dependencies": ["payment-db"],
        "base_latency": 32.0,
        "base_rps": 140,
        "base_cpu": 28.0
    },
    "inventory-service": {
        "name": "Inventory",
        "type": "service",
        "dependencies": ["stock-db"],
        "base_latency": 15.0,
        "base_rps": 180,
        "base_cpu": 19.0
    },
    "payment-db": {
        "name": "Database",
        "type": "database",
        "dependencies": [],
        "base_latency": 4.0,
        "base_rps": 220,
        "base_cpu": 25.0,
        "base_pool": 22.0
    },
    "stock-db": {
        "name": "Stock Database",
        "type": "database",
        "dependencies": [],
        "base_latency": 3.0,
        "base_rps": 210,
        "base_cpu": 18.0,
        "base_pool": 16.0
    }
}

class TelemetrySimulator:
    def __init__(self):
        self.active_scenario: Optional[str] = None
        self.scenario_start_time: Optional[float] = None
        self.active_incident_id: Optional[str] = None
        self.is_recovering: bool = False
        self.recovery_start_time: Optional[float] = None
        self.services = list(SERVICE_CONFIG.keys())

        # Cumulative request & error counters per service
        self.service_counters: Dict[str, Dict[str, int]] = {}
        # Service specific recent log buffer
        self.service_logs: Dict[str, List[Dict[str, Any]]] = {}
        # Global logs buffer & trace waterfalls
        self.logs_buffer: List[Dict[str, Any]] = []
        self.recent_traces: List[Dict[str, Any]] = []
        # History of metric points for charts
        self.metrics_history: Dict[str, List[Dict[str, Any]]] = {s: [] for s in self.services}

        # Separated Data Mode: "DEMO" (deterministic simulator) vs "LIVE" (external ingestion)
        self.data_mode: str = "DEMO"
        self.last_live_event_time: Optional[float] = None
        self.live_overrides: Dict[str, Dict[str, Any]] = {}
        self._async_listeners: List[Any] = []

        self._initialize_baseline()

    def register_listener(self, queue: Any):
        """Register an asyncio.Queue to receive instant event-driven SSE notifications."""
        if queue not in self._async_listeners:
            self._async_listeners.append(queue)

    def unregister_listener(self, queue: Any):
        """Unregister an asyncio.Queue when an SSE client disconnects."""
        if queue in self._async_listeners:
            self._async_listeners.remove(queue)

    def _notify_listeners(self):
        """Notify all connected SSE stream listeners that cluster state has changed."""
        for q in list(self._async_listeners):
            try:
                q.put_nowait(True)
            except Exception:
                pass

    def set_data_mode(self, mode: str) -> str:
        """Switch between 'DEMO' (simulated chaos scenarios) and 'LIVE' (real-time telemetry)."""
        mode_upper = mode.strip().upper()
        if mode_upper in ["DEMO", "LIVE"]:
            self.data_mode = mode_upper
            self._notify_listeners()
        return self.data_mode

    def ingest_telemetry(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Ingest live external telemetry, update service overrides, and push to SSE stream."""
        self.data_mode = "LIVE"
        self.last_live_event_time = time.time()

        # 1. Update services/metrics
        if "services" in payload and isinstance(payload["services"], dict):
            for s_id, s_data in payload["services"].items():
                self._update_live_service(s_id, s_data)
        elif "service" in payload or "service_id" in payload:
            s_id = payload.get("service") or payload.get("service_id")
            self._update_live_service(s_id, payload)
        elif "metrics" in payload and isinstance(payload["metrics"], dict):
            for s_id, s_data in payload["metrics"].items():
                self._update_live_service(s_id, s_data)

        # 2. Append logs if provided
        if "logs" in payload and isinstance(payload["logs"], list):
            for log in payload["logs"]:
                self.logs_buffer.insert(0, log)
        elif "message" in payload:
            s_id = payload.get("service", "live-telemetry")
            self._append_service_log(s_id, payload.get("level", "INFO"), payload.get("message", ""))

        # 3. Append traces if provided
        if "traces" in payload and isinstance(payload["traces"], list):
            for tr in payload["traces"]:
                self.recent_traces.insert(0, tr)
        elif "trace_id" in payload:
            self.recent_traces.insert(0, payload)

        self._notify_listeners()
        return {
            "status": "INGESTED",
            "data_mode": self.data_mode,
            "last_event_time": self.last_live_event_time,
            "services_updated": list(self.live_overrides.keys())
        }

    def _update_live_service(self, s_id: str, data: Dict[str, Any]):
        if not s_id or not isinstance(data, dict):
            return
        if s_id not in self.services:
            self.services.append(s_id)
            if s_id not in self.service_counters:
                self.service_counters[s_id] = {"request_count": 100, "error_count": 0}
            if s_id not in self.metrics_history:
                self.metrics_history[s_id] = []

        cur = self.live_overrides.setdefault(s_id, {})
        for k in ["latency", "p50_latency_ms", "p95_latency_ms", "p99_latency_ms", "error_rate", "error_rate_pct", "status", "rps", "cpu_pct", "memory_pct"]:
            if k in data:
                cur[k] = data[k]

    def _normalize_scenario(self, raw_scenario: str) -> str:
        """Normalizes scenario string to canonical uppercase format."""
        s = raw_scenario.strip().upper().replace("-", "_")
        aliases = {
            "DB_FAILURE": "DATABASE_FAILURE",
            "DATABASE": "DATABASE_FAILURE",
            "LATENCY": "PAYMENT_LATENCY",
            "CRASH": "INVENTORY_CRASH",
            "DEPLOYMENT": "BAD_DEPLOYMENT"
        }
        return aliases.get(s, s)

    def _initialize_baseline(self):
        """Restores complete environment to 100% healthy baseline."""
        self.active_scenario = None
        self.scenario_start_time = None
        self.active_incident_id = None
        self.is_recovering = False
        self.recovery_start_time = None
        self.logs_buffer.clear()
        self.recent_traces.clear()

        now = time.time()
        for s in self.services:
            self.service_counters[s] = {
                "request_count": random.randint(300, 600),
                "error_count": 0
            }
            self.service_logs[s] = [
                {
                    "timestamp": datetime.fromtimestamp(now - 10, tz=timezone.utc).isoformat(),
                    "level": "INFO",
                    "message": f"Service {SERVICE_CONFIG[s]['name']} running nominally. Health check OK."
                }
            ]
            self.metrics_history[s] = []
            for i in range(20, 0, -1):
                tick_time = now - i * 2
                self.metrics_history[s].append(self._generate_healthy_metric(s, tick_time))

        self.logs_buffer.append({
            "timestamp": datetime.fromtimestamp(now, tz=timezone.utc).isoformat(),
            "service": "control-plane",
            "level": "INFO",
            "trace_id": "sys-init",
            "span_id": "span-000",
            "message": "System baseline initialized. All 6 services operating within nominal SLA."
        })

    def _generate_healthy_metric(self, service: str, timestamp: float) -> Dict[str, Any]:
        cfg = SERVICE_CONFIG.get(service, {})
        jitter = random.uniform(0.92, 1.08)
        base_lat = cfg.get("base_latency", 20.0)
        base_rps = cfg.get("base_rps", 150)
        base_cpu = cfg.get("base_cpu", 25.0)

        counters = self.service_counters.get(service, {"request_count": 500, "error_count": 0})
        req_count = counters["request_count"]
        err_count = counters["error_count"]
        err_rate = round((err_count / max(1, req_count)) * 100.0, 2)

        return {
            "timestamp": datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat(),
            "service": service,
            "name": cfg.get("name", service),
            "status": "HEALTHY",
            "latency": round(base_lat * jitter, 1),
            "p50_latency_ms": round(base_lat * jitter, 1),
            "p95_latency_ms": round(base_lat * 1.8 * jitter, 1),
            "p99_latency_ms": round(base_lat * 2.8 * jitter, 1),
            "request_count": req_count,
            "error_count": err_count,
            "error_rate": err_rate,
            "error_rate_pct": err_rate,
            "dependencies": cfg.get("dependencies", []),
            "recent_logs": list(self.service_logs.get(service, []))[-5:],
            "rps": round(base_rps * jitter),
            "cpu_pct": round(base_cpu * jitter, 1),
            "memory_pct": round(42.0 * jitter, 1),
            "pool_usage_pct": round(cfg.get("base_pool", 20) * jitter, 1) if "db" in service else None,
            "active_connections": round(35 * jitter) if "db" in service else None
        }

    def inject_failure(self, scenario_name: str) -> Dict[str, Any]:
        """Injects one of 4 deterministic scenarios: DATABASE_FAILURE, PAYMENT_LATENCY, INVENTORY_CRASH, BAD_DEPLOYMENT."""
        self.data_mode = "DEMO"
        scenario = self._normalize_scenario(scenario_name)
        valid_scenarios = ["DATABASE_FAILURE", "PAYMENT_LATENCY", "INVENTORY_CRASH", "BAD_DEPLOYMENT"]
        if scenario not in valid_scenarios:
            raise ValueError(f"Unknown scenario: {scenario_name}. Must be one of {valid_scenarios}")

        self.active_scenario = scenario
        self.scenario_start_time = time.time()
        self.active_incident_id = f"INC-{random.randint(1000, 9999)}"
        self.is_recovering = False
        self.recovery_start_time = None

        # Log injection event
        now_str = datetime.now(timezone.utc).isoformat()
        inject_log = {
            "timestamp": now_str,
            "service": "chaos-controller",
            "level": "WARN",
            "trace_id": f"inj-{uuid.uuid4().hex[:6]}",
            "span_id": "span-inj-01",
            "message": f"Injected failure scenario [{scenario}] into cluster (Incident: {self.active_incident_id})."
        }
        self.logs_buffer.insert(0, inject_log)
        self._notify_listeners()

        return {
            "incident_id": self.active_incident_id,
            "scenario": scenario,
            "started_at": datetime.fromtimestamp(self.scenario_start_time, tz=timezone.utc).isoformat(),
            "status": "ACTIVE_INCIDENT",
            "description": f"Failure scenario {scenario} initiated. Observing cascade propagation."
        }

    def reset(self) -> Dict[str, Any]:
        """Restores complete environment to healthy baseline."""
        self.live_overrides.clear()
        self._initialize_baseline()
        self._notify_listeners()
        return {
            "status": "HEALTHY",
            "message": "Cluster state successfully reset to 100% nominal baseline.",
            "unhealthy_services": 0
        }

    def apply_recovery(self) -> Dict[str, Any]:
        """Human approval trigger: initiates remediation sequence."""
        if not self.active_scenario:
            return {"status": "NO_ACTIVE_INCIDENT"}

        self.is_recovering = True
        self.recovery_start_time = time.time()
        now_str = datetime.now(timezone.utc).isoformat()
        self.logs_buffer.insert(0, {
            "timestamp": now_str,
            "service": "control-plane",
            "level": "INFO",
            "trace_id": "sys-recovery",
            "span_id": "span-rec-01",
            "message": f"Remediation playbook approved for incident {self.active_incident_id}. State transitioning to recovering."
        })
        self._notify_listeners()
        return {"status": "RECOVERING", "incident_id": self.active_incident_id}

    def complete_recovery(self) -> Dict[str, Any]:
        """Completes recovery sequence and verifies green state."""
        prev_incident = self.active_incident_id
        prev_scenario = self.active_scenario
        self.active_scenario = None
        self.scenario_start_time = None
        self.active_incident_id = None
        self.is_recovering = False
        self.recovery_start_time = None

        # Reset counters to healthy
        for s in self.services:
            self.service_counters[s]["error_count"] = 0
            self.service_logs[s].append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": "INFO",
                "message": f"Service {SERVICE_CONFIG[s]['name']} recovery verified. Traffic flowing nominally."
            })

        self._notify_listeners()
        return {
            "status": "HEALTHY",
            "verified": True,
            "resolved_incident": prev_incident,
            "scenario": prev_scenario
        }

    def tick(self) -> Dict[str, Any]:
        """Ticking function calculating live telemetry and progressive cascade states."""
        now = time.time()
        now_iso = datetime.fromtimestamp(now, tz=timezone.utc).isoformat()

        # Update service cumulative request counts
        for s in self.services:
            rps = SERVICE_CONFIG[s]["base_rps"]
            delta_req = random.randint(int(rps * 1.5), int(rps * 2.2))
            self.service_counters[s]["request_count"] += delta_req

        current_metrics = {}
        for s in self.services:
            metric = self._compute_service_telemetry(s, now)
            self.metrics_history[s].append(metric)
            if len(self.metrics_history[s]) > 35:
                self.metrics_history[s].pop(0)
            current_metrics[s] = metric

        # Generate active trace
        trace = self._generate_distributed_trace(now)
        self.recent_traces.insert(0, trace)
        if len(self.recent_traces) > 10:
            self.recent_traces.pop()

        return {
            "timestamp": now_iso,
            "scenario": self.active_scenario,
            "incident_id": self.active_incident_id,
            "is_recovering": self.is_recovering,
            "current_metrics": current_metrics,
            "latest_trace": trace
        }

    def _append_service_log(self, service: str, level: str, message: str):
        now_iso = datetime.now(timezone.utc).isoformat()
        log_entry = {
            "timestamp": now_iso,
            "service": service,
            "level": level,
            "message": message
        }
        if service not in self.service_logs:
            self.service_logs[service] = []
        # Prevent repeating the exact same message back-to-back
        if not self.service_logs[service] or self.service_logs[service][-1].get("message") != message:
            self.service_logs[service].append(log_entry)
            if len(self.service_logs[service]) > 20:
                self.service_logs[service].pop(0)

            self.logs_buffer.insert(0, {
                **log_entry,
                "trace_id": f"tr-{uuid.uuid4().hex[:8]}",
                "span_id": f"sp-{uuid.uuid4().hex[:6]}"
            })
            if len(self.logs_buffer) > 60:
                self.logs_buffer.pop()

    def _compute_service_telemetry(self, service: str, now: float) -> Dict[str, Any]:
        base_metric = self._generate_healthy_metric(service, now)

        if self.data_mode == "LIVE":
            if service in self.live_overrides:
                base_metric.update(self.live_overrides[service])
                base_metric["service"] = service
                base_metric["timestamp"] = datetime.fromtimestamp(now, tz=timezone.utc).isoformat()
            return base_metric

        if not self.active_scenario:
            return base_metric

        if self.is_recovering:
            # When recovering, return back to healthy baseline
            return base_metric

        elapsed = now - (self.scenario_start_time or now)
        scenario = self.active_scenario

        # =========================================================================
        # 1. DATABASE_FAILURE (Cascade Over Time)
        # Stage 1: 0s - 3s: Database abnormal
        # Stage 2: 3s - 6s: Payment timeout
        # Stage 3: 6s - 9s: Order timeout
        # Stage 4: 9s+:    Gateway 502
        # Inventory & Stock DB remain HEALTHY throughout!
        # =========================================================================
        if scenario == "DATABASE_FAILURE":
            if service in ["inventory-service", "stock-db"]:
                return base_metric

            if service == "payment-db":
                # Stage 1+: Database abnormal immediately
                self.service_counters[service]["error_count"] += random.randint(15, 30)
                self._append_service_log(
                    service,
                    "CRITICAL",
                    "FATAL: remaining connection slots reserved for non-replication superuser connections (max_connections=150 exhausted)"
                )
                return {
                    **base_metric,
                    "status": "CRITICAL",
                    "latency": 3200.0,
                    "p50_latency_ms": 3200.0,
                    "p95_latency_ms": 5100.0,
                    "p99_latency_ms": 8400.0,
                    "error_rate": 100.0,
                    "error_rate_pct": 100.0,
                    "pool_usage_pct": 100.0,
                    "active_connections": 150,
                    "cpu_pct": 98.4
                }

            elif service == "payment-service":
                if elapsed < 3.0:
                    # 0s - 3s: Still healthy / minor connection queue
                    return {
                        **base_metric,
                        "status": "HEALTHY",
                        "latency": 48.0,
                        "p50_latency_ms": 48.0,
                        "p95_latency_ms": 95.0,
                        "error_rate": 0.0,
                        "error_rate_pct": 0.0
                    }
                else:
                    # 3s+: Payment connection pool timeout
                    self.service_counters[service]["error_count"] += random.randint(12, 25)
                    self._append_service_log(
                        service,
                        "CRITICAL",
                        "ConnectionPoolTimeoutException: Timeout waiting for idle connection from HikariPool after 30000ms"
                    )
                    return {
                        **base_metric,
                        "status": "CRITICAL",
                        "latency": 2800.0,
                        "p50_latency_ms": 2800.0,
                        "p95_latency_ms": 4200.0,
                        "p99_latency_ms": 6100.0,
                        "error_rate": 94.2,
                        "error_rate_pct": 94.2,
                        "rps": 12,
                        "cpu_pct": 86.5
                    }

            elif service == "order-service":
                if elapsed < 3.0:
                    # 0s - 3s: Healthy
                    return base_metric
                elif elapsed < 6.0:
                    # 3s - 6s: Degraded / retrying downstream payment calls
                    return {
                        **base_metric,
                        "status": "DEGRADED",
                        "latency": 260.0,
                        "p50_latency_ms": 260.0,
                        "p95_latency_ms": 480.0,
                        "error_rate": 5.0,
                        "error_rate_pct": 5.0
                    }
                else:
                    # 6s+: Order times out waiting on payment
                    self.service_counters[service]["error_count"] += random.randint(10, 20)
                    self._append_service_log(
                        service,
                        "CRITICAL",
                        "PaymentGatewayTimeout: POST http://payment-service:3002/v1/charge timed out after 2000ms. Retry 3/3 exhausted."
                    )
                    return {
                        **base_metric,
                        "status": "CRITICAL",
                        "latency": 1900.0,
                        "p50_latency_ms": 1900.0,
                        "p95_latency_ms": 3100.0,
                        "p99_latency_ms": 4500.0,
                        "error_rate": 78.6,
                        "error_rate_pct": 78.6,
                        "rps": 45,
                        "cpu_pct": 72.1
                    }

            elif service == "api-gateway":
                if elapsed < 6.0:
                    # 0s - 6s: Healthy
                    return base_metric
                elif elapsed < 9.0:
                    # 6s - 9s: Degraded with sporadic upstream delay
                    return {
                        **base_metric,
                        "status": "DEGRADED",
                        "latency": 450.0,
                        "p50_latency_ms": 450.0,
                        "p95_latency_ms": 780.0,
                        "error_rate": 15.0,
                        "error_rate_pct": 15.0
                    }
                else:
                    # 9s+: Gateway 502 Bad Gateway / Circuit Breaker tripped
                    self.service_counters[service]["error_count"] += random.randint(15, 35)
                    self._append_service_log(
                        service,
                        "CRITICAL",
                        "Upstream service [order-service] returned 502 Bad Gateway. Ingress circuit breaker tripped for route /checkout"
                    )
                    return {
                        **base_metric,
                        "status": "CRITICAL",
                        "latency": 1100.0,
                        "p50_latency_ms": 1100.0,
                        "p95_latency_ms": 2400.0,
                        "p99_latency_ms": 3800.0,
                        "error_rate": 68.4,
                        "error_rate_pct": 68.4,
                        "rps": 110,
                        "cpu_pct": 65.0
                    }

        # =========================================================================
        # 2. PAYMENT_LATENCY (Latency Spike & Queue Exhaustion)
        # =========================================================================
        elif scenario == "PAYMENT_LATENCY":
            if service == "payment-service":
                self._append_service_log(
                    service,
                    "WARN",
                    "Thread contention detected: JVM G1GC pause time > 2200ms. CPU threshold exceeded (96%)."
                )
                return {
                    **base_metric,
                    "status": "CRITICAL",
                    "latency": 3400.0,
                    "p50_latency_ms": 3400.0,
                    "p95_latency_ms": 4900.0,
                    "p99_latency_ms": 5800.0,
                    "error_rate": 28.5,
                    "error_rate_pct": 28.5,
                    "cpu_pct": 96.0,
                    "memory_pct": 94.5
                }
            elif service == "order-service":
                if elapsed < 3.0:
                    return base_metric
                return {
                    **base_metric,
                    "status": "DEGRADED",
                    "latency": 1850.0,
                    "p50_latency_ms": 1850.0,
                    "p95_latency_ms": 2600.0,
                    "p99_latency_ms": 3200.0,
                    "error_rate": 22.0,
                    "error_rate_pct": 22.0,
                    "rps": 80
                }
            elif service == "api-gateway":
                if elapsed < 3.0:
                    return base_metric
                return {
                    **base_metric,
                    "status": "DEGRADED",
                    "latency": 950.0,
                    "p50_latency_ms": 950.0,
                    "p95_latency_ms": 1800.0,
                    "p99_latency_ms": 2400.0,
                    "error_rate": 14.5,
                    "error_rate_pct": 14.5,
                    "rps": 160
                }
            else:
                return base_metric

        # =========================================================================
        # 3. INVENTORY_CRASH (OOMKilled Pod Termination)
        # =========================================================================
        elif scenario == "INVENTORY_CRASH":
            if service == "inventory-service":
                self.service_counters[service]["error_count"] += 50
                self._append_service_log(
                    service,
                    "CRITICAL",
                    "FATAL: Process terminated abruptly. Exit code 137 (OOMKilled by Linux kernel cgroup)."
                )
                return {
                    **base_metric,
                    "status": "DOWN",
                    "latency": 0.0,
                    "p50_latency_ms": 0.0,
                    "p95_latency_ms": 0.0,
                    "p99_latency_ms": 0.0,
                    "error_rate": 100.0,
                    "error_rate_pct": 100.0,
                    "rps": 0,
                    "cpu_pct": 0.0,
                    "memory_pct": 0.0
                }
            elif service == "order-service":
                if elapsed < 2.0:
                    return base_metric
                self.service_counters[service]["error_count"] += random.randint(10, 20)
                self._append_service_log(
                    service,
                    "CRITICAL",
                    "ConnectException: Failed to connect to inventory-service:3003 [Connection refused - ECONNREFUSED]."
                )
                return {
                    **base_metric,
                    "status": "CRITICAL",
                    "latency": 120.0,
                    "p50_latency_ms": 120.0,
                    "p95_latency_ms": 240.0,
                    "p99_latency_ms": 410.0,
                    "error_rate": 52.0,
                    "error_rate_pct": 52.0,
                    "rps": 90
                }
            elif service == "api-gateway":
                if elapsed < 3.0:
                    return base_metric
                return {
                    **base_metric,
                    "status": "DEGRADED",
                    "latency": 85.0,
                    "p50_latency_ms": 85.0,
                    "p95_latency_ms": 160.0,
                    "p99_latency_ms": 290.0,
                    "error_rate": 45.0,
                    "error_rate_pct": 45.0,
                    "rps": 140
                }
            else:
                # payment-service, payment-db, stock-db are 100% HEALTHY
                return base_metric

        # =========================================================================
        # 4. BAD_DEPLOYMENT (Release v2.4.1 commit a8f3b9c N+1 Query)
        # =========================================================================
        elif scenario == "BAD_DEPLOYMENT":
            if service == "payment-service":
                self._append_service_log(
                    service,
                    "CRITICAL",
                    "Regression in release v2.4.1 (commit a8f3b9c): Unindexed query on ledger_entries table executed in loop (N+1 pattern)."
                )
                return {
                    **base_metric,
                    "status": "CRITICAL",
                    "latency": 2100.0,
                    "p50_latency_ms": 2100.0,
                    "p95_latency_ms": 3800.0,
                    "p99_latency_ms": 5200.0,
                    "error_rate": 48.0,
                    "error_rate_pct": 48.0,
                    "cpu_pct": 94.0,
                    "memory_pct": 89.0
                }
            elif service == "payment-db":
                self._append_service_log(
                    service,
                    "WARN",
                    "SlowQueryLog: SELECT * FROM ledger_entries WHERE account_id = $1 took 2450ms (Seq Scan on ledger_entries)."
                )
                return {
                    **base_metric,
                    "status": "DEGRADED",
                    "latency": 180.0,
                    "p50_latency_ms": 180.0,
                    "p95_latency_ms": 420.0,
                    "p99_latency_ms": 890.0,
                    "cpu_pct": 88.0,
                    "pool_usage_pct": 85.0
                }
            elif service == "order-service":
                if elapsed < 2.0:
                    return base_metric
                return {
                    **base_metric,
                    "status": "CRITICAL",
                    "latency": 1400.0,
                    "p50_latency_ms": 1400.0,
                    "p95_latency_ms": 2500.0,
                    "p99_latency_ms": 3600.0,
                    "error_rate": 42.0,
                    "error_rate_pct": 42.0
                }
            elif service == "api-gateway":
                if elapsed < 3.0:
                    return base_metric
                return {
                    **base_metric,
                    "status": "DEGRADED",
                    "latency": 820.0,
                    "p50_latency_ms": 820.0,
                    "p95_latency_ms": 1700.0,
                    "p99_latency_ms": 2600.0,
                    "error_rate": 36.0,
                    "error_rate_pct": 36.0
                }
            else:
                return base_metric

        return base_metric

    def _generate_distributed_trace(self, now: float) -> Dict[str, Any]:
        """Generates a hierarchical trace waterfall with realistic spans."""
        trace_id = f"trace-{uuid.uuid4().hex[:12]}"
        now_iso = datetime.fromtimestamp(now, tz=timezone.utc).isoformat()
        is_failing = bool(self.active_scenario and not self.is_recovering)

        if not is_failing:
            return {
                "trace_id": trace_id,
                "timestamp": now_iso,
                "route": "POST /api/v1/checkout",
                "duration_ms": 85,
                "status_code": 200,
                "status": "OK",
                "spans": [
                    {"id": "span-1", "parent_id": None, "service": "api-gateway", "name": "HTTP POST /checkout", "duration_ms": 85, "status": "OK", "code": 200},
                    {"id": "span-2", "parent_id": "span-1", "service": "order-service", "name": "OrderService.createOrder", "duration_ms": 68, "status": "OK", "code": 200},
                    {"id": "span-3", "parent_id": "span-2", "service": "inventory-service", "name": "InventoryService.reserveStock", "duration_ms": 22, "status": "OK", "code": 200},
                    {"id": "span-4", "parent_id": "span-3", "service": "stock-db", "name": "SQL SELECT stock FOR UPDATE", "duration_ms": 8, "status": "OK", "code": 200},
                    {"id": "span-5", "parent_id": "span-2", "service": "payment-service", "name": "PaymentService.authorizeCharge", "duration_ms": 38, "status": "OK", "code": 200},
                    {"id": "span-6", "parent_id": "span-5", "service": "payment-db", "name": "SQL INSERT INTO charges", "duration_ms": 12, "status": "OK", "code": 200}
                ]
            }

        scenario = self.active_scenario
        if scenario == "DATABASE_FAILURE":
            return {
                "trace_id": trace_id,
                "timestamp": now_iso,
                "route": "POST /api/v1/checkout",
                "duration_ms": 3250,
                "status_code": 502,
                "status": "ERROR",
                "error_message": "Gateway error: Upstream payment-db connection timeout",
                "spans": [
                    {"id": "span-1", "parent_id": None, "service": "api-gateway", "name": "HTTP POST /checkout", "duration_ms": 3250, "status": "ERROR", "code": 502, "error": "Bad Gateway from order-service"},
                    {"id": "span-2", "parent_id": "span-1", "service": "order-service", "name": "OrderService.createOrder", "duration_ms": 3200, "status": "ERROR", "code": 500, "error": "Payment service charge timed out after retries"},
                    {"id": "span-3", "parent_id": "span-2", "service": "inventory-service", "name": "InventoryService.reserveStock", "duration_ms": 24, "status": "OK", "code": 200},
                    {"id": "span-4", "parent_id": "span-2", "service": "payment-service", "name": "PaymentService.authorizeCharge", "duration_ms": 3050, "status": "ERROR", "code": 504, "error": "HikariPool connection timeout to payment-db"},
                    {"id": "span-5", "parent_id": "span-4", "service": "payment-db", "name": "SQL INSERT INTO charges", "duration_ms": 3000, "status": "ERROR", "code": 504, "error": "Connection pool full (150/150). Connection request timed out."}
                ]
            }
        elif scenario == "PAYMENT_LATENCY":
            return {
                "trace_id": trace_id,
                "timestamp": now_iso,
                "route": "POST /api/v1/checkout",
                "duration_ms": 2650,
                "status_code": 504,
                "status": "ERROR",
                "error_message": "Gateway timeout: Payment Service exceeded SLA threshold",
                "spans": [
                    {"id": "span-1", "parent_id": None, "service": "api-gateway", "name": "HTTP POST /checkout", "duration_ms": 2650, "status": "ERROR", "code": 504, "error": "Gateway timeout"},
                    {"id": "span-2", "parent_id": "span-1", "service": "order-service", "name": "OrderService.createOrder", "duration_ms": 2600, "status": "ERROR", "code": 504, "error": "payment-service timeout (>2500ms)"},
                    {"id": "span-3", "parent_id": "span-2", "service": "inventory-service", "name": "InventoryService.reserveStock", "duration_ms": 21, "status": "OK", "code": 200},
                    {"id": "span-4", "parent_id": "span-2", "service": "payment-service", "name": "PaymentService.authorizeCharge", "duration_ms": 2550, "status": "ERROR", "code": 504, "error": "Thread execution blocked on JVM GC pause"}
                ]
            }
        elif scenario == "INVENTORY_CRASH":
            return {
                "trace_id": trace_id,
                "timestamp": now_iso,
                "route": "POST /api/v1/checkout",
                "duration_ms": 310,
                "status_code": 503,
                "status": "ERROR",
                "error_message": "Service Unavailable: inventory-service connection refused",
                "spans": [
                    {"id": "span-1", "parent_id": None, "service": "api-gateway", "name": "HTTP POST /checkout", "duration_ms": 310, "status": "ERROR", "code": 503, "error": "Service Unavailable"},
                    {"id": "span-2", "parent_id": "span-1", "service": "order-service", "name": "OrderService.createOrder", "duration_ms": 290, "status": "ERROR", "code": 503, "error": "inventory-service connection refused"},
                    {"id": "span-3", "parent_id": "span-2", "service": "inventory-service", "name": "InventoryService.reserveStock", "duration_ms": 5, "status": "ERROR", "code": 503, "error": "ECONNREFUSED - Container exited with code 137"}
                ]
            }
        elif scenario == "BAD_DEPLOYMENT":
            return {
                "trace_id": trace_id,
                "timestamp": now_iso,
                "route": "POST /api/v1/checkout",
                "duration_ms": 2840,
                "status_code": 500,
                "status": "ERROR",
                "error_message": "Internal Server Error: Unindexed sequential scan on payment-db",
                "spans": [
                    {"id": "span-1", "parent_id": None, "service": "api-gateway", "name": "HTTP POST /checkout", "duration_ms": 2840, "status": "ERROR", "code": 500, "error": "Internal Server Error"},
                    {"id": "span-2", "parent_id": "span-1", "service": "order-service", "name": "OrderService.createOrder", "duration_ms": 2800, "status": "ERROR", "code": 500, "error": "payment-service error response"},
                    {"id": "span-3", "parent_id": "span-2", "service": "inventory-service", "name": "InventoryService.reserveStock", "duration_ms": 25, "status": "OK", "code": 200},
                    {"id": "span-4", "parent_id": "span-2", "service": "payment-service", "name": "PaymentService.authorizeCharge", "duration_ms": 2720, "status": "ERROR", "code": 500, "error": "N+1 loop query bottleneck introduced in commit a8f3b9c"},
                    {"id": "span-5", "parent_id": "span-4", "service": "payment-db", "name": "SQL Seq Scan ledger_entries", "duration_ms": 2650, "status": "ERROR", "code": 500, "error": "Sequential scan lock delay"}
                ]
            }

        return self._generate_healthy_metric("api-gateway", now)

simulator = TelemetrySimulator()
