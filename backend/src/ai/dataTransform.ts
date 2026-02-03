import logger from "../utils/logger";

export function transformPodsList(mcpResponse: any): any {
  try {
    const rawPods = mcpResponse.pods || mcpResponse || [];

    const pods = rawPods.map((pod: any) => {
      const rawStatus =
        typeof pod.status === "string"
          ? pod.status
          : (pod.status?.phase ?? "Unknown");

      return {
        name: pod.name || pod.metadata?.name || "unknown",
        namespace: pod.namespace || pod.metadata?.namespace || "default",
        status: normalizeStatus(rawStatus),
        restarts: pod.restarts || pod.restartCount || 0,
        age:
          pod.age || calculateAge(pod.metadata?.creationTimestamp) || "unknown",
        node: pod.node || pod.spec?.nodeName,
        metrics: pod.metrics ? transformMetrics(pod.metrics) : undefined,
      };
    });

    logger.info("Transformed pods list", {
      inputCount: rawPods.length,
      outputCount: pods.length,
    });

    return { pods };
  } catch (error) {
    logger.error("Failed to transform pods list", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { pods: [] };
  }
}

/**
 * Transform get_logs MCP response to LogsViewer props
 */
export function transformPodLogs(
  mcpResponse: any,
  podName: string,
  namespace: string = "default",
): any {
  try {
    const logsText =
      typeof mcpResponse === "string"
        ? mcpResponse
        : mcpResponse.logs || mcpResponse.content || "";

    const logs = logsText
      .split("\n")
      .filter((line: string) => line.trim().length > 0);

    logger.info("Transformed pod logs", {
      podName,
      lineCount: logs.length,
    });

    return {
      podName,
      namespace,
      logs,
      container: mcpResponse.container,
      containers: mcpResponse.containers,
    };
  } catch (error) {
    logger.error("Failed to transform pod logs", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      podName,
      namespace,
      logs: [],
      error: "Failed to load logs",
    };
  }
}

/**
 * Transform get_pod_events MCP response to EventsTimeline props
 */
export function transformPodEvents(mcpResponse: any, podName?: string): any {
  try {
    const rawEvents = Array.isArray(mcpResponse)
      ? mcpResponse
      : mcpResponse.events || mcpResponse.items || [];

    const events = rawEvents.map((event: any) => ({
      type: event.type || "Normal",
      reason: event.reason || "Event",
      message: event.message || event.msg || "",
      timestamp: event.lastTimestamp || event.timestamp || event.firstTimestamp,
      lastTimestamp: event.lastTimestamp,
      firstTimestamp: event.firstTimestamp,
      count: event.count || 1,
      source: event.source?.component || event.source || "",
    }));

    logger.info("Transformed pod events", {
      podName,
      eventCount: events.length,
    });

    return {
      events,
      podName,
    };
  } catch (error) {
    logger.error("Failed to transform pod events", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      events: [],
      podName,
    };
  }
}

/**
 * Transform describe_pod MCP response to StatusSummary props
 */
export function transformPodDescription(mcpResponse: any): any {
  try {
    const pod = mcpResponse.pod || mcpResponse;

    const totalPods = 1;
    const runningPods = pod.status?.phase === "Running" ? 1 : 0;
    const failedPods =
      pod.status?.phase === "Failed" || pod.status?.phase === "CrashLoopBackOff"
        ? 1
        : 0;
    const pendingPods = pod.status?.phase === "Pending" ? 1 : 0;

    logger.info("Transformed pod description", {
      podName: pod.metadata?.name,
    });

    return {
      totalPods,
      runningPods,
      failedPods,
      pendingPods,
      namespace: pod.metadata?.namespace || "default",
    };
  } catch (error) {
    logger.error("Failed to transform pod description", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      totalPods: 0,
      runningPods: 0,
      failedPods: 0,
      pendingPods: 0,
    };
  }
}

/**
 * Transform pod metrics
 */
export function transformMetrics(metricsData: any): any {
  try {
    return {
      cpu: {
        usage: metricsData.cpu?.usage || "0m",
        usagePercent: metricsData.cpu?.usagePercent || 0,
        cores: metricsData.cpu?.cores || 0,
      },
      memory: {
        usage: metricsData.memory?.usage || "0Mi",
        usagePercent: metricsData.memory?.usagePercent || 0,
        bytes: metricsData.memory?.bytes || 0,
      },
      restartCount: metricsData.restartCount || 0,
      containers: metricsData.containers?.map((c: any) => ({
        name: c.name,
        cpu: {
          usage: c.cpu?.usage || "0m",
          cores: c.cpu?.cores || 0,
        },
        memory: {
          usage: c.memory?.usage || "0Mi",
          bytes: c.memory?.bytes || 0,
        },
      })),
    };
  } catch (error) {
    logger.error("Failed to transform metrics", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Transform resource usage for ResourceUsageChart component
 *
 * FIXED: Matches the exact schema expected by ResourceUsageChart:
 * {
 *   namespace?: string;
 *   resources: Array<{
 *     name: string;
 *     type: "cpu" | "memory" | "storage" | "network";
 *     current: number;    // ← MUST be number
 *     limit: number;      // ← MUST be number
 *     unit: string;
 *     trend?: "up" | "down" | "stable";
 *   }>;
 *   timestamp?: string;
 * }
 */
export function transformResourceUsage(mcpResponse: any): any {
  try {
    // ✅ If already transformed — pass through
    if (
      mcpResponse?.resources &&
      mcpResponse.resources[0]?.current !== undefined
    ) {
      return mcpResponse;
    }

    const resources: any[] = [];

    for (const r of mcpResponse.resources || []) {
      // handle "1.23 cores"
      let current = 0;
      if (typeof r.usage === "string") {
        current = parseFloat(r.usage);
      }

      resources.push({
        name: r.name,
        type: r.name.toLowerCase(),
        current,
        limit: 100,
        unit: r.name === "CPU" ? "cores" : "GiB",
        trend: determineTrend(r.percent),
      });
    }

    return {
      namespace: mcpResponse.namespace || "all",
      resources,
      timestamp: mcpResponse.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    logger.error("transformResourceUsage failed", error);
    return {
      namespace: "all",
      resources: [],
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Determine trend from a percentage value
 */
function determineTrend(percent?: number): "up" | "down" | "stable" {
  if (!percent) return "stable";
  if (percent > 80) return "up";
  if (percent < 30) return "down";
  return "stable";
}

/**
 * Determine trend from time series data
 */
function determineTrendFromArray(
  data: Array<{ value: number }>,
): "up" | "down" | "stable" {
  if (!data || data.length < 2) return "stable";

  const recent = data.slice(-3);
  const first = recent[0].value;
  const last = recent[recent.length - 1].value;

  if (last > first + 10) return "up";
  if (last < first - 10) return "down";
  return "stable";
}

/**
 * Transform filtered pods response
 */
export function transformFilteredPods(mcpResponse: any): any {
  try {
    const { pods, totalCount, filteredCount, filters } = mcpResponse;

    const transformedPods = pods.map((pod: any) => ({
      name: pod.name || "unknown",
      namespace: pod.namespace || "default",
      status: normalizeStatus(pod.status || "Unknown"),
      restarts: pod.restarts || pod.restartCount || 0,
      age: pod.age || "unknown",
      node: pod.node,
      metrics: pod.metrics ? transformMetrics(pod.metrics) : undefined,
    }));

    logger.info("Transformed filtered pods", {
      total: totalCount,
      filtered: filteredCount,
    });

    return {
      pods: transformedPods,
      totalCount,
      filteredCount,
      filters,
    };
  } catch (error) {
    logger.error("Failed to transform filtered pods", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      pods: [],
      totalCount: 0,
      filteredCount: 0,
    };
  }
}

/**
 * Normalize pod status
 */
function normalizeStatus(
  status: any,
): "Running" | "Pending" | "Failed" | "CrashLoopBackOff" | "Unknown" {
  if (typeof status !== "string") return "Unknown";

  const statusLower = status.toLowerCase();

  if (statusLower.includes("running")) return "Running";
  if (statusLower.includes("pending")) return "Pending";
  if (statusLower.includes("crash")) return "CrashLoopBackOff";
  if (statusLower.includes("fail") || statusLower.includes("error"))
    return "Failed";

  return "Unknown";
}

/**
 * Calculate pod age from creation timestamp
 */
function calculateAge(creationTimestamp?: string): string {
  if (!creationTimestamp) return "unknown";

  try {
    const created = new Date(creationTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  } catch (error) {
    return "unknown";
  }
}

/**
 * Main transformer - routes to correct transformer based on tool
 */
export function transformMcpResponse(
  tool: string,
  mcpResponse: any,
  args?: any,
): any {
  switch (tool) {
    case "get_pods":
    case "get_pod_health":
      return transformPodsList(mcpResponse);

    case "get_logs":
    case "get_pod_logs":
      return transformPodLogs(
        mcpResponse,
        args?.pod_name || args?.name || "unknown",
        args?.namespace,
      );

    case "get_pod_events":
      return transformPodEvents(mcpResponse, args?.name || args?.pod_name);

    case "describe_pod":
      return transformPodDescription(mcpResponse);

    case "get_pod_metrics":
      return transformMetrics(mcpResponse);

    case "get_resource_usage":
      return transformResourceUsage(mcpResponse);

    case "get_filtered_pods":
      return transformFilteredPods(mcpResponse);

    default:
      logger.warn("No transformer for tool", { tool });
      return mcpResponse;
  }
}
