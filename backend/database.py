import sqlite3
import json
import os
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "TraceRoot.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS deployments (
            id TEXT PRIMARY KEY,
            service TEXT NOT NULL,
            version TEXT NOT NULL,
            commit_id TEXT NOT NULL,
            author TEXT NOT NULL,
            deployed_at TEXT NOT NULL,
            description TEXT NOT NULL
        )
    """)
    
    # Incidents table with all 9 required fields:
    # 1. incident ID (id)
    # 2. start time (started_at)
    # 3. symptom
    # 4. initiating service (initiating_service)
    # 5. evidence
    # 6. associated deployment (associated_deployment)
    # 7. recovery action (recovery_action)
    # 8. verification result (verification_result)
    # 9. resolution time (resolved_at)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            started_at TEXT NOT NULL,
            symptom TEXT NOT NULL,
            initiating_service TEXT NOT NULL,
            evidence TEXT,
            associated_deployment TEXT,
            recovery_action TEXT,
            verification_result TEXT,
            resolved_at TEXT,
            duration_seconds INTEGER,
            scenario TEXT NOT NULL,
            status TEXT NOT NULL,
            title TEXT,
            summary TEXT,
            severity TEXT,
            failure_chain TEXT
        )
    """)

    # Ensure any new columns exist if table was previously created
    existing_cols = [col[1] for col in cursor.execute("PRAGMA table_info(incidents)").fetchall()]
    new_cols = {
        "symptom": "TEXT",
        "evidence": "TEXT",
        "associated_deployment": "TEXT",
        "recovery_action": "TEXT",
        "verification_result": "TEXT"
    }
    for col_name, col_type in new_cols.items():
        if col_name not in existing_cols:
            try:
                cursor.execute(f"ALTER TABLE incidents ADD COLUMN {col_name} {col_type}")
            except Exception:
                pass
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recoveries (
            id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL,
            action_name TEXT NOT NULL,
            approved_by TEXT NOT NULL,
            status TEXT NOT NULL,
            verification_result TEXT NOT NULL,
            executed_at TEXT NOT NULL,
            details TEXT
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id TEXT PRIMARY KEY,
            incident_id TEXT NOT NULL,
            diagnosis_accurate TEXT NOT NULL,
            recovery_effective TEXT NOT NULL,
            engineer_notes TEXT,
            engineer_email TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            status TEXT NOT NULL,
            architecture_type TEXT NOT NULL,
            languages TEXT,
            frameworks TEXT,
            services_count INTEGER DEFAULT 1,
            routes_count INTEGER DEFAULT 0,
            databases TEXT,
            readiness_pct INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            analysis_data TEXT,
            topology_data TEXT
        )
    """)
    
    # Check if initial deployments are seeded
    cursor.execute("SELECT COUNT(*) as count FROM deployments")
    if cursor.fetchone()["count"] == 0:
        initial_deployments = [
            ("dep-001", "api-gateway", "v1.8.4", "e7a102f", "sarah.chen@acme.corp", "2026-09-17T18:00:00Z", "Rate-limiting tuning and CORS policy update"),
            ("dep-002", "order-service", "v3.1.0", "b3f9901", "marcus.k@acme.corp", "2026-09-17T20:30:00Z", "Checkout idempotency header support"),
            ("dep-003", "payment-service", "v2.4.1", "a8f3b9c", "devon.v@acme.corp", "2026-09-18T06:45:00Z", "Payment gateway connector overhaul with batch query refactor"),
            ("dep-004", "inventory-service", "v2.0.8", "7c21e4a", "elena.r@acme.corp", "2026-09-17T14:15:00Z", "Low-stock cache eviction policy adjustment"),
            ("dep-005", "payment-db", "v15.3-pg", "infra-98a", "sre-core@acme.corp", "2026-09-16T10:00:00Z", "Connection pool max_connections set to 150"),
            ("dep-006", "stock-db", "v15.3-pg", "infra-98b", "sre-core@acme.corp", "2026-09-16T10:00:00Z", "Read-replica streaming replication sync")
        ]
        cursor.executemany(
            "INSERT INTO deployments VALUES (?, ?, ?, ?, ?, ?, ?)",
            initial_deployments
        )

    # Check if sample incident history is seeded
    cursor.execute("SELECT COUNT(*) as count FROM incidents")
    if cursor.fetchone()["count"] == 0:
        sample_incidents = [
            (
                "INC-8821",
                "2026-09-17T21:10:00Z",
                "504 Gateway Timeout",
                "payment-service",
                json.dumps([
                    "Payment anomaly occurred first (JVM GC pause > 2200ms)",
                    "Order depends on Payment",
                    "Order latency degraded from 24ms to 1850ms",
                    "Gateway 504 timeout occurred last"
                ]),
                None,
                "Restart Payment Service Pod & Reset JVM Heap",
                "RECOVERY VERIFIED",
                "2026-09-17T21:18:32Z",
                512,
                "payment_latency",
                "RESOLVED",
                "Payment Gateway Gateway Timeout Cascade",
                "Third-party webhook processing thread exhaustion caused p99 latency spike to 5200ms, triggering upstream circuit breaker in Order Service.",
                "HIGH",
                json.dumps(["payment-service", "order-service", "api-gateway"])
            ),
            (
                "INC-8819",
                "2026-09-17T11:40:00Z",
                "502 Bad Gateway",
                "payment-db",
                json.dumps([
                    "Database anomaly occurred first (pool exhausted)",
                    "Payment timeout followed Database anomaly",
                    "Gateway 502 occurred last"
                ]),
                None,
                "Flush Connection Pool & Terminate Idle Backend Connections",
                "RECOVERY VERIFIED",
                "2026-09-17T11:47:15Z",
                435,
                "database_failure",
                "RESOLVED",
                "Payment Database Connection Pool Exhaustion",
                "HikariCP pool exhaustion blocked active worker threads across payment-service.",
                "CRITICAL",
                json.dumps(["payment-db", "payment-service", "order-service", "api-gateway"])
            )
        ]
        cursor.executemany(
            "INSERT INTO incidents (id, started_at, symptom, initiating_service, evidence, associated_deployment, recovery_action, verification_result, resolved_at, duration_seconds, scenario, status, title, summary, severity, failure_chain) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            sample_incidents
        )

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
