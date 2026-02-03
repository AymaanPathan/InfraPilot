import { Router, Request, Response } from "express";
import logger from "../utils/logger";
import { generateStructuredPlan } from "../ai/Structured.planner.service";
import { runTool } from "../ai/tool-runner";
import { transformMcpResponse } from "../ai/dataTransform";
import {
  explainPodFailure,
  analyzeLogs,
  analyzeEventTimeline,
  assessPodHealth,
  detectPodIssues,
  generateTriageReport,
} from "../ai/explain.service";
import {
  getToolDefinition,
  getAllTools,
  getSmartSuggestions,
} from "../ai/ToolsRegistry";
import { k8sClient } from "../ai/KubernetesClient";

const router = Router();

/**
 * Enhanced error response builder
 */
function buildErrorResponse(
  error: any,
  context: {
    tool?: string;
    args?: Record<string, any>;
    executionTime?: number;
  },
): any {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Check for metrics unavailability
  if (errorMessage.includes("METRICS_UNAVAILABLE")) {
    return {
      ok: false,
      error: "Metrics Server Unavailable",
      code: "METRICS_SERVER_NOT_INSTALLED",
      hint: "Install Kubernetes Metrics Server to enable pod metrics",
      details: errorMessage.replace("METRICS_UNAVAILABLE: ", ""),
      solution: {
        title: "How to install Metrics Server",
        steps: [
          {
            platform: "Docker Desktop",
            command:
              "kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml",
          },
          {
            platform: "Minikube",
            command: "minikube addons enable metrics-server",
          },
          {
            platform: "Other Kubernetes clusters",
            steps: [
              "Download the manifest: curl -LO https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml",
              "Edit the deployment and add --kubelet-insecure-tls to args if using self-signed certificates",
              "Apply: kubectl apply -f components.yaml",
              "Verify: kubectl get deployment metrics-server -n kube-system",
              "Wait 1-2 minutes for metrics to become available",
            ],
          },
        ],
        verification: "kubectl top nodes",
        documentation: "https://github.com/kubernetes-sigs/metrics-server",
      },
      meta: {
        ...context,
        workaround:
          "You can still view pod details, logs, and events without metrics",
      },
    };
  }

  // Default error response
  return {
    ok: false,
    error: "Tool execution failed",
    code: "TOOL_FAILED",
    hint: "Check Kubernetes cluster status and resource names",
    details: errorMessage,
    meta: context,
  };
}

/**
 * Check if auto-explanation should be triggered
 */
function shouldAutoExplain(tool: string, data: any): boolean {
  // Auto-explain for pod-related queries
  if (tool === "get_pods" || tool === "get_pod_health") {
    const pods = Array.isArray(data) ? data : data.pods || [];
    const issues = detectPodIssues(pods);
    return issues.length > 0; // Has issues to explain
  }

  // Auto-explain for logs with errors
  if (tool === "get_pod_logs") {
    const logs = typeof data === "string" ? data : data.logs || "";
    return /error|exception|fail|fatal|panic/i.test(logs);
  }

  // Auto-explain for events with warnings
  if (tool === "get_pod_events") {
    const events = Array.isArray(data) ? data : data.events || [];
    return events.some((e:any) => e.type === "Warning");
  }

  return false;
}

/**
 * Generate auto-explanation based on tool and data
 */
async function generateAutoExplanation(
  tool: string,
  data: any,
  args: Record<string, any>,
): Promise<string | undefined> {
  try {
    if (tool === "get_pods" || tool === "get_pod_health") {
      const pods = Array.isArray(data) ? data : data.pods || [];
      const issues = detectPodIssues(pods);

      if (issues.length > 0) {
        const report = await generateTriageReport(issues);
        return report;
      }
    }

    if (tool === "get_pod_logs") {
      const logs = typeof data === "string" ? data : data.logs || "";
      return await analyzeLogs(logs, args.name, args.namespace);
    }

    if (tool === "get_pod_events") {
      const events = Array.isArray(data) ? data : data.events || [];
      return await analyzeEventTimeline(events, args.name);
    }

    return undefined;
  } catch (error) {
    logger.error("Auto-explanation failed", {
      tool,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

/**
 * POST /api/ai/command
 *
 * Main endpoint - converts natural language to tool execution with AUTO-EXPLANATION
 */
router.post("/command", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { input, explain } = req.body;

  console.log("\n========== /api/ai/command HANDLER START ==========");
  console.log("📥 Request body:", JSON.stringify(req.body, null, 2));

  try {
    // Validate input
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Invalid input",
        code: "INVALID_INPUT",
        hint: "Please provide a valid command string",
      });
    }

    logger.info("Processing AI command", {
      input: input.substring(0, 100),
      explain,
    });

    // STEP 1: Generate structured plan
    console.log("\n📋 STEP 1: Generating structured plan...");
    let plan;
    try {
      plan = await generateStructuredPlan(input);
      console.log("✅ Plan generated:", JSON.stringify(plan, null, 2));
    } catch (planError) {
      console.error("❌ Plan generation failed:", planError);
      return res.status(500).json({
        ok: false,
        error: "Failed to understand command",
        code: "PLAN_GENERATION_FAILED",
        hint: "Try rephrasing your command or check that GROQ_API_KEY is set",
        details:
          planError instanceof Error ? planError.message : String(planError),
      });
    }

    // STEP 2: Execute the tool
    console.log("\n🔧 STEP 2: Executing tool...");
    let toolResult;
    try {
      toolResult = await runTool({
        tool: plan.tool,
        args: plan.args,
      });
      console.log("✅ Tool executed:", toolResult.success);
    } catch (toolError) {
      const executionTime = Date.now() - startTime;
      const errorResponse = buildErrorResponse(toolError, {
        tool: plan.tool,
        args: plan.args,
        executionTime,
      });
      return res.status(500).json(errorResponse);
    }

    if (!toolResult.success) {
      const executionTime = Date.now() - startTime;
      const errorResponse = buildErrorResponse(
        new Error(toolResult.error || "Tool execution failed"),
        {
          tool: plan.tool,
          args: plan.args,
          executionTime: toolResult.executionTime || executionTime,
        },
      );
      return res.status(500).json(errorResponse);
    }

    // STEP 3: Transform data for UI component
    console.log("\n🎨 STEP 3: Transforming data for UI...");
    let transformedData;
    try {
      transformedData = transformMcpResponse(
        plan.tool,
        toolResult.data,
        plan.args,
      );
      console.log("✅ Data transformed for component:", plan.ui_component);
    } catch (transformError) {
      transformedData = toolResult.data;
      console.log("⚠️ Using raw data instead");
    }

    // STEP 4: AUTO-EXPLANATION (PHASE E)
    console.log("\n🧠 STEP 4: Checking for auto-explanation...");
    let explanation: string | undefined;

    // Check if auto-explanation should trigger
    const shouldExplain =
      plan.explain_needed ||
      explain ||
      shouldAutoExplain(plan.tool, toolResult.data);

    if (shouldExplain) {
      console.log("✅ Triggering auto-explanation");
      explanation = await generateAutoExplanation(
        plan.tool,
        toolResult.data,
        plan.args,
      );

      if (explanation) {
        console.log("✅ Auto-explanation generated");
      } else {
        console.log("⚠️ Auto-explanation returned empty");
      }
    } else {
      console.log("ℹ️ No auto-explanation needed");
    }

    // Build response
    const executionTime = Date.now() - startTime;
    const response = {
      ok: true,
      ui: {
        componentName: plan.ui_component,
        props: transformedData,
      },
      meta: {
        tool: plan.tool,
        args: plan.args,
        confidence: plan.confidence,
        executionTime,
        explanation,
        autoExplained: !!explanation,
      },
    };

    console.log("\n✅ SUCCESS! Sending response");
    console.log("   Component:", response.ui.componentName);
    console.log("   Has explanation:", !!explanation);
    console.log("   Total execution time:", executionTime, "ms");
    console.log("========== /api/ai/command HANDLER END ==========\n");

    logger.info("AI command completed successfully", {
      tool: plan.tool,
      component: plan.ui_component,
      executionTime,
      hasExplanation: !!explanation,
    });

    res.json(response);
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error("\n❌ UNEXPECTED ERROR:", error);
    console.log("========== /api/ai/command HANDLER END (ERROR) ==========\n");

    logger.error("AI command failed", {
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    });

    res.status(500).json({
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/ai/explain/pod
 *
 * Explain a specific pod failure
 */
router.post("/explain/pod", async (req: Request, res: Response) => {
  const { name, namespace = "default" } = req.body;

  try {
    if (!name) {
      return res.status(400).json({
        ok: false,
        error: "Pod name is required",
      });
    }

    logger.info("Explaining pod failure", { name, namespace });

    // Fetch pod data
    const pod = await k8sClient.getPod(name, namespace);
    const events = await k8sClient.getPodEvents(name, namespace);
    const logs = await k8sClient.getPodLogs(name, namespace, {
      tailLines: 100,
    });

    // Generate explanation
    const explanation = await explainPodFailure({
      name,
      namespace,
      status: pod.status,
      events,
      logs,
      containers: pod.spec?.containers,
      restarts: pod.status?.containerStatuses?.[0]?.restartCount || 0,
      age: pod.metadata?.creationTimestamp
        ? Math.floor(
            (Date.now() - new Date(pod.metadata.creationTimestamp).getTime()) /
              1000 /
              60,
          ) + "m"
        : undefined,
    });

    res.json({
      ok: true,
      explanation,
      pod: {
        name,
        namespace,
        status: pod.status?.phase,
      },
    });
  } catch (error) {
    logger.error("Failed to explain pod", {
      name,
      namespace,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      ok: false,
      error: "Failed to explain pod failure",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/ai/explain/logs
 *
 * Analyze logs for errors
 */
router.post("/explain/logs", async (req: Request, res: Response) => {
  const { name, namespace = "default", logs } = req.body;

  try {
    let logsToAnalyze = logs;

    // If logs not provided, fetch them
    if (!logsToAnalyze && name) {
      logsToAnalyze = await k8sClient.getPodLogs(name, namespace, {
        tailLines: 200,
      });
    }

    if (!logsToAnalyze) {
      return res.status(400).json({
        ok: false,
        error: "Logs are required (provide logs or pod name)",
      });
    }

    const analysis = await analyzeLogs(logsToAnalyze, name, namespace);

    res.json({
      ok: true,
      analysis,
      pod: name ? { name, namespace } : undefined,
    });
  } catch (error) {
    logger.error("Failed to analyze logs", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      ok: false,
      error: "Failed to analyze logs",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/ai/explain/events
 *
 * Analyze event timeline
 */
router.post("/explain/events", async (req: Request, res: Response) => {
  const { name, namespace = "default" } = req.body;

  try {
    if (!name) {
      return res.status(400).json({
        ok: false,
        error: "Pod name is required",
      });
    }

    const events = await k8sClient.getPodEvents(name, namespace);
    const analysis = await analyzeEventTimeline(events, name);

    res.json({
      ok: true,
      analysis,
      eventCount: events.length,
      pod: { name, namespace },
    });
  } catch (error) {
    logger.error("Failed to analyze events", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      ok: false,
      error: "Failed to analyze events",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/ai/health/assess
 *
 * Assess overall pod health across namespace
 */
router.post("/health/assess", async (req: Request, res: Response) => {
  const { namespace } = req.body;

  try {
    const pods = await k8sClient.listPods(namespace);
    const assessment = await assessPodHealth(pods);
    const issues = detectPodIssues(pods);

    res.json({
      ok: true,
      assessment,
      issues,
      summary: {
        total: pods.length,
        healthy: pods.length - issues.length,
        critical: issues.filter((i) => i.severity === "critical").length,
        warnings: issues.filter((i) => i.severity === "warning").length,
      },
    });
  } catch (error) {
    logger.error("Failed to assess health", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      ok: false,
      error: "Failed to assess pod health",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/ai/health/triage
 *
 * Get triage report for all pods
 */
router.get("/health/triage", async (req: Request, res: Response) => {
  const { namespace } = req.query;

  try {
    const pods = await k8sClient.listPods(namespace as string | undefined);
    const issues = detectPodIssues(pods);
    const report = await generateTriageReport(issues);

    res.json({
      ok: true,
      report,
      issues,
      summary: {
        total: pods.length,
        issuesFound: issues.length,
        critical: issues.filter((i) => i.severity === "critical").length,
        warnings: issues.filter((i) => i.severity === "warning").length,
      },
    });
  } catch (error) {
    logger.error("Failed to generate triage report", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      ok: false,
      error: "Failed to generate triage report",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ... (keep all existing routes)

/**
 * GET /api/ai/metrics-status
 */
router.get("/metrics-status", async (req: Request, res: Response) => {
  try {
    const status = await k8sClient.getMetricsServerStatus();
    res.json({
      ok: true,
      ...status,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Failed to check metrics status",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/ai/tools
 */
router.get("/tools", (req: Request, res: Response) => {
  try {
    const tools = getAllTools();
    res.json({
      ok: true,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        category: t.category,
        examples: t.examples,
      })),
      count: tools.length,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Failed to list tools",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/ai/suggestions
 */
router.get("/suggestions", (req: Request, res: Response) => {
  try {
    const suggestions = getSmartSuggestions();
    res.json({
      ok: true,
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Failed to get suggestions",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/ai/health
 */
router.get("/health", async (req: Request, res: Response) => {
  try {
    const metricsAvailable = await k8sClient.isMetricsServerAvailable();

    const health = {
      ok: true,
      services: {
        planner: {
          enabled: !!process.env.GROQ_API_KEY,
          model: "llama-3.3-70b-versatile",
          status: "healthy",
        },
        kubernetes: {
          enabled: true,
          connected: await k8sClient.checkConnectivity(),
          status: "healthy",
        },
        metricsServer: {
          enabled: metricsAvailable,
          status: metricsAvailable ? "healthy" : "unavailable",
        },
        explanation: {
          enabled: !!process.env.GROQ_API_KEY,
          model: "llama-3.3-70b-versatile",
          status: "healthy",
          features: [
            "pod_failure_analysis",
            "log_analysis",
            "event_timeline",
            "health_assessment",
            "auto_detection",
          ],
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Health check failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
