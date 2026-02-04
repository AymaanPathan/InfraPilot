import Groq from "groq-sdk";
import logger from "../utils/logger";
import { getToolSchemasForPlanner, TOOL_REGISTRY } from "./ToolsRegistry";

/**
 * Multi-Step Planner Service - FIXED "AND" PATTERN DETECTION
 *
 * Key Fix: Now recognizes "get logs for X and Y" as a comparison
 * even without the explicit word "compare"
 */

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface PlanStep {
  step_number: number;
  tool: string;
  args: Record<string, any>;
  depends_on?: number[];
  description: string;
}

export interface MultiStepPlan {
  is_multi_step: boolean;
  steps: PlanStep[];
  merge_strategy: "sequential" | "compare" | "aggregate" | "side_by_side";
  final_component: string;
  confidence: "high" | "medium" | "low";
  explanation_needed: boolean;
}

export function buildMultiStepPrompt(): string {
  const toolSchemas = getToolSchemasForPlanner();

  return `You are a Kubernetes intent parser that handles COMPLEX multi-step requests.

# CRITICAL RULES
1. Output ONLY valid JSON - no markdown, no explanation
2. Detect if request needs MULTIPLE operations (multi-step)
3. For multi-step: return array of steps with dependencies
4. For single-step: return is_multi_step: false with single step
5. **CRITICAL**: You MUST use ONLY the exact tool names from "AVAILABLE TOOLS" section below
   - For pod metrics/CPU/memory: use "describe_pod" NOT "get_pod_metrics"
   - For pod logs: use "get_pod_logs" NOT "get_logs"
   - For pod list: use "get_pods" NOT "list_pods"
   - Tool names are case-sensitive and must match exactly
6. **DO NOT INVENT TOOLS**: There are NO tools called "analyze_logs", "assess_health", "explain_failures", etc.

# CRITICAL: "AND" PATTERN DETECTION (MOST IMPORTANT!)

When user mentions TWO pod names connected by "and", this is ALWAYS a multi-step comparison:

## Pattern 1: "get/show logs for X and Y"
User: "get logs for payment-service and billing-service"
User: "show logs of pod-a and pod-b"  
User: "logs for db-error-app-6488467855-lg8v5 and test-api-69d598778d-4txc8"
→ ALWAYS multi-step with side_by_side!

## Pattern 2: "compare logs of X and Y"  
User: "compare logs of payment and billing"
→ Same as Pattern 1, just explicit

## Pattern 3: "get/show events for X and Y"
User: "show events for pod-a and pod-b"
→ Multi-step with side_by_side

**DETECTION RULE:**
If you see TWO pod names in the query with "and" between them:
→ is_multi_step: true
→ Create a step for EACH pod
→ merge_strategy: "side_by_side"
→ final_component: "MultiPanelView"

# CORRECT MULTI-STEP EXAMPLES

## Example 1: "get logs for X and Y" (NO "compare" keyword!)
User: "get logs for payment-service and billing-service"
{
  "is_multi_step": true,
  "steps": [
    {
      "step_number": 1,
      "tool": "get_pod_logs",
      "args": {"name": "payment-service", "namespace": "default", "tail": 100},
      "description": "Get logs for payment-service"
    },
    {
      "step_number": 2,
      "tool": "get_pod_logs",
      "args": {"name": "billing-service", "namespace": "default", "tail": 100},
      "description": "Get logs for billing-service"
    }
  ],
  "merge_strategy": "side_by_side",
  "final_component": "MultiPanelView",
  "confidence": "high",
  "explanation_needed": false
}

## Example 2: "show logs of A and B"
User: "show logs of db-error-app-6488467855-lg8v5 and test-api-69d598778d-4txc8"
{
  "is_multi_step": true,
  "steps": [
    {
      "step_number": 1,
      "tool": "get_pod_logs",
      "args": {"name": "db-error-app-6488467855-lg8v5", "namespace": "default", "tail": 100},
      "description": "Get logs for db-error-app-6488467855-lg8v5"
    },
    {
      "step_number": 2,
      "tool": "get_pod_logs",
      "args": {"name": "test-api-69d598778d-4txc8", "namespace": "default", "tail": 100},
      "description": "Get logs for test-api-69d598778d-4txc8"
    }
  ],
  "merge_strategy": "side_by_side",
  "final_component": "MultiPanelView",
  "confidence": "high",
  "explanation_needed": false
}

## Example 3: Explicit "compare"
User: "compare logs of payment and billing"
{
  "is_multi_step": true,
  "steps": [
    {
      "step_number": 1,
      "tool": "get_pod_logs",
      "args": {"name": "payment", "namespace": "default", "tail": 100},
      "description": "Get logs for payment pod"
    },
    {
      "step_number": 2,
      "tool": "get_pod_logs",
      "args": {"name": "billing", "namespace": "default", "tail": 100},
      "description": "Get logs for billing pod"
    }
  ],
  "merge_strategy": "side_by_side",
  "final_component": "MultiPanelView",
  "confidence": "high",
  "explanation_needed": false
}

# COMPARISON QUERIES

## Comparing METRICS/CPU/MEMORY:
User: "compare cpu of payment and billing"
User: "compare memory usage of pod A and B"
User: "compare metrics of X and Y"
→ Use "describe_pod" for each pod

Example:
{
  "is_multi_step": true,
  "steps": [
    {
      "step_number": 1,
      "tool": "describe_pod",
      "args": {"name": "payment", "namespace": "default"},
      "description": "Get metrics for payment pod"
    },
    {
      "step_number": 2,
      "tool": "describe_pod",
      "args": {"name": "billing", "namespace": "default"},
      "description": "Get metrics for billing pod"
    }
  ],
  "merge_strategy": "compare",
  "final_component": "ComparisonView",
  "confidence": "high",
  "explanation_needed": false
}

## Comparing EVENTS:
User: "compare events of X and Y"
User: "why are X and Y failing"
User: "show events for X and Y"
→ Use "get_pod_events" for each pod

Example:
{
  "is_multi_step": true,
  "steps": [
    {
      "step_number": 1,
      "tool": "get_pod_events",
      "args": {"name": "payment", "namespace": "default"},
      "description": "Get events for payment pod"
    },
    {
      "step_number": 2,
      "tool": "get_pod_events",
      "args": {"name": "billing", "namespace": "default"},
      "description": "Get events for billing pod"
    }
  ],
  "merge_strategy": "side_by_side",
  "final_component": "MultiPanelView",
  "confidence": "high",
  "explanation_needed": true
}

# KEY RULES FOR COMPARISONS:
- If user mentions "logs" → use get_pod_logs + side_by_side + MultiPanelView
- If user mentions "events" → use get_pod_events + side_by_side + MultiPanelView  
- If user mentions "cpu", "memory", "metrics", "usage" → use describe_pod + compare + ComparisonView
- If user says "X and Y" with TWO pod names → ALWAYS multi-step (even without "compare")!

# MERGE STRATEGY:
- Logs comparison → merge_strategy: "side_by_side", final_component: "MultiPanelView"
- Events comparison → merge_strategy: "side_by_side", final_component: "MultiPanelView"
- Metrics comparison → merge_strategy: "compare", final_component: "ComparisonView"

# OUTPUT STRUCTURE

## Single-Step Response (only when user asks for ONE pod):
{
  "is_multi_step": false,
  "steps": [{
    "step_number": 1,
    "tool": "tool_name",
    "args": {...},
    "description": "What this step does"
  }],
  "merge_strategy": "sequential",
  "final_component": "ComponentName",
  "confidence": "high/medium/low",
  "explanation_needed": true/false
}

## Multi-Step Response (when TWO+ pods mentioned):
{
  "is_multi_step": true,
  "steps": [
    {
      "step_number": 1,
      "tool": "get_pod_logs",
      "args": {"name": "pod1", "namespace": "default", "tail": 100},
      "description": "Get logs for pod1"
    },
    {
      "step_number": 2,
      "tool": "get_pod_logs",
      "args": {"name": "pod2", "namespace": "default", "tail": 100},
      "description": "Get logs for pod2"
    }
  ],
  "merge_strategy": "side_by_side",
  "final_component": "MultiPanelView",
  "confidence": "high",
  "explanation_needed": false
}

# AVAILABLE TOOLS

${toolSchemas}

# DETECTION RULES

**ALWAYS multi-step when:**
- User mentions TWO or more pod names with "and" (e.g., "logs for X and Y")
- User says "compare" with TWO items
- User says "X and Y" or "X vs Y"

**Single-step when:**
- User mentions only ONE pod
- No comparison implied
- Simple query like "show all pods"

Now parse the user's request:`;
}

export async function generateMultiStepPlan(
  userInput: string,
): Promise<MultiStepPlan> {
  const startTime = Date.now();

  console.log("\n========== 🔵 MULTI-STEP PLANNER DEBUG START ==========");
  console.log("📥 Input:", userInput);
  console.log("🔍 Checking if this is a comparison query...");

  const isComparisonQuery = /compare|versus|vs\.?/i.test(userInput);

  // ENHANCED: Check for "and" pattern even without "compare"
  const hasAndPattern = /\b(and|&)\b/i.test(userInput);

  const isLogComparison =
    /compar[e\w]*\s+(?:\w+\s+){0,5}logs?/i.test(userInput) ||
    /logs?\s+(?:\w+\s+){0,5}compar/i.test(userInput) ||
    (/logs?\s+(?:for|of|from)/i.test(userInput) && hasAndPattern); // NEW!

  const isEventComparison =
    /compar[e\w]*\s+(?:\w+\s+){0,5}events?/i.test(userInput) ||
    /events?\s+(?:\w+\s+){0,5}compar/i.test(userInput) ||
    (/events?\s+(?:for|of|from)/i.test(userInput) && hasAndPattern); // NEW!

  console.log("   Is comparison?", isComparisonQuery);
  console.log("   Has 'and' pattern?", hasAndPattern);
  console.log("   Is log comparison?", isLogComparison);
  console.log("   Is event comparison?", isEventComparison);

  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY environment variable not set");
    }

    const systemPrompt = buildMultiStepPrompt();

    console.log("🚀 Calling Groq API for multi-step planning...");
    const response = await groq.chat.completions.create({
      model: process.env.AI_MODEL!,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
      ],
      temperature: 0.1,
      max_tokens: 1000,
      top_p: 1,
      stream: false,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI model");
    }

    console.log("📄 Raw response:", content);
    const plan = parseMultiStepPlan(content);

    const executionTime = Date.now() - startTime;
    console.log("\n✅ Multi-step plan generated!");
    console.log("   Is multi-step:", plan.is_multi_step);
    console.log("   Step count:", plan.steps.length);
    console.log("   Merge strategy:", plan.merge_strategy);
    console.log("   Final component:", plan.final_component);

    if (plan.is_multi_step && plan.steps.length > 1) {
      console.log("\n📋 Steps breakdown:");
      plan.steps.forEach((step, i) => {
        console.log(`   Step ${i + 1}:`, {
          tool: step.tool,
          args: step.args,
          description: step.description,
        });
      });
    }

    // COMPARISON-SPECIFIC LOGGING
    if (
      plan.merge_strategy === "compare" ||
      plan.merge_strategy === "side_by_side"
    ) {
      console.log("\n🔵 COMPARISON DETECTED!");
      console.log("   Component will be:", plan.final_component);
      console.log("   Items to compare:", plan.steps.length);
      console.log("   Tool being used:", plan.steps[0]?.tool);

      if (isLogComparison && plan.steps[0]?.tool !== "get_pod_logs") {
        console.warn(
          "   ⚠️ WARNING: User asked for logs but planner chose",
          plan.steps[0]?.tool,
        );
      }

      // VALIDATION: If user had "and" pattern but planner made it single-step
      if (hasAndPattern && !plan.is_multi_step) {
        console.warn(
          "   ⚠️ WARNING: User query has 'and' but planner returned single-step!",
        );
        console.warn("   This might be a planner error - query:", userInput);
      }
    }

    console.log("   Execution time:", executionTime, "ms");
    console.log("========== MULTI-STEP PLANNER DEBUG END ==========\n");

    logger.info("Multi-step plan generated", {
      isMultiStep: plan.is_multi_step,
      stepCount: plan.steps.length,
      mergeStrategy: plan.merge_strategy,
      isComparison:
        plan.merge_strategy === "compare" ||
        plan.merge_strategy === "side_by_side",
      isLogComparison,
      hasAndPattern,
      executionTime,
    });

    return plan;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error("\n❌ MULTI-STEP PLANNER ERROR!");
    console.error(
      "   Error:",
      error instanceof Error ? error.message : String(error),
    );
    console.error("   Execution time:", executionTime, "ms");
    console.log("========== MULTI-STEP PLANNER DEBUG END ==========\n");

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
      throw new Error("Content must be a non-empty string");
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

    // Validate each step
    parsed.steps.forEach((step: any, index: number) => {
      if (typeof step.step_number !== "number") {
        throw new Error(`Step ${index}: missing step_number`);
      }
      if (!step.tool || typeof step.tool !== "string") {
        throw new Error(`Step ${index}: missing tool`);
      }
      if (!step.args || typeof step.args !== "object") {
        throw new Error(`Step ${index}: missing args`);
      }
      if (!(step.tool in TOOL_REGISTRY)) {
        throw new Error(`Step ${index}: unknown tool '${step.tool}'`);
      }
    });

    if (
      !["sequential", "compare", "aggregate", "side_by_side"].includes(
        parsed.merge_strategy,
      )
    ) {
      throw new Error("Invalid merge_strategy");
    }

    if (!parsed.final_component) {
      throw new Error("Missing final_component");
    }

    return parsed as MultiStepPlan;
  } catch (error) {
    logger.error("Failed to parse multi-step plan", {
      content: content ? content.substring(0, 300) : "null",
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

export function validateMultiStepCapability(): {
  configured: boolean;
  error?: string;
} {
  if (!process.env.GROQ_API_KEY) {
    return {
      configured: false,
      error: "GROQ_API_KEY environment variable not set",
    };
  }
  return { configured: true };
}
