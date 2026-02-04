import Groq from "groq-sdk";
import logger from "../utils/logger";
import { getToolSchemasForPlanner, TOOL_REGISTRY } from "./ToolsRegistry";

/**
 * Multi-Step Planner Service - PHASE F - FIXED
 *
 * Handles complex prompts with multiple intents:
 * - "show failing pods and their logs" → [get_filtered_pods, get_pod_logs]
 * - "compare cpu of payment and billing" → [describe_pod, describe_pod]
 * - "list pods and explain why they're failing" → [get_pods, explain_failures]
 *
 * CRITICAL FIX: Uses only valid tool names from TOOL_REGISTRY
 */

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface PlanStep {
  step_number: number;
  tool: string;
  args: Record<string, any>;
  depends_on?: number[]; // Which steps must complete first
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
   - For pod list: use "get_pods" NOT "list_pods"
   - Tool names are case-sensitive and must match exactly
6. **DO NOT INVENT TOOLS**: There are NO tools called "analyze_logs", "assess_health", "explain_failures", etc.
   - For "explain" requests: Use the actual data tool (get_pod_logs, get_pod_events) with explanation_needed: true
   - The backend will automatically analyze the data and provide explanations
   - NEVER create a second step for analysis - just set explanation_needed flag

# OUTPUT STRUCTURE

## Single-Step Response:
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

## Multi-Step Response:
{
  "is_multi_step": true,
  "steps": [
    {
      "step_number": 1,
      "tool": "get_filtered_pods",
      "args": {"status": ["Failed"]},
      "description": "Get failing pods"
    },
    {
      "step_number": 2,
      "tool": "get_pod_logs",
      "args": {"name": "$DYNAMIC", "namespace": "default"},
      "depends_on": [1],
      "description": "Get logs for each failing pod"
    }
  ],
  "merge_strategy": "side_by_side",
  "final_component": "MultiPanelView",
  "confidence": "high",
  "explanation_needed": true
}

# AVAILABLE TOOLS

${toolSchemas}

# MERGE STRATEGIES

1. **sequential**: Execute steps one by one, show final result only
   - Use for: "get logs then explain them"
   
2. **compare**: Execute steps in parallel, compare results
   - Use for: "compare pod A and pod B"
   
3. **aggregate**: Combine results into single view
   - Use for: "show all failed pods and their events"
   
4. **side_by_side**: Show multiple results in panels
   - Use for: "show pods and their logs"

# FINAL COMPONENTS

- **MultiPanelView**: Side-by-side panels (for "show X and Y")
- **ComparisonView**: Comparison table (for "compare X and Y")
- **AggregateView**: Combined results (for "all X with their Y")
- Standard components: PodGrid, LogsViewer, etc.

# DYNAMIC ARGUMENTS

Use "$DYNAMIC" for args that depend on previous step results:
- "$DYNAMIC" → Will be populated from previous step
- "$DYNAMIC_EACH" → Loop over results from previous step
- "$RESULT_FIELD:pods" → Extract specific field from previous result

# MULTI-STEP EXAMPLES

## Example 1: Show failing pods and their logs
User: "show failing pods and their logs"
{
  "is_multi_step": true,
  "steps": [
    {
      "step_number": 1,
      "tool": "get_filtered_pods",
      "args": {"status": ["Failed", "CrashLoopBackOff"]},
      "description": "Get all failing pods"
    },
    {
      "step_number": 2,
      "tool": "get_pod_logs",
      "args": {
        "name": "$DYNAMIC_EACH",
        "namespace": "$DYNAMIC_EACH",
        "tail": 100
      },
      "depends_on": [1],
      "description": "Get logs for each failing pod"
    }
  ],
  "merge_strategy": "side_by_side",
  "final_component": "MultiPanelView",
  "confidence": "high",
  "explanation_needed": true
}

## Example 2: Compare CPU of two pods
User: "compare cpu of payment and billing pods"
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

## Example 2b: Get CPU for single pod
User: "get CPU usage for pod nginx"
{
  "is_multi_step": false,
  "steps": [
    {
      "step_number": 1,
      "tool": "describe_pod",
      "args": {"name": "nginx", "namespace": "default"},
      "description": "Get pod details including CPU metrics"
    }
  ],
  "merge_strategy": "sequential",
  "final_component": "StatusSummary",
  "confidence": "high",
  "explanation_needed": false
}

## Example 3: Logs with explanation
User: "get logs for nginx and explain errors"
{
  "is_multi_step": false,
  "steps": [
    {
      "step_number": 1,
      "tool": "get_pod_logs",
      "args": {"name": "nginx", "namespace": "default", "tail": 200},
      "description": "Fetch nginx logs and auto-analyze for errors"
    }
  ],
  "merge_strategy": "sequential",
  "final_component": "LogsViewer",
  "confidence": "high",
  "explanation_needed": true
}

## Example 4: Multi-step aggregation
User: "show all pods in production with their events"
{
  "is_multi_step": true,
  "steps": [
    {
      "step_number": 1,
      "tool": "get_pods",
      "args": {"namespace": "production"},
      "description": "Get all production pods"
    },
    {
      "step_number": 2,
      "tool": "get_pod_events",
      "args": {
        "name": "$DYNAMIC_EACH",
        "namespace": "production"
      },
      "depends_on": [1],
      "description": "Get events for each pod"
    }
  ],
  "merge_strategy": "aggregate",
  "final_component": "MultiPanelView",
  "confidence": "high",
  "explanation_needed": false
}

# DETECTION RULES

Detect multi-step when user says:
- "X and Y" → Two operations (e.g., "show pods and their logs")
- "compare X and Y" → Comparison (e.g., "compare CPU of pod A and B")
- "show X with their Y" → Aggregation with loop (e.g., "show all pods with their events")
- "all X and their Y" → Loop + aggregate

Use SINGLE-STEP with explanation_needed=true when user says:
- "explain" or "why" → Set explanation_needed: true, do NOT create multi-step
- "analyze" → Set explanation_needed: true, do NOT create multi-step
- User wants AI insight → Single tool + explanation flag

CRITICAL: Do NOT create tools like "analyze_logs", "assess_health", or "explain_*" - these are handled automatically via the explanation_needed flag.

# COMMON QUERIES TO TOOL MAPPING

**Pod Metrics/CPU/Memory queries:**
- "get CPU usage" → use "describe_pod"
- "show memory" → use "describe_pod"
- "pod metrics" → use "describe_pod"
- "resource usage" → use "get_resource_usage" (for cluster-wide) or "describe_pod" (for specific pod)

**Pod listing queries:**
- "show pods" → use "get_pods"
- "list pods" → use "get_pods"
- "failing pods" → use "get_filtered_pods"

**Log queries:**
- "get logs" → use "get_pod_logs"
- "show logs" → use "get_pod_logs"

**Event queries:**
- "why is X crashing" → use "get_pod_events"
- "what happened" → use "get_pod_events"

Now parse the user's request:`;
}

export async function generateMultiStepPlan(
  userInput: string,
): Promise<MultiStepPlan> {
  const startTime = Date.now();

  console.log("\n========== MULTI-STEP PLANNER DEBUG START ==========");
  console.log("🔵 Input:", userInput);

  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY environment variable not set");
    }

    const systemPrompt = buildMultiStepPrompt();

    console.log("🚀 Calling Groq API for multi-step planning...");
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
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

    console.log("📝 Raw response:", content);
    const plan = parseMultiStepPlan(content);

    const executionTime = Date.now() - startTime;
    console.log("✅ Multi-step plan generated!");
    console.log("   Is multi-step:", plan.is_multi_step);
    console.log("   Step count:", plan.steps.length);
    console.log("   Merge strategy:", plan.merge_strategy);
    console.log("   Final component:", plan.final_component);
    console.log("   Execution time:", executionTime, "ms");
    console.log("========== MULTI-STEP PLANNER DEBUG END ==========\n");

    logger.info("Multi-step plan generated", {
      isMultiStep: plan.is_multi_step,
      stepCount: plan.steps.length,
      mergeStrategy: plan.merge_strategy,
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
