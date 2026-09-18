export type HealthStatus = "HEALTHY" | "DEGRADED" | "CRITICAL" | "DOWN" | "WARNING";

export interface SystemStatus {
  system_health: HealthStatus;
  data_mode?: "DEMO" | "LIVE";
  last_event_age_seconds?: number | null;
  active_scenario: string | null;
  active_incident_id: string | null;
  is_recovering: boolean;
  unhealthy_services_count: number;
  unhealthy_services: string[];
  cluster_avg_latency_ms: number;
  cluster_max_error_rate_pct: number;
  total_services: number;
  timestamp: string;
  cascade_stage?: string;
  resolved_incident?: string | null;
  services?: Record<string, any>;
}

export interface TopologyNode {
  id: string;
  name: string;
  type: "gateway" | "service" | "database";
  tier: "edge" | "gateway" | "application" | "data";
  runtime: string;
  port: number;
  x: number;
  y: number;
  description: string;
  status: HealthStatus;
  p50_latency_ms: number;
  p99_latency_ms: number;
  error_rate_pct: number;
  rps: number;
  cpu_pct: number;
  latency?: number;
  error_rate?: number;
}

export interface TopologyEdge {
  source: string;
  target: string;
  protocol: string;
  timeout_ms: number;
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  latency_ms: number;
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface MetricPoint {
  timestamp: string;
  service: string;
  status: HealthStatus;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  error_rate_pct: number;
  rps: number;
  cpu_pct: number;
  memory_pct: number;
  pool_usage_pct?: number | null;
  active_connections?: number | null;
}

export interface TraceSpan {
  id: string;
  parent_id: string | null;
  service: string;
  name: string;
  duration_ms: number;
  status: "OK" | "ERROR";
  code: number;
  error?: string;
}

export interface DistributedTrace {
  trace_id: string;
  timestamp: string;
  route: string;
  duration_ms: number;
  status_code: number;
  status: "OK" | "ERROR";
  error_message?: string;
  spans: TraceSpan[];
}

export interface LogEntry {
  timestamp: string;
  service: string;
  level: "INFO" | "WARN" | "ERROR";
  trace_id: string;
  span_id: string;
  message: string;
}

export interface TelemetryData {
  current_metrics: Record<string, MetricPoint>;
  metrics_history: Record<string, MetricPoint[]>;
  recent_logs: LogEntry[];
  recent_traces: DistributedTrace[];
}

export interface InvestigationStep {
  step: number;
  title: string;
  target_service: string;
  action: string;
  finding: string;
  evidence_type: "METRIC_ALERT" | "TRACE_WATERFALL" | "DEPENDENCY_BRANCH" | "INFRA_METRIC" | "DEPLOYMENT_CORRELATION" | "ROOT_CAUSE_VERDICT";
  badge: string;
  latency_ms: number;
  severity: "CRITICAL" | "WARNING" | "FATAL" | "DIAGNOSED";
  snippet: Record<string, any>;
}

export interface Candidate {
  service: string;
  name: string;
  type: string;
  score: number;
  breakdown: {
    anomaly_timing: number;
    topological_depth: number;
    trace_error_origin: number;
    deployment_correlation: number;
  };
  reasons: string[];
  status: HealthStatus;
  error_rate: number;
  p99_latency: number;
}

export interface Deployment {
  id: string;
  service: string;
  version: string;
  commit_id: string;
  author: string;
  deployed_at: string;
  description: string;
}

export interface AIExplanation {
  headline: string;
  executive_summary: string;
  failure_chain: string;
  confidence_score: number;
  why_root_cause: string[];
  technical_narrative: string;
  associated_deployment?: Deployment | null;
}

export interface Diagnosis {
  has_incident: boolean;
  scenario?: string;
  initiating_service?: string | null;
  initiating_service_name?: string | null;
  confidence_score: number;
  evidence_breakdown: Record<string, number>;
  evidence_reasons: string[];
  failure_chain: string[];
  correlated_deployment?: Deployment | null;
  ranked_candidates: Candidate[];
  ai_explanation?: AIExplanation;
  incident?: {
    symptom?: string;
    [key: string]: any;
  };
}

export interface RecoveryPlan {
  available: boolean;
  action_id: string | null;
  action_name: string;
  description: string;
  risk_impact: string;
  target_service: string | null;
  command: string;
  expected_recovery_time_s?: number;
}

export interface VerificationCheck {
  name: string;
  service: string;
  target: string;
  actual: string;
  passed: boolean;
}

export interface VerificationResult {
  verified: boolean;
  verdict: "RECOVERY VERIFIED" | "RECOVERY NOT VERIFIED — CONTINUE INVESTIGATION";
  badge_color: "emerald" | "rose";
  timestamp: string;
  checks: VerificationCheck[];
  summary: string;
}

export interface IncidentRecord {
  id: string;
  started_at: string;
  symptom?: string;
  initiating_service: string;
  evidence?: string | string[];
  associated_deployment?: string | null;
  recovery_action?: string;
  verification_result?: string;
  resolved_at?: string | null;
  duration_seconds?: number;
  scenario?: string;
  status: string;
  title?: string;
  summary?: string;
  severity?: string;
  failure_chain?: string;
}

export interface BlastRadiusService {
  service_id: string;
  name: string;
  status: HealthStatus;
  error_rate: number;
  latency_ms: number;
  is_root_cause?: boolean;
  exposure_reason?: string;
}

export interface BlastRadiusData {
  root_cause_id: string;
  root_cause_name: string;
  total_services: number;
  affected_count: number;
  affected_percentage: number;
  impact_level: "CRITICAL_OUTAGE" | "DEGRADED_EXPERIENCE" | "INTERNAL_AT_RISK" | "NOMINAL";
  impact_summary: string;
  currently_affected: BlastRadiusService[];
  potentially_exposed: BlastRadiusService[];
  isolated_healthy: BlastRadiusService[];
  critical_path: string[];
  customer_impact: {
    impacted_endpoints: string[];
    failed_transactions_pct: number;
    gateway_latency_ms: number;
    estimated_affected_users_per_min: number;
    sla_breached: boolean;
  };
}

export interface EarlyWarningIndicator {
  service: string;
  metric: string;
  value: string;
  baseline: string;
  drift_rate?: string;
  warning: string;
}

export interface EarlyWarningData {
  severity: "NOMINAL" | "EARLY_WARNING" | "ELEVATED_RISK" | "SLA_BREACHED";
  has_early_warning: boolean;
  time_to_breach_seconds: number | null;
  indicators_count: number;
  indicators: EarlyWarningIndicator[];
  preventative_recommendation: string;
  evaluated_at: number;
  failure_risk_level?: "LOW" | "HIGH" | "CRITICAL";
  degradation_trend?: string;
  downstream_exposure_path?: string[];
}

export interface CausalNode {
  id: string;
  event: string;
  service: string;
  timestamp: string;
  evidence_source: string;
  severity: "CRITICAL" | "WARNING" | "FATAL" | "DIAGNOSED";
  evidence_details: string;
}

export interface CausalEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface CausalGraphData {
  nodes: CausalNode[];
  edges: CausalEdge[];
}

export interface Hypothesis {
  service_id: string;
  name: string;
  probability: number;
  rank: number;
  status: string;
}

export interface NextBestEvidence {
  id: string;
  action_title: string;
  target_service: string;
  query: string;
  rationale: string;
  expected_information_gain: string;
}

export interface AdaptiveAnalysis {
  status: "NOMINAL" | "EVIDENCE_INSUFFICIENT" | "EVIDENCE_SUFFICIENT";
  is_sufficient: boolean;
  confidence_score: number;
  hypotheses: Hypothesis[];
  next_best_evidence: NextBestEvidence | null;
  investigation_steps: InvestigationStep[];
}

export interface CandidateOption {
  id: string;
  title: string;
  type: string;
  target_service: string;
  is_recommended: boolean;
  command: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  risk_score: number;
  projected_recovery_time_s: number;
  projected_success_rate_pct: number;
  tradeoffs: string;
  blast_radius_reduction: string;
}

export interface SandboxSimulation {
  simulation_id: string;
  action_id: string;
  action_title: string;
  target_service: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  risk_score: number;
  projected_duration_s: number;
  projected_success_rate: number;
  before: {
    unhealthy_services_count: number;
    unhealthy_services: string[];
    cluster_avg_latency_ms: number;
    cluster_max_error_rate_pct: number;
    customer_impact: string;
  };
  after: {
    unhealthy_services_count: number;
    unhealthy_services: string[];
    cluster_avg_latency_ms: number;
    cluster_max_error_rate_pct: number;
    customer_impact: string;
  };
  delta: {
    latency_reduction_ms: number;
    error_rate_reduction_pct: number;
    services_restored: number;
  };
  side_effects_analysis: string;
  verification_preview: Array<{
    check: string;
    expected: string;
    confidence: string;
  }>;
  is_sandbox_isolated: boolean;
}

export interface SimilarIncident {
  incident_id: string;
  title: string;
  started_at: string;
  resolved_at?: string;
  symptom?: string;
  initiating_service: string;
  recovery_action?: string;
  verification_result?: string;
  duration_seconds?: number;
  similarity_score_pct: number;
  match_factors: string[];
  summary: string;
}

export interface FeedbackStats {
  total_incidents_recorded: number;
  total_evaluations: number;
  diagnosis_accuracy_pct: number;
  recovery_success_rate_pct: number;
  mean_time_to_detect_s: number;
  mean_time_to_recover_s: number;
  engineer_satisfaction_pct: number;
  recent_evaluations: Array<{
    incident_id: string;
    diagnosis_accurate: string;
    recovery_effective: string;
    engineer_notes: string;
    engineer_email: string;
    created_at: string;
  }>;
}

// =========================================================================
// Multi-Project Observability & Static Analysis Types
// =========================================================================

export type ProjectCapabilityLevel =
  | "LEVEL 1: STATIC PROJECT ANALYSIS"
  | "LEVEL 2: LIVE OBSERVABILITY (TELEMETRY CONNECTED)"
  | "LEVEL 2: ACTIVE REPAIR (VERIFIED REMEDIATION)"
  | "LEVEL 3: CONTROLLED RECOVERY SANDBOX";

export interface ProjectSummary {
  id: string;
  name: string;
  type: "DEMO" | "SAMPLE_PROJECT" | "USER_UPLOAD" | "UPLOADED_PROJECT";
  status: "LIVE_SIMULATION" | "STATIC_ANALYSIS" | "INTEGRATION_REQUIRED" | "CONNECTED" | "MONITORING";
  architecture_type?: "MICROSERVICES" | "MONOLITH" | "BACKEND_SERVICE" | "EVENT_DRIVEN" | "DISTRIBUTED_COMPOSE";
  services_count: number;
  routes_count: number;
  readiness_pct: number;
  description?: string;
  is_active_demo?: boolean;
}

export interface ReadinessItem {
  item: string;
  status: "PASSED" | "ACTION_REQUIRED" | "WARNING";
  score: number;
  details: string;
}

export interface ObservabilityReadiness {
  readiness_percentage: number;
  status_label: "READY FOR TRACEROUTE" | "INTEGRATION REQUIRED" | "STATIC ANALYSIS ONLY" | "PRODUCTION READY" | "EARLY ADOPTION";
  missing_count: number;
  checklist: ReadinessItem[];
}

export interface DiscoveredService {
  id: string;
  name: string;
  framework: string;
  port?: number;
  tier: "edge" | "gateway" | "application" | "data";
  language: string;
  description?: string;
  path?: string;
}

export interface DiscoveredRoute {
  method: string;
  path: string;
  file: string;
  framework: string;
}

export interface DiscoveredDependency {
  source: string;
  target: string;
  protocol?: string;
  timeout_ms?: number;
  status?: string;
  confidence: "CONFIRMED" | "LIKELY" | "UNRESOLVED";
  evidence: string;
}

export interface IntegrationFileSnippet {
  filename: string;
  language: string;
  code: string;
  description: string;
}

export interface IntegrationPlan {
  project_id?: string;
  project_name?: string;
  steps?: Array<{ step_number: number; title: string; description: string; command?: string; verification?: string }>;
  snippets?: any[];
  collector_endpoint?: string;
  estimated_setup_minutes?: number;
  frameworks_detected?: string[];
  languages_detected?: string[];
  target_services?: Array<{ id: string }>;
  suggested_package_managers?: string[];
  install_command?: string;
  files?: IntegrationFileSnippet[];
  next_steps?: string[];
}

export interface ProjectDetails {
  id: string;
  name: string;
  type: "DEMO" | "SAMPLE_PROJECT" | "USER_UPLOAD" | "UPLOADED_PROJECT";
  status: string;
  architecture_type: "MICROSERVICES" | "MONOLITH" | "BACKEND_SERVICE" | "EVENT_DRIVEN" | "DISTRIBUTED_COMPOSE";
  languages: string[];
  frameworks: string[];
  databases: string[];
  total_services: number;
  total_routes: number;
  total_dependencies: number;
  readiness: ObservabilityReadiness;
  services: DiscoveredService[];
  routes: DiscoveredRoute[];
  dependencies: DiscoveredDependency[];
  topology: TopologyData;
  integration_plan: IntegrationPlan;
  capability_level: ProjectCapabilityLevel;
  sensitive_files_detected?: Array<{
    relative_path: string;
    type: string;
    redacted: boolean;
    notice: string;
  }>;
  skipped_directories?: string[];
}

export interface ServiceCriticalityInfo {
  criticality_tier: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  is_critical_path: boolean;
  downstream_dependent_count: number;
  downstream_dependents: string[];
  failure_blast_impact: "CATASTROPHIC" | "HIGH" | "MODERATE" | "LOW";
  description: string;
}

export type ServiceCriticalityMap = Record<string, ServiceCriticalityInfo>;

export interface WhyNowTimelineItem {
  timestamp: string;
  relative_s: number;
  event: string;
  category: string;
  badge: string;
}

export interface ContributingCondition {
  factor: string;
  description: string;
  weight: string;
}

export interface WhyNowData {
  has_incident: boolean;
  headline?: string;
  timeline: WhyNowTimelineItem[];
  contributing_conditions: ContributingCondition[];
  primary_trigger: string;
}

export interface MetricDeviation {
  service: string;
  metric: string;
  unit?: string;
  before: string;
  after: string;
  delta?: string;
  delta_pct: number;
  severity?: "CRITICAL" | "WARNING" | "NORMAL";
}

export interface WhatChangedData {
  has_incident: boolean;
  largest_deviation: MetricDeviation;
  metrics_comparison: MetricDeviation[];
}

export interface CopilotActionLink {
  label: string;
  tab: string;
}

export interface CopilotResponse {
  question: string;
  answer: string;
  evidence_citations: string[];
  action_links?: CopilotActionLink[];
  confidence: string;
  model_source?: string;
}

export interface ChangeAnalysisResult {
  service_id: string;
  version: string;
  change_type: string;
  risk_score: number;
  risk_level: "HIGH" | "MEDIUM" | "LOW";
  criticality_tier: string;
  downstream_impact_count: number;
  impacted_services: string[];
  recommendations: string[];
}
