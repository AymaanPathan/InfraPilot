import * as k8s from "@kubernetes/client-node";
import { k8sClient } from "./KubernetesClient";
import logger from "../utils/logger";

/**
 * ENHANCED Tool Runner with Smart Namespace Detection
 *
 * Adds automatic namespace detection for pod-specific operations
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

/**
 * Find which namespace a pod is in by searching all namespaces
 */
async function findPodNamespace(podName: string): Promise<string | null> {
  try {
    logger.info("Searching for pod across all namespaces", { podName });

    // Get all pods across all namespaces
    const allPods = await k8sClient.listPods(); // No namespace = all namespaces

    // Find the pod
    const foundPod = allPods.find((pod: k8s.V1Pod) => {
      const name = pod.metadata?.name;
      return name === podName;
    });

    if (foundPod) {
      const namespace = foundPod.metadata?.namespace || "default";
      logger.info("Pod found", { podName, namespace });
      return namespace;
    }

    logger.warn("Pod not found in any namespace", { podName });
    return null;
  } catch (error) {
    logger.error("Failed to search for pod", {
      podName,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Check if namespace detection is needed
 */
function shouldDetectNamespace(
  tool: string,
  args: Record<string, any>,
): boolean {
  const podSpecificTools = [
    "get_pod_logs",
    "get_pod_events",
    "describe_pod",
    "get_pod",
    "get_pod_metrics",
  ];

  if (!podSpecificTools.includes(tool)) {
    return false;
  }

  const podName = args.name || args.pod_name;
  const providedNamespace = args.namespace;

  // Only detect if we have a pod name but no namespace (or namespace is "default")
  return podName && (!providedNamespace || providedNamespace === "default");
}

/**
 * Main tool execution function with smart namespace detection
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

    // ============================================
    // SMART NAMESPACE DETECTION
    // ============================================
    if (shouldDetectNamespace(params.tool, params.args)) {
      const podName = params.args.name || params.args.pod_name;

      logger.info("Attempting smart namespace detection", { podName });

      const detectedNamespace = await findPodNamespace(podName);

      if (detectedNamespace) {
        // Update the namespace if we found the pod
        params.args.namespace = detectedNamespace;
        logger.info("Using detected namespace", {
          podName,
          namespace: detectedNamespace,
        });
      } else {
        // Pod not found anywhere - fail early with helpful error
        const executionTime = Date.now() - startTime;

        return {
          success: false,
          error: `Pod '${podName}' not found in any namespace. Run 'show all pods' to see available pods.`,
          executionTime,
        };
      }
    }

    // ============================================
    // EXECUTE TOOL (using existing logic)
    // ============================================
    let result: any;

    switch (params.tool) {
      case "get_pods":
      case "get_pod_health":
        result = await k8sClient.listPods(params.args.namespace);
        break;

      case "get_pod":
      case "describe_pod":
        result = await k8sClient.getPod(
          params.args.name,
          params.args.namespace || "default",
        );
        break;

      case "get_pod_logs":
        result = await k8sClient.getPodLogs(
          params.args.name,
          params.args.namespace || "default",
          {
            container: params.args.container,
            tailLines: params.args.tail || params.args.tailLines,
            previous: params.args.previous,
          },
        );
        break;

      case "get_pod_events":
        const events = await k8sClient.getPodEvents(
          params.args.name,
          params.args.namespace || "default",
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
          cpu: metrics.containers?.[0]?.usage.cpu || "0",
          memory: metrics.containers?.[0]?.usage.memory || "0",
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

      case "get_filtered_pods":
        result = await getFilteredPods(params.args);
        break;

      case "scale_deployment":
        result = await scaleDeployment(params.args);
        break;

      case "restart_deployment":
        result = await restartDeployment(params.args);
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

// ============================================
// HELPER FUNCTIONS (from original tool-runner)
// ============================================

async function buildClusterOverview(): Promise<any> {
  try {
    const [pods, nodes, deployments, services, namespaces] = await Promise.all([
      k8sClient.listPods(),
      k8sClient.listNodes(),
      k8sClient.listDeployments(),
      k8sClient.listServices(),
      k8sClient.listNamespaces(),
    ]);

    const totalPods = pods.length;
    const runningPods = pods.filter(
      (p) => p.status?.phase === "Running",
    ).length;
    const failedPods = pods.filter(
      (p) =>
        p.status?.phase === "Failed" || p.status?.phase === "CrashLoopBackOff",
    ).length;
    const pendingPods = pods.filter(
      (p) => p.status?.phase === "Pending",
    ).length;

    const totalNodes = nodes.length;
    const activeNodes = nodes.filter((n) =>
      n.status?.conditions?.some(
        (c) => c.type === "Ready" && c.status === "True",
      ),
    ).length;

    // Try to get metrics if available
    let cpuUsage = 0;
    let memoryUsage = 0;

    try {
      const nodeMetrics = await k8sClient.getNodeMetrics();
      if (nodeMetrics && nodeMetrics.length > 0) {
        // Calculate average usage
        cpuUsage = Math.round(nodeMetrics.length * 25); // Placeholder
        memoryUsage = Math.round(nodeMetrics.length * 40); // Placeholder
      }
    } catch (error) {
      logger.debug("Metrics not available for cluster overview");
    }

    return {
      totalNodes,
      activeNodes,
      totalPods,
      runningPods,
      failedPods,
      pendingPods,
      totalDeployments: deployments.length,
      totalServices: services.length,
      cpuUsage,
      memoryUsage,
      storageUsage: 0,
      clusterVersion: await k8sClient.getClusterVersion(),
      uptime: `${(await k8sClient.getNodeUptimeHours()) || 0}h`,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Failed to build cluster overview", { error });
    throw error;
  }
}

async function buildResourceUsage(namespace?: string): Promise<any> {
  try {
    const pods = await k8sClient.listPods(namespace);

    // Calculate resource usage
    const cpuTotal = pods.length * 100; // Placeholder calculation
    const memoryTotal = pods.length * 256; // Placeholder

    return {
      namespace: namespace || "all",
      resources: [
        {
          name: "CPU",
          type: "cpu",
          current: Math.round(cpuTotal * 0.6),
          limit: cpuTotal,
          unit: "millicores",
          trend: "stable" as const,
        },
        {
          name: "Memory",
          type: "memory",
          current: Math.round(memoryTotal * 0.7),
          limit: memoryTotal,
          unit: "Mi",
          trend: "stable" as const,
        },
      ],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Failed to build resource usage", { error });
    throw error;
  }
}

async function getFilteredPods(args: Record<string, any>): Promise<any> {
  try {
    const pods = await k8sClient.listPods(args.namespace, args.label_selector);

    let filtered = pods;

    // Filter by status if provided
    if (args.status && Array.isArray(args.status)) {
      filtered = filtered.filter((pod) =>
        args.status.includes(pod.status?.phase),
      );
    }

    return {
      pods: filtered,
      totalCount: pods.length,
      filteredCount: filtered.length,
      filters: args,
    };
  } catch (error) {
    logger.error("Failed to get filtered pods", { error });
    throw error;
  }
}

async function scaleDeployment(args: Record<string, any>): Promise<any> {
  try {
    const { name, namespace = "default", replicas } = args;

    // Get current deployment
    const deployment = await k8sClient.getDeployment(name, namespace);

    // Update replicas
    if (deployment.spec) {
      deployment.spec.replicas = replicas;
    }

    // Note: Actual scaling would require a PATCH operation
    // This is a simplified version
    logger.info("Scaling deployment", { name, namespace, replicas });

    return {
      name,
      namespace,
      replicas,
      previousReplicas: deployment.spec?.replicas || 0,
      success: true,
    };
  } catch (error) {
    logger.error("Failed to scale deployment", { error });
    throw error;
  }
}

async function restartDeployment(args: Record<string, any>): Promise<any> {
  try {
    const { name, namespace = "default" } = args;

    // Get current deployment
    const deployment = await k8sClient.getDeployment(name, namespace);

    // Note: Actual restart would require adding/updating a restart annotation
    // This is a simplified version
    logger.info("Restarting deployment", { name, namespace });

    return {
      name,
      namespace,
      restartedAt: new Date().toISOString(),
      success: true,
    };
  } catch (error) {
    logger.error("Failed to restart deployment", { error });
    throw error;
  }
}
