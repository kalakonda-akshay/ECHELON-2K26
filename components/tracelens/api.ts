import {
  SystemStatus,
  TopologyData,
  TelemetryData,
  InvestigationStep,
  Diagnosis,
  RecoveryPlan,
  VerificationResult,
  Deployment,
  IncidentRecord,
  BlastRadiusData,
  EarlyWarningData,
  CausalGraphData,
  AdaptiveAnalysis,
  CandidateOption,
  SandboxSimulation,
  SimilarIncident,
  FeedbackStats,
  ProjectSummary,
  ProjectDetails,
  ObservabilityReadiness,
  IntegrationPlan,
  ServiceCriticalityMap,
  WhyNowData,
  WhatChangedData,
  CopilotResponse,
  ChangeAnalysisResult
} from "./types";

const getApiBase = () => {
  if (typeof window !== "undefined") {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (window.location.protocol === "https:") {
      return "/api";
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
};

const API_BASE = getApiBase();

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {})
    },
    cache: "no-store"
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export const TraceRouteAPI = {
  async getStatus(): Promise<SystemStatus> {
    return fetchJson<SystemStatus>(`${API_BASE}/status`);
  },

  async getTopology(): Promise<TopologyData> {
    return fetchJson<TopologyData>(`${API_BASE}/topology`);
  },

  async getTelemetry(): Promise<TelemetryData> {
    return fetchJson<TelemetryData>(`${API_BASE}/telemetry`);
  },

  async getInvestigation(): Promise<{ scenario: string; incident_id: string; total_steps: number; steps: InvestigationStep[] }> {
    return fetchJson(`${API_BASE}/investigation`);
  },

  async getDiagnosis(): Promise<Diagnosis> {
    return fetchJson<Diagnosis>(`${API_BASE}/diagnosis`);
  },

  async getRecoveryRecommendation(): Promise<RecoveryPlan> {
    return fetchJson<RecoveryPlan>(`${API_BASE}/recovery/recommendation`);
  },

  async approveRecovery(actionId: string, approvedBy = "oncall-sre@acme.corp"): Promise<{ success: boolean; recovery_id: string; message: string }> {
    return fetchJson(`${API_BASE}/recovery/approve`, {
      method: "POST",
      body: JSON.stringify({ action_id: actionId, approved_by: approvedBy })
    });
  },

  async verifyRecovery(): Promise<VerificationResult> {
    return fetchJson<VerificationResult>(`${API_BASE}/recovery/verify`);
  },

  async injectScenario(scenario: string): Promise<{ incident_id: string; scenario: string; status: string }> {
    return fetchJson(`${API_BASE}/demo/inject`, {
      method: "POST",
      body: JSON.stringify({ scenario })
    });
  },

  async resetScenario(): Promise<{ status: string; message: string }> {
    return fetchJson(`${API_BASE}/demo/reset`, {
      method: "POST"
    });
  },

  async resetDemo(): Promise<{ status: string; message: string }> {
    return this.resetScenario();
  },

  async getDeployments(): Promise<Deployment[]> {
    return fetchJson<Deployment[]>(`${API_BASE}/deployments`);
  },

  async getIncidentHistory(): Promise<IncidentRecord[]> {
    return fetchJson<IncidentRecord[]>(`${API_BASE}/history`);
  },

  // Enterprise SRE Endpoints
  async getBlastRadius(): Promise<BlastRadiusData> {
    return fetchJson<BlastRadiusData>(`${API_BASE}/blast-radius`);
  },

  async getEarlyWarning(): Promise<EarlyWarningData> {
    return fetchJson<EarlyWarningData>(`${API_BASE}/early-warning`);
  },

  async getCausalGraph(): Promise<CausalGraphData> {
    return fetchJson<CausalGraphData>(`${API_BASE}/causal-graph`);
  },

  async getAdaptiveAnalysis(): Promise<AdaptiveAnalysis> {
    return fetchJson<AdaptiveAnalysis>(`${API_BASE}/investigation/adaptive`);
  },

  async acquireEvidence(scenario?: string): Promise<{ scenario: string; status: string; message: string }> {
    return fetchJson(`${API_BASE}/investigation/acquire-evidence`, {
      method: "POST",
      body: JSON.stringify({ scenario })
    });
  },

  async getRecoveryOptions(): Promise<CandidateOption[]> {
    return fetchJson<CandidateOption[]>(`${API_BASE}/recovery/options`);
  },

  async simulateRecovery(actionId: string, scenario?: string): Promise<SandboxSimulation> {
    return fetchJson<SandboxSimulation>(`${API_BASE}/recovery/simulate`, {
      method: "POST",
      body: JSON.stringify({ action_id: actionId, scenario })
    });
  },

  async getSimilarIncidents(): Promise<SimilarIncident[]> {
    return fetchJson<SimilarIncident[]>(`${API_BASE}/memory/similar`);
  },

  async submitFeedback(payload: {
    incident_id: string;
    diagnosis_accurate: string;
    recovery_effective: string;
    engineer_notes: string;
    engineer_email?: string;
  }): Promise<{ feedback_id: string; incident_id: string; status: string }> {
    return fetchJson(`${API_BASE}/feedback`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async getFeedbackStats(): Promise<FeedbackStats> {
    return fetchJson<FeedbackStats>(`${API_BASE}/feedback/stats`);
  },

  async getServiceCriticality(): Promise<ServiceCriticalityMap> {
    return fetchJson<ServiceCriticalityMap>(`${API_BASE}/services/criticality`);
  },

  async getWhyNow(): Promise<WhyNowData> {
    return fetchJson<WhyNowData>(`${API_BASE}/investigation/why-now`);
  },

  async getWhatChanged(): Promise<WhatChangedData> {
    return fetchJson<WhatChangedData>(`${API_BASE}/investigation/what-changed`);
  },

  async queryCopilot(question: string, apiKey?: string): Promise<CopilotResponse> {
    return fetchJson<CopilotResponse>(`${API_BASE}/copilot/query`, {
      method: "POST",
      body: JSON.stringify({ question, api_key: apiKey })
    });
  },

  async analyzeChange(serviceId: string, version: string, changeType = "config", description = ""): Promise<ChangeAnalysisResult> {
    return fetchJson<ChangeAnalysisResult>(`${API_BASE}/deployments/analyze-change`, {
      method: "POST",
      body: JSON.stringify({
        service_id: serviceId,
        version: version,
        change_type: changeType,
        description: description
      })
    });
  },

  // =========================================================================
  // Multi-Project Observability & Static Discovery API
  // =========================================================================
  async listProjects(): Promise<ProjectSummary[]> {
    let remoteProjects: ProjectSummary[] = [];
    try {
      remoteProjects = await fetchJson<ProjectSummary[]>(`${API_BASE}/projects`);
    } catch (e) {
      // Backend offline or running in standalone mode
    }
    if (typeof window !== "undefined") {
      try {
        const local = JSON.parse(localStorage.getItem("traceroute_uploaded_projects") || "[]");
        const localSummaries: ProjectSummary[] = local.map((p: any) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          services_count: p.total_services,
          routes_count: p.total_routes,
          readiness_pct: p.readiness?.readiness_percentage || 65,
          status: p.status
        }));
        const ids = new Set(remoteProjects.map(p => p.id));
        for (const loc of localSummaries) {
          if (!ids.has(loc.id)) {
            remoteProjects.push(loc);
          }
        }
      } catch (err) {}
    }
    return remoteProjects.length > 0 ? remoteProjects : [
      { id: "FoodDelivery-Demo", name: "FoodDelivery-Demo", type: "DEMO", readiness_pct: 100, services_count: 6, routes_count: 8, status: "MONITORING", architecture_type: "MICROSERVICES", description: "FoodDelivery Live Microservices" }
    ];
  },

  async getProject(projectId: string): Promise<ProjectDetails> {
    try {
      return await fetchJson<ProjectDetails>(`${API_BASE}/projects/${projectId}`);
    } catch (e) {
      if (typeof window !== "undefined") {
        const local = JSON.parse(localStorage.getItem("traceroute_uploaded_projects") || "[]");
        const found = local.find((p: any) => p.id === projectId);
        if (found) return found;
      }
      throw e;
    }
  },

  async uploadProjectZip(file: File): Promise<ProjectDetails> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/projects/upload`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const result = await res.json();
        if (typeof window !== "undefined") {
          try {
            const stored = JSON.parse(localStorage.getItem("traceroute_uploaded_projects") || "[]");
            stored.unshift(result);
            localStorage.setItem("traceroute_uploaded_projects", JSON.stringify(stored.slice(0, 10)));
          } catch (e) {}
        }
        return result;
      }
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || "Upload failed");
    } catch (netErr: any) {
      console.warn("Backend API upload unreachable, utilizing in-browser resilient static analyzer:", netErr);
      try {
        const { analyzeZipInBrowser } = await import("./client-project-analyzer");
        return await analyzeZipInBrowser(file);
      } catch (clientErr: any) {
        throw new Error(clientErr.message || netErr.message || "Failed to process ZIP archive.");
      }
    }
  },

  async loadSampleProject(sampleId: string): Promise<ProjectDetails> {
    try {
      return await fetchJson<ProjectDetails>(`${API_BASE}/projects/sample/${sampleId}`, {
        method: "POST"
      });
    } catch (netErr) {
      const sampleMap: Record<string, Partial<ProjectDetails>> = {
        "myshop-microservices": {
          id: "myshop-microservices",
          name: "MyShop Microservices",
          type: "SAMPLE_PROJECT",
          architecture_type: "DISTRIBUTED_COMPOSE",
          languages: ["Python", "JavaScript", "TypeScript"],
          frameworks: ["FastAPI", "Express", "Flask", "Redis", "PostgreSQL"],
          databases: ["PostgreSQL", "Redis"],
          total_services: 5,
          total_routes: 14,
          total_dependencies: 4,
          status: "CONNECTED",
          capability_level: "LEVEL 2: ACTIVE REPAIR (VERIFIED REMEDIATION)"
        },
        "sample-fastapi-service": {
          id: "sample-fastapi-service",
          name: "FastAPI Order Service",
          type: "SAMPLE_PROJECT",
          architecture_type: "BACKEND_SERVICE",
          languages: ["Python"],
          frameworks: ["FastAPI", "SQLite"],
          databases: ["SQLite"],
          total_services: 2,
          total_routes: 7,
          total_dependencies: 1,
          status: "CONNECTED",
          capability_level: "LEVEL 1: STATIC PROJECT ANALYSIS"
        },
        "sample-express-payment": {
          id: "sample-express-payment",
          name: "Express Payment API",
          type: "SAMPLE_PROJECT",
          architecture_type: "BACKEND_SERVICE",
          languages: ["TypeScript", "JavaScript"],
          frameworks: ["Express", "Redis"],
          databases: ["Redis"],
          total_services: 2,
          total_routes: 6,
          total_dependencies: 1,
          status: "CONNECTED",
          capability_level: "LEVEL 1: STATIC PROJECT ANALYSIS"
        }
      };

      const base = sampleMap[sampleId] || sampleMap["myshop-microservices"];
      const fullSample: ProjectDetails = {
        id: base.id!,
        name: base.name!,
        type: "SAMPLE_PROJECT",
        architecture_type: base.architecture_type!,
        languages: base.languages!,
        frameworks: base.frameworks!,
        databases: base.databases!,
        total_services: base.total_services!,
        total_routes: base.total_routes!,
        total_dependencies: base.total_dependencies!,
        status: "CONNECTED",
        capability_level: base.capability_level!,
        readiness: {
          readiness_percentage: 75,
          status_label: "INTEGRATION REQUIRED",
          missing_count: 2,
          checklist: [
            { item: "Microservice Boundaries Discovered", status: "PASSED", score: 20, details: "Cataloged distributed services." },
            { item: "API Routes & Endpoints Mapped", status: "PASSED", score: 20, details: `${base.total_routes} routes mapped.` },
            { item: "Container Topology Defined", status: "PASSED", score: 20, details: "Compose manifests cataloged." },
            { item: "Distributed Tracing Configured", status: "ACTION_REQUIRED", score: 0, details: "TraceRoute OpenTelemetry SDK required." },
            { item: "Metrics Exporter Active", status: "ACTION_REQUIRED", score: 0, details: "Prometheus exporter required." },
            { item: "Liveness / Health Probe Endpoint", status: "PASSED", score: 15, details: "/health probe operational." }
          ]
        },
        services: [
          { id: "api-gateway", name: "Gateway", framework: "FastAPI", port: 8080, tier: "edge", language: "Python" },
          { id: "order-service", name: "Order Service", framework: "Flask", port: 5000, tier: "application", language: "Python" },
          { id: "payment-service", name: "Payment Service", framework: "Express", port: 3000, tier: "application", language: "JavaScript" },
          { id: "order-db", name: "Order Database", framework: "PostgreSQL", port: 5432, tier: "data", language: "SQL" }
        ],
        routes: [
          { method: "GET", path: "/health", file: "main.py", framework: "FastAPI" },
          { method: "POST", path: "/orders", file: "app.py", framework: "Flask" },
          { method: "POST", path: "/charge", file: "server.js", framework: "Express" }
        ],
        dependencies: [
          { source: "api-gateway", target: "order-service", confidence: "CONFIRMED", evidence: "Gateway routing" },
          { source: "order-service", target: "payment-service", confidence: "CONFIRMED", evidence: "HTTP checkout call" },
          { source: "order-service", target: "order-db", confidence: "CONFIRMED", evidence: "PostgreSQL pool" }
        ],
        topology: {
          nodes: [
            { id: "api-gateway", name: "Gateway", type: "gateway", tier: "edge", runtime: "FastAPI", port: 8080, x: 400, y: 70, description: "Edge Router", status: "HEALTHY", latency: 18.0, p50_latency_ms: 18.0, p99_latency_ms: 32.0, error_rate: 0.0, error_rate_pct: 0.0, rps: 200, cpu_pct: 19.0 },
            { id: "order-service", name: "Order Service", type: "service", tier: "application", runtime: "Flask", port: 5000, x: 280, y: 220, description: "Order API", status: "HEALTHY", latency: 24.0, p50_latency_ms: 24.0, p99_latency_ms: 45.0, error_rate: 0.0, error_rate_pct: 0.0, rps: 180, cpu_pct: 28.0 },
            { id: "payment-service", name: "Payment Service", type: "service", tier: "application", runtime: "Express", port: 3000, x: 520, y: 220, description: "Payment API", status: "HEALTHY", latency: 31.0, p50_latency_ms: 31.0, p99_latency_ms: 55.0, error_rate: 0.0, error_rate_pct: 0.0, rps: 150, cpu_pct: 22.0 },
            { id: "order-db", name: "Order Database", type: "database", tier: "data", runtime: "PostgreSQL", port: 5432, x: 400, y: 440, description: "Datastore", status: "HEALTHY", latency: 3.5, p50_latency_ms: 3.5, p99_latency_ms: 8.0, error_rate: 0.0, error_rate_pct: 0.0, rps: 210, cpu_pct: 15.0 }
          ],
          edges: [
            { source: "api-gateway", target: "order-service", protocol: "HTTP/1.1", timeout_ms: 2500, status: "HEALTHY", latency_ms: 24.0 },
            { source: "order-service", target: "payment-service", protocol: "HTTP/1.1", timeout_ms: 3000, status: "HEALTHY", latency_ms: 31.0 },
            { source: "order-service", target: "order-db", protocol: "TCP/PostgreSQL", timeout_ms: 1000, status: "HEALTHY", latency_ms: 3.5 }
          ]
        },
        integration_plan: {
          project_id: base.id!,
          project_name: base.name!,
          steps: [
            { step_number: 1, title: "Install TraceRoute AI OpenTelemetry", description: "Standardized OpenTelemetry exporters.", command: "pip install opentelemetry-api opentelemetry-sdk" },
            { step_number: 2, title: "Initialize TraceRoute Provider", description: "Hook into FastAPI/Flask/Express.", command: "python -m traceroute_instrumentation" }
          ],
          snippets: [],
          collector_endpoint: "http://127.0.0.1:8000/api/telemetry/ingest",
          estimated_setup_minutes: 3
        }
      };
      return fullSample;
    }
  },

  async getProjectTopology(projectId: string): Promise<TopologyData> {
    return fetchJson<TopologyData>(`${API_BASE}/projects/${projectId}/topology`);
  },

  async getProjectReadiness(projectId: string): Promise<ObservabilityReadiness> {
    return fetchJson<ObservabilityReadiness>(`${API_BASE}/projects/${projectId}/readiness`);
  },

  async getProjectIntegrationPlan(projectId: string): Promise<IntegrationPlan> {
    return fetchJson<IntegrationPlan>(`${API_BASE}/projects/${projectId}/integration-plan`);
  },

  async ingestProjectTelemetry(projectId: string, payload: any): Promise<any> {
    return fetchJson(`${API_BASE}/projects/${projectId}/telemetry`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async deleteProject(projectId: string): Promise<any> {
    return fetchJson(`${API_BASE}/projects/${projectId}`, {
      method: "DELETE"
    });
  },

  // =========================================================================
  // Real-Time Telemetry Streaming & Live Ingestion
  // =========================================================================
  connectTelemetryStream(
    onData: (state: SystemStatus) => void,
    onStatusChange?: (connected: boolean) => void
  ): () => void {
    if (typeof window === "undefined") return () => {};

    let es: EventSource | null = null;
    let isClosing = false;
    let reconnectTimeout: any = null;

    const connect = () => {
      if (isClosing) return;
      try {
        es = new EventSource(`${API_BASE}/telemetry/stream`);

        es.onopen = () => {
          onStatusChange?.(true);
        };

        es.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.type === "state" && parsed.data) {
              onData(parsed.data);
            }
          } catch (e) {
            // Ignore parse errors on keepalive ping
          }
        };

        es.onerror = () => {
          onStatusChange?.(false);
          es?.close();
          if (!isClosing) {
            reconnectTimeout = setTimeout(connect, 2500);
          }
        };
      } catch (err) {
        onStatusChange?.(false);
        if (!isClosing) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      isClosing = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (es) es.close();
      onStatusChange?.(false);
    };
  },

  async ingestTelemetry(payload: any): Promise<any> {
    return fetchJson(`${API_BASE}/telemetry/ingest`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async setTelemetryMode(mode: "DEMO" | "LIVE"): Promise<{ status: string; data_mode: string }> {
    return fetchJson(`${API_BASE}/telemetry/mode`, {
      method: "POST",
      body: JSON.stringify({ mode })
    });
  },

  async streamCopilotChat(
    messages: { role: string; content: string }[],
    options: {
      apiKey?: string;
      projectId?: string;
      signal?: AbortSignal;
      onChunk: (delta: string) => void;
      onCitations?: (citations: string[]) => void;
      onActions?: (actions: any[]) => void;
      onDone?: (info: { confidence?: string; modelSource?: string }) => void;
      onError?: (err: Error) => void;
    }
  ): Promise<void> {
    const { apiKey, projectId, signal, onChunk, onCitations, onActions, onDone, onError } = options;
    try {
      const res = await fetch(`${API_BASE}/copilot/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          api_key: apiKey || undefined,
          project_id: projectId || "FoodDelivery-Demo"
        }),
        signal
      });

      if (!res.ok) {
        throw new Error(`Copilot stream error ${res.status}: ${await res.text()}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("ReadableStream not supported by browser");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            const jsonStr = trimmed.slice(5).trim();
            if (jsonStr) {
              try {
                const event = JSON.parse(jsonStr);
                if (event.type === "chunk" && event.delta) {
                  onChunk(event.delta);
                } else if (event.type === "citations" && event.citations) {
                  onCitations?.(event.citations);
                } else if (event.type === "action_links" && event.action_links) {
                  onActions?.(event.action_links);
                } else if (event.type === "done") {
                  onDone?.({ confidence: event.confidence, modelSource: event.model_source });
                }
              } catch (e) {
                // Ignore parse errors on partial chunk
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return; // User aborted generating
      }
      onError?.(err);
    }
  }
};

// Backward compatibility alias
export const TraceLensAPI = TraceRouteAPI;
