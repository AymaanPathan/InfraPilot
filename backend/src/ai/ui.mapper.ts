import { getToolDefinition, type ResultType } from "./ToolsRegistry";
import logger from "../utils/logger";

/**
 * UI Mapper
 *
 * Maps tool execution results to UI components dynamically.
 * This is the ONLY place that decides which component to render.
 * NO prompt-based UI selection allowed.
 *
 * RULE: Tool result type → Component name (deterministic)
 */

export interface UIComponent {
  type: "component";
  componentName: string;
  props: Record<string, any>;
}

export interface UIPayload {
  component: UIComponent;
  explanation?: string;
  actions?: UIAction[];
  metadata?: {
    tool: string;
    resultType: ResultType;
    timestamp: string;
  };
}

export interface UIAction {
  label: string;
  action: string;
  params?: Record<string, any>;
}

/**
 * Map tool result to UI component
 *
 * @param toolName - Name of the tool that was executed
 * @param result - Raw result from MCP tool execution
 * @param args - Original arguments passed to the tool
 * @param explainNeeded - Whether AI explanation is needed
 * @returns Complete UI payload with component, props, and metadata
 */
export function mapResultToUI(
  toolName: string,
  result: any,
  args: Record<string, any> = {},
  explainNeeded: boolean = false,
): UIPayload {
  const startTime = Date.now();

  logger.info("Mapping tool result to UI", {
    tool: toolName,
    resultType: typeof result,
    explainNeeded,
  });

  // Get tool definition from registry
  const toolDef = getToolDefinition(toolName);

  if (!toolDef) {
    logger.warn("Tool not found in registry, using fallback UI", {
      tool: toolName,
    });
    return buildFallbackUI(result, toolName);
  }

  // Map based on result_type (deterministic)
  const uiPayload = mapByResultType(
    toolDef.result_type,
    result,
    args,
    toolName,
  );

  // Add explanation if needed
  if (explainNeeded) {
    uiPayload.explanation = generateExplanation(toolDef, result, args);
  }

  // Add suggested actions
  uiPayload.actions = generateActions(toolDef, result, args);

  // Add metadata
  uiPayload.metadata = {
    tool: toolName,
    resultType: toolDef.result_type,
    timestamp: new Date().toISOString(),
  };

  const executionTime = Date.now() - startTime;

  logger.info("UI mapped successfully", {
    tool: toolName,
    component: uiPayload.component.componentName,
    hasExplanation: !!uiPayload.explanation,
    actionCount: uiPayload.actions?.length || 0,
    executionTime,
  });

  return uiPayload;
}

/**
 * Map result type to component and props
 */
function mapByResultType(
  resultType: ResultType,
  result: any,
  args: Record<string, any>,
  toolName: string,
): UIPayload {
  switch (resultType) {
    case "cluster_overview":
      return {
        component: {
          type: "component",
          componentName: "ClusterOverview",
          props: {
            totalNodes: result.totalNodes || 0,
            activeNodes: result.activeNodes || 0,
            totalPods: result.totalPods || 0,
            runningPods: result.runningPods || 0,
            failedPods: result.failedPods || 0,
            pendingPods: result.pendingPods || 0,
            totalDeployments: result.totalDeployments || 0,
            totalServices: result.totalServices || 0,
            cpuUsage: result.cpuUsage || 0,
            memoryUsage: result.memoryUsage || 0,
            storageUsage: result.storageUsage || 0,
            uptime: result.uptime,
            clusterVersion: result.clusterVersion,
            lastUpdated: new Date().toISOString(),
          },
        },
      };

    case "resource_usage":
      return {
        component: {
          type: "component",
          componentName: "ResourceUsageChart",
          props: {
            namespace: args.namespace,
            resources: result.resources || [],
            cpuData: result.cpuData || [],
            memoryData: result.memoryData || [],
            storageData: result.storageData || [],
            networkData: result.networkData || [],
            timeRange: result.timeRange || "1h",
            timestamp: new Date().toISOString(),
          },
        },
      };

    case "pod_health":
      return {
        component: {
          type: "component",
          componentName: "PodHealthMonitor",
          props: {
            pods: result.pods || [],
            healthScores: result.healthScores || {},
            autoRefresh: args.autoRefresh || false,
            refreshInterval: args.refreshInterval || 30000,
            namespace: args.namespace,
          },
        },
      };

    case "pods":
      return {
        component: {
          type: "component",
          componentName: "PodGrid",
          props: {
            pods: Array.isArray(result) ? result : result.pods || [],
            namespace: args.namespace || "default",
            labelSelector: args.label_selector,
            showFilters: true,
            sortBy: "status",
          },
        },
      };

    case "logs":
      return {
        component: {
          type: "component",
          componentName: "LogsViewer",
          props: {
            logs: typeof result === "string" ? result : result.logs || "",
            podName: result.podName || args.pod_name,
            namespace: result.namespace || args.namespace || "default",
            container: result.container || args.container,
            tail: args.tail,
            follow: args.follow || false,
            showTimestamps: true,
            highlightErrors: true,
          },
        },
      };

    case "events":
      return {
        component: {
          type: "component",
          componentName: "EventsTimeline",
          props: {
            events: Array.isArray(result) ? result : result.events || [],
            podName: args.pod_name,
            namespace: args.namespace || "default",
            showWarningsOnly: false,
            groupByType: true,
          },
        },
      };

    case "pod_detail":
      return {
        component: {
          type: "component",
          componentName: "PodDetailView",
          props: {
            pod: result,
            showContainers: true,
            showEvents: true,
            showMetrics: true,
          },
        },
      };

    case "deployment":
      return {
        component: {
          type: "component",
          componentName: "DeploymentsList",
          props: {
            deployments: Array.isArray(result)
              ? result
              : result.deployments || [],
            namespace: args.namespace || "default",
            showReplicas: true,
            showStatus: true,
          },
        },
      };

    case "services":
      return {
        component: {
          type: "component",
          componentName: "ServicesList",
          props: {
            services: Array.isArray(result) ? result : result.services || [],
            namespace: args.namespace || "default",
            showPorts: true,
            showEndpoints: true,
          },
        },
      };

    case "namespaces":
      return {
        component: {
          type: "component",
          componentName: "NamespacesList",
          props: {
            namespaces: Array.isArray(result)
              ? result
              : result.namespaces || [],
            showResourceCounts: true,
            showStatus: true,
          },
        },
      };

    case "nodes":
      return {
        component: {
          type: "component",
          componentName: "NodesList",
          props: {
            nodes: Array.isArray(result) ? result : result.nodes || [],
            showCapacity: true,
            showConditions: true,
            showTaints: false,
          },
        },
      };

    case "generic":
    default:
      return {
        component: {
          type: "component",
          componentName: "JsonViewer",
          props: {
            data: result,
            tool: toolName,
            expandLevel: 2,
          },
        },
      };
  }
}

/**
 * Build fallback UI for unknown tools
 */
function buildFallbackUI(result: any, toolName: string): UIPayload {
  logger.warn("Using fallback UI for unknown tool", { tool: toolName });

  return {
    component: {
      type: "component",
      componentName: "JsonViewer",
      props: {
        data: result,
        tool: toolName,
        expandLevel: 1,
      },
    },
    metadata: {
      tool: toolName,
      resultType: "generic",
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(
  toolDef: any,
  result: any,
  args: Record<string, any>,
): string {
  const tool = toolDef.name;

  switch (toolDef.result_type) {
    case "cluster_overview":
      return `Cluster has ${result.totalNodes || 0} nodes with ${result.runningPods || 0} running pods out of ${result.totalPods || 0} total.`;

    case "resource_usage":
      const ns = args.namespace || "all namespaces";
      return `Resource usage for ${ns}: CPU ${result.cpuUsage || 0}%, Memory ${result.memoryUsage || 0}%`;

    case "pod_health":
      const unhealthy = (result.pods || []).filter(
        (p: any) => p.healthScore < 80,
      ).length;
      return unhealthy > 0
        ? `Found ${unhealthy} unhealthy pod(s) requiring attention`
        : "All pods are healthy";

    case "pods":
      const pods = Array.isArray(result) ? result : result.pods || [];
      return `Found ${pods.length} pod(s) in ${args.namespace || "default"} namespace`;

    case "logs":
      const lines = typeof result === "string" ? result.split("\n").length : 0;
      return `Retrieved ${lines} log lines from ${args.pod_name}`;

    case "events":
      const events = Array.isArray(result) ? result : result.events || [];
      const warnings = events.filter((e: any) => e.type === "Warning").length;
      return warnings > 0
        ? `Found ${warnings} warning event(s)`
        : `${events.length} event(s) recorded`;

    default:
      return `Executed ${tool} successfully`;
  }
}

/**
 * Generate contextual actions based on result
 */
function generateActions(
  toolDef: any,
  result: any,
  args: Record<string, any>,
): UIAction[] {
  const actions: UIAction[] = [];

  switch (toolDef.result_type) {
    case "cluster_overview":
      if (result.failedPods > 0) {
        actions.push({
          label: "View Failed Pods",
          action: "filter_pods",
          params: { status: "Failed" },
        });
      }
      break;

    case "pods":
      const pods = Array.isArray(result) ? result : result.pods || [];
      const crashingPods = pods.filter((p: any) => p.status?.includes("Crash"));

      if (crashingPods.length > 0) {
        actions.push({
          label: "Debug Crashes",
          action: "explain_failures",
          params: { pods: crashingPods.map((p: any) => p.name) },
        });
      }
      break;

    case "logs":
      actions.push({
        label: "Explain Errors",
        action: "explain_logs",
        params: { pod_name: args.pod_name },
      });
      break;

    case "events":
      const events = Array.isArray(result) ? result : result.events || [];
      const hasWarnings = events.some((e: any) => e.type === "Warning");

      if (hasWarnings) {
        actions.push({
          label: "Analyze Events",
          action: "explain_events",
          params: { pod_name: args.pod_name },
        });
      }
      break;

    case "deployment":
      actions.push({
        label: "Scale Deployment",
        action: "scale_deployment",
        params: { name: args.name },
      });
      break;
  }

  // Always add "Show Raw Data" action
  actions.push({
    label: "Show Raw Data",
    action: "show_json",
    params: { data: result },
  });

  return actions;
}

/**
 * Validate UI payload structure
 */
export function validateUIPayload(payload: any): {
  valid: boolean;
  error?: string;
} {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Payload must be an object" };
  }

  if (!payload.component || typeof payload.component !== "object") {
    return { valid: false, error: "Missing component object" };
  }

  if (!payload.component.componentName) {
    return { valid: false, error: "Missing componentName" };
  }

  if (!payload.component.props || typeof payload.component.props !== "object") {
    return { valid: false, error: "Missing or invalid props" };
  }

  return { valid: true };
}

/**
 * Get available component names (for documentation)
 */
export function getAvailableComponents(): string[] {
  return [
    "ClusterOverview",
    "ResourceUsageChart",
    "PodHealthMonitor",
    "PodGrid",
    "LogsViewer",
    "EventsTimeline",
    "PodDetailView",
    "DeploymentsList",
    "ServicesList",
    "NamespacesList",
    "NodesList",
    "JsonViewer",
  ];
}
