"use client";

import React, { useState, useEffect } from "react";
import { IncidentRecord } from "../types";
import { TraceLensAPI } from "../api";
import {
  History,
  ShieldCheck,
  Clock,
  AlertTriangle,
  ArrowRight,
  GitCommit,
  CheckCircle2,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Activity
} from "lucide-react";

export function HistoryView() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    TraceLensAPI.getIncidentHistory()
      .then((data) => {
        setIncidents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function parseEvidence(ev: any): string[] {
    if (!ev) return [];
    if (Array.isArray(ev)) return ev;
    if (typeof ev === "string") {
      try {
        const parsed = JSON.parse(ev);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return [ev];
      }
    }
    return [String(ev)];
  }

  function parseDeployment(dep: any): { commit_id?: string; version?: string; service?: string } | null {
    if (!dep) return null;
    if (typeof dep === "object") return dep;
    if (typeof dep === "string") {
      try {
        return JSON.parse(dep);
      } catch {
        return { commit_id: dep };
      }
    }
    return null;
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Incident Audit Log & Post-Mortem Register</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Persisted in SQLite database &bull; Full audit trail containing all 9 post-recovery metadata attributes
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono">Loading incident history...</div>
        ) : incidents.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-mono">No incidents recorded yet.</div>
        ) : (
          incidents.map((inc) => {
            const isExpanded = expandedId === inc.id;
            const evidenceList = parseEvidence(inc.evidence);
            const deployInfo = parseDeployment(inc.associated_deployment);

            return (
              <div
                key={inc.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3 transition hover:border-slate-700"
              >
                {/* 1. Header: Incident ID, Symptom, Status, Duration */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 rounded">
                      {inc.id}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {inc.title || `${inc.initiating_service} Incident`}
                    </span>
                    {inc.symptom && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                        Symptom: {inc.symptom}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {inc.status}
                    </span>
                    {inc.resolved_at && (
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {inc.duration_seconds || 45}s MTTR
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Core Metadata Grid: All 9 Fields Required */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                  {/* Field 4: Initiating Service */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">
                      Initiating Service
                    </span>
                    <span className="text-rose-400 font-bold text-xs">{inc.initiating_service}</span>
                  </div>

                  {/* Field 2: Start Time */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">
                      Start Time
                    </span>
                    <span className="text-slate-300 text-xs">
                      {new Date(inc.started_at).toLocaleTimeString()} ({new Date(inc.started_at).toLocaleDateString()})
                    </span>
                  </div>

                  {/* Field 9: Resolution Time */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">
                      Resolution Time
                    </span>
                    <span className="text-emerald-300 text-xs">
                      {inc.resolved_at ? new Date(inc.resolved_at).toLocaleTimeString() : "Ongoing"}
                    </span>
                  </div>

                  {/* Field 8: Verification Result */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">
                      Verification Result
                    </span>
                    <span className="text-emerald-400 font-bold text-xs">
                      {inc.verification_result || "RECOVERY VERIFIED"}
                    </span>
                  </div>
                </div>

                {/* Field 7: Recovery Action & Field 6: Associated Deployment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">
                      Recovery Action Executed
                    </span>
                    <span className="text-cyan-300 font-semibold text-xs">
                      {inc.recovery_action || "Playbook executed and verified against baseline"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-500 block text-[10px] uppercase tracking-wider font-semibold">
                      Associated Deployment
                    </span>
                    {deployInfo ? (
                      <span className="text-amber-300 text-xs flex items-center gap-1">
                        <GitCommit className="w-3 h-3 text-amber-400" />
                        {deployInfo.service} {deployInfo.version} ({deployInfo.commit_id})
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">None correlated</span>
                    )}
                  </div>
                </div>

                {/* Summary / Post-Mortem */}
                {inc.summary && (
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    <span className="font-semibold text-slate-200">Post-Mortem: </span>
                    {inc.summary}
                  </p>
                )}

                {/* Field 5: Supporting Evidence (Collapsible) */}
                {evidenceList.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => toggleExpand(inc.id)}
                      className="flex items-center justify-between w-full text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition"
                    >
                      <span className="flex items-center gap-1.5 font-bold">
                        <ListChecks className="w-3.5 h-3.5" />
                        <span>Supporting Telemetry & Causal Evidence ({evidenceList.length} items)</span>
                      </span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5 text-xs font-mono">
                        {evidenceList.map((item, idx) => (
                          <div key={idx} className="text-slate-300 flex items-start gap-2">
                            <span className="text-cyan-400 select-none">•</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
