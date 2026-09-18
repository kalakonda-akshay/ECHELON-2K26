"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TraceRouteAPI } from "@/components/traceroute/api";
import {
  SystemStatus,
  TopologyData,
  TelemetryData,
  Diagnosis,
  InvestigationStep,
  RecoveryPlan,
  BlastRadiusData,
  EarlyWarningData,
  CausalGraphData,
  AdaptiveAnalysis
} from "@/components/traceroute/types";
import { Sidebar } from "@/components/traceroute/shell/sidebar";
import { Topbar } from "@/components/traceroute/shell/topbar";
import { OverviewView } from "@/components/traceroute/views/overview-view";
import { TopologyView } from "@/components/traceroute/views/topology-view";
import { CausalGraphView } from "@/components/traceroute/views/causal-graph-view";
import { AdaptiveView } from "@/components/traceroute/views/adaptive-view";
import { RootCauseView } from "@/components/traceroute/views/root-cause-view";
import { BlastRadiusView } from "@/components/traceroute/views/blast-radius-view";
import { SandboxView } from "@/components/traceroute/views/sandbox-view";
import { MemoryView } from "@/components/traceroute/views/memory-view";
import { DeploymentsView } from "@/components/traceroute/views/deployments-view";
import { DemoLabView } from "@/components/traceroute/views/demo-lab-view";
import { PresentationView } from "@/components/traceroute/views/presentation-view";
import { ConnectProjectView } from "@/components/traceroute/views/connect-project-view";
import { ProjectDashboardView } from "@/components/traceroute/views/project-dashboard-view";
import { WhyNowView } from "@/components/traceroute/views/why-now-view";
import { CopilotView } from "@/components/traceroute/views/copilot-view";
import { ReplayView } from "@/components/traceroute/views/replay-view";
import { RepairLabView } from "@/components/traceroute/views/repair-lab-view";
import { ProjectSummary, ProjectDetails } from "@/components/traceroute/types";
import { DevDiagnosticsPanel } from "@/components/traceroute/dev-diagnostics-panel";
import { RefreshCw } from "lucide-react";

export default function TraceRoutePage() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);

  // Real-time streaming & diagnostics states
  const [isStreamConnected, setIsStreamConnected] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);

  // Multi-Project states
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("FoodDelivery-Demo");
  const [activeProjectDetails, setActiveProjectDetails] = useState<ProjectDetails | null>(null);

  // Live platform states
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [investigationSteps, setInvestigationSteps] = useState<InvestigationStep[]>([]);
  const [recoveryPlan, setRecoveryPlan] = useState<RecoveryPlan | null>(null);
  const [blastRadius, setBlastRadius] = useState<BlastRadiusData | null>(null);
  const [earlyWarning, setEarlyWarning] = useState<EarlyWarningData | null>(null);
  const [causalGraph, setCausalGraph] = useState<CausalGraphData | null>(null);
  const [adaptiveData, setAdaptiveData] = useState<AdaptiveAnalysis | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [backendOnline, setBackendOnline] = useState<boolean>(true);

  const fetchAllData = useCallback(async () => {
    try {
      const [
        statusData,
        topoData,
        telemData,
        diagData,
        investData,
        planData,
        blastData,
        earlyData,
        causalData,
        adaptiveRes,
        projectsList
      ] = await Promise.all([
        TraceRouteAPI.getStatus().catch(() => null),
        TraceRouteAPI.getTopology().catch(() => null),
        TraceRouteAPI.getTelemetry().catch(() => null),
        TraceRouteAPI.getDiagnosis().catch(() => null),
        TraceRouteAPI.getInvestigation().catch(() => null),
        TraceRouteAPI.getRecoveryRecommendation().catch(() => null),
        TraceRouteAPI.getBlastRadius().catch(() => null),
        TraceRouteAPI.getEarlyWarning().catch(() => null),
        TraceRouteAPI.getCausalGraph().catch(() => null),
        TraceRouteAPI.getAdaptiveAnalysis().catch(() => null),
        TraceRouteAPI.listProjects().catch(() => [])
      ]);

      if (statusData) {
        setStatus(statusData);
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }

      if (topoData) setTopology(topoData);
      if (telemData) setTelemetry(telemData);
      if (diagData) setDiagnosis(diagData);
      if (investData?.steps) setInvestigationSteps(investData.steps);
      if (planData) setRecoveryPlan(planData);
      if (blastData) setBlastRadius(blastData);
      if (earlyData) setEarlyWarning(earlyData);
      if (causalData) setCausalGraph(causalData);
      if (adaptiveRes) setAdaptiveData(adaptiveRes);
      if (projectsList && projectsList.length > 0) setProjects(projectsList);

      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to sync TraceRoute telemetry:", err);
      setBackendOnline(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Real-Time SSE Telemetry Stream Connection
  useEffect(() => {
    fetchAllData();

    // Zero-latency reactive stream: updates 6 dashboard cards in real time without browser refresh
    const disconnectStream = TraceRouteAPI.connectTelemetryStream(
      (incomingState: any) => {
        setStatus((prev: any) => {
          // If incident or system health transitioned, refresh full diagnosis in background
          if (
            prev?.active_incident_id !== incomingState?.active_incident_id ||
            prev?.system_health !== incomingState?.system_health ||
            prev?.active_scenario !== incomingState?.active_scenario
          ) {
            fetchAllData();
          }
          return incomingState;
        });
        setLastRefreshed(new Date());
      },
      (connected: boolean) => {
        setIsStreamConnected(connected);
        if (connected) setBackendOnline(true);
      }
    );

    // Periodic reconciliation interval every 6 seconds as fallback
    const interval = setInterval(fetchAllData, 6000);

    return () => {
      disconnectStream();
      clearInterval(interval);
    };
  }, [fetchAllData]);

  const handleToggleDataMode = async () => {
    const nextMode = status?.data_mode === "LIVE" ? "DEMO" : "LIVE";
    try {
      await TraceRouteAPI.setTelemetryMode(nextMode);
      fetchAllData();
    } catch (e) {
      console.error("Failed to switch pipeline mode:", e);
    }
  };

  async function handleSelectProject(projectId: string) {
    setActiveProjectId(projectId);
    if (projectId === "FoodDelivery-Demo") {
      setActiveProjectDetails(null);
      setActiveTab("overview");
    } else {
      try {
        const details = await TraceRouteAPI.getProject(projectId);
        setActiveProjectDetails(details);
        setActiveTab("project_dashboard");
      } catch (err) {
        console.error("Failed to load project details:", err);
      }
    }
  }

  function handleProjectSelected(details: ProjectDetails) {
    setActiveProjectId(details.id);
    setActiveProjectDetails(details);
    setActiveTab("project_dashboard");
    fetchAllData();
  }

  async function handleReset() {
    try {
      await TraceRouteAPI.resetDemo();
      await fetchAllData();
      setActiveTab("overview");
    } catch (err) {
      console.error("Error resetting cluster:", err);
    }
  }

  function handleScenarioInjected() {
    fetchAllData();
    setActiveTab("overview");
  }

  function handleRecoveryComplete() {
    fetchAllData();
  }

  // Fullscreen Presentation Mode (for hackathon judging on projector)
  if (isPresentationMode) {
    return (
      <PresentationView
        status={status}
        topology={topology}
        telemetry={telemetry}
        diagnosis={diagnosis}
        investigationSteps={investigationSteps}
        blastRadius={blastRadius}
        causalGraph={causalGraph}
        adaptiveData={adaptiveData}
        recoveryPlan={recoveryPlan}
        onExit={() => setIsPresentationMode(false)}
        onReset={handleReset}
        onRefresh={fetchAllData}
      />
    );
  }

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-sky-500/30 selection:text-sky-200">
      {/* Persistent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={status}
        earlyWarning={earlyWarning}
        isPresentationMode={isPresentationMode}
        setIsPresentationMode={setIsPresentationMode}
        onReset={handleReset}
        activeProjectId={activeProjectId}
        onConnectProject={() => setActiveTab("connect_project")}
      />

      {/* Main Content Area with Top Status Bar */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          status={status}
          earlyWarning={earlyWarning}
          lastRefreshed={lastRefreshed}
          onRefresh={fetchAllData}
          onReset={handleReset}
          isPresentationMode={isPresentationMode}
          setIsPresentationMode={setIsPresentationMode}
          onNavigate={setActiveTab}
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={handleSelectProject}
          onOpenConnectProject={() => setActiveTab("connect_project")}
          isStreamConnected={isStreamConnected}
          onToggleDataMode={handleToggleDataMode}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        />

        {/* Backend offline alert if connection fails */}
        {!backendOnline && !isLoading && (
          <div className="bg-amber-950/80 border-b border-amber-800/80 px-6 py-2.5 text-xs text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>
                <strong>Connecting to TraceRoute Backend:</strong> FastAPI server offline or unreachable at{" "}
                <code className="font-mono bg-amber-900/60 px-1.5 py-0.5 rounded text-white">
                  http://127.0.0.1:8000
                </code>
              </span>
            </div>
          </div>
        )}

        {/* View Routing */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {activeTab === "overview" && (
            <OverviewView
              status={status}
              topology={topology}
              telemetry={telemetry}
              diagnosis={diagnosis}
              earlyWarning={earlyWarning}
              investigationSteps={investigationSteps}
              recoveryPlan={recoveryPlan}
              adaptiveData={adaptiveData}
              isPresentationMode={isPresentationMode}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "topology" && (
            <TopologyView
              topology={topology}
              telemetry={telemetry}
              activeScenario={status?.active_scenario || null}
            />
          )}

          {activeTab === "causal_graph" && (
            <CausalGraphView
              causalGraph={causalGraph}
              status={status}
              diagnosis={diagnosis}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "adaptive" && (
            <AdaptiveView
              adaptiveData={adaptiveData}
              status={status}
              diagnosis={diagnosis}
              onRefresh={fetchAllData}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "root_cause" && (
            <RootCauseView
              diagnosis={diagnosis}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "why_now" && (
            <WhyNowView
              status={status}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "copilot" && (
            <CopilotView
              status={status}
              diagnosis={diagnosis}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "replay" && (
            <ReplayView
              status={status}
              topology={topology}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "blast_radius" && (
            <BlastRadiusView
              blastRadius={blastRadius}
              status={status}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "repair_lab" && (
            <RepairLabView
              projectId={activeProjectId}
              projectName={activeProjectDetails?.name || "FoodBridge Application"}
              onNavigate={setActiveTab}
              activeIncidentId={status?.active_incident_id}
            />
          )}

          {activeTab === "sandbox" && (
            <SandboxView
              status={status}
              diagnosis={diagnosis}
              onRecoveryComplete={handleRecoveryComplete}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "memory" && (
            <MemoryView
              status={status}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "deployments" && (
            <DeploymentsView
              status={status}
              diagnosis={diagnosis}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "demo_lab" && (
            <DemoLabView
              onScenarioInjected={handleScenarioInjected}
              onReset={handleReset}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "connect_project" && (
            <ConnectProjectView
              onProjectSelected={handleProjectSelected}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === "project_dashboard" && activeProjectDetails && (
            <ProjectDashboardView
              project={activeProjectDetails}
              onNavigate={setActiveTab}
              onSwitchToDemo={() => handleSelectProject("FoodDelivery-Demo")}
              onConnectAnother={() => setActiveTab("connect_project")}
            />
          )}
        </main>
      </div>

      {/* Real-Time Telemetry Dev Diagnostics Panel */}
      <DevDiagnosticsPanel
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        status={status}
        isStreamConnected={isStreamConnected}
        onRefreshData={fetchAllData}
      />
    </div>
  );
}
