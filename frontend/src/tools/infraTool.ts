import type { TamboTool } from "@tambo-ai/react";
import { logger } from "@/components/DevConsole";

/**
 * Infrastructure Command Tool - WITH DEV CONSOLE LOGGING
 *
 * Now logs all internal operations to DevConsole for debugging
 */
export const infraCommandTool: TamboTool<{
  input: string;
  explain?: boolean;
}> = {
  name: "infra_command",
  description: "Execute Kubernetes operations using natural language",

  inputSchema: {
    type: "object",
    properties: {
      input: {
        type: "string",
        description:
          "Natural language command (e.g., 'show all pods', 'get logs for api-server')",
      },
      explain: {
        type: "boolean",
        description: "Whether to include AI explanation",
        default: false,
      },
    },
    required: ["input"],
  },

  outputSchema: {
    type: "object",
    properties: {
      componentName: {
        type: "string",
        description: "Name of the component to render",
      },
      props: {
        type: "object",
        description: "Props to pass to the component",
      },
      explanation: {
        type: "string",
        description: "AI-generated explanation",
      },
      autoExplained: {
        type: "boolean",
        description: "Whether explanation was auto-generated",
      },
    },
    required: ["componentName", "props"],
  },

  async tool({ input, explain = false }) {
    // Group logs for this command
    logger.group(`Command: "${input}"`);
    logger.info("tool", "infra_command invoked", { input, explain });
    const isComparisonQuery = /compare|versus|vs\b/i.test(input);

    if (isComparisonQuery) {
      logger.info("tool", "🔵 COMPARISON DETECTED - sending to backend as-is", {
        input,
        isLogComparison: /logs?/i.test(input),
        isMetricComparison: /cpu|memory|metric|usage/i.test(input),
      });
    }
    try {
      // Validate input
      if (!input || typeof input !== "string" || input.trim().length === 0) {
        logger.error("tool", "Invalid input received", { input });

        return {
          componentName: "ErrorDisplay",
          props: {
            error: "Invalid input: command cannot be empty",
            hint: "Please provide a valid Kubernetes command",
          },
        };
      }

      logger.info("tool", "Input validated ✓");

      // Call backend
      const apiUrl = "http://localhost:8000/api/ai/command";
      logger.api("POST", apiUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        logger.warn("tool", "Request timeout - aborting");
        controller.abort();
      }, 30000);

      let response: Response;
      try {
        const startTime = Date.now();

        response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input, explain }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;
        logger.api("POST", apiUrl, response.status);
        logger.info("tool", `Request completed in ${duration}ms`);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        logger.error("tool", "Fetch failed", {
          error:
            fetchError instanceof Error
              ? fetchError.message
              : String(fetchError),
        });

        return {
          componentName: "ErrorDisplay",
          props: {
            error: "Failed to connect to backend",
            hint: "Check if backend is running on http://localhost:8000",
            details:
              fetchError instanceof Error
                ? fetchError.message
                : String(fetchError),
          },
        };
      }

      logger.info("tool", `Response status: ${response.status}`);

      // Parse response
      let data: any;
      try {
        const responseText = await response.text();
        logger.debug("tool", `Response length: ${responseText.length} bytes`);

        if (!responseText || responseText.trim().length === 0) {
          logger.error("tool", "Empty response from backend");

          return {
            componentName: "ErrorDisplay",
            props: {
              error: "Backend returned empty response",
              hint: "The backend may be experiencing issues",
              code: `HTTP ${response.status}`,
            },
          };
        }

        data = JSON.parse(responseText);
        logger.success("tool", "Response parsed successfully", {
          ok: data.ok,
          component: data.ui?.componentName,
          hasExplanation: !!data.meta?.explanation,
        });
      } catch (parseError) {
        logger.error("tool", "JSON parse failed", {
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
        });

        return {
          componentName: "ErrorDisplay",
          props: {
            error: "Invalid JSON response from backend",
            hint: "Backend may have crashed",
          },
        };
      }

      // Check for errors
      if (!response.ok || data.ok === false) {
        logger.error("tool", "Backend returned error", {
          error: data.error,
          code: data.code,
        });

        return {
          componentName: "ErrorDisplay",
          props: {
            error: data.error || "Backend operation failed",
            code: data.code,
            hint: data.hint,
            details: data.details,
            solution: data.solution,
          },
        };
      }

      // Validate response structure
      if (!data.ui || !data.ui.componentName || !data.ui.props) {
        logger.error("tool", "Invalid response structure", {
          hasUI: !!data.ui,
          hasComponent: !!data.ui?.componentName,
          hasProps: !!data.ui?.props,
        });

        return {
          componentName: "ErrorDisplay",
          props: {
            error: "Invalid response structure from backend",
            hint: "Backend returned data but missing required UI fields",
          },
        };
      }

      // Build props with explanation
      const props = {
        ...data.ui.props,
        ...(data.meta?.explanation && {
          explanation: data.meta.explanation,
          autoExplained: data.meta.autoExplained || false,
        }),
      };

      logger.success("tool", "Component ready to render", {
        component: data.ui.componentName,
        propsKeys: Object.keys(props),
        hasExplanation: !!props.explanation,
      });

      // Log component details
      if (props.pods) {
        logger.info("tool", `Rendering ${props.pods.length} pods`);
      }
      if (props.logs) {
        const logCount = Array.isArray(props.logs)
          ? props.logs.length
          : props.logs.split("\n").length;
        logger.info("tool", `Rendering ${logCount} log lines`);
      }

      logger.group("━━━ Tool execution complete ━━━");

      return {
        componentName: data.ui.componentName,
        props,
        ...(data.meta?.explanation && {
          explanation: data.meta.explanation,
          autoExplained: data.meta.autoExplained,
        }),
      };
    } catch (error) {
      logger.error("tool", "Unexpected error", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        componentName: "ErrorDisplay",
        props: {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
          hint: "An unexpected error occurred. Check DevConsole for details.",
          details: error instanceof Error ? error.stack : String(error),
        },
      };
    }
  },
};
