import { Router, Request, Response } from "express";
import logger from "../utils/logger";
import { generateMultiStepPlan } from "../ai/multi_step_planner";
import { executeMultiStepPlan } from "../ai/multi_step_executor";
import { runTool } from "../ai/tool-runner";
import { transformK8sResponse } from "../ai/dataTransform";
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
import { generateLogFixSuggestions } from "../ai/logFixService";

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

  // Handle pod not found errors gracefully
  if (errorMessage.includes("not found") || errorMessage.includes("404")) {
    return {
      ok: false,
      error: "Resource Not Found",
      code: "RESOURCE_NOT_FOUND",
      hint: `The pod '${context.args?.name}' does not exist in namespace '${context.args?.namespace || "default"}'`,
      details: errorMessage,
      suggestion: "Try listing available pods first with 'show all pods'",
      meta: context,
    };
  }

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
  if (tool === "get_pods" || tool === "get_pod_health") {
    const pods = Array.isArray(data) ? data : data.pods || [];
    const issues = detectPodIssues(pods);
    return issues.length > 0;
  }

  if (tool === "get_pod_logs") {
    const logs = typeof data === "string" ? data : data.logs || "";
    return /error|exception|fail|fatal|panic/i.test(logs);
  }

  if (tool === "get_pod_events") {
    const events = Array.isArray(data) ? data : data.events || [];
    return events.some((e: any) => e.type === "Warning");
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
 * PHASE F ENHANCED - Main endpoint with multi-step support
 * Handles both simple queries and complex multi-intent prompts
 * NO MCP DEPENDENCIES
 */
router.post("/command", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { input, explain } = req.body;

  console.log(
    "\n========== /api/ai/command HANDLER START (PHASE F - NO MCP) ==========",
  );
  console.log("📥 Input:", input);

  try {
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Invalid input",
        code: "INVALID_INPUT",
        hint: "Please provide a valid command string",
      });
    }

    logger.info("Processing AI command (Phase F)", {
      input: input.substring(0, 100),
      explain,
    });

    // STEP 1: Generate multi-step plan
    console.log("\n📋 STEP 1: Generating plan (multi-step capable)...");
    let multiStepPlan;
    try {
      multiStepPlan = await generateMultiStepPlan(input);
      console.log("✅ Plan generated:", {
        isMultiStep: multiStepPlan.is_multi_step,
        stepCount: multiStepPlan.steps.length,
        mergeStrategy: multiStepPlan.merge_strategy,
      });
    } catch (planError) {
      console.error("❌ Plan generation failed:", planError);
      return res.status(500).json({
        ok: false,
        error: "Failed to understand command",
        code: "PLAN_GENERATION_FAILED",
        hint: "Try rephrasing your command",
        details:
          planError instanceof Error ? planError.message : String(planError),
      });
    }

    // STEP 2: Execute plan
    console.log("\n🔧 STEP 2: Executing plan...");

    if (multiStepPlan.is_multi_step && multiStepPlan.steps.length > 1) {
      // ========================================
      // MULTI-STEP EXECUTION (PHASE F)
      // ========================================
      console.log("🔵 Multi-step execution mode");

      try {
        const executionResult = await executeMultiStepPlan(multiStepPlan);

        if (!executionResult.success) {
          const failedSteps = executionResult.results
            .filter((r) => !r.success)
            .map((r) => `Step ${r.step_number}: ${r.error}`)
            .join("; ");

          return res.status(500).json({
            ok: false,
            error: "Multi-step execution failed",
            code: "MULTI_STEP_FAILED",
            details: failedSteps,
            completedSteps: executionResult.results.filter((r) => r.success)
              .length,
            totalSteps: executionResult.results.length,
          });
        }

        const executionTime = Date.now() - startTime;
        const response = {
          ok: true,
          ui: {
            componentName: executionResult.finalComponent,
            props: {
              ...executionResult.mergedData,
              explanation: executionResult.explanation,
            },
          },
          meta: {
            isMultiStep: true,
            stepCount: executionResult.results.length,
            mergeStrategy: multiStepPlan.merge_strategy,
            executionTime,
            totalExecutionTime: executionResult.totalExecutionTime,
            explanation: executionResult.explanation,
            steps: executionResult.results.map((r) => ({
              step: Math.floor(r.step_number),
              success: r.success,
              time: r.executionTime,
            })),
          },
        };

        console.log("\n✅ SUCCESS! Multi-step execution completed");
        console.log("   Component:", response.ui.componentName);
        console.log("   Steps executed:", executionResult.results.length);
        console.log("   Total time:", executionTime, "ms");
        console.log("========== PHASE F HANDLER END ==========\n");

        logger.info("Multi-step command completed", {
          stepCount: executionResult.results.length,
          component: executionResult.finalComponent,
          executionTime,
        });

        return res.json(response);
      } catch (execError) {
        console.error("❌ Multi-step execution error:", execError);

        // Handle specific error cases
        const errorMessage =
          execError instanceof Error ? execError.message : String(execError);

        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("404")
        ) {
          return res.status(404).json({
            ok: false,
            error: "One or more pods not found",
            code: "PODS_NOT_FOUND",
            hint: "The pods you're trying to compare don't exist in the cluster",
            suggestion: "Run 'show all pods' to see available pods first",
            details: errorMessage,
          });
        }

        return res.status(500).json({
          ok: false,
          error: "Multi-step execution failed",
          code: "EXECUTION_ERROR",
          details: errorMessage,
        });
      }
    }

    // ========================================
    // SINGLE-STEP EXECUTION
    // ========================================
    console.log("🟢 Single-step execution mode");
    const singleStep = multiStepPlan.steps[0];

    let toolResult;
    try {
      toolResult = await runTool({
        tool: singleStep.tool,
        args: singleStep.args,
      });
      console.log("✅ Tool executed:", toolResult.success);
    } catch (toolError) {
      const executionTime = Date.now() - startTime;
      const errorResponse = buildErrorResponse(toolError, {
        tool: singleStep.tool,
        args: singleStep.args,
        executionTime,
      });
      return res.status(500).json(errorResponse);
    }

    if (!toolResult.success) {
      const executionTime = Date.now() - startTime;
      const errorResponse = buildErrorResponse(
        new Error(toolResult.error || "Tool execution failed"),
        {
          tool: singleStep.tool,
          args: singleStep.args,
          executionTime: toolResult.executionTime || executionTime,
        },
      );
      return res.status(500).json(errorResponse);
    }

    // Transform data (renamed from transformMcpResponse)
    console.log("\n🎨 STEP 3: Transforming data...");
    let transformedData;
    try {
      transformedData = transformK8sResponse(
        singleStep.tool,
        toolResult.data,
        singleStep.args,
      );
      console.log("✅ Data transformed");
    } catch (transformError) {
      transformedData = toolResult.data;
      console.log("⚠️ Using raw data");
    }

    // Auto-explanation
    console.log("\n🧠 STEP 4: Checking for auto-explanation...");
    let explanation: string | undefined;

    // Update your /api/ai/command endpoint to auto-generate fix suggestions for logs:

    // In the single-step execution section, after getting logs:

    if (singleStep.tool === "get_pod_logs") {
      console.log(
        "\n🔧 STEP 3.5: Checking for errors and generating fix suggestions...",
      );

      try {
        // Check if logs contain errors
        const logsText =
          typeof toolResult.data === "string"
            ? toolResult.data
            : toolResult.data.logs || "";

        const hasLogErrors = /error|exception|fail|fatal|panic/i.test(logsText);

        if (hasLogErrors) {
          console.log("✅ Errors detected - generating AI fix suggestions");

          const fixAnalysis = await generateLogFixSuggestions(
            logsText,
            singleStep.args.name,
            singleStep.args.namespace || "default",
          );

          // Add fix suggestions to transformed data
          transformedData.fixSuggestions = fixAnalysis.suggestions;
          transformedData.hasErrors = fixAnalysis.hasErrors;

          console.log(
            `✅ Generated ${fixAnalysis.suggestions.length} fix suggestion(s)`,
          );

          // Auto-add explanation if not already present
          if (!explanation && fixAnalysis.summary) {
            explanation = fixAnalysis.summary;
          }
        } else {
          console.log("ℹ️  No errors detected in logs");
        }
      } catch (fixError) {
        console.error("⚠️  Failed to generate fix suggestions:", fixError);
        // Continue without fix suggestions
      }
    }

    const shouldExplain =
      multiStepPlan.explanation_needed ||
      explain ||
      shouldAutoExplain(singleStep.tool, toolResult.data);

    if (shouldExplain) {
      explanation = await generateAutoExplanation(
        singleStep.tool,
        toolResult.data,
        singleStep.args,
      );
    }

    const executionTime = Date.now() - startTime;
    const response = {
      ok: true,
      ui: {
        componentName: multiStepPlan.final_component,
        props: transformedData,
      },
      meta: {
        tool: singleStep.tool,
        args: singleStep.args,
        confidence: multiStepPlan.confidence,
        executionTime,
        explanation,
        autoExplained: !!explanation,
      },
    };

    console.log("\n✅ SUCCESS! Single-step execution completed");
    console.log("   Component:", response.ui.componentName);
    console.log("   Total time:", executionTime, "ms");
    console.log("========== PHASE F HANDLER END ==========\n");

    res.json(response);
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error("\n❌ UNEXPECTED ERROR:", error);
    console.log("========== PHASE F HANDLER END (ERROR) ==========\n");

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

// Explain pod endpoint
router.post("/explain/pod", async (req: Request, res: Response) => {
  const { name, namespace = "default" } = req.body;
  try {
    if (!name) {
      return res.status(400).json({ ok: false, error: "Pod name is required" });
    }

    const pod = await k8sClient.getPod(name, namespace);
    const events = await k8sClient.getPodEvents(name, namespace);
    const logs = await k8sClient.getPodLogs(name, namespace, {
      tailLines: 100,
    });

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
      pod: { name, namespace, status: pod.status?.phase },
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Failed to explain pod failure",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Health endpoint
router.get("/health", async (req: Request, res: Response) => {
  try {
    const metricsAvailable = await k8sClient.isMetricsServerAvailable();

    res.json({
      ok: true,
      services: {
        planner: {
          enabled: !!process.env.GROQ_API_KEY,
          model: process.env.AI_MODEL!,
          status: "healthy",
          features: ["single-step", "multi-step", "comparison", "aggregation"],
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
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Health check failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Get available tools
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
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Failed to get tools",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Get command suggestions
router.get("/suggestions", (req: Request, res: Response) => {
  try {
    const suggestions = getSmartSuggestions();
    res.json({
      ok: true,
      suggestions,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Failed to get suggestions",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Add this endpoint to your ai.routes.ts file:

/**
 * POST /api/ai/log-fixes
 *
 * Generate AI-powered fix suggestions for logs
 */
router.post("/log-fixes", async (req: Request, res: Response) => {
  const { logs, podName, namespace = "default" } = req.body;

  try {
    if (!logs) {
      return res.status(400).json({
        ok: false,
        error: "Logs are required",
      });
    }

    if (!podName) {
      return res.status(400).json({
        ok: false,
        error: "Pod name is required",
      });
    }

    logger.info("Generating log fix suggestions", {
      podName,
      namespace,
    });

    const fixAnalysis = await generateLogFixSuggestions(
      logs,
      podName,
      namespace,
    );

    res.json({
      ok: true,
      ...fixAnalysis,
    });
  } catch (error) {
    logger.error("Failed to generate log fix suggestions", {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      ok: false,
      error: "Failed to generate fix suggestions",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
