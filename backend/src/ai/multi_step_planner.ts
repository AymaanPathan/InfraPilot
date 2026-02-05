import Groq from "groq-sdk";
import logger from "../utils/logger";
import { getToolSchemasForPlanner } from "./ToolsRegistry";

/**
 * Enhanced Multi-Step Planner - COMPARISON FIX
 *
 * Improvements:
 * 1. Better detection of comparison queries
 * 2. Proper handling of "compare X vs Y" patterns
 * 3. Enhanced log comparison support
 * 4. Clearer merge strategies for different comparison types
 */

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface PlanStep {
  step_number: number;
  tool: string;
  args: Record<string, any>;
  description: string;
  depends_on?: number[];
}

export interface MultiStepPlan {
  is_multi_step: boolean;
  steps: PlanStep[];
  merge_strategy:
    | "aggregate"
    | "compare"
    | "side_by_side"
    | "sequential"
    | "single";
  final_component: string;
  explanation_needed: boolean;
  confidence: "high" | "medium" | "low";
  reasoning?: string;
}

function buildMultiStepPlannerPrompt(): string {
  const toolSchemas = getToolSchemasForPlanner();

  return `You are a Kubernetes query planner. Analyze user requests and create execution plans.

# CRITICAL RULES
1. Output ONLY valid JSON - no markdown, no explanation
2. Detect multi-step operations (comparisons, aggregations, sequential tasks)
3. For COMPARISON queries, ALWAYS use merge_strategy: "comparison"

# COMPARISON QUERY DETECTION
A query is a COMPARISON if it contains:
- "compare X vs Y" or "compare X and Y"
- "X versus Y"
- "difference between X and Y"
- "which is higher/lower/better"
- Any comparison of metrics, logs, or resources between TWO entities

Examples of comparison queries:
- "compare CPU of pod-a and pod-b" → COMPARISON
- "compare logs of payment vs billing" → COMPARISON
- "which pod uses more memory: api or db" → COMPARISON
- "show difference between prod and staging pods" → COMPARISON

# MERGE STRATEGIES

1. "compare" - Use for comparing TWO entities (metrics comparison)
   - CPU/memory comparison between pods
   - Resource usage comparison
   - Metrics comparison

2. "side_by_side" - Use for side-by-side display of similar content
   - Log comparison between pods
   - Event comparison
   - Any text-based comparison

3. "aggregate" - Use for summarizing MULTIPLE similar items
   - "show all failing pods and their logs"
   - "list deployments and their pods"

4. "sequential" - Use for dependent operations
   - "restart deployment then check status"

5. "single" - Single operation, no merging needed

# OUTPUT SCHEMA

{
  "is_multi_step": true/false,
  "steps": [
    {
      "step_number": 1,
      "tool": "get_pod_metrics",
      "args": { "name": "pod-a", "namespace": "default" },
      "description": "Get CPU/memory metrics for pod-a",
      "depends_on": []
    },
    {
      "step_number": 2,
      "tool": "get_pod_metrics",
      "args": { "name": "pod-b", "namespace": "default" },
      "description": "Get CPU/memory metrics for pod-b",
      "depends_on": []
    }
  ],
  "merge_strategy": "comparison",
  "final_component": "ComparisonView",
  "explanation_needed": false,
  "confidence": "high",
  "reasoning": "User wants to compare metrics between two pods"
}

# COMPONENT MAPPING

- "compare" → "ComparisonView" (for comparing TWO pods' metrics)
- "side_by_side" → "MultiPanelView" (for comparing logs/events side-by-side)
- "aggregate" → "MultiPanelView" (for showing multiple items)
- "single" → Use tool's default component

# AVAILABLE TOOLS

${toolSchemas}

# COMPARISON EXAMPLES

User: "compare CPU of payment-service and billing-service"
{
  "is_multi_step": true,
  "steps": [
    {
      "step_number": 1,
      "tool": "get_pod_metrics",
      "args": { "name": "payment-service", "namespace": "default" },
      "description": "Get metrics for payment-service"
    },
    {
      "step_number": 2,
      "tool": "get_pod_metrics",
      "args": { "name": "billing-service", "namespace": "default" },
      "description": "Get metrics for billing-service"
    }
  ],
  "merge_strategy": "compare",
  "final_component": "ComparisonView",
  "explanation_needed": false,
  "confidence": "high"
}

User: "compare logs of db-error-app vs test-api"
{
  "is_multi_step": true,
  "steps": [
    {
      "step_number": 1,
      "tool": "get_pod_logs",
      "args": { "name": "db-error-app-6488467855-lg8v5", "namespace": "default", "tail": 50 },
      "description": "Get logs for db-error-app"
    },
    {
      "step_number": 2,
      "tool": "get_pod_logs",
      "args": { "name": "test-api-69d598778d-4txc8", "namespace": "default", "tail": 50 },
      "description": "Get logs for test-api"
    }
  ],
  "merge_strategy": "side_by_side",
  "final_component": "MultiPanelView",
  "explanation_needed": false,
  "confidence": "high"
}

User: "which pod uses more CPU: frontend or backend"
{
  "is_multi_step": true,
  "steps": [
    {
      "step_number": 1,
      "tool": "get_pod_metrics",
      "args": { "name": "frontend", "namespace": "default" },
      "description": "Get CPU metrics for frontend"
    },
    {
      "step_number": 2,
      "tool": "get_pod_metrics",
      "args": { "name": "backend", "namespace": "default" },
      "description": "Get CPU metrics for backend"
    }
  ],
  "merge_strategy": "compare",
  "final_component": "ComparisonView",
  "explanation_needed": false,
  "confidence": "high"
}

# SINGLE-STEP EXAMPLES

User: "show CPU usage of payment-service"
{
  "is_multi_step": false,
  "steps": [
    {
      "step_number": 1,
      "tool": "get_pod_metrics",
      "args": { "name": "payment-service", "namespace": "default" },
      "description": "Get CPU metrics"
    }
  ],
  "merge_strategy": "single",
  "final_component": "MetricsPanel",
  "explanation_needed": false,
  "confidence": "high"
}

User: "get logs for api-server"
{
  "is_multi_step": false,
  "steps": [
    {
      "step_number": 1,
      "tool": "get_pod_logs",
      "args": { "name": "api-server", "namespace": "default" },
      "description": "Get pod logs"
    }
  ],
  "merge_strategy": "single",
  "final_component": "LogsViewer",
  "explanation_needed": false,
  "confidence": "high"
}

Now analyze the user's request and create an execution plan. Return ONLY the JSON object:`;
}

export async function generateMultiStepPlan(
  userInput: string,
): Promise<MultiStepPlan> {
  const startTime = Date.now();

  console.log("\n========== MULTI-STEP PLANNER START ==========");
  console.log("📝 Input:", userInput);

  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY environment variable not set");
    }

    const systemPrompt = buildMultiStepPlannerPrompt();

    console.log("🚀 Calling Groq API for multi-step planning...");

    const response = await groq.chat.completions.create({
      model: process.env.AI_MODEL || "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
      ],
      temperature: 0.1,
      max_tokens: 1500,
      top_p: 1,
      stream: false,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI model");
    }

    console.log("📥 Raw AI response received");

    const plan = parseMultiStepPlan(content);

    const executionTime = Date.now() - startTime;

    console.log("✅ Multi-step plan generated!");
    console.log("   Is multi-step:", plan.is_multi_step);
    console.log("   Steps:", plan.steps.length);
    console.log("   Merge strategy:", plan.merge_strategy);
    console.log("   Component:", plan.final_component);
    console.log("   Execution time:", executionTime, "ms");
    console.log("========== MULTI-STEP PLANNER END ==========\n");

    logger.info("Multi-step plan generated", {
      isMultiStep: plan.is_multi_step,
      stepCount: plan.steps.length,
      mergeStrategy: plan.merge_strategy,
      executionTime,
    });

    return plan;
  } catch (error) {
    const executionTime = Date.now() - startTime;

    console.error("\n❌ PLANNER ERROR!");
    console.error(
      "   Error:",
      error instanceof Error ? error.message : String(error),
    );
    console.log("========== MULTI-STEP PLANNER END (ERROR) ==========\n");

    logger.error("Multi-step plan generation failed", {
      input: userInput,
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    });

    throw error;
  }
}

function parseMultiStepPlan(content: string): MultiStepPlan {
  try {
    if (!content || typeof content !== "string") {
      throw new Error("Invalid content from AI");
    }

    let cleaned = content.trim();

    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (typeof parsed.is_multi_step !== "boolean") {
      throw new Error("Missing or invalid 'is_multi_step' field");
    }

    if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      throw new Error("Missing or empty 'steps' array");
    }

    if (!parsed.merge_strategy) {
      throw new Error("Missing 'merge_strategy' field");
    }

    if (!parsed.final_component) {
      throw new Error("Missing 'final_component' field");
    }

    // Validate each step
    parsed.steps.forEach((step: any, index: number) => {
      if (typeof step.step_number !== "number") {
        throw new Error(`Step ${index}: missing step_number`);
      }
      if (!step.tool || typeof step.tool !== "string") {
        throw new Error(`Step ${index}: missing or invalid tool`);
      }
      if (!step.args || typeof step.args !== "object") {
        throw new Error(`Step ${index}: missing or invalid args`);
      }
      if (!step.description) {
        throw new Error(`Step ${index}: missing description`);
      }
    });

    logger.debug("Multi-step plan parsed successfully", {
      stepCount: parsed.steps.length,
      mergeStrategy: parsed.merge_strategy,
    });

    return parsed as MultiStepPlan;
  } catch (error) {
    logger.error("Failed to parse multi-step plan", {
      content: content ? content.substring(0, 300) : "null",
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof SyntaxError) {
      throw new Error("AI returned invalid JSON for multi-step plan");
    }

    throw error;
  }
}

/**
 * Validate multi-step plan before execution
 */
export function validateMultiStepPlan(plan: MultiStepPlan): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for circular dependencies
  plan.steps.forEach((step) => {
    if (step.depends_on) {
      step.depends_on.forEach((dep) => {
        if (dep >= step.step_number) {
          errors.push(`Step ${step.step_number} depends on future step ${dep}`);
        }

        const depStep = plan.steps.find((s) => s.step_number === dep);
        if (!depStep) {
          errors.push(
            `Step ${step.step_number} depends on non-existent step ${dep}`,
          );
        }
      });
    }
  });

  // Validate merge strategy matches step count
  if (
    plan.merge_strategy === "compare" &&
    plan.steps.length !== 2 &&
    plan.steps.length !== 1
  ) {
    errors.push(
      `Compare strategy requires exactly 2 steps, got ${plan.steps.length}`,
    );
  }

  if (plan.merge_strategy === "single" && plan.steps.length > 1) {
    errors.push(`Single strategy requires 1 step, got ${plan.steps.length}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
