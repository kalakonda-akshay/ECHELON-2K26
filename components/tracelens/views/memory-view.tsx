"use client";

import React, { useState, useEffect } from "react";
import { SimilarIncident, FeedbackStats, SystemStatus, IncidentRecord } from "../types";
import { TraceLensAPI } from "../api";
import {
  History,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Sparkles,
  Search,
  ExternalLink,
  ShieldCheck,
  Send,
  Clock,
  Server
} from "lucide-react";

interface MemoryViewProps {
  status: SystemStatus | null;
  onNavigate: (tab: string) => void;
}

export function MemoryView({ status, onNavigate }: MemoryViewProps) {
  const [similarIncidents, setSimilarIncidents] = useState<SimilarIncident[]>([]);
  const [historyList, setHistoryList] = useState<IncidentRecord[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Feedback form state
  const [diagAccurate, setDiagAccurate] = useState<string>("YES");
  const [recEffective, setRecEffective] = useState<string>("YES");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState(false);

  useEffect(() => {
    async function loadMemory() {
      try {
        const [sim, hist, st] = await Promise.all([
          TraceLensAPI.getSimilarIncidents().catch(() => []),
          TraceLensAPI.getIncidentHistory().catch(() => []),
          TraceLensAPI.getFeedbackStats().catch(() => null)
        ]);
        setSimilarIncidents(sim);
        setHistoryList(hist);
        if (st) setStats(st);
      } catch (err) {
        console.error("Failed to load incident memory data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMemory();
  }, [status?.active_scenario]);

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const activeId = status?.active_incident_id || (historyList[0]?.id) || "INC-CURRENT";
      await TraceLensAPI.submitFeedback({
        incident_id: activeId,
        diagnosis_accurate: diagAccurate,
        recovery_effective: recEffective,
        engineer_notes: notes,
        engineer_email: "oncall-sre@acme.corp"
      });
      setSubmittedFeedback(true);
      const updatedStats = await TraceLensAPI.getFeedbackStats();
      setStats(updatedStats);
    } catch (err) {
      console.error("Failed to submit engineer feedback:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Incident Memory & Engineer Feedback Loop
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-medium">
                Continuous Learning System
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Retrieves semantically similar historical failures, displays resolution benchmarks, and incorporates engineer validation to refine root-cause accuracy.
            </p>
          </div>
        </div>

        {/* Stats Pill */}
        {stats && (
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
              Accuracy: {stats.diagnosis_accuracy_pct}%
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800">
              {stats.total_evaluations} Evaluated
            </div>
          </div>
        )}
      </div>

      {/* Stats KPI Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 backdrop-blur">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Diagnosis Accuracy</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {stats.diagnosis_accuracy_pct}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Validated by SRE Team
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 backdrop-blur">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Recovery Success Rate</div>
            <div className="text-2xl font-bold text-sky-400 mt-1">
              {stats.recovery_success_rate_pct}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              5-Gate Automated Probes
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 backdrop-blur">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Mean Time to Detect (MTTD)</div>
            <div className="text-2xl font-bold text-slate-100 mt-1 font-mono">
              {stats.mean_time_to_detect_s}s
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 font-mono">
              Sub-second cascade isolation
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 backdrop-blur">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Mean Time to Recover (MTTR)</div>
            <div className="text-2xl font-bold text-slate-100 mt-1 font-mono">
              {stats.mean_time_to_recover_s}s
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Post-Approval Automated Playbooks
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid: Left Similar Incidents | Right Feedback Validation Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (7 cols): Similar Incidents Match List */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              Similar Historical Incidents ({similarIncidents.length} Matches)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Correlated from SQLite Memory
            </span>
          </div>

          {similarIncidents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching past incidents found in memory archive.
            </div>
          ) : (
            <div className="space-y-3">
              {similarIncidents.map((inc) => (
                <div
                  key={inc.incident_id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-sky-400">
                          {inc.incident_id}
                        </span>
                        <span className="text-xs font-bold text-slate-200">{inc.title}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>Root: {inc.initiating_service}</span>
                        <span>&bull;</span>
                        <span>Symptom: {inc.symptom || "502 Bad Gateway"}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block font-mono text-xs font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                        {inc.similarity_score_pct}% MATCH
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {inc.summary}
                  </p>

                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs font-mono text-slate-400 flex-wrap gap-2">
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {inc.recovery_action || "Verified Playbook Applied"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Duration: {inc.duration_seconds}s
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col (5 cols): Engineer Validation Feedback Form */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-5 backdrop-blur space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              SRE Validation & Feedback
            </span>
          </div>

          {submittedFeedback ? (
            <div className="py-12 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-100">Feedback Successfully Recorded!</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Your feedback has been committed to SQLite and will be used to calibrate Bayesian hypothesis priors for future incidents.
              </p>
              <button
                onClick={() => setSubmittedFeedback(false)}
                className="mt-2 text-xs text-sky-400 hover:underline"
              >
                Submit another evaluation
              </button>
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              {/* Question 1: Diagnosis Accuracy */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  1. Was the root-cause diagnosis accurate?
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  {["YES", "PARTIAL", "NO"].map((choice) => (
                    <button
                      type="button"
                      key={choice}
                      onClick={() => setDiagAccurate(choice)}
                      className={`py-2 px-3 rounded-lg border font-semibold transition ${
                        diagAccurate === choice
                          ? choice === "YES"
                            ? "bg-emerald-950 text-emerald-300 border-emerald-600"
                            : choice === "PARTIAL"
                            ? "bg-amber-950 text-amber-300 border-amber-600"
                            : "bg-rose-950 text-rose-300 border-rose-600"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900"
                      }`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2: Recovery Effectiveness */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  2. Did the recovery action restore the system safely?
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {["YES", "NO"].map((choice) => (
                    <button
                      type="button"
                      key={choice}
                      onClick={() => setRecEffective(choice)}
                      className={`py-2 px-3 rounded-lg border font-semibold transition ${
                        recEffective === choice
                          ? choice === "YES"
                            ? "bg-emerald-950 text-emerald-300 border-emerald-600"
                            : "bg-rose-950 text-rose-300 border-rose-600"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900"
                      }`}
                    >
                      {choice === "YES" ? "SUCCESSFUL (YES)" : "UNSUCCESSFUL (NO)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  3. Engineer Post-Incident Notes & Observations:
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Connection pool saturation correctly flagged. Recovery terminated idle connections with zero dropped transactions."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-md shadow-sky-950/40 disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Persisting Feedback..." : "Record Validation Feedback"}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
