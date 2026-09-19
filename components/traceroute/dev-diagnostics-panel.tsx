"use client";

import React, { useState } from "react";
import { TraceRootAPI } from "./api";
import { SystemStatus } from "./types";
import {
  Activity,
  Zap,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Send,
  X,
  RefreshCw,
  Sliders,
  Sparkles
} from "lucide-react";

interface DevDiagnosticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  status: SystemStatus | null;
  isStreamConnected: boolean;
  onRefreshData?: () => void;
}

export function DevDiagnosticsPanel({
  isOpen,
  onClose,
  status,
  isStreamConnected,
  onRefreshData
}: DevDiagnosticsPanelProps) {
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentMode = status?.data_mode || "DEMO";
  const lastAge = status?.last_event_age_seconds != null ? `${status.last_event_age_seconds}s ago` : "No external events yet";

  const handleToggleMode = async () => {
    const nextMode = currentMode === "DEMO" ? "LIVE" : "DEMO";
    try {
      setIsSending(true);
      await TraceRootAPI.setTelemetryMode(nextMode);
      setFeedback(`Switched mode to ${nextMode}`);
      onRefreshData?.();
    } catch (e: any) {
      setFeedback(`Error: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSpike = async () => {
    try {
      setIsSending(true);
      await TraceRootAPI.ingestTelemetry({
        service: "payment-service",
        latency: 480.0,
        error_rate: 22.5,
        status: "CRITICAL",
        message: "Simulated live upstream timeout on /api/v1/charge - gateway latency spike."
      });
      setFeedback("Injected live metric spike -> payment-service (480ms, 22.5% err)");
      onRefreshData?.();
    } catch (e: any) {
      setFeedback(`Ingest failed: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendRecovery = async () => {
    try {
      setIsSending(true);
      await TraceRootAPI.ingestTelemetry({
        service: "payment-service",
        latency: 22.0,
        error_rate: 0.0,
        status: "HEALTHY",
        message: "Live recovery pulse received. payment-service returned to nominal SLA."
      });
      setFeedback("Sent live nominal pulse -> payment-service (22ms, 0% err)");
      onRefreshData?.();
    } catch (e: any) {
      setFeedback(`Reset failed: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                Real-Time Telemetry Diagnostics
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Inspect live SSE stream, data pipeline modes, and trigger live events.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Stream Status */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
              SSE Event Stream
            </span>
            <div className="flex items-center gap-2 pt-0.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isStreamConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className="text-xs font-mono font-bold text-white">
                {isStreamConnected ? "CONNECTED" : "DISCONNECTED"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">
              Endpoint: /api/telemetry/stream
            </span>
          </div>

          {/* Data Mode */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
              Active Pipeline Mode
            </span>
            <div className="flex items-center gap-2 pt-0.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  currentMode === "LIVE" ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span className="text-xs font-mono font-bold text-white">
                {currentMode === "LIVE" ? "LIVE TELEMETRY" : "DEMO DATA"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">
              Last event: {lastAge}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-3">
          <div className="text-[11px] font-mono text-slate-300 font-semibold uppercase tracking-wider">
            Live Stream Verification Controls
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Toggle Mode Button */}
            <button
              onClick={handleToggleMode}
              disabled={isSending}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-mono text-slate-200 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Toggle to {currentMode === "DEMO" ? "LIVE Mode" : "DEMO Mode"}</span>
            </button>

            {/* Send Test Metric Spike */}
            <button
              onClick={handleSendSpike}
              disabled={isSending}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-xs font-mono text-rose-300 transition"
            >
              <Send className="w-3.5 h-3.5 text-rose-400" />
              <span>Inject Live Metric Spike</span>
            </button>

            {/* Send Nominal Baseline Pulse */}
            <button
              onClick={handleSendRecovery}
              disabled={isSending}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/60 text-xs font-mono text-emerald-300 transition col-span-1 sm:col-span-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Send Live Nominal Pulse (Clear Overrides)</span>
            </button>
          </div>
        </div>

        {/* Feedback Display */}
        {feedback && (
          <div className="p-2.5 rounded-lg bg-sky-950/60 border border-sky-800/60 text-xs font-mono text-sky-300 flex items-center justify-between">
            <span>{feedback}</span>
            <button onClick={() => setFeedback(null)} className="text-sky-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Cluster Health: <strong className="text-white">{status?.system_health}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
