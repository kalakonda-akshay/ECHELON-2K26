# TraceLens AI

> **Tagline:** *Detect. Trace. Explain. Recover. Verify.*  
> **Mission:** Enterprise developer/SRE platform transforming microservice cascading chaos into deterministic root-cause certainty and safe, verified recovery.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_Python_3.12+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_14_App_Router-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![NetworkX](https://img.shields.io/badge/Graph_Reasoning-NetworkX_DAG-blue)](https://networkx.org)
[![Tailwind CSS](https://img.shields.io/badge/UI-Tailwind_CSS_Dark_SRE-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![SQLite](https://img.shields.io/badge/Database-SQLite_WAL-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

---

## 1. Problem Statement

Modern distributed applications consist of interconnected microservices. When an upstream or data-layer component degrades, downstream callers fail simultaneously. During incidents, engineers are overwhelmed:

1. **What happened?** (SREs often blame the ingress gateway because that is where 502/504 errors appear first).
2. **Where did the failure actually start?** (Isolating the root initiating component among cascading symptoms).
3. **How did it propagate?** (Tracing the upstream path through dependencies).
4. **Why now?** (What changed in deployments, config, or traffic to trigger the incident at this exact moment?).
5. **What evidence supports the diagnosis?** (Replacing subjective guesswork with deterministic metric and trace proof).
6. **What is the blast radius?** (Evaluating currently affected vs. at-risk services and customer impact).
7. **What recovery action should be taken?** (Evaluating playbooks before mutating live production).
8. **Did the system actually recover?** (Objective multi-gate verification against baseline).

---

## 2. Platform Architecture & Product Structure

TraceLens AI is organized around **Three Understandable Product Modes**:

```
                                  TRACELENS AI PLATFORM
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      │                                      │                                      │
▼ 1. OBSERVE                           ▼ 2. INVESTIGATE                       ▼ 3. RECOVER
• Command Center                       • Root Cause & Score                   • SafeOps Recovery Sandbox
• Service Topology                     • Why Now? (Trigger Confluence)        • Digital Twin Simulation
• System Health & Criticality          • What Changed? (Baseline Deltas)      • Human Approval Gate
• Early Warning & Telemetry            • TraceLens Copilot (AI SRE)           • Real Verification Engine
• Change Risk & Deployments            • Causal Incident Graph (DAG)          • Incident Memory & Feedback
• Observability Readiness              • Adaptive Bayesian Evidence           • Incident Post-Mortem Audit
                                       • Blast Radius Assessment              • Incident Replay Studio
```

### Dual Workspaces: Demo Environment vs. Project Analysis
- **Mode 1: Demo Environment (`FoodDelivery-Demo`)**: Built-in 6-service microservice simulator with real-time metric streams, time-delayed cascades, and 4 failure scenarios.
- **Mode 2: Project Analysis (`+ Connect Project`)**: Upload user `.zip` archives or inspect pre-built sample fixtures (`sample-myshop-microservices`, `sample-fastapi-service`, `sample-express-payment`). Generates static architecture topologies, evaluates Observability Readiness (0-100%), and exports turnkey OpenTelemetry instrumentation plans.

---

## 3. Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript (strict mode), Tailwind CSS, Lucide Icons, Recharts.
- **Backend Control Plane**: Python 3.12+, FastAPI, Uvicorn, NetworkX (DAG analysis), Pydantic v2.
- **Database & Storage**: SQLite with WAL mode for persistent incident history, deployment logs, and feedback.
- **Static Analysis & Security**: Python AST & regex parsing with path-traversal guardrails (Zip-Slip defense) and automated secret sanitization.

---

## 4. Setup & Run Commands

### Prerequisites
- Python 3.10+
- Node.js 18+

### Quick Start (Local Development)

```bash
# 1. Install frontend dependencies
npm install

# 2. Install backend dependencies
pip install fastapi uvicorn networkx pydantic

# 3. Start the FastAPI backend control plane (Port 8000)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# 4. In a separate terminal, start the Next.js web console (Port 3000)
npm run dev

# 5. Access the application in your browser:
# Frontend: http://localhost:3000
# Backend API Docs: http://127.0.0.1:8000/docs
```

---

## 5. Core Feature Specifications

### A. Command Center (Observe Mode)
- **7 Top Metrics**: System Health, Active Incidents, Affected Services, P95 Latency, Error Rate, Failure Risk, and Recent Deployments.
- **Live Service Topology**: Interactive SVG directed graph indicating health, latency, error rates, and criticality tiers (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- **Active Incident Context**: Live severity badge (`P0 CRITICAL`), duration, customer symptom, leading root-cause candidate, and evidence strength meter.
- **Telemetry Sparklines & Event Stream**: Real-time polling charts for latency and error rates alongside live OpenTelemetry log streams.

### B. Observability Readiness Engine
Evaluates static codebases across **5 Capability Pillars** (0-100%):
1. **Structured Logs** (100%)
2. **Cluster Metrics** (70%)
3. **Distributed Traces** (40%)
4. **Health Checks** (80%)
5. **Deployments** (60%)

Provides explicit summaries:
- **What TraceLens Found**: Discovered services, API endpoints, databases, container configs, and dependency links.
- **Observability Gaps**: Uninstrumented services, missing liveness/readiness probes, and unmapped dependencies.
- **Recommended Next Steps**: Copy-paste OpenTelemetry instrumentation snippets for FastAPI and Express.

### C. Early Warning Engine
Monitors telemetry gradient slopes (e.g. database connection pool saturation, GC pause trends) **before** customer-facing 502/504 errors appear. Emits **Failure Risk: HIGH** with estimated Time-to-Breach (TTB) and potential downstream cascade exposure paths.

### D. Service Criticality Engine
Computes reverse dependency graphs in NetworkX to quantify downstream dependents and customer-facing checkout path centrality. Classifies nodes into `CRITICAL`, `HIGH`, `MEDIUM`, and `LOW` tiers to guide blast radius calculations and recovery risk assessments.

### E. Adaptive Evidence Engine 2.0 (Information-Gain Guided Investigation)
Maintains multiple competing hypotheses (e.g. Database 52% vs. Payment 43%) and guides engineers step-by-step using Shannon entropy / information gain:
- Emits `EVIDENCE INSUFFICIENT` when hypotheses are ambiguous.
- Identifies the next best evidence probe (e.g. `"Inspect Payment -> Database trace"`).
- Emits `EVIDENCE SUFFICIENT` when confidence surpasses deterministic thresholds.

### F. Explainable Evidence Scoring
Confidence scores are strictly deterministic and explainable:
$$\text{Score} = S_{\text{temporal}} + S_{\text{dependency}} + S_{\text{trace}} + S_{\text{latency}} + S_{\text{error}} - P_{\text{contradictory}}$$
No arbitrary percentages are hallucinated by LLMs.

### G. Why Now? & What Changed? Analysis
- **Why Now?**: Identifies the temporal tipping point and contributing confluence factors (e.g. recent infrastructure config change + 31% checkout traffic surge) that transformed latent fragility into an incident.
- **What Changed?**: Compares active incident telemetry against a rolling 30-minute statistical baseline, identifying the largest deviation (e.g. Database Connection Utilization: +233%).

### H. Causal Incident Graph (Distinct from Service Topology)
Maps causal event progression over time rather than static architecture:
`DB connection pool saturation` $\rightarrow$ `Query latency increases` $\rightarrow$ `Payment thread starvation` $\rightarrow$ `Payment timeout` $\rightarrow$ `Order retry timeout` $\rightarrow$ `Gateway 502`. Every causal node links directly to raw telemetry citations.

### I. TraceLens Copilot (AI SRE Assistant)
Incident-aware conversational assistant grounded strictly in structured TraceLens telemetry, causal graphs, blast radius, and memory. Answers questions such as *"Why is checkout failing?"*, *"What changed before the incident?"*, *"Show strongest evidence"*, and *"What are our recovery options?"* with zero hallucinations, deterministic citations, and one-click jump links.

### J. SafeOps Recovery Sandbox & Digital Twin
- **Simulation Before Remediation**: Evaluates candidate recovery playbooks (e.g. Pool Reset, Pod Restart, Git Rollback) in an isolated digital twin state without mutating live production.
- **Human-in-the-Loop Approval**: Displays exact changes and expected impacts for explicit SRE authorization.
- **5-Gate Recovery Verification**: Polls health probes, latency baselines, and error rate baselines after execution before displaying **`RECOVERY VERIFIED`**.

### K. Incident Memory & Continuous Engineer Feedback
- Persists post-mortems in SQLite. When an incident occurs, calculates similarity against historical incidents.
- SREs submit feedback on diagnosis accuracy and recovery effectiveness, updating platform confidence metrics.

### L. Incident Replay Studio
Visually replays resolved incidents chronologically with interactive controls (**Play**, **Pause**, **Scrub**, **1x/2x/5x speed**), animating topology transitions and highlighting causal events at each step.

---

## 6. Supported Failure Scenarios

| Scenario | Initiator | Customer Symptom | Root Cause Mechanics | Recovery Action |
| :--- | :--- | :--- | :--- | :--- |
| **`DATABASE_FAILURE`** | `payment-db` | `HTTP 502 Bad Gateway` | HikariCP connection pool saturated (150/150). Cascades to Payment timeout & Gateway circuit breaker. | Reset connection pool & flush idle connections. |
| **`PAYMENT_LATENCY`** | `payment-service` | `HTTP 504 Gateway Timeout` | Stop-the-world JVM G1GC pause (3800ms) locks worker threads. | Rolling pod restart & JVM heap flush. |
| **`INVENTORY_CRASH`** | `inventory-service` | `HTTP 503 Service Unavailable` | Memory exceeds ceiling; terminated by Linux OOM killer (Exit 137). | Recreate container with 1.5Gi memory ceiling. |
| **`BAD_DEPLOYMENT`** | `payment-service` | `HTTP 500 Internal Server Error` | Release v2.4.1 introduces unindexed sequential scan N+1 query regression. | Git rollback to previous stable release v2.4.0. |

---

## 7. Automated Test Suites

TraceLens includes comprehensive automated test coverage:

```bash
# 1. Test new advanced features (Criticality, Why Now, What Changed, Copilot, Change Risk)
python -m backend.test_new_features

# 2. Test end-to-end controlled recovery and 5-gate verification suite
python -m backend.test_complete_demo_client

# 3. Test static project analyzer and secure ZIP extraction
python -m backend.test_project_analysis

# 4. Verify strict frontend TypeScript compilation
npx tsc --noEmit
```

---

## 8. Limitations & Future Production Integration

- **Simulator vs. Physical K8s**: The built-in Demo environment runs on a high-fidelity in-memory state machine. In production environments, TraceLens connects to live OpenTelemetry collectors via OTLP (gRPC/HTTP) and Kubernetes API webhooks.
- **Automated Remediation**: In the current version, remediation execution is safely simulated or applied via container lifecycle commands; in enterprise deployments, SafeOps dispatches via Argo Rollouts or Kubernetes admission controllers with canary validation.
- **Language Support**: Static project discovery currently supports Python (FastAPI/Flask/Django) and Node.js (Express/Nest/Next.js). Support for Go and Java Spring Boot is planned.
