import type { TamboTool } from "@tambo-ai/react";

/**
 * Infrastructure Command Tool - ENHANCED with AI Explanations (Phase E)
 *
 * Now supports:
 * - Auto-detection of pod issues
 * - AI-powered explanations
 * - Triage reports
 * - Error analysis
 */
export const infraCommandTool: TamboTool<{
  input: string;
  explain?: boolean;
}> = {
  name: "infra_command",
  description:
    "Execute Kubernetes operations using natural language with AI-powered explanations. Handles pod listing, logs, events, deployments, services, health monitoring, and automatic issue detection via MCP backend.",

  inputSchema: {
    type: "object",
    properties: {
      input: {
        type: "string",
        description:
          "Natural language command (e.g., 'show all pods', 'get logs for api-server', 'why is payment-service crashing?', 'analyze cluster health')",
      },
      explain: {
        type: "boolean",
        description:
          "Whether to include AI explanation of the results (auto-detects if not specified)",
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
        description:
          "Props to pass to the component (includes data + optional explanation)",
      },
      explanation: {
        type: "string",
        description:
          "AI-generated explanation (if auto-triggered or requested)",
      },
      autoExplained: {
        type: "boolean",
        description: "Whether explanation was auto-generated",
      },
    },
    required: ["componentName", "props"],
  },

  async tool({ input, explain = false }) {
    console.log("🟢 infra_command invoked", { input, explain });

    try {
      // Validate input
      if (!input || typeof input !== "string" || input.trim().length === 0) {
        console.error("❌ Invalid input:", input);

        return {
          componentName: "ErrorDisplay",
          props: {
            error: "Invalid input: command cannot be empty",
            hint: "Please provide a valid Kubernetes command",
          },
        };
      }

      console.log("📡 Calling backend at http://localhost:8000/api/ai/command");

      // Call backend API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let response: Response;
      try {
        response = await fetch("http://localhost:8000/api/ai/command", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input, explain }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error("❌ Fetch failed:", fetchError);

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

      console.log("📨 Response status:", response.status);

      // Parse response
      let data: any;
      try {
        const responseText = await response.text();
        console.log("📄 Response length:", responseText.length);

        if (!responseText || responseText.trim().length === 0) {
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
        console.log("✅ Parsed JSON:", {
          ok: data.ok,
          component: data.ui?.componentName,
          hasExplanation: !!data.meta?.explanation,
          autoExplained: data.meta?.autoExplained,
        });
      } catch (parseError) {
        console.error("❌ JSON parse failed:", parseError);
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
        console.error("❌ Backend error:", data);
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

      // Validate UI structure
      if (!data.ui || !data.ui.componentName || !data.ui.props) {
        console.error("❌ Invalid response structure:", data);
        return {
          componentName: "ErrorDisplay",
          props: {
            error: "Invalid response structure from backend",
            hint: "Backend returned data but missing required UI fields",
          },
        };
      }

      console.log("✅ Success - returning component:", {
        componentName: data.ui.componentName,
        propsKeys: Object.keys(data.ui.props),
        explanation: data.meta?.explanation ? "present" : "none",
      });

      // ENHANCEMENT: Include explanation in props if available
      const props = {
        ...data.ui.props,
        // Add explanation metadata if present
        ...(data.meta?.explanation && {
          explanation: data.meta.explanation,
          autoExplained: data.meta.autoExplained || false,
        }),
      };

      // Return the component info - Tambo will handle rendering
      return {
        componentName: data.ui.componentName,
        props,
        // Also return at top level for tool output schema
        ...(data.meta?.explanation && {
          explanation: data.meta.explanation,
          autoExplained: data.meta.autoExplained,
        }),
      };
    } catch (error) {
      console.error("💥 Unexpected error:", error);

      return {
        componentName: "ErrorDisplay",
        props: {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
          hint: "An unexpected error occurred. Check browser console.",
          details: error instanceof Error ? error.stack : String(error),
        },
      };
    }
  },
};
