import Groq from "groq-sdk";
import logger from "../utils/logger";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * ENHANCED EXPLANATION SERVICE - PHASE E IMPLEMENTATION
 *
 * Features:
 * - Auto-detection of pod issues (CrashLoopBackOff, high restarts, unhealthy readiness)
 * - Intelligent error explanation
 * - Suggested remediation actions
 * - Context-aware explanations based on pod state
 */

// ============================================
// SYSTEM PROMPTS
// ============================================

const POD_FAILURE_EXPERT_PROMPT = `You are a senior Kubernetes SRE helping developers diagnose pod failures.

Your goal is to provide:
1. **Problem Summary** - What's wrong in one clear sentence
2. **Root Cause Analysis** - Why this is happening (technical but accessible)
3. **Immediate Action** - What to do RIGHT NOW to fix or investigate
4. **Prevention** - How to avoid this in the future

Keep your tone:
- Professional but supportive
- Technical but not overwhelming
- Action-oriented (always tell them what to do next)

Common Failure Patterns:
- **ImagePullBackOff**: Can't pull container image (registry auth, wrong image name, network issues)
- **CrashLoopBackOff**: App crashes immediately on startup (code bug, missing config, OOM at startup)
- **OOMKilled**: Ran out of memory (increase limits, optimize app, memory leak)
- **Pending**: Can't be scheduled (insufficient resources, node selector mismatch, PVC issues)
- **Error/Failed**: General failure (check logs for specifics)
- **Unhealthy**: Failing readiness/liveness probes (app not responding, probe misconfigured)

Output format:
**🔍 Problem**
[One sentence summary]

**💡 Root Cause**
[2-3 sentences explaining why]

**⚡ Immediate Action**
[Specific command or step to take NOW]

**🛡️ Prevention**
[One sentence on avoiding this]`;

const LOG_ANALYSIS_PROMPT = `You are an expert at analyzing application logs to identify errors and issues.

Your job:
1. Scan logs for ERROR, FATAL, PANIC, Exception patterns
2. Identify the most critical issues (ignore noise)
3. Explain what the errors mean
4. Suggest specific fixes

Focus on:
- Stack traces (extract key error lines)
- Connection failures (DB, API, network)
- Authentication/authorization errors
- Resource exhaustion (memory, disk, connections)
- Configuration errors

Output format:
**🔴 Critical Errors Found**
[List 1-3 most important errors]

**📊 Analysis**
[What these errors indicate]

**🔧 Recommended Fix**
[Specific actions to resolve, with commands if applicable]`;

const EVENT_TIMELINE_PROMPT = `You are a Kubernetes expert analyzing event timelines to diagnose issues.

Your job:
1. Reconstruct what happened chronologically
2. Identify the trigger event
3. Explain the cascade of failures
4. Suggest remediation

Pay attention to:
- Warning vs Normal events
- Event frequency (repeated events indicate persistent issues)
- Scheduling events (node affinity, resources)
- Volume/networking events (storage, DNS issues)

Output format:
**⏱️ Timeline**
[Chronological sequence of what happened]

**🎯 Trigger**
[What started this problem]

**🔧 Remediation**
[What to do to fix it]`;

const HEALTH_CHECK_PROMPT = `You are a Kubernetes health expert analyzing pod health metrics.

Analyze:
- Restart counts (>5 is concerning, >20 is critical)
- Readiness/liveness probe failures
- Age vs restarts (young pod with many restarts = serious issue)
- Resource utilization patterns

Output format:
**🏥 Health Assessment**
[Overall health summary]

**⚠️ Concerns**
[Specific issues detected]

**💊 Treatment Plan**
[Steps to improve health]`;

// ============================================
// ISSUE DETECTION
// ============================================

export interface PodIssue {
  type:
    | "crash_loop"
    | "high_restarts"
    | "unhealthy"
    | "oom"
    | "pending"
    | "image_pull"
    | "general";
  severity: "critical" | "warning" | "info";
  podName: string;
  namespace: string;
  description: string;
  metrics?: {
    restarts: number;
    age?: string;
    status?: string;
  };
}

/**
 * Auto-detect pod issues
 */
export function detectPodIssues(pods: any[]): PodIssue[] {
  const issues: PodIssue[] = [];

  for (const pod of pods) {
    const name = pod.name || pod.metadata?.name || "unknown";
    const namespace = pod.namespace || pod.metadata?.namespace || "default";
    const status = pod.status?.phase || pod.status || "Unknown";
    const restarts = pod.restarts || pod.restartCount || 0;
    const age = pod.age;

    // CrashLoopBackOff detection
    if (status.toLowerCase().includes("crashloop")) {
      issues.push({
        type: "crash_loop",
        severity: "critical",
        podName: name,
        namespace,
        description: `Pod ${name} is in CrashLoopBackOff - container crashes immediately after starting`,
        metrics: { restarts, age, status },
      });
      continue;
    }

    // ImagePullBackOff detection
    if (
      status.toLowerCase().includes("imagepull") ||
      status.toLowerCase().includes("errimagepull")
    ) {
      issues.push({
        type: "image_pull",
        severity: "critical",
        podName: name,
        namespace,
        description: `Pod ${name} cannot pull container image`,
        metrics: { restarts, age, status },
      });
      continue;
    }

    // OOMKilled detection
    if (status.toLowerCase().includes("oom")) {
      issues.push({
        type: "oom",
        severity: "critical",
        podName: name,
        namespace,
        description: `Pod ${name} was killed due to out of memory`,
        metrics: { restarts, age, status },
      });
      continue;
    }

    // Pending detection
    if (status === "Pending") {
      issues.push({
        type: "pending",
        severity: "warning",
        podName: name,
        namespace,
        description: `Pod ${name} is stuck in Pending state - cannot be scheduled`,
        metrics: { restarts, age, status },
      });
      continue;
    }

    // High restart count detection (even if currently running)
    if (restarts >= 5) {
      const severity =
        restarts >= 20 ? "critical" : restarts >= 10 ? "warning" : "info";
      issues.push({
        type: "high_restarts",
        severity,
        podName: name,
        namespace,
        description: `Pod ${name} has ${restarts} restarts - indicating instability`,
        metrics: { restarts, age, status },
      });
    }

    // Unhealthy detection (readiness probe failures)
    if (pod.ready === false || pod.conditions?.ready === false) {
      issues.push({
        type: "unhealthy",
        severity: "warning",
        podName: name,
        namespace,
        description: `Pod ${name} is not ready - failing health checks`,
        metrics: { restarts, age, status },
      });
    }
  }

  logger.info("Pod issues detected", {
    totalPods: pods.length,
    issuesFound: issues.length,
    critical: issues.filter((i) => i.severity === "critical").length,
  });

  return issues;
}

/**
 * Generate triage report for all detected issues
 */
export async function generateTriageReport(
  issues: PodIssue[],
): Promise<string> {
  if (issues.length === 0) {
    return "✅ **All Clear**\nNo pod issues detected. All pods are healthy.";
  }

  const critical = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");

  let report = `# 🚨 Pod Health Triage Report\n\n`;
  report += `**Issues Found:** ${issues.length} (${critical.length} critical, ${warnings.length} warnings)\n\n`;

  if (critical.length > 0) {
    report += `## ⚠️ Critical Issues (Immediate Attention Required)\n\n`;
    for (const issue of critical) {
      report += `### ${issue.podName} (${issue.namespace})\n`;
      report += `**Type:** ${issue.type.replace(/_/g, " ").toUpperCase()}\n`;
      report += `**Issue:** ${issue.description}\n`;
      if (issue.metrics?.restarts) {
        report += `**Restarts:** ${issue.metrics.restarts}\n`;
      }
      report += `\n`;
    }
  }

  if (warnings.length > 0) {
    report += `## ⚠️ Warnings (Should Investigate)\n\n`;
    for (const issue of warnings.slice(0, 5)) {
      // Limit to top 5
      report += `- **${issue.podName}**: ${issue.description}\n`;
    }
    if (warnings.length > 5) {
      report += `\n*...and ${warnings.length - 5} more warnings*\n`;
    }
  }

  return report;
}

// ============================================
// ENHANCED EXPLANATION FUNCTIONS
// ============================================

/**
 * Explain pod failure with full context
 */
export async function explainPodFailure(podData: {
  name: string;
  namespace: string;
  status?: any;
  events?: any[];
  logs?: string;
  containers?: any[];
  restarts?: number;
  age?: string;
}): Promise<string> {
  const startTime = Date.now();

  logger.info("Explaining pod failure", {
    pod: podData.name,
    namespace: podData.namespace,
    restarts: podData.restarts,
  });

  try {
    const context = buildEnhancedPodContext(podData);

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: POD_FAILURE_EXPERT_PROMPT },
        {
          role: "user",
          content: `Analyze this pod failure and provide diagnosis:\n\n${context}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 800,
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
    });

    return explanation.trim();
  } catch (error) {
    logger.error("Failed to explain pod failure", {
      pod: podData.name,
      error: error instanceof Error ? error.message : String(error),
    });

    return getFallbackPodExplanation(podData);
  }
}

/**
 * Analyze logs for errors
 */
export async function analyzeLogs(
  logs: string,
  podName?: string,
  namespace?: string,
): Promise<string> {
  const startTime = Date.now();

  logger.info("Analyzing logs", {
    pod: podName,
    logLength: logs.length,
  });

  try {
    // Truncate to last 4000 chars for recent errors
    const truncatedLogs = logs.length > 4000 ? logs.slice(-4000) : logs;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: LOG_ANALYSIS_PROMPT },
        {
          role: "user",
          content: `Analyze these logs${podName ? ` from pod ${podName}` : ""}:\n\n${truncatedLogs}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 600,
      stream: false,
    });

    const analysis = response.choices[0]?.message?.content;

    if (!analysis) {
      throw new Error("No analysis generated");
    }

    const executionTime = Date.now() - startTime;

    logger.info("Logs analyzed", {
      pod: podName,
      executionTime,
    });

    return analysis.trim();
  } catch (error) {
    logger.error("Failed to analyze logs", {
      pod: podName,
      error: error instanceof Error ? error.message : String(error),
    });

    return getFallbackLogAnalysis(logs);
  }
}

/**
 * Analyze event timeline
 */
export async function analyzeEventTimeline(
  events: any[],
  podName?: string,
): Promise<string> {
  const startTime = Date.now();

  logger.info("Analyzing event timeline", {
    pod: podName,
    eventCount: events.length,
  });

  try {
    const formattedEvents = events
      .slice(0, 20) // Last 20 events
      .map(
        (e) =>
          `[${e.type || "Normal"}] ${e.lastTimestamp || e.timestamp || "Unknown time"} - ${e.reason || "Event"}: ${e.message || "No message"}`,
      )
      .join("\n");

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: EVENT_TIMELINE_PROMPT },
        {
          role: "user",
          content: `Analyze this event timeline${podName ? ` for pod ${podName}` : ""}:\n\n${formattedEvents}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 600,
      stream: false,
    });

    const analysis = response.choices[0]?.message?.content;

    if (!analysis) {
      throw new Error("No analysis generated");
    }

    const executionTime = Date.now() - startTime;

    logger.info("Event timeline analyzed", {
      pod: podName,
      executionTime,
    });

    return analysis.trim();
  } catch (error) {
    logger.error("Failed to analyze event timeline", {
      pod: podName,
      error: error instanceof Error ? error.message : String(error),
    });

    return getFallbackEventAnalysis(events);
  }
}

/**
 * Assess pod health
 */
export async function assessPodHealth(pods: any[]): Promise<string> {
  const startTime = Date.now();

  logger.info("Assessing pod health", {
    podCount: pods.length,
  });

  try {
    const issues = detectPodIssues(pods);

    const healthSummary = pods
      .map((p) => {
        const name = p.name || "unknown";
        const status = p.status || "Unknown";
        const restarts = p.restarts || 0;
        const age = p.age || "unknown";
        return `${name}: ${status} (${restarts} restarts, age: ${age})`;
      })
      .join("\n");

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: HEALTH_CHECK_PROMPT },
        {
          role: "user",
          content: `Assess the health of these pods:\n\n${healthSummary}\n\nDetected Issues:\n${JSON.stringify(issues, null, 2)}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 600,
      stream: false,
    });

    const assessment = response.choices[0]?.message?.content;

    if (!assessment) {
      throw new Error("No assessment generated");
    }

    const executionTime = Date.now() - startTime;

    logger.info("Pod health assessed", {
      executionTime,
    });

    return assessment.trim();
  } catch (error) {
    logger.error("Failed to assess pod health", {
      error: error instanceof Error ? error.message : String(error),
    });

    return "Unable to generate health assessment. Check individual pod status for details.";
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildEnhancedPodContext(podData: {
  name: string;
  namespace: string;
  status?: any;
  events?: any[];
  logs?: string;
  containers?: any[];
  restarts?: number;
  age?: string;
}): string {
  const parts: string[] = [];

  parts.push(`# Pod: ${podData.name}`);
  parts.push(`Namespace: ${podData.namespace}`);

  if (podData.age) {
    parts.push(`Age: ${podData.age}`);
  }

  if (podData.restarts !== undefined) {
    parts.push(`Restarts: ${podData.restarts}`);
  }

  if (podData.status) {
    parts.push(`\n## Status`);
    parts.push(JSON.stringify(podData.status, null, 2));
  }

  if (podData.containers && podData.containers.length > 0) {
    parts.push(`\n## Containers`);
    parts.push(podData.containers.map((c) => c.name || c).join(", "));
  }

  if (podData.events && podData.events.length > 0) {
    parts.push(`\n## Recent Events (Last 5)`);
    podData.events.slice(0, 5).forEach((e) => {
      parts.push(`[${e.type}] ${e.reason}: ${e.message}`);
    });
  }

  if (podData.logs) {
    const truncatedLogs =
      podData.logs.length > 1500 ? podData.logs.slice(-1500) : podData.logs;
    parts.push(`\n## Recent Logs`);
    parts.push(truncatedLogs);
  }

  return parts.join("\n");
}

function getFallbackPodExplanation(podData: any): string {
  const status = podData.status?.phase || podData.status || "Unknown";
  const restarts = podData.restarts || 0;

  if (status.includes("CrashLoop")) {
    return `**🔍 Problem**
Pod is in CrashLoopBackOff state.

**💡 Root Cause**
The container starts but immediately crashes. This is usually due to application errors, missing configuration, or startup failures.

**⚡ Immediate Action**
Check logs: \`kubectl logs ${podData.name} -n ${podData.namespace}\`

**🛡️ Prevention**
Add proper health checks and ensure all environment variables and configs are set.`;
  }

  if (status.includes("ImagePull")) {
    return `**🔍 Problem**
Cannot pull container image.

**💡 Root Cause**
The image may not exist, the name/tag is wrong, or there are authentication issues with the registry.

**⚡ Immediate Action**
Verify image name and ensure registry credentials are configured.

**🛡️ Prevention**
Use image pull secrets and verify images exist before deploying.`;
  }

  if (restarts > 10) {
    return `**🔍 Problem**
Pod has restarted ${restarts} times.

**💡 Root Cause**
The application is unstable and keeps crashing or being killed.

**⚡ Immediate Action**
Check logs and events to identify the cause of restarts.

**🛡️ Prevention**
Fix application bugs and increase resource limits if needed.`;
  }

  return `**🔍 Problem**
Pod is experiencing issues.

**💡 Root Cause**
Check pod status, events, and logs for specific error details.

**⚡ Immediate Action**
Run: \`kubectl describe pod ${podData.name} -n ${podData.namespace}\`

**🛡️ Prevention**
Monitor pod health and set up alerts for failures.`;
}

function getFallbackLogAnalysis(logs: string): string {
  const hasError = /error|exception|fail|fatal|panic/i.test(logs);
  const hasWarning = /warn|warning/i.test(logs);

  if (hasError) {
    return `**🔴 Critical Errors Found**
Application errors detected in logs.

**📊 Analysis**
Multiple error patterns indicate application-level issues. Review stack traces for specifics.

**🔧 Recommended Fix**
Debug the application errors and deploy a fix.`;
  }

  if (hasWarning) {
    return `**⚠️ Warnings Found**
Warning messages detected but no critical errors.

**📊 Analysis**
Non-critical issues that should be addressed to prevent future problems.

**🔧 Recommended Fix**
Review warnings and address underlying issues.`;
  }

  return `**✅ No Critical Errors**
No obvious error patterns detected in logs.

**📊 Analysis**
Application appears to be logging normally.

**🔧 Recommended Fix**
If issues persist, enable debug logging for more detail.`;
}

function getFallbackEventAnalysis(events: any[]): string {
  const warningEvents = events.filter((e) => e.type === "Warning");

  if (warningEvents.length > 0) {
    const firstWarning = warningEvents[0];
    return `**⏱️ Timeline**
Warning events detected starting with ${firstWarning.reason}.

**🎯 Trigger**
${firstWarning.message}

**🔧 Remediation**
Address the warning conditions to stabilize the pod.`;
  }

  return `**⏱️ Timeline**
Normal events recorded, no warnings found.

**🎯 Trigger**
Pod appears to be operating normally based on events.

**🔧 Remediation**
If issues persist, check pod logs for application-level errors.`;
}
