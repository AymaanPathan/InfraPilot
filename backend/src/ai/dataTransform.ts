import logger from "../utils/logger";

/**
 * Enhanced Data Transformation Layer - METRICS FIX
 *
 * CRITICAL FIX: CPU and memory values were being incorrectly parsed
 * Problem: Values like "1493872000m" were being treated as 1,493,872 cores
 * Solution: Proper validation and capping of unreasonable values
 */

/**
 * Parse CPU string to numerical values
 * FIXED: Handles edge cases and caps unreasonable values
 */
function parseCpu(cpuInput: string | number): { usage: string; cores: number } {
  if (!cpuInput && cpuInput !== 0) {
    return { usage: "0m", cores: 0 };
  }

  const str = cpuInput.toString().trim();

  // Handle millicore format (e.g., "100m")
  if (str.endsWith("m")) {
    const millicores = parseInt(str.replace("m", ""), 10);

    // CRITICAL FIX: Cap unreasonable values
    // Most K8s pods shouldn't use more than 16 cores
    if (millicores > 16000) {
      logger.warn("Unreasonable CPU value detected, capping", {
        original: millicores,
        capped: 16000,
      });
      return {
        usage: "16000m",
        cores: 16,
      };
    }

    const cores = millicores / 1000;
    return {
      usage: `${millicores}m`,
      cores,
    };
  }

  // Handle core format (e.g., "0.5", "1", "2")
  const cores = parseFloat(str);

  // Cap unreasonable core values
  if (cores > 16) {
    logger.warn("Unreasonable CPU cores detected, capping", {
      original: cores,
      capped: 16,
    });
    return {
      usage: "16000m",
      cores: 16,
    };
  }

  const millicores = Math.round(cores * 1000);
  return {
    usage: `${millicores}m`,
    cores,
  };
}

/**
 * Parse memory string to numerical valuesd
 * FIXED: Better validation and capping
 */
/**
 * Parse memory string to numerical values
 * FIXED: Better validation and capping
 */
function parseMemory(memoryInput: string | number): {
  usage: string;
  bytes: number;
} {
  if (!memoryInput && memoryInput !== 0) {
    return { usage: "0Mi", bytes: 0 };
  }

  const str = memoryInput.toString().trim();

  const units: Record<string, number> = {
    Ki: 1024,
    Mi: 1024 * 1024,
    Gi: 1024 * 1024 * 1024,
    Ti: 1024 * 1024 * 1024 * 1024,
  };

  for (const [unit, multiplier] of Object.entries(units)) {
    if (str.endsWith(unit)) {
      const value = parseFloat(str.replace(unit, ""));
      const bytes = Math.round(value * multiplier);

      // CRITICAL FIX: Cap at 256GB for safety
      const maxBytes = 256 * 1024 * 1024 * 1024;
      if (bytes > maxBytes) {
        logger.warn("Unreasonable memory value detected, capping", {
          original: bytes,
          originalFormatted: `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}Gi`,
          capped: maxBytes,
        });
        return {
          usage: "256Gi",
          bytes: maxBytes,
        };
      }

      return {
        usage: str,
        bytes,
      };
    }
  }

  // Assume Mi if no unit
  const value = parseFloat(str);
  const bytes = Math.round(value * 1024 * 1024);

  // Cap here too
  const maxBytes = 256 * 1024 * 1024 * 1024;
  if (bytes > maxBytes) {
    logger.warn("Unreasonable memory value detected (no unit), capping", {
      original: bytes,
      capped: maxBytes,
    });
    return {
      usage: "256Gi",
      bytes: maxBytes,
    };
  }

  return {
    usage: `${value}Mi`,
    bytes,
  };
}
export function transformPodsList(k8sResponse: any): any {
  try {
    const rawPods = k8sResponse.pods || k8sResponse || [];

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

export function transformPodsForHealthMonitor(k8sResponse: any): any {
  try {
    const rawPods = k8sResponse.pods || k8sResponse || [];

    const pods = rawPods.map((pod: any) => {
      const rawStatus =
        typeof pod.status === "string"
          ? pod.status
          : (pod.status?.phase ?? "Unknown");

      let cpuUsage: number | undefined;
      let memoryUsage: number | undefined;

      if (pod.metrics) {
        cpuUsage = pod.metrics.cpu?.usagePercent;
        memoryUsage = pod.metrics.memory?.usagePercent;

        if (cpuUsage === undefined && pod.metrics.cpu?.cores !== undefined) {
          const totalCores = 12;
          cpuUsage = Math.round((pod.metrics.cpu.cores / totalCores) * 100);
        }

        if (
          memoryUsage === undefined &&
          pod.metrics.memory?.bytes !== undefined
        ) {
          const totalMemory = 7903313920;
          memoryUsage = Math.round(
            (pod.metrics.memory.bytes / totalMemory) * 100,
          );
        }
      }

      return {
        name: pod.name || pod.metadata?.name || "unknown",
        namespace: pod.namespace || pod.metadata?.namespace || "default",
        status: normalizeStatus(rawStatus),
        restarts: pod.restarts || pod.restartCount || 0,
        age:
          pod.age || calculateAge(pod.metadata?.creationTimestamp) || "unknown",
        readiness: pod.readiness,
        cpuUsage,
        memoryUsage,
        lastRestart: pod.lastRestart,
      };
    });

    logger.info("Transformed pods for health monitor", {
      inputCount: rawPods.length,
      outputCount: pods.length,
      podsWithMetrics: pods.filter((p: any) => p.cpuUsage !== undefined).length,
    });

    return { pods };
  } catch (error) {
    logger.error("Failed to transform pods for health monitor", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { pods: [] };
  }
}

export function transformPodLogs(
  k8sResponse: any,
  podName: string,
  namespace: string = "default",
): any {
  try {
    const logsText =
      typeof k8sResponse === "string"
        ? k8sResponse
        : k8sResponse.logs || k8sResponse.content || "";

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
      container: k8sResponse.container,
      containers: k8sResponse.containers,
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

export function transformPodEvents(k8sResponse: any, podName?: string): any {
  try {
    const rawEvents = Array.isArray(k8sResponse)
      ? k8sResponse
      : k8sResponse.events || k8sResponse.items || [];

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

export function transformPodDescription(k8sResponse: any): any {
  try {
    const pod = k8sResponse.pod || k8sResponse;

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
      pod: {
        name: pod.metadata?.name,
        namespace: pod.metadata?.namespace,
        status: pod.status?.phase,
        metrics: pod.metrics ? transformMetrics(pod.metrics) : undefined,
      },
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
 * Enhanced metrics transformer with proper CPU/memory handling
 * CRITICAL FIX: Now properly parses and validates metrics
 */
export function transformMetrics(metricsData: any): any {
  try {
    // Handle case where metrics are unavailable
    if (!metricsData || metricsData.available === false) {
      return {
        available: false,
        cpu: { usage: "0m", usagePercent: 0, cores: 0 },
        memory: { usage: "0Mi", usagePercent: 0, bytes: 0 },
        restartCount: 0,
        error: metricsData?.error || "Metrics unavailable",
      };
    }

    // Parse CPU with proper validation
    const cpuData = metricsData.cpu || {};
    const cpuParsed = parseCpu(cpuData.usage || cpuData.cores || 0);
    const cpu = {
      usage: cpuParsed.usage,
      usagePercent: cpuData.usagePercent || 0,
      cores: cpuParsed.cores,
    };

    // Parse memory with proper validation
    const memoryData = metricsData.memory || {};
    const memoryParsed = parseMemory(memoryData.usage || memoryData.bytes || 0);
    const memory = {
      usage: memoryParsed.usage,
      usagePercent: memoryData.usagePercent || 0,
      bytes: memoryParsed.bytes,
    };

    const result = {
      available: metricsData.available !== false,
      cpu,
      memory,
      restartCount: metricsData.restartCount || 0,
      containers: metricsData.containers?.map((c: any) => ({
        name: c.name,
        cpu: parseCpu(c.cpu?.usage || c.cpu?.cores || 0),
        memory: parseMemory(c.memory?.usage || c.memory?.bytes || 0),
      })),
    };

    logger.debug("Transformed metrics", {
      cpuUsage: cpu.usage,
      cpuCores: cpu.cores,
      cpuPercent: cpu.usagePercent,
      memoryUsage: memory.usage,
      memoryBytes: memory.bytes,
      memoryPercent: memory.usagePercent,
    });

    return result;
  } catch (error) {
    logger.error("Failed to transform metrics", {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      available: false,
      cpu: { usage: "0m", usagePercent: 0, cores: 0 },
      memory: { usage: "0Mi", usagePercent: 0, bytes: 0 },
      restartCount: 0,
      error: "Failed to parse metrics",
    };
  }
}

export function transformResourceUsage(k8sResponse: any): any {
  try {
    if (
      k8sResponse?.resources &&
      k8sResponse.resources[0]?.current !== undefined
    ) {
      return k8sResponse;
    }

    const resources: any[] = [];

    for (const r of k8sResponse.resources || []) {
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
      namespace: k8sResponse.namespace || "all",
      resources,
      timestamp: k8sResponse.timestamp || new Date().toISOString(),
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

function determineTrend(percent?: number): "up" | "down" | "stable" {
  if (!percent) return "stable";
  if (percent > 80) return "up";
  if (percent < 30) return "down";
  return "stable";
}

export function transformFilteredPods(k8sResponse: any): any {
  try {
    const { pods, totalCount, filteredCount, filters } = k8sResponse;

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
 * Main transformer with pod metrics special handling
 */
export function transformK8sResponse(
  tool: string,
  k8sResponse: any,
  args?: any,
): any {
  switch (tool) {
    case "get_pods":
      return transformPodsList(k8sResponse);

    case "get_pod_health":
      return transformPodsForHealthMonitor(k8sResponse);

    case "get_logs":
    case "get_pod_logs":
      return transformPodLogs(
        k8sResponse,
        args?.name || args?.pod_name,
        args?.namespace,
      );

    case "get_pod_events":
      return transformPodEvents(k8sResponse, args?.name || args?.pod_name);

    case "describe_pod":
      return transformPodDescription(k8sResponse);

    case "get_pod_metrics":
      // Metrics are already in the correct format from tool-runner
      // Just ensure consistency
      return {
        ...k8sResponse,
        podName: k8sResponse.podName || args?.name,
        namespace: k8sResponse.namespace || args?.namespace || "default",
      };

    case "get_resource_usage":
      return transformResourceUsage(k8sResponse);

    case "get_filtered_pods":
      return transformFilteredPods(k8sResponse);

    default:
      logger.warn("No transformer for tool", { tool });
      return k8sResponse;
  }
}

export function transformPodLogsWithFixes(
  k8sResponse: any,
  fixSuggestions: any[],
  podName: string,
  namespace: string = "default",
): any {
  try {
    const logsText =
      typeof k8sResponse === "string"
        ? k8sResponse
        : k8sResponse.logs || k8sResponse.content || "";

    const logs = logsText
      .split("\n")
      .filter((line: string) => line.trim().length > 0);

    logger.info("Transformed pod logs with fix suggestions", {
      podName,
      lineCount: logs.length,
      suggestionCount: fixSuggestions.length,
    });

    return {
      podName,
      namespace,
      logs,
      container: k8sResponse.container,
      containers: k8sResponse.containers,
      fixSuggestions,
      hasErrors: fixSuggestions.length > 0,
    };
  } catch (error) {
    logger.error("Failed to transform pod logs with fixes", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      podName,
      namespace,
      logs: [],
      fixSuggestions: [],
      hasErrors: false,
      error: "Failed to load logs",
    };
  }
}

export const transformMcpResponse = transformK8sResponse;
