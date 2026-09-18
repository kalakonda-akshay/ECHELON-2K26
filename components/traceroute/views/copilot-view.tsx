"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  SystemStatus,
  Diagnosis,
  CopilotActionLink
} from "../types";
import { TraceRouteAPI } from "../api";
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
  Zap,
  Square,
  RotateCcw,
  Plus,
  Copy,
  Radio,
  Activity
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
  isStreaming?: boolean;
}

const QUICK_PROMPTS = [
  "Why is checkout failing right now?",
  "What changed before the incident?",
  "Explain Project Repair Lab Level 1 vs 2 vs 3",
  "How does TraceRoute isolate patches safely?",
  "Explain Circuit Breakers in microservices",
  "What is HikariCP connection pool saturation?",
  "What causes OOMKilled (Exit 137)?",
  "SLO vs SLA vs SLI explained",
  "Show strongest evidence citations",
  "What are our recovery playbook options?"
];

export function CopilotView({ status, diagnosis, onNavigate }: CopilotViewProps) {
  const [geminiKey, setGeminiKey] = useState<string>("");
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [tempKeyInput, setTempKeyInput] = useState<string>("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "copilot",
      text: "Hello! I am TraceRoute Copilot, powered by Google Gemini. I can help investigate the active incident, explain failure cascades, recommend recovery actions, or resolve any technical doubt about microservices, database tuning, and distributed systems reliability. What would you like to explore?",
      citations: ["Engine: Google Gemini SRE", "Telemetry Stream: Active", "Deterministic Guardrails: Enforced"],
      modelSource: "TraceRoute Gemini SRE Engine",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("traceroute_gemini_api_key");
    if (saved) {
      setGeminiKey(saved);
      setTempKeyInput(saved);
    }
  }, []);

  const saveGeminiKey = (key: string) => {
    const cleaned = key.trim();
    setGeminiKey(cleaned);
    if (cleaned) {
      localStorage.setItem("traceroute_gemini_api_key", cleaned);
    } else {
      localStorage.removeItem("traceroute_gemini_api_key");
    }
    setShowKeyModal(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  };

  const handleNewConversation = () => {
    handleStopGenerating();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "copilot",
        text: "Started a fresh conversation session. How can I assist with your distributed systems architecture or current cluster telemetry?",
        citations: ["Session: Fresh Multi-turn", "Grounding: Active Cluster"],
        modelSource: geminiKey ? "Google Gemini 1.5 Flash (Live API)" : "TraceRoute Gemini SRE Engine",
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  const handleRegenerate = () => {
    if (loading) return;
    // Find last user question
    let lastUserText = "";
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === "user") {
        lastUserText = messages[i].text;
        break;
      }
    }
    if (!lastUserText) return;

    // Remove the latest assistant message
    setMessages((prev) => {
      const copy = [...prev];
      if (copy.length > 0 && copy[copy.length - 1].sender === "copilot") {
        copy.pop();
      }
      return copy;
    });

    handleSend(lastUserText, true);
  };

  const handleSend = async (queryText: string, isRegenerate = false) => {
    const q = queryText.trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString()
    };

    const copilotMsgId = `copilot-${Date.now()}`;
    const initialCopilotMsg: ChatMessage = {
      id: copilotMsgId,
      sender: "copilot",
      text: "",
      citations: [],
      actionLinks: [],
      timestamp: new Date().toLocaleTimeString(),
      modelSource: geminiKey ? "Google Gemini 1.5 Flash (Live API)" : "TraceRoute Gemini SRE Engine",
      isStreaming: true
    };

    if (isRegenerate) {
      setMessages((prev) => [...prev, initialCopilotMsg]);
    } else {
      setMessages((prev) => [...prev, userMsg, initialCopilotMsg]);
      setInput("");
    }

    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Build multi-turn history
    const historyPayload = messages
      .filter((m) => m.text.trim().length > 0)
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));
    if (!isRegenerate) {
      historyPayload.push({ role: "user", content: q });
    }

    try {
      await TraceRouteAPI.streamCopilotChat(historyPayload, {
        apiKey: geminiKey || undefined,
        signal: controller.signal,
        onChunk: (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === copilotMsgId ? { ...m, text: m.text + delta } : m
            )
          );
        },
        onCitations: (citations) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === copilotMsgId ? { ...m, citations } : m
            )
          );
        },
        onActions: (actionLinks) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === copilotMsgId ? { ...m, actionLinks } : m
            )
          );
        },
        onDone: (info) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === copilotMsgId
                ? {
                    ...m,
                    confidence: info.confidence || "HIGH",
                    modelSource: info.modelSource || m.modelSource,
                    isStreaming: false
                  }
                : m
            )
          );
        },
        onError: (err) => {
          console.error("Stream error:", err);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === copilotMsgId
                ? {
                    ...m,
                    text:
                      m.text ||
                      "Error communicating with the telemetry analysis engine. Please verify the backend server is reachable.",
                    isStreaming: false
                  }
                : m
            )
          );
        }
      });
    } catch (e) {
      console.error("Failed to query copilot", e);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
      setMessages((prev) =>
        prev.map((m) => (m.id === copilotMsgId ? { ...m, isStreaming: false } : m))
      );
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isIncident = Boolean(status?.active_scenario);
  const initiatorName =
    diagnosis?.initiating_service_name ||
    diagnosis?.initiating_service ||
    "Nominal Baseline";
  const confidenceScore = diagnosis?.confidence_score || 0;

  // Markdown-like text formatter with code block support
  const renderFormattedText = (rawText: string, messageId: string) => {
    if (!rawText) return null;

    // Check for code blocks
    if (rawText.includes("```")) {
      const parts = rawText.split("```");
      return parts.map((part, pIdx) => {
        if (pIdx % 2 === 1) {
          // Code block
          const lines = part.split("\n");
          const lang = lines[0].trim();
          const code = (lang ? lines.slice(1) : lines).join("\n");
          return (
            <div key={pIdx} className="my-2 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden font-mono text-[11px]">
              <div className="flex items-center justify-between px-3 py-1 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400">
                <span>{lang || "code"}</span>
                <button
                  onClick={() => copyToClipboard(code, `${messageId}-${pIdx}`)}
                  className="flex items-center gap-1 hover:text-white transition"
                >
                  {copiedId === `${messageId}-${pIdx}` ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedId === `${messageId}-${pIdx}` ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="p-3 text-slate-200 overflow-x-auto leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        // Normal text portion
        return <div key={pIdx}>{renderTextLines(part)}</div>;
      });
    }

    return renderTextLines(rawText);
  };

  const renderTextLines = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Header 4
      if (line.startsWith("#### ")) {
        return <h4 key={idx} className="text-xs font-bold text-slate-200 mt-2 mb-0.5 font-mono uppercase tracking-wider">{line.slice(5)}</h4>;
      }
      // Header 3
      if (line.startsWith("### ")) {
        return <h3 key={idx} className="text-sm font-bold text-slate-100 mt-2.5 mb-1 font-mono">{line.slice(4)}</h3>;
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-tl-border pb-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 font-mono">
              <Sparkles className="w-5 h-5 text-tl-violet animate-pulse" />
              TraceRoute Copilot
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gradient-to-r from-tl-violet/30 to-tl-cyan/30 border border-tl-violet/50 text-white font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 text-tl-cyan" />
              CONVERSATIONAL SRE AI
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time conversational intelligence with multi-turn history, token streaming, and deterministic incident grounding.
          </p>
        </div>

        {/* Live Context Indicators & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Mode Pill */}
          <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5 font-mono text-xs">
            <span className={`w-2 h-2 rounded-full ${status?.data_mode === "LIVE" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            <span className="text-[11px] text-slate-300">
              MODE: <strong className="text-white">{status?.data_mode || "DEMO"}</strong>
            </span>
          </div>

          {/* Active Incident Pill */}
          <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5 font-mono text-xs">
            <span className={`w-2 h-2 rounded-full ${isIncident ? "bg-rose-500 animate-ping" : "bg-emerald-400"}`} />
            <span className="text-[11px] text-slate-300">
              INCIDENT: <strong className="text-white">{status?.active_incident_id || "NOMINAL"}</strong>
            </span>
          </div>

          {/* Root Cause Candidate Pill */}
          {isIncident && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-800/60 font-mono text-xs text-rose-300">
              <span>ROOT CAUSE:</span>
              <strong className="text-white">{initiatorName}</strong>
              <span className="text-[10px] px-1 rounded bg-rose-900/60 text-white font-bold">
                {confidenceScore}%
              </span>
            </div>
          )}

          {/* New Conversation Button */}
          <button
            onClick={handleNewConversation}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white transition"
            title="Start New Conversation Session"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          {/* Gemini Key Config Button */}
          <button
            onClick={() => setShowKeyModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition ${
              geminiKey
                ? "bg-tl-green/15 border-tl-green/50 text-tl-green hover:bg-tl-green/25"
                : "bg-tl-card border-tl-border text-slate-300 hover:text-white hover:border-tl-cyan/50"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{geminiKey ? "Key: Active" : "Set Key"}</span>
          </button>
        </div>
      </div>

      {/* Main Chat Box */}
      <div className="flex-1 bg-tl-card border border-tl-border rounded-xl flex flex-col overflow-hidden backdrop-blur shadow-sm">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, idx) => (
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
                className={`rounded-xl p-4 space-y-2.5 border text-xs leading-relaxed shadow-sm min-w-[240px] max-w-2xl ${
                  m.sender === "user"
                    ? "bg-tl-cyan/10 border-tl-cyan/40 text-slate-100"
                    : "bg-tl-bg/90 border-tl-border text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[10px] font-mono text-slate-400 border-b border-tl-border/50 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-slate-300">
                      {m.sender === "user" ? "You (On-Call SRE)" : "TraceRoute Copilot"}
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
                  {m.text ? (
                    renderFormattedText(m.text, m.id)
                  ) : m.isStreaming ? (
                    <div className="flex items-center gap-2 text-slate-400 font-mono text-xs py-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-tl-cyan" />
                      <span>Generating grounded reasoning...</span>
                    </div>
                  ) : null}

                  {m.isStreaming && m.text && (
                    <span className="inline-block w-2 h-3.5 bg-tl-cyan animate-pulse ml-0.5 align-middle" />
                  )}
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

                {/* Assistant Regenerate Button on Latest Response */}
                {m.sender === "copilot" && !loading && idx === messages.length - 1 && (
                  <div className="pt-2 mt-1 border-t border-tl-border/40 flex items-center justify-end">
                    <button
                      onClick={handleRegenerate}
                      className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white transition"
                      title="Regenerate this response with latest context"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Regenerate</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="p-3 border-t border-tl-border bg-tl-elevated/40 flex items-center gap-2 overflow-x-auto flex-shrink-0">
          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-tl-violet" />
            Quick Prompts:
          </span>
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="px-2.5 py-1 rounded-full bg-tl-bg border border-tl-border hover:border-tl-cyan/50 text-[11px] font-mono text-slate-300 hover:text-white whitespace-nowrap transition disabled:opacity-50"
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
            placeholder={
              loading
                ? "Generating response..."
                : "Ask anything about this incident, root cause, code fix, or SRE concepts..."
            }
            disabled={loading}
            className="flex-1 bg-tl-bg border border-tl-border rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-tl-cyan transition disabled:opacity-60"
          />

          {/* Send or Stop Generating Button */}
          {loading ? (
            <button
              onClick={handleStopGenerating}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono transition flex items-center gap-1.5 shadow-sm"
              title="Stop Generating"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim()}
              className="px-4 py-2 rounded-lg bg-tl-violet hover:bg-violet-600 disabled:opacity-50 text-white font-bold text-xs font-mono transition flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          )}
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
              If omitted, TraceRoute operates using the built-in intelligent Gemini SRE reasoning engine with zero latency.
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
