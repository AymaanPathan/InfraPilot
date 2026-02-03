import Groq from "groq-sdk";
import logger from "../utils/logger";

/**
 * Explain Service
 *
 * Uses AI to:
 * - Summarize pod failures
 * - Explain error messages in logs
 * - Suggest remediation steps
 * - Provide context for Kubernetes events
 */

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * System prompt for explaining pod failures
 */
const POD_FAILURE_PROMPT = `You are a Kubernetes expert helping developers understand pod failures.

Your job is to:
1. Analyze the pod status, events, and logs
2. Identify the root cause of the failure
3. Explain it in simple, actionable terms
4. Suggest concrete next steps

Keep your response:
- Concise (2-4 sentences)
- Developer-friendly (no jargon unless necessary)
- Actionable (what should they do next?)

Common failure patterns to recognize:
- ImagePullBackOff: Container image not found or inaccessible
- CrashLoopBackOff: Container starts then immediately crashes (check logs for error)
- OOMKilled: Pod ran out of memory (increase memory limits)
- Pending: Insufficient cluster resources or scheduling issues
- Error: General container error (check logs)
- ErrImagePull: Cannot pull container image (check image name, registry access)

Respond in this format:
**Root Cause:** [1 sentence summary]
**Explanation:** [1-2 sentences with details]
**Next Steps:** [Specific action to take]`;

/**
 * System prompt for explaining logs
 */
const LOG_EXPLANATION_PROMPT = `You are a Kubernetes expert helping developers understand application logs.

Your job is to:
1. Identify error patterns in the logs
2. Explain what the errors mean
3. Suggest how to fix them

Keep your response:
- Concise (2-3 sentences)
- Focus on the most critical errors
- Provide specific remediation steps

Common log patterns to recognize:
- Connection errors: Database/API connectivity issues
- Authentication errors: Invalid credentials or tokens
- Resource errors: Out of memory, disk space, file handles
- Code errors: Exceptions, panics, stack traces
- Configuration errors: Missing env vars, invalid config

Respond in this format:
**Errors Found:** [Brief summary of key errors]
**Likely Cause:** [What's causing these errors]
**Suggested Fix:** [Specific action to resolve]`;

/**
 * System prompt for event analysis
 */
const EVENT_ANALYSIS_PROMPT = `You are a Kubernetes expert helping developers understand pod events.

Your job is to:
1. Analyze the sequence of Kubernetes events
2. Identify the timeline of what went wrong
3. Suggest remediation steps

Keep your response:
- Concise (2-3 sentences)
- Timeline-focused (what happened in order)
- Actionable

Respond in this format:
**Timeline:** [Brief sequence of events]
**Root Cause:** [What caused this]
**Action Required:** [What to do next]`;

/**
 * Explain a pod failure
 *
 * @param podData - Pod details including status, events, logs
 * @returns AI-generated explanation
 */
export async function explainPodFailure(podData: {
  name: string;
  namespace: string;
  status?: any;
  events?: any[];
  logs?: string;
  containers?: any[];
}): Promise<string> {
  const startTime = Date.now();

  logger.info("Explaining pod failure", {
    pod: podData.name,
    namespace: podData.namespace,
  });

  try {
    // Build context from available data
    const context = buildPodContext(podData);

    // Call AI
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: POD_FAILURE_PROMPT },
        {
          role: "user",
          content: `Analyze this pod failure:\n\n${context}`,
        },
      ],
      temperature: 0.3, // Slightly higher for more natural explanations
      max_tokens: 500,
      stream: false,
    });

    const explanation = response.choices[0]?.message?.content;

    if (!explanation) {
      throw new Error("No explanation generated");
    }

    const executionTime = Date.now() - startTime;

    logger.info("Pod failure explained", {
      pod: podData.name,
      executionTime,
      explanationLength: explanation.length,
    });

    return explanation.trim();
  } catch (error) {
    const executionTime = Date.now() - startTime;

    logger.error("Failed to explain pod failure", {
      pod: podData.name,
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    });

    // Return fallback explanation
    return getFallbackPodExplanation(podData);
  }
}

/**
 * Explain logs and identify errors
 *
 * @param logs - Raw log output from pod
 * @param podName - Pod name for context
 * @returns AI-generated log analysis
 */
export async function explainLogs(
  logs: string,
  podName?: string,
): Promise<string> {
  const startTime = Date.now();

  logger.info("Explaining logs", {
    pod: podName,
    logLength: logs.length,
  });

  try {
    // Truncate logs if too long (keep last 3000 chars for recent errors)
    const truncatedLogs = logs.length > 3000 ? logs.slice(-3000) : logs;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: LOG_EXPLANATION_PROMPT },
        {
          role: "user",
          content: `Analyze these logs${podName ? ` from pod ${podName}` : ""}:\n\n${truncatedLogs}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 400,
      stream: false,
    });

    const explanation = response.choices[0]?.message?.content;

    if (!explanation) {
      throw new Error("No explanation generated");
    }

    const executionTime = Date.now() - startTime;

    logger.info("Logs explained", {
      pod: podName,
      executionTime,
    });

    return explanation.trim();
  } catch (error) {
    const executionTime = Date.now() - startTime;

    logger.error("Failed to explain logs", {
      pod: podName,
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    });

    return getFallbackLogExplanation(logs);
  }
}

/**
 * Analyze pod events
 *
 * @param events - Kubernetes events for the pod
 * @param podName - Pod name for context
 * @returns AI-generated event analysis
 */
export async function analyzeEvents(
  events: any[],
  podName?: string,
): Promise<string> {
  const startTime = Date.now();

  logger.info("Analyzing events", {
    pod: podName,
    eventCount: events.length,
  });

  try {
    // Format events for analysis
    const formattedEvents = events
      .map(
        (e) =>
          `[${e.type || "Normal"}] ${e.reason || "Event"}: ${e.message || "No message"} (${e.lastTimestamp || e.eventTime || "Unknown time"})`,
      )
      .join("\n");

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: EVENT_ANALYSIS_PROMPT },
        {
          role: "user",
          content: `Analyze these events${podName ? ` for pod ${podName}` : ""}:\n\n${formattedEvents}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 400,
      stream: false,
    });

    const explanation = response.choices[0]?.message?.content;

    if (!explanation) {
      throw new Error("No explanation generated");
    }

    const executionTime = Date.now() - startTime;

    logger.info("Events analyzed", {
      pod: podName,
      executionTime,
    });

    return explanation.trim();
  } catch (error) {
    const executionTime = Date.now() - startTime;

    logger.error("Failed to analyze events", {
      pod: podName,
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    });

    return getFallbackEventExplanation(events);
  }
}

/**
 * Get next recommended action
 *
 * @param context - Current situation context
 * @returns Suggested next action
 */
export async function suggestNextAction(context: {
  issue: string;
  podName?: string;
  namespace?: string;
  additionalContext?: string;
}): Promise<string> {
  const startTime = Date.now();

  logger.info("Suggesting next action", {
    issue: context.issue,
    pod: context.podName,
  });

  try {
    const prompt = `Given this Kubernetes issue: "${context.issue}"${
      context.podName ? ` for pod ${context.podName}` : ""
    }${context.additionalContext ? `\n\nAdditional context: ${context.additionalContext}` : ""}

What should the developer do next? Provide ONE specific, actionable command or step.`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a Kubernetes expert. Provide ONE specific, actionable next step. Be concise (1-2 sentences).",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 200,
      stream: false,
    });

    const suggestion = response.choices[0]?.message?.content;

    if (!suggestion) {
      throw new Error("No suggestion generated");
    }

    const executionTime = Date.now() - startTime;

    logger.info("Next action suggested", {
      executionTime,
    });

    return suggestion.trim();
  } catch (error) {
    const executionTime = Date.now() - startTime;

    logger.error("Failed to suggest next action", {
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    });

    return "Check pod logs for more details: `kubectl logs <pod-name>`";
  }
}

/**
 * Build context string from pod data
 */
function buildPodContext(podData: {
  name: string;
  namespace: string;
  status?: any;
  events?: any[];
  logs?: string;
  containers?: any[];
}): string {
  const parts: string[] = [];

  parts.push(`Pod: ${podData.name}`);
  parts.push(`Namespace: ${podData.namespace}`);

  if (podData.status) {
    parts.push(`Status: ${JSON.stringify(podData.status, null, 2)}`);
  }

  if (podData.containers && podData.containers.length > 0) {
    parts.push(
      `Containers: ${podData.containers.map((c) => c.name || c).join(", ")}`,
    );
  }

  if (podData.events && podData.events.length > 0) {
    parts.push("\nRecent Events:");
    podData.events.slice(0, 5).forEach((e) => {
      parts.push(`- [${e.type}] ${e.reason}: ${e.message}`);
    });
  }

  if (podData.logs) {
    const truncatedLogs =
      podData.logs.length > 1000 ? podData.logs.slice(-1000) : podData.logs;
    parts.push(`\nRecent Logs:\n${truncatedLogs}`);
  }

  return parts.join("\n");
}

/**
 * Fallback explanation when AI fails
 */
function getFallbackPodExplanation(podData: {
  status?: any;
  events?: any[];
}): string {
  const status = podData.status?.phase || "Unknown";
  const reason = podData.status?.reason || "";

  if (reason.includes("ImagePullBackOff") || reason.includes("ErrImagePull")) {
    return "**Root Cause:** Container image cannot be pulled.\n**Explanation:** The container image may not exist, the image name may be incorrect, or there may be authentication issues with the registry.\n**Next Steps:** Verify the image name and tag, and ensure you have access to the container registry.";
  }

  if (reason.includes("CrashLoopBackOff")) {
    return "**Root Cause:** Container is crashing immediately after starting.\n**Explanation:** The application inside the container is exiting with an error.\n**Next Steps:** Check the pod logs to see the error message: `kubectl logs <pod-name>`";
  }

  if (reason.includes("OOMKilled")) {
    return "**Root Cause:** Pod was killed due to out of memory.\n**Explanation:** The container exceeded its memory limit.\n**Next Steps:** Increase the memory limit in the pod specification or optimize your application's memory usage.";
  }

  if (status === "Pending") {
    return "**Root Cause:** Pod is waiting to be scheduled.\n**Explanation:** There may not be enough cluster resources or the pod has scheduling constraints that can't be met.\n**Next Steps:** Check cluster capacity and pod resource requests.";
  }

  return "**Root Cause:** Pod failure detected.\n**Explanation:** Check pod events and logs for more details.\n**Next Steps:** Run `kubectl describe pod <pod-name>` and `kubectl logs <pod-name>` for more information.";
}

/**
 * Fallback log explanation when AI fails
 */
function getFallbackLogExplanation(logs: string): string {
  // Look for common error patterns
  const hasError = /error|exception|fail|fatal|panic/i.test(logs);
  const hasWarning = /warn|warning/i.test(logs);

  if (hasError) {
    return "**Errors Found:** Application errors detected in logs.\n**Likely Cause:** Check the error messages for specific failure reasons.\n**Suggested Fix:** Review the error stack traces and fix the underlying issues in your code.";
  }

  if (hasWarning) {
    return "**Errors Found:** Warnings detected in logs.\n**Likely Cause:** Non-critical issues that may affect performance or functionality.\n**Suggested Fix:** Review warnings and address them to prevent potential problems.";
  }

  return "**Errors Found:** No obvious errors detected in logs.\n**Likely Cause:** Application may be running normally or errors are not being logged.\n**Suggested Fix:** If issues persist, enable debug logging to get more details.";
}

/**
 * Fallback event explanation when AI fails
 */
function getFallbackEventExplanation(events: any[]): string {
  if (!events || events.length === 0) {
    return "**Timeline:** No events recorded for this pod.\n**Root Cause:** Unknown.\n**Action Required:** Check pod status and logs for more information.";
  }

  const warningEvents = events.filter((e) => e.type === "Warning");

  if (warningEvents.length > 0) {
    const firstWarning = warningEvents[0];
    return `**Timeline:** Warning events detected starting with ${firstWarning.reason}.\n**Root Cause:** ${firstWarning.message}\n**Action Required:** Address the warning conditions to stabilize the pod.`;
  }

  return "**Timeline:** Pod events recorded but no warnings found.\n**Root Cause:** Pod appears to be operating normally based on events.\n**Action Required:** If issues persist, check pod logs for application-level errors.";
}

/**
 * Validate explain service capability (for health checks)
 */
export function validateExplainCapability(): {
  configured: boolean;
  error?: string;
} {
  if (!process.env.GROQ_API_KEY) {
    return {
      configured: false,
      error: "GROQ_API_KEY environment variable not set",
    };
  }

  return {
    configured: true,
  };
}
