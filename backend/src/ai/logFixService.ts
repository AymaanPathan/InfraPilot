import Groq from "groq-sdk";
import logger from "../utils/logger";

/**
 * Log Fix Suggestions Service
 *
 * Analyzes error logs and generates actionable "Fix It" suggestions
 * using AI to understand the context and provide remediation steps
 */

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ErrorPattern {
  pattern: RegExp;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
}

export interface FixSuggestion {
  title: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  steps: string[];
  commands?: string[];
  documentation?: string;
  relatedErrors?: string[];
}

export interface LogAnalysisResult {
  hasErrors: boolean;
  errorCount: number;
  warningCount: number;
  suggestions: FixSuggestion[];
  summary: string;
  criticalIssues: string[];
}

/**
 * Common Kubernetes error patterns
 */
const K8S_ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /CrashLoopBackOff|ImagePullBackOff/i,
    category: "container_startup",
    severity: "critical",
  },
  {
    pattern: /OOMKilled|out of memory/i,
    category: "resource_limits",
    severity: "critical",
  },
  {
    pattern: /ErrImagePull|Failed to pull image/i,
    category: "image_issues",
    severity: "high",
  },
  {
    pattern: /connection refused|dial tcp.*connect: connection refused/i,
    category: "network_connectivity",
    severity: "high",
  },
  {
    pattern: /permission denied|forbidden|unauthorized/i,
    category: "rbac_permissions",
    severity: "high",
  },
  {
    pattern: /liveness probe failed|readiness probe failed/i,
    category: "health_checks",
    severity: "medium",
  },
  {
    pattern: /panic|fatal error/i,
    category: "application_crash",
    severity: "critical",
  },
  {
    pattern: /database.*connection|mysql.*error|postgres.*error/i,
    category: "database_connectivity",
    severity: "high",
  },
];

/**
 * Extract errors from logs
 */
export function extractErrors(logs: string | string[]): string[] {
  const logLines = Array.isArray(logs) ? logs : logs.split("\n");

  const errorLines = logLines.filter((line) => {
    return /error|exception|fail|fatal|panic|err\[/i.test(line);
  });

  return errorLines.slice(0, 20); // Limit to first 20 errors
}

/**
 * Categorize errors by pattern
 */
function categorizeErrors(errors: string[]): Map<string, string[]> {
  const categorized = new Map<string, string[]>();

  errors.forEach((error) => {
    let matched = false;

    for (const pattern of K8S_ERROR_PATTERNS) {
      if (pattern.pattern.test(error)) {
        const existing = categorized.get(pattern.category) || [];
        existing.push(error);
        categorized.set(pattern.category, existing);
        matched = true;
        break;
      }
    }

    if (!matched) {
      const existing = categorized.get("general") || [];
      existing.push(error);
      categorized.set("general", existing);
    }
  });

  return categorized;
}

/**
 * Generate AI-powered fix suggestions
 */
export async function generateLogFixSuggestions(
  logs: string | string[],
  podName: string,
  namespace: string = "default",
): Promise<LogAnalysisResult> {
  const startTime = Date.now();

  try {
    logger.info("Generating log fix suggestions", { podName, namespace });

    // Extract errors
    const errors = extractErrors(logs);

    if (errors.length === 0) {
      return {
        hasErrors: false,
        errorCount: 0,
        warningCount: 0,
        suggestions: [],
        summary: "No errors detected in logs",
        criticalIssues: [],
      };
    }

    // Categorize errors
    const categorized = categorizeErrors(errors);

    // Build context for AI
    const errorSummary = Array.from(categorized.entries())
      .map(([category, errs]) => `${category}: ${errs.length} errors`)
      .join(", ");

    const sampleErrors = errors.slice(0, 10).join("\n");

    // Generate AI suggestions
    const prompt = buildFixSuggestionsPrompt(
      podName,
      namespace,
      sampleErrors,
      errorSummary,
    );

    const response = await groq.chat.completions.create({
      model: process.env.AI_MODEL || "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse AI response
    const suggestions = parseFixSuggestions(content);

    const executionTime = Date.now() - startTime;

    logger.info("Log fix suggestions generated", {
      podName,
      errorCount: errors.length,
      suggestionCount: suggestions.length,
      executionTime,
    });

    // Identify critical issues
    const criticalIssues = identifyCriticalIssues(errors, categorized);

    return {
      hasErrors: true,
      errorCount: errors.length,
      warningCount: countWarnings(
        Array.isArray(logs) ? logs : logs.split("\n"),
      ),
      suggestions,
      summary: `Found ${errors.length} error(s) in ${podName}. ${suggestions.length} fix suggestion(s) available.`,
      criticalIssues,
    };
  } catch (error) {
    logger.error("Failed to generate log fix suggestions", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Return fallback suggestions
    return generateFallbackSuggestions(logs, podName);
  }
}

/**
 * Build prompt for AI fix suggestions
 */
function buildFixSuggestionsPrompt(
  podName: string,
  namespace: string,
  sampleErrors: string,
  errorSummary: string,
): string {
  return `You are a Kubernetes troubleshooting expert. Analyze the following error logs and provide actionable fix suggestions.

Pod: ${podName}
Namespace: ${namespace}
Error Summary: ${errorSummary}

Sample Error Logs:
\`\`\`
${sampleErrors}
\`\`\`

Provide fix suggestions in the following JSON format:
\`\`\`json
{
  "suggestions": [
    {
      "title": "Short descriptive title",
      "category": "container_startup|resource_limits|image_issues|network_connectivity|rbac_permissions|health_checks|application_crash|database_connectivity|general",
      "severity": "critical|high|medium|low",
      "description": "Detailed explanation of the issue",
      "steps": [
        "Step 1: Clear action to take",
        "Step 2: Another action",
        "Step 3: Verification step"
      ],
      "commands": [
        "kubectl command if applicable",
        "another command"
      ],
      "documentation": "URL to relevant docs (if applicable)"
    }
  ]
}
\`\`\`

IMPORTANT:
- Provide 1-3 most relevant suggestions
- Be specific and actionable
- Include actual kubectl commands when helpful
- Focus on root cause, not symptoms
- Order by severity (critical first)
- Keep descriptions concise but informative

Return ONLY the JSON, no markdown, no explanations.`;
}

/**
 * Parse AI response into fix suggestions
 */
function parseFixSuggestions(content: string): FixSuggestion[] {
  try {
    // Remove markdown code blocks if present
    let cleaned = content.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleaned);

    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      throw new Error("Invalid suggestions format");
    }

    return parsed.suggestions.map((s: any) => ({
      title: s.title || "Unknown Issue",
      category: s.category || "general",
      severity: s.severity || "medium",
      description: s.description || "",
      steps: s.steps || [],
      commands: s.commands || [],
      documentation: s.documentation,
      relatedErrors: s.relatedErrors || [],
    }));
  } catch (error) {
    logger.error("Failed to parse fix suggestions", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Generate fallback suggestions based on common patterns
 */
function generateFallbackSuggestions(
  logs: string | string[],
  podName: string,
): LogAnalysisResult {
  const errors = extractErrors(logs);
  const suggestions: FixSuggestion[] = [];

  const logText = Array.isArray(logs) ? logs.join("\n") : logs;

  // CrashLoopBackOff
  if (/CrashLoopBackOff/i.test(logText)) {
    suggestions.push({
      title: "Fix CrashLoopBackOff",
      category: "container_startup",
      severity: "critical",
      description:
        "The container is repeatedly crashing and restarting. Check application logs for the root cause.",
      steps: [
        "Check the container logs for error messages",
        "Verify the container command and arguments are correct",
        "Ensure all required environment variables are set",
        "Check if the application has proper startup health checks",
      ],
      commands: [
        `kubectl logs ${podName} --previous`,
        `kubectl describe pod ${podName}`,
      ],
    });
  }

  // OOMKilled
  if (/OOMKilled|out of memory/i.test(logText)) {
    suggestions.push({
      title: "Increase Memory Limits",
      category: "resource_limits",
      severity: "critical",
      description:
        "The container was killed due to out-of-memory (OOM). Increase memory limits or optimize application memory usage.",
      steps: [
        "Check current memory limits and usage",
        "Increase memory limits in deployment spec",
        "Monitor memory usage patterns",
        "Consider optimizing application memory usage",
      ],
      commands: [
        `kubectl top pod ${podName}`,
        "kubectl edit deployment <deployment-name>",
      ],
    });
  }

  // Image pull errors
  if (/ImagePullBackOff|ErrImagePull/i.test(logText)) {
    suggestions.push({
      title: "Fix Image Pull Issues",
      category: "image_issues",
      severity: "high",
      description:
        "Unable to pull the container image. Verify image name, registry credentials, and network connectivity.",
      steps: [
        "Verify the image name and tag are correct",
        "Check if image registry credentials are configured",
        "Ensure the image exists in the registry",
        "Verify network access to the registry",
      ],
      commands: [
        `kubectl describe pod ${podName}`,
        "kubectl get secret <imagePullSecret> -o yaml",
      ],
    });
  }

  // Connection refused
  if (/connection refused/i.test(logText)) {
    suggestions.push({
      title: "Fix Network Connectivity",
      category: "network_connectivity",
      severity: "high",
      description:
        "Connection refused errors indicate the target service is not accessible. Check service configuration and network policies.",
      steps: [
        "Verify the target service is running",
        "Check service endpoints are available",
        "Verify network policies allow traffic",
        "Ensure correct service port configuration",
      ],
      commands: [
        "kubectl get svc",
        "kubectl get endpoints",
        "kubectl get networkpolicies",
      ],
    });
  }

  return {
    hasErrors: errors.length > 0,
    errorCount: errors.length,
    warningCount: countWarnings(Array.isArray(logs) ? logs : logs.split("\n")),
    suggestions,
    summary: `Detected ${errors.length} error(s). ${suggestions.length} automated suggestion(s) available.`,
    criticalIssues: identifyCriticalIssues(errors, categorizeErrors(errors)),
  };
}

/**
 * Count warnings in logs
 */
function countWarnings(logLines: string[]): number {
  return logLines.filter((line) => /warn|warning/i.test(line)).length;
}

/**
 * Identify critical issues that need immediate attention
 */
function identifyCriticalIssues(
  errors: string[],
  categorized: Map<string, string[]>,
): string[] {
  const critical: string[] = [];

  K8S_ERROR_PATTERNS.forEach((pattern) => {
    if (pattern.severity === "critical") {
      const categoryErrors = categorized.get(pattern.category) || [];
      if (categoryErrors.length > 0) {
        critical.push(
          `${pattern.category.replace("_", " ").toUpperCase()}: ${categoryErrors.length} error(s)`,
        );
      }
    }
  });

  return critical;
}

/**
 * Quick check if logs contain errors
 */
export function hasErrors(logs: string | string[]): boolean {
  const logText = Array.isArray(logs) ? logs.join("\n") : logs;
  return /error|exception|fail|fatal|panic/i.test(logText);
}
