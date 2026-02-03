import * as k8s from "@kubernetes/client-node";

/**
 * PHASE D: Enhanced Tool Runner
 *
 * Adds:
 * - Multi-pod / distributed query support
 * - Dynamic filter engine
 * - Result merging and tagging
 * - Resource usage monitoring
 */

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
  metadata?: {
    podCount?: number;
    successCount?: number;
    failedCount?: number;
  };
}

interface FilterOptions {
  namespace?: string;
  status?: string;
  name_contains?: string;
  restart_gt?: number;
  labels?: Record<string, string>;
}

/**
 * C2: Multi-Pod / Distributed Queries
 *
 * Execute tool across multiple pods and merge results
 */
export async function runMultiPodTool(params: {
  tool: string;
  podNames: string[];
  namespace?: string;
  additionalArgs?: Record<string, any>;
}): Promise<ToolResult> {
  const startTime = Date.now();
  const { tool, podNames, namespace = "default", additionalArgs = {} } = params;

  logger.info("Running multi-pod tool", {
    tool,
    podCount: podNames.length,
    namespace,
  });

  const results: any[] = [];
  const errors: any[] = [];

  // Execute tool for each pod in parallel
  await Promise.allSettled(
    podNames.map(async (podName) => {
      try {
        const result = await executeSinglePodTool(tool, {
          name: podName,
          namespace,
          ...additionalArgs,
        });

        results.push({
          podName,
          namespace,
          ...result,
        });
      } catch (error) {
        errors.push({
          podName,
          namespace,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  );

  const executionTime = Date.now() - startTime;

  logger.info("Multi-pod tool completed", {
    tool,
    successCount: results.length,
    failedCount: errors.length,
    executionTime,
  });

  return {
    success: true,
    data: {
      results,
      errors,
      summary: {
        total: podNames.length,
        successful: results.length,
        failed: errors.length,
      },
    },
    executionTime,
    metadata: {
      podCount: podNames.length,
      successCount: results.length,
      failedCount: errors.length,
    },
  };
}

/**
 * Execute tool for single pod
 */
async function executeSinglePodTool(
  tool: string,
  args: Record<string, any>,
): Promise<any> {
  switch (tool) {
    case "get_pod_logs":
      return await getPodLogs(args as any);
    case "get_pod_metrics":
      return await getPodMetrics(args as any);
    case "get_pod_events":
      return await getPodEvents(args as any);
    case "get_pod":
      return await getPodDetails(args as any);
    default:
      throw new Error(`Tool ${tool} not supported for multi-pod execution`);
  }
}

/**
 * C3: Dynamic Filter Engine
 *
 * Apply filters to pod lists post-query if MCP doesn't support them
 */
export async function applyPodFilters(
  pods: k8s.V1Pod[],
  filters: FilterOptions,
): Promise<k8s.V1Pod[]> {
  let filtered = [...pods];

  // Filter by namespace
  if (filters.namespace) {
    filtered = filtered.filter(
      (pod) => pod.metadata?.namespace === filters.namespace,
    );
  }

  // Filter by status
  if (filters.status) {
    filtered = filtered.filter((pod) => {
      const status = pod.status?.phase || "Unknown";
      return normalizeStatus(status) === filters.status;
    });
  }

  // Filter by name contains
  if (filters.name_contains) {
    const search = filters.name_contains.toLowerCase();
    filtered = filtered.filter((pod) =>
      pod.metadata?.name?.toLowerCase().includes(search),
    );
  }

  // Filter by restart count
  if (filters.restart_gt !== undefined) {
    filtered = filtered.filter((pod) => {
      const restarts = calculateRestartCount(pod);
      return restarts > filters.restart_gt!;
    });
  }

  // Filter by labels
  if (filters.labels && Object.keys(filters.labels).length > 0) {
    filtered = filtered.filter((pod) => {
      const podLabels = pod.metadata?.labels || {};
      return Object.entries(filters.labels!).every(
        ([key, value]) => podLabels[key] === value,
      );
    });
  }

  logger.info("Filters applied", {
    originalCount: pods.length,
    filteredCount: filtered.length,
    filters,
  });

  return filtered;
}

/**
 * Enhanced get filtered pods with metrics support
 */
export async function getFilteredPodsWithMetrics(
  filters: FilterOptions & { includeMetrics?: boolean },
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // Get all pods
    const allPods = await k8sClient.listPods(filters.namespace);

    // Apply filters
    const filtered = await applyPodFilters(allPods, filters);

    // Transform to simple format
    let pods = filtered.map(transformPodToSimple);

    // Add metrics if requested
    if (filters.includeMetrics) {
      pods = await enrichPodsWithMetrics(pods, filters.namespace);
    }

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        pods,
        totalCount: allPods.length,
        filteredCount: filtered.length,
        filters,
      },
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    };
  }
}

/**
 * Enrich pods with metrics data
 */
async function enrichPodsWithMetrics(
  pods: any[],
  namespace?: string,
): Promise<any[]> {
  const enriched = await Promise.allSettled(
    pods.map(async (pod) => {
      try {
        const metrics = await k8sClient.getPodMetrics(
          pod.name,
          pod.namespace || namespace || "default",
        );
        return {
          ...pod,
          metrics: {
            cpu: {
              usage: metrics.containers[0]?.usage.cpu || "0",
              cores: parseCpuString(metrics.containers[0]?.usage.cpu || "0"),
            },
            memory: {
              usage: metrics.containers[0]?.usage.memory || "0",
              bytes: parseMemoryString(
                metrics.containers[0]?.usage.memory || "0",
              ),
            },
          },
        };
      } catch {
        return pod;
      }
    }),
  );

  return enriched
    .filter((r) => r.status === "fulfilled")
    .map((r: any) => r.value);
}

/**
 * Get logs for multiple pods
 */
export async function getMultiPodLogs(params: {
  podNames: string[];
  namespace?: string;
  container?: string;
  tailLines?: number;
}): Promise<ToolResult> {
  return runMultiPodTool({
    tool: "get_pod_logs",
    podNames: params.podNames,
    namespace: params.namespace,
    additionalArgs: {
      container: params.container,
      tailLines: params.tailLines,
    },
  });
}

/**
 * Get metrics for multiple pods
 */
export async function getMultiPodMetrics(params: {
  podNames: string[];
  namespace?: string;
}): Promise<ToolResult> {
  return runMultiPodTool({
    tool: "get_pod_metrics",
    podNames: params.podNames,
    namespace: params.namespace,
  });
}

/**
 * Get events for multiple pods
 */
export async function getMultiPodEvents(params: {
  podNames: string[];
  namespace?: string;
}): Promise<ToolResult> {
  return runMultiPodTool({
    tool: "get_pod_events",
    podNames: params.podNames,
    namespace: params.namespace,
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getPodLogs(args: {
  name: string;
  namespace: string;
  container?: string;
  tailLines?: number;
}): Promise<any> {
  const logs = await k8sClient.getPodLogs(args.name, args.namespace, {
    container: args.container,
    tailLines: args.tailLines,
  });
  return {
    logs,
    container: args.container,
  };
}

async function getPodMetrics(args: {
  name: string;
  namespace: string;
}): Promise<any> {
  const pod = await k8sClient.getPod(args.name, args.namespace);
  const metrics = await k8sClient.getPodMetrics(args.name, args.namespace);

  const restartCount = calculateRestartCount(pod);

  return {
    cpu: {
      usage: metrics.containers[0]?.usage.cpu || "0",
      cores: parseCpuString(metrics.containers[0]?.usage.cpu || "0"),
    },
    memory: {
      usage: metrics.containers[0]?.usage.memory || "0",
      bytes: parseMemoryString(metrics.containers[0]?.usage.memory || "0"),
    },
    restartCount,
    status: pod.status?.phase || "Unknown",
  };
}

async function getPodEvents(args: {
  name: string;
  namespace: string;
}): Promise<any> {
  const events = await k8sClient.getPodEvents(args.name, args.namespace);
  const podEvents = events.filter(
    (e: any) => e.involvedObject?.name === args.name,
  );

  return {
    events: podEvents.map((e: any) => ({
      type: e.type,
      reason: e.reason,
      message: e.message,
      timestamp: e.lastTimestamp || e.eventTime,
    })),
  };
}

async function getPodDetails(args: {
  name: string;
  namespace: string;
}): Promise<any> {
  const pod = await k8sClient.getPod(args.name, args.namespace);
  return transformPodToDetail(pod);
}

function normalizeStatus(
  status: string,
): "Running" | "Pending" | "Failed" | "CrashLoopBackOff" | "Unknown" {
  const statusLower = status.toLowerCase();
  if (statusLower.includes("running")) return "Running";
  if (statusLower.includes("pending")) return "Pending";
  if (statusLower.includes("crash")) return "CrashLoopBackOff";
  if (statusLower.includes("fail") || statusLower.includes("error"))
    return "Failed";
  return "Unknown";
}

function calculateRestartCount(pod: k8s.V1Pod): number {
  return (
    pod.status?.containerStatuses?.reduce(
      (sum, c) => sum + (c.restartCount || 0),
      0,
    ) || 0
  );
}

function transformPodToSimple(pod: k8s.V1Pod): any {
  return {
    name: pod.metadata?.name || "unknown",
    namespace: pod.metadata?.namespace || "default",
    status: normalizeStatus(pod.status?.phase || "Unknown"),
    restarts: calculateRestartCount(pod),
    age: calculateAge(pod.metadata?.creationTimestamp),
    node: pod.spec?.nodeName,
  };
}

function transformPodToDetail(pod: k8s.V1Pod): any {
  return {
    ...transformPodToSimple(pod),
    ip: pod.status?.podIP,
    containers: pod.spec?.containers?.map((c) => ({
      name: c.name,
      image: c.image,
    })),
    conditions: pod.status?.conditions,
  };
}

function parseCpuString(cpu: string): number {
  if (cpu.endsWith("m")) return parseInt(cpu) / 1000;
  if (cpu.endsWith("n")) return parseInt(cpu) / 1000000000;
  return parseFloat(cpu);
}

function parseMemoryString(memory: string): number {
  const units: Record<string, number> = {
    Ki: 1024,
    Mi: 1024 * 1024,
    Gi: 1024 * 1024 * 1024,
    Ti: 1024 * 1024 * 1024 * 1024,
  };

  for (const [unit, multiplier] of Object.entries(units)) {
    if (memory.endsWith(unit)) {
      return parseInt(memory) * multiplier;
    }
  }

  return parseInt(memory);
}

function calculateAge(timestamp?: Date | string): string {
  if (!timestamp) return "unknown";

  const created = new Date(timestamp);
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
}

import { k8sClient } from "./KubernetesClient";
import logger from "../utils/logger";

/**
 * Updated Tool Runner with Phase D enhancements
 *
 * Integrates:
 * - Multi-pod distributed queries
 * - Dynamic filtering
 * - Result merging
 * - Resource usage monitoring
 */

/**
 * Main tool execution with multi-pod support detection
 */
export async function runTool(params: {
  tool: string;
  args: Record<string, any>;
}): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    logger.info("Running tool", {
      tool: params.tool,
      args: params.args,
    });

    // Check if this is a multi-pod request
    if (params.args.podNames && Array.isArray(params.args.podNames)) {
      return await handleMultiPodRequest(params.tool, params.args);
    }

    // Check if this uses filters
    if (params.tool === "get_filtered_pods" || hasFilterArgs(params.args)) {
      return await handleFilteredRequest(params.tool, params.args);
    }

    // Regular single-pod/single-resource request
    let result: any;

    switch (params.tool) {
      case "get_pods":
      case "get_pod_health": // Maps to same MCP call as get_pods
        result = await k8sClient.listPods(params.args.namespace);
        break;

      case "get_pod":
        result = await k8sClient.getPod(
          params.args.name,
          params.args.namespace,
        );
        break;

      case "get_pod_logs":
        result = await k8sClient.getPodLogs(
          params.args.name,
          params.args.namespace,
          {
            container: params.args.container,
            tailLines: params.args.tailLines,
          },
        );
        break;

      case "get_pod_events":
        const events = await k8sClient.getPodEvents(
          params.args.name,
          params.args.namespace,
        );
        result = { events };
        break;

      case "get_pod_metrics":
        const pod = await k8sClient.getPod(
          params.args.name,
          params.args.namespace || "default",
        );
        const metrics = await k8sClient.getPodMetrics(
          params.args.name,
          params.args.namespace || "default",
        );
        result = {
          podName: params.args.name,
          namespace: params.args.namespace || "default",
          cpu: metrics.containers[0]?.usage.cpu || "0",
          memory: metrics.containers[0]?.usage.memory || "0",
          restartCount:
            pod.status?.containerStatuses?.reduce(
              (sum, c) => sum + (c.restartCount || 0),
              0,
            ) || 0,
          status: pod.status?.phase || "Unknown",
        };
        break;

      case "get_deployments":
        result = await k8sClient.listDeployments(params.args.namespace);
        break;

      case "get_services":
        result = await k8sClient.listServices(params.args.namespace);
        break;

      case "get_namespaces":
        result = await k8sClient.listNamespaces();
        break;

      case "get_nodes":
        result = await k8sClient.listNodes();
        break;

      case "get_cluster_overview":
        result = await buildClusterOverview();
        break;

      case "get_resource_usage":
        result = await buildResourceUsage(params.args.namespace);
        break;

      default:
        throw new Error(`Unknown tool: ${params.tool}`);
    }

    const executionTime = Date.now() - startTime;

    logger.info("Tool executed successfully", {
      tool: params.tool,
      executionTime,
    });

    return {
      success: true,
      data: result,
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Tool execution failed", {
      tool: params.tool,
      error: errorMessage,
      executionTime,
    });

    return {
      success: false,
      error: errorMessage,
      executionTime,
    };
  }
}

/**
 * Handle multi-pod requests
 */
async function handleMultiPodRequest(
  tool: string,
  args: Record<string, any>,
): Promise<ToolResult> {
  logger.info("Handling multi-pod request", {
    tool,
    podCount: args.podNames.length,
  });

  // Map tool to multi-pod handler
  switch (tool) {
    case "get_pod_logs":
      return await getMultiPodLogs({
        podNames: args.podNames,
        namespace: args.namespace,
        container: args.container,
        tailLines: args.tailLines,
      });

    case "get_pod_metrics":
      return await getMultiPodMetrics({
        podNames: args.podNames,
        namespace: args.namespace,
      });

    case "get_pod_events":
      return await getMultiPodEvents({
        podNames: args.podNames,
        namespace: args.namespace,
      });

    default:
      return await runMultiPodTool({
        tool,
        podNames: args.podNames,
        namespace: args.namespace,
        additionalArgs: args,
      });
  }
}

/**
 * Handle filtered requests
 */
async function handleFilteredRequest(
  tool: string,
  args: Record<string, any>,
): Promise<ToolResult> {
  const startTime = Date.now();

  logger.info("Handling filtered request", {
    tool,
    filters: args,
  });

  try {
    // Get all pods
    const allPods = await k8sClient.listPods(args.namespace);
    console.log("🔍 Filtering pods:", {
      total: allPods.length,
      filter: args,
      podStatuses: allPods.map((p) => ({
        name: p.metadata?.name || "unknown",
        status: p.status,
      })),
    });

    // Apply filters
    const filtered = await applyPodFilters(allPods, {
      namespace: args.namespace,
      status: args.status,
      name_contains: args.name_contains,
      restart_gt: args.restart_gt,
      labels: args.labels,
    });

    // Transform results
    const pods = filtered.map((pod: any) => ({
      name: pod.metadata?.name || "unknown",
      namespace: pod.metadata?.namespace || "default",
      status: pod.status?.phase || "Unknown",
      restarts:
        pod.status?.containerStatuses?.reduce(
          (sum: number, c: any) => sum + (c.restartCount || 0),
          0,
        ) || 0,
      age: calculateAge(pod.metadata?.creationTimestamp),
      node: pod.spec?.nodeName,
    }));

    // Add metrics if requested
    let enrichedPods = pods;
    if (args.includeMetrics) {
      enrichedPods = await enrichPodsWithMetrics(pods, args.namespace);
    }

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        pods: enrichedPods,
        totalCount: allPods.length,
        filteredCount: filtered.length,
        filters: args,
      },
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    };
  }
}

/**
 * Build cluster overview
 */
async function buildClusterOverview(): Promise<any> {
  const [nodes, pods, deployments, services] = await Promise.all([
    k8sClient.listNodes(),
    k8sClient.listPods(),
    k8sClient.listDeployments(),
    k8sClient.listServices(),
  ]);

  const runningPods = pods.filter((p: any) => p.status?.phase === "Running");
  const failedPods = pods.filter(
    (p: any) =>
      p.status?.phase === "Failed" || p.status?.phase === "CrashLoopBackOff",
  );
  const pendingPods = pods.filter((p: any) => p.status?.phase === "Pending");

  return {
    totalNodes: nodes.length,
    activeNodes: nodes.filter((n: any) =>
      n.status?.conditions?.some(
        (c: any) => c.type === "Ready" && c.status === "True",
      ),
    ).length,
    totalPods: pods.length,
    runningPods: runningPods.length,
    failedPods: failedPods.length,
    pendingPods: pendingPods.length,
    totalDeployments: deployments.length,
    totalServices: services.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build resource usage report
 *
 * This generates mock/simulated data for now.
 * In production, this should query the Metrics Server API.
 */
async function buildResourceUsage(namespace?: string): Promise<any> {
  try {
    const pods = await k8sClient.listPods(namespace);

    // Try to get real metrics if available
    let cpuUsage = 0;
    let memoryUsage = 0;
    let podsWithMetrics = 0;

    // Check if metrics server is available
    const metricsAvailable = await k8sClient.isMetricsServerAvailable();

    if (metricsAvailable) {
      // Get metrics for all pods
      for (const pod of pods) {
        try {
          const metrics = await k8sClient.getPodMetricsSafe(
            pod.metadata?.name || "",
            pod.metadata?.namespace || "default",
          );

          if (metrics) {
            podsWithMetrics++;
            // Aggregate CPU and memory from containers
            for (const container of metrics.containers || []) {
              cpuUsage += parseCpuString(container.usage?.cpu || "0");
              memoryUsage += parseMemoryString(container.usage?.memory || "0");
            }
          }
        } catch {
          // Skip pods without metrics
        }
      }

      // Calculate percentages (mock capacity for now)
      const cpuPercent = Math.min((cpuUsage / 10) * 100, 100); // Assume 10 cores total
      const memoryPercent = Math.min(
        (memoryUsage / (16 * 1024 * 1024 * 1024)) * 100,
        100,
      ); // Assume 16GB total

      return {
        namespace: namespace || "all",
        resources: [
          {
            name: "CPU",
            usage: `${cpuUsage.toFixed(2)} cores`,
            percent: Math.round(cpuPercent),
          },
          {
            name: "Memory",
            usage: formatBytes(memoryUsage),
            percent: Math.round(memoryPercent),
          },
        ],
        cpuData: [
          { time: "5m ago", value: Math.max(0, cpuPercent - 10) },
          { time: "4m ago", value: Math.max(0, cpuPercent - 5) },
          { time: "3m ago", value: cpuPercent },
          { time: "2m ago", value: Math.min(100, cpuPercent + 3) },
          { time: "1m ago", value: Math.min(100, cpuPercent + 2) },
          { time: "now", value: cpuPercent },
        ],
        memoryData: [
          { time: "5m ago", value: Math.max(0, memoryPercent - 8) },
          { time: "4m ago", value: Math.max(0, memoryPercent - 4) },
          { time: "3m ago", value: memoryPercent },
          { time: "2m ago", value: Math.min(100, memoryPercent + 2) },
          { time: "1m ago", value: Math.min(100, memoryPercent + 1) },
          { time: "now", value: memoryPercent },
        ],
        storageData: [
          { time: "5m ago", value: 45 },
          { time: "4m ago", value: 47 },
          { time: "3m ago", value: 48 },
          { time: "2m ago", value: 50 },
          { time: "1m ago", value: 52 },
          { time: "now", value: 53 },
        ],
        networkData: [
          { time: "5m ago", rx: 120, tx: 80 },
          { time: "4m ago", rx: 135, tx: 95 },
          { time: "3m ago", rx: 150, tx: 110 },
          { time: "2m ago", rx: 145, tx: 105 },
          { time: "1m ago", rx: 160, tx: 120 },
          { time: "now", rx: 155, tx: 115 },
        ],
        timeRange: "5m",
        timestamp: new Date().toISOString(),
        metricsServerAvailable: true,
        podsWithMetrics,
        totalPods: pods.length,
      };
    } else {
      // Metrics server not available - return simulated data
      return {
        namespace: namespace || "all",
        resources: [
          {
            name: "CPU",
            usage: "simulated",
            percent: 45,
          },
          {
            name: "Memory",
            usage: "simulated",
            percent: 62,
          },
        ],
        cpuData: [
          { time: "5m ago", value: 35 },
          { time: "4m ago", value: 40 },
          { time: "3m ago", value: 42 },
          { time: "2m ago", value: 44 },
          { time: "1m ago", value: 46 },
          { time: "now", value: 45 },
        ],
        memoryData: [
          { time: "5m ago", value: 58 },
          { time: "4m ago", value: 60 },
          { time: "3m ago", value: 61 },
          { time: "2m ago", value: 63 },
          { time: "1m ago", value: 64 },
          { time: "now", value: 62 },
        ],
        storageData: [
          { time: "5m ago", value: 45 },
          { time: "4m ago", value: 47 },
          { time: "3m ago", value: 48 },
          { time: "2m ago", value: 50 },
          { time: "1m ago", value: 52 },
          { time: "now", value: 53 },
        ],
        networkData: [
          { time: "5m ago", rx: 120, tx: 80 },
          { time: "4m ago", rx: 135, tx: 95 },
          { time: "3m ago", rx: 150, tx: 110 },
          { time: "2m ago", rx: 145, tx: 105 },
          { time: "1m ago", rx: 160, tx: 120 },
          { time: "now", rx: 155, tx: 115 },
        ],
        timeRange: "5m",
        timestamp: new Date().toISOString(),
        metricsServerAvailable: false,
        warning: "Metrics Server not available - showing simulated data",
      };
    }
  } catch (error) {
    logger.error("Failed to build resource usage", {
      error: error instanceof Error ? error.message : String(error),
      namespace,
    });

    // Return empty data on error
    return {
      namespace: namespace || "all",
      resources: [],
      cpuData: [],
      memoryData: [],
      storageData: [],
      networkData: [],
      timeRange: "5m",
      timestamp: new Date().toISOString(),
      error:
        error instanceof Error ? error.message : "Failed to get resource usage",
    };
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Helper functions
 */
function hasFilterArgs(args: Record<string, any>): boolean {
  return !!(
    args.status ||
    args.name_contains ||
    args.restart_gt !== undefined ||
    args.labels
  );
}
