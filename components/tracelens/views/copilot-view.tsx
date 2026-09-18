"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  SystemStatus,
  Diagnosis,
  CopilotResponse,
  CopilotActionLink
} from "../types";
import { TraceLensAPI } from "../api";
import {
  Bot,
  User,
  Send,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
  Clock,
  Layers,
  Database,
  Sliders,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Key,
  Settings,
  X,
  Check,
  Cpu,
  Flame,
  Zap
} from "lucide-react";

interface CopilotViewProps {
  status: SystemStatus | null;
  diagnosis: Diagnosis | null;
  onNavigate: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "copilot";
  text: string;
  citations?: string[];
  actionLinks?: CopilotActionLink[];
  confidence?: string;
  modelSource?: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Why is checkout failing?",
  "What changed before the incident?",
  "Explain Circuit Breakers in microservices",
  "What is HikariCP connection pool saturation?",
  "What causes OOMKilled (Exit 137)?",
  "SLO vs SLA vs SLI explained",
  "Show strongest evidence",
  "What are our recovery options?"
];

export function CopilotView({ status, diagnosis, onNavigate }: CopilotViewProps) {
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [tempKeyInput, setTempKeyInput] = useState<string>("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "copilot",
      text: "Hello! I am TraceLens Copilot, powered by Google Gemini. I can help investigate the active incident, explain failure cascades, recommend recovery actions, or resolve any technical doubt about microservices, database tuning, and distributed systems reliability. What would you like to explore?",
      citations: ["Engine: Google Gemini SRE", "Telemetry Stream: Active", "Deterministic Guardrails: Enforced"],
      modelSource: "TraceLens Gemini SRE Engine",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tracelens_gemini_api_key");
    if (saved) {
      setGeminiKey(saved);
      setTempKeyInput(saved);
    }
  }, []);

  const saveGeminiKey = (key: string) => {
    const cleaned = key.trim();
    setGeminiKey(cleaned);
    if (cleaned) {
      localStorage.setItem("tracelens_gemini_api_key", cleaned);
    } else {
      localStorage.removeItem("tracelens_gemini_api_key");
    }
    setShowKeyModal(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res: CopilotResponse = await TraceLensAPI.queryCopilot(q, geminiKey || undefined);
      const copilotMsg: ChatMessage = {
        id: `copilot-${Date.now()}`,
        sender: "copilot",
        text: res.answer,
        citations: res.evidence_citations,
        actionLinks: res.action_links,
        confidence: res.confidence,
        modelSource: res.model_source || (geminiKey ? "Google Gemini 1.5 Flash (Live API)" : "TraceLens Gemini SRE Engine"),
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, copilotMsg]);
    } catch (e) {
      console.error("Failed to query copilot", e);
      const errMsg: ChatMessage = {
        id: `copilot-${Date.now()}`,
        sender: "copilot",
        text: "Error communicating with the telemetry analysis engine. Please verify the backend server is reachable.",
        modelSource: "Error Handler",
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const isIncident = Boolean(status?.active_scenario);

  // Markdown-like text formatter
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split("\n");
    return lines.map((line, idx) => {
      // Header 3
      if (line.startsWith("### ")) {
        return <h3 key={idx} className="text-sm font-bold text-slate-100 mt-2 mb-1 font-mono">{line.slice(4)}</h3>;
      }
      // Header 2
      if (line.startsWith("## ")) {
        return <h2 key={idx} className="text-base font-bold text-slate-100 mt-3 mb-1 font-mono">{line.slice(3)}</h2>;
      }
      // Bullet items
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const bulletText = line.slice(2);
        return (
          <div key={idx} className="flex items-start gap-2 ml-2 my-0.5 text-slate-200">
            <span className="text-tl-cyan font-bold">•</span>
            <span>{renderInlineStyles(bulletText)}</span>
          </div>
        );
      }
      // Numbered items
      if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^\d+\./)?.[0];
        const rest = line.replace(/^\d+\.\s/, "");
        return (
          <div key={idx} className="flex items-start gap-2 ml-2 my-0.5 text-slate-200">
            <span className="text-tl-violet font-bold font-mono">{num}</span>
            <span>{renderInlineStyles(rest)}</span>
          </div>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return <p key={idx} className="my-0.5 leading-relaxed text-slate-200">{renderInlineStyles(line)}</p>;
    });
  };

  // Helper for inline bold, code snippets
  const renderInlineStyles = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-tl-elevated border border-tl-border text-[11px] font-mono text-tl-cyan">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-tl-border pb-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-mono">
              <Sparkles className="w-5 h-5 text-tl-violet animate-pulse" />
              TraceLens Copilot
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gradient-to-r from-tl-violet/30 to-tl-cyan/30 border border-tl-violet/50 text-white font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 text-tl-cyan" />
              POWERED BY GOOGLE GEMINI
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time SRE intelligence for active incident diagnosis, cascade analysis, or any distributed systems engineering doubt.
          </p>
        </div>

        {/* Live Context & Gemini Key Configuration Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowKeyModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition ${
              geminiKey
                ? "bg-tl-green/15 border-tl-green/50 text-tl-green hover:bg-tl-green/25"
                : "bg-tl-card border-tl-border text-slate-300 hover:text-white hover:border-tl-cyan/50"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{geminiKey ? "Gemini Key: Active" : "Set Gemini Key"}</span>
          </button>

          <div className="p-2 rounded-lg bg-tl-card border border-tl-border flex items-center gap-2.5 font-mono text-xs">
            <span className={`w-2 h-2 rounded-full ${isIncident ? "bg-tl-coral animate-ping" : "bg-tl-green"}`} />
            <div className="text-[11px]">
              <span className="text-slate-500 block">ACTIVE INCIDENT:</span>
              <span className="text-slate-200 font-bold">{status?.active_incident_id || "NOMINAL_BASELINE"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Box */}
      <div className="flex-1 bg-tl-card border border-tl-border rounded-xl flex flex-col overflow-hidden backdrop-blur shadow-sm">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 max-w-3xl ${m.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold border shadow-sm ${
                  m.sender === "user"
                    ? "bg-tl-cyan/20 border-tl-cyan text-tl-cyan"
                    : "bg-gradient-to-br from-tl-violet/30 to-tl-cyan/30 border-tl-violet text-tl-violet"
                }`}
              >
                {m.sender === "user" ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-tl-violet" />}
              </div>

              {/* Bubble */}
              <div
                className={`rounded-xl p-4 space-y-2.5 border text-xs leading-relaxed shadow-sm ${
                  m.sender === "user"
                    ? "bg-tl-cyan/10 border-tl-cyan/40 text-slate-100"
                    : "bg-tl-bg/90 border-tl-border text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[10px] font-mono text-slate-400 border-b border-tl-border/50 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-slate-300">
                      {m.sender === "user" ? "You (On-Call SRE)" : "TraceLens Copilot"}
                    </span>
                    {m.modelSource && (
                      <span className="px-1.5 py-0.2 rounded bg-tl-elevated text-tl-cyan border border-tl-border text-[9px] font-mono">
                        {m.modelSource}
                      </span>
                    )}
                  </div>
                  <span>{m.timestamp}</span>
                </div>

                <div className="font-sans text-xs sm:text-[13px] space-y-1">
                  {renderFormattedText(m.text)}
                </div>

                {/* Evidence Citations */}
                {m.citations && m.citations.length > 0 && (
                  <div className="pt-2.5 mt-2.5 border-t border-tl-border/70 space-y-1.5 font-mono text-[11px]">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-tl-cyan" />
                      Deterministic Citations & Grounding:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.citations.map((cite, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-tl-elevated border border-tl-border text-slate-300 text-[10px]"
                        >
                          &bull; {cite}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Links */}
                {m.actionLinks && m.actionLinks.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-tl-border/70 flex flex-wrap gap-2">
                    {m.actionLinks.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => onNavigate(action.tab)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-tl-violet/20 hover:bg-tl-violet/30 border border-tl-violet/50 text-tl-violet font-mono text-[11px] font-bold transition"
                      >
                        <span>{action.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 max-w-xl">
              <div className="w-8 h-8 rounded-lg bg-tl-violet/20 border border-tl-violet text-tl-violet flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 animate-spin text-tl-violet" />
              </div>
              <div className="rounded-xl p-4 bg-tl-bg/90 border border-tl-border text-xs text-slate-400 flex items-center gap-2 font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-tl-cyan" />
                <span>Consulting Gemini reasoning model & cluster telemetry...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="p-3 border-t border-tl-border bg-tl-elevated/40 flex items-center gap-2 overflow-x-auto flex-shrink-0">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-tl-violet" />
            Quick Doubts & Queries:
          </span>
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="px-2.5 py-1 rounded-full bg-tl-bg border border-tl-border hover:border-tl-cyan/50 text-[11px] font-mono text-slate-300 hover:text-white whitespace-nowrap transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-tl-border bg-tl-card flex items-center gap-2 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="Ask Gemini any doubt about this incident, root cause, microservices, or how to fix it..."
            className="flex-1 bg-tl-bg border border-tl-border rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-tl-cyan transition"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || loading}
            className="px-4 py-2 rounded-lg bg-tl-violet hover:bg-violet-600 disabled:opacity-50 text-white font-bold text-xs font-mono transition flex items-center gap-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </div>

      {/* Google Gemini API Key Configuration Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-tl-card border border-tl-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-tl-border pb-3">
              <div className="flex items-center gap-2 font-mono font-bold text-slate-100 text-sm">
                <Sparkles className="w-4 h-4 text-tl-violet" />
                <span>Google Gemini API Configuration</span>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Enter your <strong>Google Gemini API Key</strong> from Google AI Studio to unlock direct live streaming intelligence.
              If omitted, TraceLens automatically operates using the built-in intelligent Gemini SRE reasoning engine.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase block">Gemini API Key (Google AI Studio)</label>
              <input
                type="password"
                value={tempKeyInput}
                onChange={(e) => setTempKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-tl-bg border border-tl-border rounded-lg p-2.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-tl-cyan"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setTempKeyInput("");
                  saveGeminiKey("");
                }}
                className="text-xs font-mono text-slate-400 hover:text-tl-coral transition"
              >
                Clear Key
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-tl-bg border border-tl-border text-xs font-mono text-slate-300 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveGeminiKey(tempKeyInput)}
                  className="px-4 py-1.5 rounded-lg bg-tl-cyan hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Key</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
