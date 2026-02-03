import type { TamboComponent } from "@tambo-ai/react";

// Import existing components
import { PodGrid } from "@/components/container/PodsGrid";
import {
  StatusSummary,
  statusSummarySchema,
} from "@/components/container/StatusSummary";

// Import new components
import {
  DeploymentsList,
  deploymentsListSchema,
} from "@/components/container/DeploymentsList";
import {
  ServicesList,
  servicesListSchema,
} from "@/components/container/ServicesList";
import {
  EventsTimeline,
  eventsTimelineSchema,
} from "@/components/container/EventsTimeline";
import {
  ResourceQuota,
  resourceQuotaSchema,
} from "@/components/container/ResourceQuota";
import { NodesList, nodesListSchema } from "@/components/container/NodesList";
import {
  ConfigMapsList,
  configMapsListSchema,
} from "@/components/container/ConfigMapsList";
import {
  IngressList,
  ingressListSchema,
} from "@/components/container/IngressList";
import {
  ClusterMetrics,
  clusterMetricsSchema,
} from "@/components/container/ClusterMetrics";
import { LogsViewer } from "@/components/container/LogsViewew";
import {
  NamespacesList,
  namespacesListSchema,
} from "@/components/container/NamespacesList";
import {
  PersistentVolumesList,
  persistentVolumesListSchema,
} from "@/components/container/PersistentVolumesList";

// Import NEW enhanced components
import {
  ClusterOverview,
  clusterOverviewSchema,
} from "@/components/container/clusterOverView";
import {
  ResourceUsageChart,
  resourceUsageChartSchema,
} from "@/components/container/ResourceUsage";
import {
  PodHealthMonitor,
  podHealthMonitorSchema,
} from "@/components/container/Podhealthmonitor";

// Import error display
import { ErrorDisplay, errorDisplaySchema } from "../components/ErrorDisplay";
import { z } from "zod";
import { MetricsPanel } from "@/components/container/metricsPanel";

const podGridSchema = z.object({
  pods: z.array(
    z.object({
      name: z.string(),
      namespace: z.string(),
      status: z.string(),
      restartCount: z.number().optional(),
      age: z.string().optional(),
      metrics: z
        .object({
          cpu: z
            .object({
              usage: z.string(),
              cores: z.number(),
            })
            .optional(),
          memory: z
            .object({
              usage: z.string(),
              bytes: z.number(),
            })
            .optional(),
        })
        .optional(),
    }),
  ),
  namespace: z.string().optional(),
});

const logsViewerSchema = z.object({
  logs: z.union([z.string(), z.array(z.string())]),
  podName: z.string(),
  namespace: z.string().optional(),
  container: z.string().optional(),
  showTimestamps: z.boolean().optional(),
  highlightErrors: z.boolean().optional(),
});

const metricsPanelSchema = z.object({
  podName: z.string(),
  namespace: z.string().optional(),
  cpu: z
    .object({
      usage: z.string(),
      cores: z.number(),
    })
    .optional(),
  memory: z
    .object({
      usage: z.string(),
      bytes: z.number(),
    })
    .optional(),
  restartCount: z.number().optional(),
  status: z.string().optional(),
});

/**
 * Tambo Components Configuration
 *
 * All Kubernetes visualization components that Tambo can render.
 * Each component is AI-aware and will be automatically selected based on user intent.
 */
export const components: TamboComponent[] = [
  // ============================================================================
  // ERROR HANDLING
  // ============================================================================
  {
    name: "ErrorDisplay",
    description:
      "Displays error messages from backend or MCP server with helpful hints and retry options. Use when any operation fails or backend is unavailable.",
    component: ErrorDisplay,
    propsSchema: errorDisplaySchema,
  },

  // ============================================================================
  // ENHANCED OVERVIEW & MONITORING (NEW!)
  // ============================================================================
  {
    name: "ClusterOverview",
    description:
      "Comprehensive cluster health dashboard with visual metrics, health scores, node status, resource usage (CPU/memory), and workload summaries. Shows uptime and cluster version. Use when user asks for 'cluster overview', 'cluster status', 'cluster health', 'dashboard', 'show me cluster metrics', or 'how is my cluster doing'.",
    component: ClusterOverview,
    propsSchema: clusterOverviewSchema,
  },
  {
    name: "ResourceUsageChart",
    description:
      "Detailed resource usage visualization with charts for CPU, memory, storage, and network. Shows current usage vs limits with trend indicators. Supports namespace-specific or cluster-wide views. Use when user asks about 'resource usage', 'show resource charts', 'CPU and memory usage', 'storage usage', 'network usage', or 'resource metrics'.",
    component: ResourceUsageChart,
    propsSchema: resourceUsageChartSchema,
  },
  {
    name: "PodHealthMonitor",
    description:
      "Real-time pod health monitoring with health scores, restart counts, readiness status, and resource usage per pod. Includes filtering by status and health. Use when user asks to 'monitor pod health', 'show pod health scores', 'which pods are unhealthy', 'pod monitoring dashboard', or 'track pod status'.",
    component: PodHealthMonitor,
    propsSchema: podHealthMonitorSchema,
  },

  // ============================================================================
  // CORE POD MANAGEMENT
  // ============================================================================
  {
    name: "PodGrid",
    description:
      "Displays a grid of Kubernetes pods with status badges, namespace info, and filtering capabilities. Shows pod name, status (Running/Pending/CrashLoopBackOff), restarts, age, and node assignment. Use when user asks to 'show pods', 'list pods', 'what pods are running', or similar.",
    component: PodGrid,
    propsSchema: podGridSchema,
  },
  {
    name: "LogsViewer",
    description:
      "A component for viewing and analyzing pod logs. Supports live log streaming, error highlighting, container selection for multi-container pods, and AI-powered log explanation. Includes copy and download functionality. Use when user asks for 'logs', 'show logs for [pod]', or 'what are the errors in [pod]'.",
    component: LogsViewer,
    propsSchema: logsViewerSchema,
  },
  {
    name: "StatusSummary",
    description:
      "Displays detailed status information for a specific pod including container states, conditions, resource usage, and recent events. Use when user asks to 'describe pod [name]', 'show pod details', or 'what's wrong with [pod]'.",
    component: StatusSummary,
    propsSchema: statusSummarySchema,
  },
  {
    name: "MetricsPanel",
    description: "Display pod resource metrics (CPU, memory, restarts)",
    component: MetricsPanel,
    propsSchema: metricsPanelSchema,
  },

  // ============================================================================
  // WORKLOAD MANAGEMENT
  // ============================================================================
  {
    name: "DeploymentsList",
    description:
      "Shows all deployments with replica counts, availability status, and health indicators. Displays desired vs ready replicas with visual progress bars. Use when user asks about 'deployments', 'show deployments', 'list all deployments', or 'deployment status'.",
    component: DeploymentsList,
    propsSchema: deploymentsListSchema,
  },

  // ============================================================================
  // NETWORKING
  // ============================================================================
  {
    name: "ServicesList",
    description:
      "Displays Kubernetes services with type (ClusterIP/LoadBalancer/NodePort), ports, selectors, and IP addresses. Shows internal and external connectivity options. Use when user asks about 'services', 'show services', 'what services are exposed', or 'networking'.",
    component: ServicesList,
    propsSchema: servicesListSchema,
  },
  {
    name: "IngressList",
    description:
      "Shows ingress resources with routing rules, TLS configuration, hosts, and backends. Displays HTTP/HTTPS routes and path mappings. Use when user asks about 'ingress', 'routes', 'external access', 'domains', or 'HTTPS configuration'.",
    component: IngressList,
    propsSchema: ingressListSchema,
  },

  // ============================================================================
  // EVENTS & MONITORING
  // ============================================================================
  {
    name: "EventsTimeline",
    description:
      "Chronological timeline of Kubernetes events for pods or other resources. Shows warnings, errors, and normal events with timestamps and reasons. Useful for debugging. Use when user asks 'what happened to [pod]', 'show events', 'pod history', or 'why did [pod] fail'.",
    component: EventsTimeline,
    propsSchema: eventsTimelineSchema,
  },
  {
    name: "ClusterMetrics",
    description:
      "High-level cluster health dashboard showing total nodes, pods, deployments, services, resource usage (CPU/memory), and active issues. Provides overview of cluster status. Use when user asks 'cluster status', 'cluster health', 'overview', 'dashboard', or 'how is my cluster doing'.",
    component: ClusterMetrics,
    propsSchema: clusterMetricsSchema,
  },

  // ============================================================================
  // INFRASTRUCTURE
  // ============================================================================
  {
    name: "NamespacesList",
    description:
      "Lists all namespaces with resource counts (pods, services, deployments), status, and labels. Shows system vs custom namespaces. Use when user asks 'show namespaces', 'list namespaces', 'what namespaces exist', or 'namespace overview'.",
    component: NamespacesList,
    propsSchema: namespacesListSchema,
  },
  {
    name: "NodesList",
    description:
      "Displays cluster nodes with health status, roles (control-plane/worker), capacity (CPU/memory/pods), and conditions. Shows node-level infrastructure. Use when user asks 'show nodes', 'node status', 'cluster capacity', or 'available resources'.",
    component: NodesList,
    propsSchema: nodesListSchema,
  },

  // ============================================================================
  // STORAGE
  // ============================================================================
  {
    name: "PersistentVolumesList",
    description:
      "Shows persistent volumes with capacity, access modes, reclaim policy, status (Bound/Available), and claims. Displays storage infrastructure. Use when user asks about 'storage', 'volumes', 'persistent volumes', 'PVs', or 'disk usage'.",
    component: PersistentVolumesList,
    propsSchema: persistentVolumesListSchema,
  },

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  {
    name: "ConfigMapsList",
    description:
      "Lists ConfigMaps with keys and data preview. Expandable to show full configuration content. Use when user asks 'show config maps', 'list configs', 'configuration', or 'environment variables'.",
    component: ConfigMapsList,
    propsSchema: configMapsListSchema,
  },
  {
    name: "ResourceQuota",
    description:
      "Displays namespace resource quotas showing CPU, memory, and pod limits vs usage. Shows resource consumption with progress bars. Use when user asks 'resource limits', 'quotas', 'namespace limits', or 'resource usage in [namespace]'.",
    component: ResourceQuota,
    propsSchema: resourceQuotaSchema,
  },
];

/**
 * No tools exported - all Kubernetes operations handled via MCP
 *
 * The backend API at /api/ai/command handles:
 * - Intent recognition (user input → MCP tool selection)
 * - MCP tool execution (get_pods, get_logs, restart_deployment, etc.)
 * - Result formatting for components
 * - AI explanations when needed
 *
 * Tools are registered with Tambo via the infraCommandTool in /tools/infraTool.ts
 */
export const tools = [];
