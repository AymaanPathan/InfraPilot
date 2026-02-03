import Groq from "groq-sdk";
import logger from "../utils/logger";
import { TOOL_REGISTRY } from "./ToolsRegistry";

/**
 * Unified Planner Service - FIXED VERSION
 *
 * Converts natural language to STRICT JSON tool calls.
 * Uses ToolsRegistry as single source of truth.
 * Enhanced error handling and debugging.
 */

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Planner output schema
 */
export interface PlannerOutput {
  tool: string;
  args: Record<string, any>;
  ui_component: string;
  explain_needed: boolean;
  confidence: "high" | "medium" | "low";
}

/**
 * Build dynamic system prompt from tool registry
 */

/**
 * Generate structured plan from user input
 */

/**
 * Parse AI response and validate structure
 */
function parseAndValidatePlan(content: string): PlannerOutput {
  try {
    // Null/undefined check BEFORE any string operations
    if (content === null || content === undefined) {
      throw new Error("Content is null or undefined");
    }

    if (typeof content !== "string") {
      throw new Error(`Content is not a string, got: ${typeof content}`);
    }

    // Remove markdown code blocks if present
    let cleaned = content.trim();

    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    cleaned = cleaned.trim();

    logger.debug("Cleaned AI response", {
      original: content.substring(0, 100),
      cleaned: cleaned.substring(0, 100),
      cleanedLength: cleaned.length,
    });

    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      logger.error("JSON parse failed", {
        cleaned: cleaned,
        error:
          parseError instanceof Error ? parseError.message : String(parseError),
      });
      throw new Error(
        `Invalid JSON from AI: ${parseError instanceof Error ? parseError.message : "Unknown parse error"}`,
      );
    }

    // Validate required fields
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Parsed content is not an object");
    }

    if (!parsed.tool || typeof parsed.tool !== "string") {
      throw new Error(
        `Missing or invalid 'tool' field. Got: ${JSON.stringify(parsed)}`,
      );
    }

    if (!parsed.args || typeof parsed.args !== "object") {
      throw new Error(
        `Missing or invalid 'args' field. Got: ${JSON.stringify(parsed)}`,
      );
    }

    if (!parsed.ui_component || typeof parsed.ui_component !== "string") {
      throw new Error(
        `Missing or invalid 'ui_component' field. Got: ${JSON.stringify(parsed)}`,
      );
    }

    if (typeof parsed.explain_needed !== "boolean") {
      throw new Error(
        `Missing or invalid 'explain_needed' field. Got: ${JSON.stringify(parsed)}`,
      );
    }

    if (!["high", "medium", "low"].includes(parsed.confidence)) {
      throw new Error(
        `Invalid 'confidence' field - must be high/medium/low. Got: ${parsed.confidence}`,
      );
    }

    // Validate tool exists in registry
    if (!TOOL_REGISTRY[parsed.tool as keyof typeof TOOL_REGISTRY]) {
      const availableTools = Object.keys(TOOL_REGISTRY).slice(0, 10).join(", ");
      throw new Error(
        `Unknown tool '${parsed.tool}'. Available tools (first 10): ${availableTools}...`,
      );
    }

    logger.debug("Plan validated successfully", {
      tool: parsed.tool,
      argsKeys: Object.keys(parsed.args),
    });

    return parsed as PlannerOutput;
  } catch (error) {
    logger.error("Failed to parse planner output", {
      content: content ? content.substring(0, 300) : "null/undefined",
      contentType: typeof content,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof SyntaxError) {
      throw new Error(
        "AI returned invalid JSON. Please try rephrasing your request.",
      );
    }

    throw error;
  }
}

/**
 * Validate planner capability (for health checks)
 */
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

  // Test that Groq SDK can be initialized
  try {
    const testClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    return {
      configured: true,
    };
  } catch (error) {
    return {
      configured: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to initialize Groq client",
    };
  }
}

/**
 * Get suggestions based on tool registry
 */
export function getSmartSuggestions(): string[] {
  const suggestions: string[] = [];

  // Get first 2 examples from each category
  const categorizedTools: Record<string, any[]> = {};

  Object.values(TOOL_REGISTRY).forEach((tool) => {
    if (!categorizedTools[tool.category]) {
      categorizedTools[tool.category] = [];
    }
    categorizedTools[tool.category].push(tool);
  });

  // Add diverse examples
  Object.values(categorizedTools).forEach((tools) => {
    tools.slice(0, 2).forEach((tool) => {
      if (tool.examples && tool.examples.length > 0) {
        suggestions.push(tool.examples[0]);
      }
    });
  });

  return suggestions;
}

/**
 * Get available tools description for documentation
 */
export function getToolsDescription(): Array<{
  name: string;
  description: string;
  examples: string[];
  args: string;
}> {
  return Object.values(TOOL_REGISTRY).map((tool) => ({
    name: tool.name,
    description: tool.description,
    examples: tool.examples,
    args: JSON.stringify(tool.args_schema.shape),
  })) as any;
}
