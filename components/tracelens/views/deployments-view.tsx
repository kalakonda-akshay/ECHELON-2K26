"use client";

import React, { useState, useEffect } from "react";
import { Deployment, SystemStatus, Diagnosis } from "../types";
import { TraceRouteAPI } from "../api";
import {
  GitCommit,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  ArrowRight,
  GitBranch,
  Server
} from "lucide-react";

interface DeploymentsViewProps {
  status: SystemStatus | null;
  diagnosis: Diagnosis | null;
  onNavigate: (tab: string) => void;
}

export function DeploymentsView({
  status,
  diagnosis,
  onNavigate
}: DeploymentsViewProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedDep, setSelectedDep] = useState<Deployment | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const deps = await TraceRouteAPI.getDeployments();
        setDeployments(deps);
        if (deps.length > 0) setSelectedDep(deps[0]);
      } catch (err) {
        console.error("Failed to load deployments:", err);
      }
    }
    load();
  }, []);

  const suspectedCommit = diagnosis?.correlated_deployment;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <GitCommit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              CI/CD Deployment & Commit Correlation
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-medium">
                Temporal Change Register
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Correlates recent git commits and container image releases with incident onset timestamps to detect deployment regressions.
            </p>
          </div>
        </div>

        {suspectedCommit ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-800 text-xs font-mono text-rose-300 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Suspected Change: {suspectedCommit.commit_id} ({suspectedCommit.version})</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs font-mono text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>No Deployment Regressions Detected</span>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Deployments List */}
        <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Production Release History ({deployments.length} Deployments)
            </span>
          </div>

          <div className="space-y-3">
            {deployments.map((dep) => {
              const isSelected = selectedDep?.id === dep.id;
              const isSuspected =
                suspectedCommit?.commit_id === dep.commit_id ||
                (status?.active_scenario === "BAD_DEPLOYMENT" && dep.commit_id === "a8f3b9c");

              return (
                <div
                  key={dep.id}
                  onClick={() => setSelectedDep(dep)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 border-sky-500 ring-2 ring-sky-500/20"
                      : "bg-slate-950/70 hover:bg-slate-900/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-sky-400">
                          {dep.service}
                        </span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {dep.version}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          ({dep.commit_id})
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 font-sans">{dep.description}</p>
                    </div>

                    {isSuspected && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold shrink-0">
                        SUSPECTED REGRESSION
                      </span>
                    )}
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-900 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {dep.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {dep.deployed_at}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Commit Details & Code Diff */}
        <div className="lg:col-span-6 bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              Commit Details & Simulated Code Diff
            </span>
          </div>

          {selectedDep ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-sky-400 font-bold">{selectedDep.service} &bull; {selectedDep.version}</span>
                  <span className="text-slate-400">Commit: {selectedDep.commit_id}</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-100">{selectedDep.description}</h4>
                <div className="text-xs text-slate-400 font-mono flex items-center gap-3">
                  <span>Author: {selectedDep.author}</span>
                  <span>&bull;</span>
                  <span>Deployed: {selectedDep.deployed_at}</span>
                </div>
              </div>

              {/* Simulated Git Diff */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
                <div className="text-[10px] text-slate-400 uppercase">File: services/payment/src/db/queries.ts</div>
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-[11px] overflow-x-auto space-y-1">
                  <div className="text-slate-400">@@ -42,6 +42,12 @@ export async function getLedger(...)</div>
                  <div className="text-rose-400 bg-rose-950/30 px-1 py-0.5 rounded">
                    - const entry = await db.query(&apos;SELECT * FROM ledger WHERE id = $1&apos;, [id]);
                  </div>
                  <div className="text-emerald-400 bg-emerald-950/30 px-1 py-0.5 rounded">
                    + // Regression: Loop executes N+1 unindexed queries without connection limit
                  </div>
                  <div className="text-emerald-400 bg-emerald-950/30 px-1 py-0.5 rounded">
                    + for (const item of items) &#123;
                  </div>
                  <div className="text-emerald-400 bg-emerald-950/30 px-1 py-0.5 rounded">
                    +   await db.query(&apos;SELECT * FROM ledger_entries WHERE account_id = $1&apos;, [item.id]);
                  </div>
                  <div className="text-emerald-400 bg-emerald-950/30 px-1 py-0.5 rounded">
                    + &#125;
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-200">Remediation Recommendation</div>
                <p className="text-xs text-slate-400">
                  If this commit introduced the regression, use the Recovery Sandbox to simulate an instant rollback to previous stable release v2.4.0 (commit e4d120a).
                </p>
                <button
                  onClick={() => onNavigate("sandbox")}
                  className="mt-2 w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition"
                >
                  Simulate Rollback in Recovery Sandbox
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Select a deployment on the left to inspect its commit details and diff.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
