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

const API_BASE = "http://127.0.0.1:8000/api";

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

export const TraceLensAPI = {
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
    return fetchJson<ProjectSummary[]>(`${API_BASE}/projects`);
  },

  async getProject(projectId: string): Promise<ProjectDetails> {
    return fetchJson<ProjectDetails>(`${API_BASE}/projects/${projectId}`);
  },

  async uploadProjectZip(file: File): Promise<ProjectDetails> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/projects/upload`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Upload failed" }));
      throw new Error(err.detail || "Upload failed");
    }
    return res.json();
  },

  async loadSampleProject(sampleId: string): Promise<ProjectDetails> {
    return fetchJson<ProjectDetails>(`${API_BASE}/projects/sample/${sampleId}`, {
      method: "POST"
    });
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
  }
};
