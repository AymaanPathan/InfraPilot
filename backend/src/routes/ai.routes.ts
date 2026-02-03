import { Router, Request, Response } from "express";
import logger from "../utils/logger";
import { generateStructuredPlan } from "../ai/Structured.planner.service";
import { runTool } from "../ai/tool-runner";
import { transformMcpResponse } from "../ai/dataTransform";
import { explainLogs } from "../ai/explain.service";
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

  // Check for invalid JSON from metrics API
  if (
    errorMessage.includes("invalid json response body") &&
    errorMessage.includes("metrics.k8s.io")
  ) {
    return {
      ok: false,
      error: "Metrics Server Configuration Error",
      code: "METRICS_SERVER_MALFORMED_RESPONSE",
      hint: "The Metrics Server is installed but not responding correctly",
      details:
        "The Metrics Server returned an invalid response. This usually means it's not properly configured.",
      solution: {
        title: "Fix Metrics Server Configuration",
        steps: [
          "Check Metrics Server status: kubectl get pods -n kube-system | grep metrics-server",
          "Check logs: kubectl logs -n kube-system deployment/metrics-server",
          "Common fix for Docker Desktop - reinstall with insecure TLS:",
          "kubectl delete -n kube-system deployment metrics-server",
          "Download manifest and edit to add --kubelet-insecure-tls flag",
          "Reapply the manifest",
        ],
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
 * POST /api/ai/command
 *
 * Main endpoint - converts natural language to tool execution
 */
router.post("/command", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { input, explain } = req.body;

  console.log("\n========== /api/ai/command HANDLER START ==========");
  console.log("📥 Request body:", JSON.stringify(req.body, null, 2));
  console.log("📝 Input:", input);
  console.log("🔍 Explain:", explain);

  try {
    // Validate input
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      console.error("❌ Invalid input:", input);
      return res.status(400).json({
        ok: false,
        error: "Invalid input",
        code: "INVALID_INPUT",
        hint: "Please provide a valid command string",
        details: "Input must be a non-empty string",
      });
    }

    logger.info("Processing AI command", {
      input: input.substring(0, 100),
      explain,
    });

    // STEP 1: Generate structured plan from natural language
    console.log("\n📋 STEP 1: Generating structured plan...");
    let plan;
    try {
      plan = await generateStructuredPlan(input);
      console.log("✅ Plan generated:", JSON.stringify(plan, null, 2));
    } catch (planError) {
      console.error("❌ Plan generation failed:", planError);
      logger.error("Plan generation failed", {
        error:
          planError instanceof Error ? planError.message : String(planError),
        input,
      });

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
    console.log("   Tool:", plan.tool);
    console.log("   Args:", JSON.stringify(plan.args, null, 2));

    let toolResult;
    try {
      toolResult = await runTool({
        tool: plan.tool,
        args: plan.args,
      });
      console.log("✅ Tool executed:");
      console.log("   Success:", toolResult.success);
      console.log("   Execution time:", toolResult.executionTime, "ms");
      if (!toolResult.success) {
        console.error("   Error:", toolResult.error);
      }
    } catch (toolError) {
      console.error("❌ Tool execution failed:", toolError);
      logger.error("Tool execution failed", {
        tool: plan.tool,
        error:
          toolError instanceof Error ? toolError.message : String(toolError),
      });

      const executionTime = Date.now() - startTime;
      const errorResponse = buildErrorResponse(toolError, {
        tool: plan.tool,
        args: plan.args,
        executionTime,
      });

      return res.status(500).json(errorResponse);
    }

    // Check if tool execution failed
    if (!toolResult.success) {
      console.error("❌ Tool returned failure");
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
      console.log(
        "   Data keys:",
        Object.keys(transformedData || {}).join(", "),
      );
    } catch (transformError) {
      console.error("❌ Data transformation failed:", transformError);
      logger.error("Data transformation failed", {
        tool: plan.tool,
        error:
          transformError instanceof Error
            ? transformError.message
            : String(transformError),
      });

      // Continue with raw data if transformation fails
      transformedData = toolResult.data;
      console.log("⚠️ Using raw data instead");
    }

    // STEP 4: Generate explanation if needed
    let explanation = undefined;
    if (plan.explain_needed || explain) {
      console.log("\n💬 STEP 4: Generating explanation...");
      try {
        // Simple explanation based on tool type
        if (plan.tool.includes("logs")) {
          explanation = await explainLogs(
            transformedData.logs || toolResult.data.logs || "",
            plan.args.name,
          );
        } else if (plan.tool.includes("pod") && plan.tool.includes("events")) {
          explanation = `Retrieved ${transformedData.events?.length || 0} events for pod ${plan.args.name}`;
        } else {
          explanation = `Successfully executed ${plan.tool}`;
        }
        console.log("✅ Explanation generated");
      } catch (explainError) {
        console.warn(
          "⚠️ Explanation generation failed (non-critical):",
          explainError,
        );
        // Explanation failure is non-critical
        explanation = undefined;
      }
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
      },
    };

    console.log("\n✅ SUCCESS! Sending response:");
    console.log("   Component:", response.ui.componentName);
    console.log("   Total execution time:", executionTime, "ms");
    console.log("========== /api/ai/command HANDLER END ==========\n");

    logger.info("AI command completed successfully", {
      tool: plan.tool,
      component: plan.ui_component,
      executionTime,
    });

    res.json(response);
  } catch (error) {
    const executionTime = Date.now() - startTime;

    console.error("\n❌ UNEXPECTED ERROR in /api/ai/command:");
    console.error("   Error:", error);
    console.error(
      "   Type:",
      error instanceof Error ? error.constructor.name : typeof error,
    );
    console.error(
      "   Message:",
      error instanceof Error ? error.message : String(error),
    );
    if (error instanceof Error && error.stack) {
      console.error("   Stack:", error.stack);
    }
    console.log("========== /api/ai/command HANDLER END (ERROR) ==========\n");

    logger.error("AI command failed with unexpected error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      executionTime,
    });

    res.status(500).json({
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      hint: "An unexpected error occurred. Check server logs for details.",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/ai/metrics-status
 *
 * Check Metrics Server status with installation guidance
 */
router.get("/metrics-status", async (req: Request, res: Response) => {
  try {
    const status = await k8sClient.getMetricsServerStatus();
    res.json({
      ok: true,
      ...status,
    });
  } catch (error) {
    logger.error("Failed to check metrics status", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      ok: false,
      error: "Failed to check metrics status",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/ai/tools
 *
 * List all available tools
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
    logger.error("Failed to list tools", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      ok: false,
      error: "Failed to list tools",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/ai/suggestions
 *
 * Get smart command suggestions
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
    logger.error("Failed to get suggestions", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      ok: false,
      error: "Failed to get suggestions",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/ai/health
 *
 * Check AI services health including metrics server
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
          message: metricsAvailable
            ? "Metrics Server is available"
            : "Metrics Server is not installed or not responding",
        },
        explanation: {
          enabled: !!process.env.GROQ_API_KEY,
          model: "llama-3.3-70b-versatile",
          status: "healthy",
        },
      },
      timestamp: new Date().toISOString(),
    };

    res.json(health);
  } catch (error) {
    logger.error("Health check failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      ok: false,
      error: "Health check failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/ai/validate
 *
 * Validate a command without executing
 */
router.post("/validate", async (req: Request, res: Response) => {
  const { input } = req.body;

  try {
    if (!input || typeof input !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Invalid input",
        hint: "Provide a string input to validate",
      });
    }

    // Generate plan but don't execute
    const plan = await generateStructuredPlan(input);
    const toolDef = getToolDefinition(plan.tool);

    // Check if tool requires metrics
    const requiresMetrics = plan.tool.includes("metrics");
    let metricsWarning = undefined;

    if (requiresMetrics) {
      const metricsAvailable = await k8sClient.isMetricsServerAvailable();
      if (!metricsAvailable) {
        metricsWarning =
          "This command requires Metrics Server, which is not available";
      }
    }

    res.json({
      ok: true,
      valid: true,
      plan: {
        tool: plan.tool,
        args: plan.args,
        component: plan.ui_component,
        confidence: plan.confidence,
        explainNeeded: plan.explain_needed,
      },
      toolInfo: toolDef
        ? {
            name: toolDef.name,
            description: toolDef.description,
            category: toolDef.category,
          }
        : undefined,
      warnings: metricsWarning ? [metricsWarning] : undefined,
    });
  } catch (error) {
    logger.error("Command validation failed", {
      input,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      ok: false,
      valid: false,
      error: "Validation failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
