import { NextRequest, NextResponse } from "next/server";
import {
  getNativeSystemState,
  getNativeTopology,
  getNativeTelemetry,
  injectNativeScenario,
  resetNativeScenario,
  getNativeDiagnosis,
  getNativeRecoveryOptions,
  getNativeRecoveryRecommendation,
  getNativeRecoveryVerify,
  simulateNativeRecovery,
  executeNativeRecovery,
  verifyNativeRecovery,
  getNativeBlastRadius,
  getNativeEarlyWarning,
  getNativeCausalGraph,
  getNativeAdaptiveInvestigation,
  getNativeSimilarIncidents,
  getNativeWhyNow,
  getNativeWhatChanged,
  getNativeServiceCriticality,
  getNativeFeedbackStats,
  getNativeProjects,
  getNativeProjectDetails,
  handleNativeProjectUpload,
  handleNativeMakeItWork,
  getNativeRepairedZip,
  generateNativeCopilotResponse
} from "@/lib/traceroute-native-engine";

// Upstream FastAPI backend URL (if running locally or hosted on Railway/Render)
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

async function tryProxyToBackend(
  req: NextRequest,
  subpath: string,
  rawBody?: string | FormData | null
): Promise<Response | null> {
  try {
    let targetSubpath = subpath;
    if (subpath === "copilot/ask") targetSubpath = "copilot/query";

    const targetUrl = `${BACKEND_URL}/api/${targetSubpath}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const headers = new Headers(req.headers);
    headers.delete("host");

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      signal: controller.signal,
      cache: "no-store"
    };

    if (req.method !== "GET" && req.method !== "HEAD" && rawBody) {
      fetchOptions.body = rawBody;
    }

    const response = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeout);

    // If backend returns server error, fall back to native engine
    if (!response.ok && response.status >= 500) {
      return null;
    }

    const resHeaders = new Headers(response.headers);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders
    });
  } catch (e) {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const subpath = params.path.join("/");

  // 1. Try forwarding to Python FastAPI backend if available
  const proxied = await tryProxyToBackend(req, subpath);
  if (proxied) return proxied;

  // 2. Native Engine Fallback (Works 100% online out of the box on Vercel)
  switch (subpath) {
    case "health":
      return NextResponse.json({
        service: "TraceRoute AI API",
        tagline: "Detect. Trace. Explain. Recover. Verify.",
        status: "ONLINE",
        mode: "Native Cloud Engine",
        endpoints: ["/api/system/state", "/api/topology", "/api/telemetry", "/api/incidents"]
      });

    case "status":
    case "system/state":
      return NextResponse.json(getNativeSystemState());

    case "topology":
      return NextResponse.json(getNativeTopology());

    case "telemetry":
      return NextResponse.json(getNativeTelemetry());

    case "telemetry/stream": {
      // Real-time SSE stream for 6 dashboard cards
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
          const interval = setInterval(() => {
            try {
              const state = getNativeSystemState();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "state", data: state })}\n\n`));
            } catch (e) {
              clearInterval(interval);
            }
          }, 2000);

          req.signal.addEventListener("abort", () => {
            clearInterval(interval);
          });
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive"
        }
      });
    }

    case "diagnosis":
      return NextResponse.json(getNativeDiagnosis());

    case "root-cause":
      return NextResponse.json(getNativeDiagnosis());

    case "investigation":
    case "investigation/adaptive":
      return NextResponse.json(getNativeAdaptiveInvestigation());

    case "investigation/why-now":
    case "why-now":
      return NextResponse.json(getNativeWhyNow());

    case "investigation/what-changed":
      return NextResponse.json(getNativeWhatChanged());

    case "blast-radius":
      return NextResponse.json(getNativeBlastRadius());

    case "early-warning":
      return NextResponse.json(getNativeEarlyWarning());

    case "causal-graph":
      return NextResponse.json(getNativeCausalGraph());

    case "memory/similar":
      return NextResponse.json(getNativeSimilarIncidents());

    case "recovery/options":
      return NextResponse.json(getNativeRecoveryOptions());

    case "recovery/recommendation":
      return NextResponse.json(getNativeRecoveryRecommendation());

    case "recovery/verify":
      return NextResponse.json(getNativeRecoveryVerify());

    case "services/criticality":
      return NextResponse.json(getNativeServiceCriticality());

    case "feedback/stats":
      return NextResponse.json(getNativeFeedbackStats());

    case "incidents":
    case "history":
      return NextResponse.json(getNativeSimilarIncidents());

    case "projects":
      return NextResponse.json(getNativeProjects());

    case "deployments":
      return NextResponse.json([
        { id: "dep-001", service: "payment-service", version: "v2.8.2", status: "STABLE", commit_id: "a8f3b9c", author: "devon.v@acme.corp", deployed_at: new Date(Date.now() - 3600000).toISOString(), description: "Payment gateway connector overhaul" },
        { id: "dep-002", service: "order-service", version: "v2.8.1", status: "STABLE", commit_id: "b3f9901", author: "marcus.k@acme.corp", deployed_at: new Date(Date.now() - 7200000).toISOString(), description: "Checkout idempotency header support" },
        { id: "dep-003", service: "api-gateway", version: "v1.8.4", status: "STABLE", commit_id: "e7a102f", author: "sarah.chen@acme.corp", deployed_at: new Date(Date.now() - 10800000).toISOString(), description: "Rate-limiting tuning and CORS policy update" }
      ]);

    default: {
      // Project specific routes: projects/:id or projects/:id/repair/...
      if (subpath.startsWith("projects/")) {
        const parts = subpath.split("/");
        const projectId = parts[1];

        if (parts.length === 2) {
          const details = getNativeProjectDetails(projectId);
          return details ? NextResponse.json(details) : NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        if (parts[2] === "topology") {
          const details = getNativeProjectDetails(projectId) as any;
          return NextResponse.json(details?.observability_readiness || {});
        }

        if (parts[2] === "readiness") {
          const details = getNativeProjectDetails(projectId) as any;
          return NextResponse.json(details?.observability_readiness || {});
        }

        if (parts[2] === "repaired" && parts[3] === "status") {
          const zipInfo = getNativeRepairedZip(projectId);
          return NextResponse.json({
            is_repaired: Boolean(zipInfo),
            ready_for_download: Boolean(zipInfo),
            filename: zipInfo?.filename || `${projectId}-tracelens-repaired.zip`
          });
        }

        if ((parts[2] === "repaired" || parts[2] === "repair") && parts[3] === "download") {
          const zipInfo = getNativeRepairedZip(projectId);
          if (!zipInfo) {
            return NextResponse.json({ detail: "Complete validation before export." }, { status: 400 });
          }
          return new Response(zipInfo.buffer, {
            headers: {
              "Content-Type": "application/zip",
              "Content-Disposition": `attachment; filename="${zipInfo.filename}"`
            }
          });
        }
      }

      return NextResponse.json({ error: `Native route /api/${subpath} not found` }, { status: 404 });
    }
  }
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const subpath = params.path.join("/");
  const contentType = req.headers.get("content-type") || "";
  let rawBodyText: string | null = null;
  let rawFormData: FormData | null = null;
  let body: any = {};

  if (contentType.includes("multipart/form-data")) {
    try {
      rawFormData = await req.formData();
    } catch {}
  } else {
    try {
      rawBodyText = await req.text();
      if (rawBodyText) {
        body = JSON.parse(rawBodyText);
      }
    } catch {}
  }

  // 1. Try forwarding to Python FastAPI backend
  const proxied = await tryProxyToBackend(req, subpath, rawFormData || rawBodyText);
  if (proxied) return proxied;

  // 2. Native Engine Fallback

  switch (subpath) {
    case "failure/inject":
    case "demo/inject": {
      const scenario = body.scenario || "DATABASE_FAILURE";
      return NextResponse.json(injectNativeScenario(scenario));
    }

    case "scenarios/reset":
    case "reset":
    case "demo/reset":
      return NextResponse.json(resetNativeScenario());

    case "telemetry/ingest":
      return NextResponse.json({ status: "INGESTED", timestamp: new Date().toISOString() });

    case "telemetry/mode":
      return NextResponse.json({ status: "SUCCESS", data_mode: body.mode || "DEMO" });

    case "investigation/acquire-evidence":
      return NextResponse.json({
        scenario: body.scenario || "CURRENT",
        status: "COMPLETED",
        message: "Forensic evidence acquired across distributed traces and host kernel logs."
      });

    case "recovery/simulate":
      return NextResponse.json(simulateNativeRecovery(body.action_id || "scale_connection_pool"));

    case "recovery/execute":
    case "recovery/approve":
      return NextResponse.json(executeNativeRecovery(body.action_id || "scale_connection_pool"));

    case "recovery/verify":
      return NextResponse.json(verifyNativeRecovery());

    case "feedback":
      return NextResponse.json({ status: "RECORDED", feedback_id: `fb-${Date.now().toString(36)}`, message: "Engineer feedback stored in incident memory." });

    case "copilot/ask":
    case "copilot/query": {
      const text = await generateNativeCopilotResponse(body.question || "");
      return NextResponse.json({ answer: text, question: body.question, confidence: 0.92, model_source: "Native TraceRoute AI Engine" });
    }

    case "copilot/chat/stream": {
      const userMsg = (body.messages && body.messages.length > 0)
        ? body.messages[body.messages.length - 1].content
        : "Explain system status";
      const fullReply = await generateNativeCopilotResponse(userMsg);

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Stream in small realistic chunks
          const words = fullReply.split(" ");
          let i = 0;
          const interval = setInterval(() => {
            if (i < words.length) {
              const chunk = words.slice(i, i + 3).join(" ") + " ";
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
              i += 3;
            } else {
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
              clearInterval(interval);
            }
          }, 40);
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache"
        }
      });
    }

    case "projects/upload": {
      // Use the rawFormData already buffered above — do NOT call req.formData() again
      try {
        const formData = rawFormData || new FormData();
        const result = await handleNativeProjectUpload(formData);
        return NextResponse.json(result);
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    default: {
      if (subpath.startsWith("projects/")) {
        const parts = subpath.split("/");
        const projectId = parts[1];

        if (parts[2] === "repair" && (parts[3] === "make-it-work" || parts[3] === "make-it-run")) {
          const repairResult = await handleNativeMakeItWork(projectId);
          return NextResponse.json(repairResult);
        }

        if (parts[2] === "telemetry") {
          return NextResponse.json({ status: "INGESTED", count: 1 });
        }

        if (parts[2] === "repair" && parts[3] === "apply-patch") {
          return NextResponse.json({ status: "APPLIED", issue_id: body.issue_id });
        }

        if (parts[2] === "repair" && parts[3] === "rollback") {
          return NextResponse.json({ status: "ROLLED_BACK", issue_id: body.issue_id });
        }
      }

      return NextResponse.json({ error: `Native route POST /api/${subpath} not found` }, { status: 404 });
    }
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  const subpath = params.path.join("/");
  const proxied = await tryProxyToBackend(req, subpath);
  if (proxied) return proxied;

  return NextResponse.json({ status: "DELETED", path: subpath });
}
