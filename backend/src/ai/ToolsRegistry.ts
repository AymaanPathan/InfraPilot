import { z } from "zod";
import logger from "../utils/logger";

/**
 * ENHANCED Tools Registry - NAMESPACE FIX
 *
 * Fixed: get_pods now supports querying all namespaces
 */

export type ResultType =
  | "cluster_overview"
  | "resource_usage"
  | "pod_health"
  | "pods"
  | "logs"
  | "events"
  | "pod_detail"
  | "deployment"
  | "services"
  | "namespaces"
  | "nodes"
  | "generic";

export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  mcp_tool: string;
  args_schema: z.ZodObject<any>;
  result_type: ResultType;
  ui_component_default: string;
  examples: readonly string[];
}

export type ToolName = keyof typeof TOOL_REGISTRY;

export const TOOL_REGISTRY = {
  // ============================================
  // CLUSTER OVERVIEW & MONITORING
  // ============================================
  get_cluster_overview: {
    name: "get_cluster_overview",
    description:
      "Get comprehensive cluster health dashboard with nodes, pods, deployments, services, and resource usage metrics",
    category: "monitoring",
    mcp_tool: "get_cluster_overview",
    args_schema: z.object({}),
    result_type: "cluster_overview" as ResultType,
    ui_component_default: "ClusterOverview",
    examples: [
      "show cluster overview",
      "cluster status",
      "how is my cluster doing",
      "dashboard",
      "cluster health",
    ] as const,
  },

  get_resource_usage: {
    name: "get_resource_usage",
    description:
      "Get detailed resource usage charts for CPU, memory, storage, and network with trend indicators",
    category: "monitoring",
    mcp_tool: "get_resource_usage",
    args_schema: z.object({
      namespace: z.string().optional(),
    }),
    result_type: "resource_usage" as ResultType,
    ui_component_default: "ResourceUsageChart",
    examples: [
      "show resource usage",
      "resource metrics",
      "CPU and memory usage",
      "show resource charts",
      "resource usage for production",
    ] as const,
  },

  get_pod_health: {
    name: "get_pod_health",
    description:
      "Monitor pod health with health scores, readiness status, and restart counts",
    category: "monitoring",
    mcp_tool: "get_pods",
    args_schema: z.object({
      namespace: z.string().optional(), // FIXED: Made optional
    }),
    result_type: "pod_health" as ResultType,
    ui_component_default: "PodHealthMonitor",
    examples: [
      "monitor pod health",
      "pod health dashboard",
      "show pod health scores",
      "which pods are unhealthy",
      "track pod status",
    ] as const,
  },

  // ============================================
  // POD OPERATIONS
  // ============================================
  get_pods: {
    name: "get_pods",
    description:
      "List pods in a namespace or across all namespaces. If namespace is not specified, shows pods from ALL namespaces.",
    category: "pods",
    mcp_tool: "get_pods",
    args_schema: z.object({
      namespace: z.string().optional(), // FIXED: Changed from .default("default") to .optional()
      label_selector: z.string().optional(),
    }),
    result_type: "pods" as ResultType,
    ui_component_default: "PodGrid",
    examples: [
      "show all pods",
      "list pods",
      "pods in default namespace",
      "show pods in production",
      "list all pods across all namespaces",
    ] as const,
  },

  get_filtered_pods: {
    name: "get_filtered_pods",
    description: "Get pods filtered by status, labels, or other criteria",
    category: "pods",
    mcp_tool: "get_filtered_pods",
    args_schema: z.object({
      namespace: z.string().optional(), // FIXED: Made optional
      status: z.array(z.string()).optional(),
      label_selector: z.string().optional(),
    }),
    result_type: "pods" as ResultType,
    ui_component_default: "PodGrid",
    examples: [
      "show failed pods",
      "list crashing pods",
      "pods with status CrashLoopBackOff",
      "show all pods with errors",
    ] as const,
  },

  get_pod_logs: {
    name: "get_pod_logs",
    description: "Get logs from a specific pod with error highlighting",
    category: "pods",
    mcp_tool: "get_pod_logs",
    args_schema: z.object({
      name: z.string(),
      namespace: z.string().default("default"),
      container: z.string().optional(),
      tail: z.number().optional(),
      previous: z.boolean().optional(),
    }),
    result_type: "logs" as ResultType,
    ui_component_default: "LogsViewer",
    examples: [
      "get logs for api-server",
      "show logs for pod nginx",
      "logs from payment-service",
      "show last 100 lines of logs",
    ] as const,
  },

  get_pod_events: {
    name: "get_pod_events",
    description:
      "Get Kubernetes events for a pod to understand failures and warnings",
    category: "pods",
    mcp_tool: "get_pod_events",
    args_schema: z.object({
      name: z.string(),
      namespace: z.string().default("default"),
    }),
    result_type: "events" as ResultType,
    ui_component_default: "EventsTimeline",
    examples: [
      "why is payment-service crashing",
      "what happened to api pod",
      "show events for nginx",
      "pod history for frontend",
    ] as const,
  },

  describe_pod: {
    name: "describe_pod",
    description: "Get detailed information about a specific pod",
    category: "pods",
    mcp_tool: "describe_pod",
    args_schema: z.object({
      name: z.string(),
      namespace: z.string().default("default"),
    }),
    result_type: "pod_detail" as ResultType,
    ui_component_default: "PodDetailView",
    examples: [
      "describe pod api-server",
      "show details for nginx pod",
      "what's the status of payment-service",
    ] as const,
  },

  // ============================================
  // WORKLOAD MANAGEMENT
  // ============================================
  get_deployments: {
    name: "get_deployments",
    description: "List all deployments with replica counts and status",
    category: "workloads",
    mcp_tool: "get_deployments",
    args_schema: z.object({
      namespace: z.string().optional(), // FIXED: Made optional
    }),
    result_type: "deployment" as ResultType,
    ui_component_default: "DeploymentsList",
    examples: [
      "show deployments",
      "list all deployments",
      "deployment status",
      "show deployments in production",
    ] as const,
  },

  scale_deployment: {
    name: "scale_deployment",
    description: "Scale a deployment to a specific number of replicas",
    category: "workloads",
    mcp_tool: "scale_deployment",
    args_schema: z.object({
      name: z.string(),
      namespace: z.string().default("default"),
      replicas: z.number(),
    }),
    result_type: "deployment" as ResultType,
    ui_component_default: "DeploymentsList",
    examples: [
      "scale api to 5 replicas",
      "scale nginx deployment to 3",
      "set frontend replicas to 10",
    ] as const,
  },

  restart_deployment: {
    name: "restart_deployment",
    description: "Restart a deployment by triggering a rollout",
    category: "workloads",
    mcp_tool: "restart_deployment",
    args_schema: z.object({
      name: z.string(),
      namespace: z.string().default("default"),
    }),
    result_type: "deployment" as ResultType,
    ui_component_default: "DeploymentsList",
    examples: [
      "restart api deployment",
      "rollout restart nginx",
      "restart frontend",
    ] as const,
  },

  // ============================================
  // SERVICES & NETWORKING
  // ============================================
  get_services: {
    name: "get_services",
    description: "List all services with ports and endpoints",
    category: "networking",
    mcp_tool: "get_services",
    args_schema: z.object({
      namespace: z.string().optional(), // FIXED: Made optional
    }),
    result_type: "services" as ResultType,
    ui_component_default: "ServicesList",
    examples: [
      "show services",
      "list all services",
      "what services are running",
      "show services in default",
    ] as const,
  },

  // ============================================
  // CLUSTER INFRASTRUCTURE
  // ============================================
  get_namespaces: {
    name: "get_namespaces",
    description: "List all namespaces in the cluster",
    category: "infrastructure",
    mcp_tool: "get_namespaces",
    args_schema: z.object({}),
    result_type: "namespaces" as ResultType,
    ui_component_default: "NamespacesList",
    examples: [
      "show namespaces",
      "list namespaces",
      "what namespaces exist",
      "namespace overview",
    ] as const,
  },

  get_nodes: {
    name: "get_nodes",
    description: "List all nodes with capacity and conditions",
    category: "infrastructure",
    mcp_tool: "get_nodes",
    args_schema: z.object({}),
    result_type: "nodes" as ResultType,
    ui_component_default: "NodesList",
    examples: [
      "show nodes",
      "list cluster nodes",
      "node status",
      "cluster capacity",
    ] as const,
  },
} as const;

export function getToolDefinition(
  toolName: string,
): ToolDefinition | undefined {
  return TOOL_REGISTRY[toolName as ToolName];
}

export function isValidTool(toolName: string): boolean {
  return toolName in TOOL_REGISTRY;
}

export function getAllTools(): ToolDefinition[] {
  return Object.values(TOOL_REGISTRY);
}

export function getToolsByCategory(category: string): ToolDefinition[] {
  return Object.values(TOOL_REGISTRY).filter((t) => t.category === category);
}

export function getSmartSuggestions(): string[] {
  const suggestions: string[] = [];
  Object.values(TOOL_REGISTRY).forEach((tool) => {
    suggestions.push(...tool.examples.slice(0, 2));
  });
  return suggestions;
}

export function getToolSchemasForPlanner(): string {
  const schemas = Object.values(TOOL_REGISTRY).map((tool) => {
    const argsShape = tool.args_schema?.shape || {};

    const args = Object.entries(argsShape)
      .map(([key, schema]: [string, any]) => {
        const isOptional = schema?.isOptional?.() || false;
        const optional = isOptional ? "?" : "";

        let defaultVal = "";
        try {
          if (schema?._def?.defaultValue) {
            const defValue =
              typeof schema._def.defaultValue === "function"
                ? schema._def.defaultValue()
                : schema._def.defaultValue;
            defaultVal = ` (default: "${defValue}")`;
          }
        } catch (e) {
          // Ignore
        }

        const typeName = schema?._def?.typeName || "unknown";
        const cleanType = typeName.replace(/^Zod/, "").toLowerCase();

        return `  ${key}${optional}: ${cleanType}${defaultVal}`;
      })
      .join("\n");

    return `## ${tool.name}
Description: ${tool.description}
Category: ${tool.category}
UI Component: ${tool.ui_component_default}
Arguments:
${args || "  (none)"}
Examples:
${tool.examples.map((ex) => `  - "${ex}"`).join("\n")}
`;
  });

  return schemas.join("\n\n");
}

logger.info("Tools registry initialized", {
  toolCount: Object.keys(TOOL_REGISTRY).length,
  categories: Array.from(
    new Set(Object.values(TOOL_REGISTRY).map((t) => t.category)),
  ),
});
