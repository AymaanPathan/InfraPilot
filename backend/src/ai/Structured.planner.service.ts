import Groq from "groq-sdk";
import logger from "../utils/logger";
import { getToolSchemasForPlanner, TOOL_REGISTRY } from "./ToolsRegistry";

/**
 * Structured Planner Service - NAMESPACE FIX
 *
 * Converts natural language to STRICT JSON tool calls.
 * Fixed: Better namespace handling for "show all pods"
 */

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface PlannerOutput {
  tool: string;
  args: Record<string, any>;
  ui_component: string;
  explain_needed: boolean;
  confidence: "high" | "medium" | "low";
}

export function buildPlannerPrompt(): string {
  const toolSchemas = getToolSchemasForPlanner();

  return `You are a Kubernetes intent parser. Convert user requests to STRICT JSON tool calls.

# CRITICAL RULES
1. Output ONLY valid JSON - no markdown, no explanation, no extra text
2. Always respond with this exact structure:
{
  "tool": "tool_name",
  "args": {...},
  "ui_component": "ComponentName",
  "explain_needed": true/false,
  "confidence": "high/medium/low"
}

3. NAMESPACE RULES (VERY IMPORTANT):
   - If user says "all pods" or "list pods" or "show pods" WITHOUT specifying namespace → DO NOT include namespace field (query all namespaces)
   - If user says "pods in [namespace]" or "show pods in production" → namespace: "[namespace]"
   - If user specifies a pod by name for logs/events → namespace: "default" (unless specified)
   - Only add namespace when explicitly mentioned OR when targeting specific named resources
4. Extract exact entity names from user input
5. Infer filters from natural language

# AVAILABLE TOOLS

${toolSchemas}

# FIELD DEFINITIONS

- tool: MUST be one of the tool names listed above
- args: Arguments matching the tool's schema
  - For get_pods: namespace is OPTIONAL - omit it to query all namespaces
  - For get_pod_logs/get_pod_events: namespace defaults to "default"
- ui_component: The default UI component for this tool
- explain_needed: true if user asked "why", "what happened", or needs explanation
- confidence: 
  - "high" = clear intent, all required info present
  - "medium" = likely correct but ambiguous
  - "low" = guessing, missing critical info

# INTENT MAPPING EXAMPLES

User: "show all pods"
{
  "tool": "get_pods",
  "args": {},
  "ui_component": "PodGrid",
  "explain_needed": false,
  "confidence": "high"
}

User: "list pods"
{
  "tool": "get_pods",
  "args": {},
  "ui_component": "PodGrid",
  "explain_needed": false,
  "confidence": "high"
}

User: "show pods in production"
{
  "tool": "get_pods",
  "args": {
    "namespace": "production"
  },
  "ui_component": "PodGrid",
  "explain_needed": false,
  "confidence": "high"
}

User: "pods in default namespace"
{
  "tool": "get_pods",
  "args": {
    "namespace": "default"
  },
  "ui_component": "PodGrid",
  "explain_needed": false,
  "confidence": "high"
}

User: "get logs for nginx"
{
  "tool": "get_pod_logs",
  "args": {
    "name": "nginx",
    "namespace": "default"
  },
  "ui_component": "LogsViewer",
  "explain_needed": false,
  "confidence": "high"
}

User: "why is payment-service crashing?"
{
  "tool": "get_pod_events",
  "args": {
    "name": "payment-service",
    "namespace": "default"
  },
  "ui_component": "EventsTimeline",
  "explain_needed": true,
  "confidence": "high"
}

User: "show cluster overview"
{
  "tool": "get_cluster_overview",
  "args": {},
  "ui_component": "ClusterOverview",
  "explain_needed": false,
  "confidence": "high"
}

User: "show failed pods"
{
  "tool": "get_filtered_pods",
  "args": {
    "status": ["Failed"]
  },
  "ui_component": "PodGrid",
  "explain_needed": false,
  "confidence": "high"
}

Now convert the user's request to a tool call. Respond with ONLY the JSON object:`;
}

export async function generateStructuredPlan(
  userInput: string,
): Promise<PlannerOutput> {
  const startTime = Date.now();

  console.log("\n========== PLANNER DEBUG START ==========");
  console.log("📝 Input:", userInput);
  console.log("🔑 API Key present:", !!process.env.GROQ_API_KEY);

  logger.info("Generating structured plan", {
    input: userInput.substring(0, 100),
  });

  try {
    if (!process.env.GROQ_API_KEY) {
      console.error("❌ GROQ_API_KEY not found in environment");
      throw new Error("GROQ_API_KEY environment variable not set");
    }

    const systemPrompt = buildPlannerPrompt();
    console.log("📋 System prompt length:", systemPrompt.length);

    console.log("🚀 Calling Groq API...");
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
      ],
      temperature: 0.1,
      max_tokens: 500,
      top_p: 1,
      stream: false,
    });

    console.log("✅ Groq API responded");
    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error("❌ No content in response!");
      throw new Error("No response from AI model - content is null/undefined");
    }

    console.log("📝 Raw content:", content);
    const plan = parseAndValidatePlan(content);

    const executionTime = Date.now() - startTime;
    console.log("✅ Plan generated successfully!");
    console.log("   Tool:", plan.tool);
    console.log("   Args:", JSON.stringify(plan.args));
    console.log("   UI Component:", plan.ui_component);
    console.log("   Execution time:", executionTime, "ms");
    console.log("========== PLANNER DEBUG END ==========\n");

    logger.info("Structured plan generated", {
      tool: plan.tool,
      confidence: plan.confidence,
      explainNeeded: plan.explain_needed,
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
    console.error("   Execution time:", executionTime, "ms");
    console.log("========== PLANNER DEBUG END ==========\n");

    logger.error("Structured plan generation failed", {
      input: userInput,
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    });

    throw error;
  }
}

function parseAndValidatePlan(content: string): PlannerOutput {
  try {
    if (content === null || content === undefined) {
      throw new Error("Content is null or undefined - cannot parse");
    }

    if (typeof content !== "string") {
      throw new Error(`Content must be a string, got: ${typeof content}`);
    }

    let cleaned = content.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    cleaned = cleaned.trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      throw new Error(
        `Invalid JSON from AI: ${parseError instanceof Error ? parseError.message : "Unknown parse error"}`,
      );
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Parsed content is not an object");
    }

    if (!parsed.tool || typeof parsed.tool !== "string") {
      throw new Error("Missing or invalid 'tool' field");
    }

    if (!parsed.args || typeof parsed.args !== "object") {
      throw new Error("Missing or invalid 'args' field");
    }

    if (!parsed.ui_component || typeof parsed.ui_component !== "string") {
      throw new Error("Missing or invalid 'ui_component' field");
    }

    if (typeof parsed.explain_needed !== "boolean") {
      throw new Error("Missing or invalid 'explain_needed' field");
    }

    if (!["high", "medium", "low"].includes(parsed.confidence)) {
      throw new Error("Invalid 'confidence' field - must be high/medium/low");
    }

    if (!(parsed.tool in TOOL_REGISTRY)) {
      const availableTools = Object.keys(TOOL_REGISTRY);
      throw new Error(
        `Unknown tool '${parsed.tool}'. Must be one of: ${availableTools.join(", ")}`,
      );
    }

    return parsed as PlannerOutput;
  } catch (error) {
    logger.error("Failed to parse planner output", {
      content: content ? content.substring(0, 300) : "null/undefined",
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof SyntaxError) {
      throw new Error(
        "AI returned invalid JSON. This is likely a temporary issue - please try again.",
      );
    }

    throw error;
  }
}

export function validatePlannerCapability(): {
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

export function getSmartSuggestions(): string[] {
  const suggestions: string[] = [];
  Object.values(TOOL_REGISTRY).forEach((tool) => {
    suggestions.push(...tool.examples.slice(0, 2));
  });
  return suggestions;
}
