"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  FolderGit2,
  FileCode2,
  Terminal,
  Loader2,
  Sparkles,
  Layers,
  ChevronRight,
  Info
} from "lucide-react";
import { TraceRouteAPI } from "@/components/traceroute/api";
import { ProjectDetails } from "@/components/traceroute/types";

interface ConnectProjectViewProps {
  onProjectSelected: (project: ProjectDetails) => void;
  onNavigate: (tab: string) => void;
}

const ANALYSIS_STAGES = [
  "Receiving and parsing archive container...",
  "Applying Zip-Slip path traversal defense checks...",
  "Filtering bloat directories (node_modules, .git, __pycache__)...",
  "Auditing sensitive files (.env, private keys redacted)...",
  "Scanning AST and framework signatures (FastAPI, Express, Flask)...",
  "Extracting HTTP routes and endpoint path parameters...",
  "Inferring dependency edges and inter-service calls...",
  "Computing Observability Readiness Score & OpenTelemetry Plan..."
];

export function ConnectProjectView({
  onProjectSelected,
  onNavigate
}: ConnectProjectViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stage simulation timer while uploading
  useEffect(() => {
    let interval: any;
    if (isUploading) {
      interval = setInterval(() => {
        setCurrentStageIndex((prev) => {
          if (prev < ANALYSIS_STAGES.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 350);
    } else {
      setCurrentStageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isUploading]);

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setUploadError("Please upload a standard .zip archive of your project codebase.");
      return;
    }

    setUploadError(null);
    setSelectedFileName(file.name);
    setIsUploading(true);
    setCurrentStageIndex(0);

    try {
      const result = await TraceRouteAPI.uploadProjectZip(file);
      setIsUploading(false);
      onProjectSelected(result);
    } catch (err: any) {
      setIsUploading(false);
      setUploadError(err.message || "Failed to analyze uploaded project.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSampleSelect = async (sampleId: string) => {
    setIsUploading(true);
    setCurrentStageIndex(0);
    setUploadError(null);
    try {
      const proj = await TraceRouteAPI.loadSampleProject(sampleId);
      setIsUploading(false);
      onProjectSelected(proj);
    } catch (err: any) {
      setIsUploading(false);
      setUploadError(err.message || "Failed to load sample project");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PROJECT ONBOARDING & ARCHITECTURE DISCOVERY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Connect Your Project to TraceRoute AI
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Upload your codebase or select a pre-configured multi-service fixture. TraceRoute performs safe static analysis, maps microservice boundaries, evaluates observability readiness, and delivers a turnkey OpenTelemetry integration plan.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero Arbitrary Code Execution</span>
            </div>
            <div className="flex items-center gap-1.5 text-sky-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Path-Traversal & Secret Redaction Guardrails</span>
            </div>
            <div className="flex items-center gap-1.5 text-purple-400">
              <Layers className="w-4 h-4" />
              <span>Docker Compose & Multi-Framework AST</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone & Loading Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Upload Box */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-sky-400" />
              Option 1: Upload Project ZIP Archive
            </h2>
            <span className="text-xs text-slate-400 font-mono">Max 500MB</span>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[280px] relative overflow-hidden ${
              isDragging
                ? "border-sky-500 bg-sky-950/20"
                : isUploading
                ? "border-sky-500/50 bg-slate-900/60 cursor-wait"
                : "border-slate-800 hover:border-slate-700 bg-slate-950/80 hover:bg-slate-900/40"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".zip"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            {isUploading ? (
              <div className="w-full max-w-md space-y-4">
                <div className="relative w-14 h-14 mx-auto">
                  <div className="absolute inset-0 rounded-full border-2 border-sky-500/20 animate-ping" />
                  <div className="w-14 h-14 rounded-full bg-sky-950/80 border border-sky-500 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/30">
                    <Loader2 className="w-7 h-7 animate-spin" />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Analyzing Project Architecture
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    {selectedFileName || "archive.zip"}
                  </p>
                </div>

                {/* Stepper Progress Visualizer */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Discovery Pipeline</span>
                    <span className="text-sky-400">
                      Stage {currentStageIndex + 1} of {ANALYSIS_STAGES.length}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full transition-all duration-300"
                      style={{
                        width: `${((currentStageIndex + 1) / ANALYSIS_STAGES.length) * 100}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-300 font-mono flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    {ANALYSIS_STAGES[currentStageIndex]}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-sky-400 group-hover:scale-105 transition shadow-lg">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Drag & Drop your project ZIP here
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    or <span className="text-sky-400 underline underline-offset-2">browse files</span> from your computer
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400">
                  <FileArchive className="w-3.5 h-3.5 text-sky-400" />
                  <span>Supports FastAPI, Express, Flask, Next.js, Docker Compose</span>
                </div>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Upload & Extraction Error</p>
                <p className="text-rose-300/80 mt-0.5 font-mono">{uploadError}</p>
              </div>
            </div>
          )}

          {/* Security & Isolation Callout */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Safe Isolated Workspace Sandbox</span>
            </div>
            <p className="leading-relaxed">
              TraceRoute analyzes your code strictly via static syntax pattern matching and AST resolution in a temporary sandbox. No arbitrary code, bash scripts, or dependencies are executed. Secrets (.env, private keys) are automatically sanitized and never stored in plain text.
            </p>
          </div>
        </div>

        {/* Option 2: 1-Click Sample Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-purple-400" />
              Option 2: 1-Click Sample Fixtures
            </h2>
          </div>

          <div className="space-y-3">
            {/* Sample 1: MyShop Multi-Service */}
            <div
              onClick={() => handleSampleSelect("sample-myshop-microservices")}
              className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/50 transition cursor-pointer group shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition">
                    MyShop E-Commerce
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  5 Services
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Multi-service architecture with FastAPI Gateway, Order saga, Express payment processor, and PostgreSQL datastore.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                <span>FastAPI • Express • Docker</span>
                <span className="flex items-center gap-1 text-sky-400 group-hover:translate-x-0.5 transition">
                  Load Fixture <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Sample 2: FastAPI Order Service */}
            <div
              onClick={() => handleSampleSelect("sample-fastapi-service")}
              className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer group shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">
                    FastAPI Order Service
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Standalone API
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Clean Python FastAPI backend with modular APIRouters, SQLite connection, and Pydantic request models.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                <span>Python • FastAPI • SQLite</span>
                <span className="flex items-center gap-1 text-emerald-400 group-hover:translate-x-0.5 transition">
                  Load Fixture <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Sample 3: Express Payment API */}
            <div
              onClick={() => handleSampleSelect("sample-express-payment")}
              className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition cursor-pointer group shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                    Express Payment Gateway
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                  Node/TypeScript
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                TypeScript Node/Express payment gateway with Redis idempotency cache and health probe endpoint.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                <span>TypeScript • Express • Redis</span>
                <span className="flex items-center gap-1 text-amber-400 group-hover:translate-x-0.5 transition">
                  Load Fixture <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Sample 4: Broken Food Delivery (Repair Lab Demo) */}
            <div
              onClick={() => handleSampleSelect("sample-broken-food-delivery")}
              className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/50 transition cursor-pointer group shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                  <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition">
                    Broken Food Delivery
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                  3 Fixable Issues
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Pre-packaged microservices project with build blockers (missing env fallback, missing dependency, route mismatch) ready for Project Repair Lab.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                <span>FastAPI • Docker • Repair Lab</span>
                <span className="flex items-center gap-1 text-rose-400 group-hover:translate-x-0.5 transition font-semibold">
                  Test Repair Lab <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}