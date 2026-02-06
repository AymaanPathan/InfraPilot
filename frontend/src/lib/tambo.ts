import type { TamboComponent } from "@tambo-ai/react";
import { z } from "zod";

// Import all existing components
import { PodGrid } from "@/components/container/PodsGrid";
import {
  StatusSummary,
  statusSummarySchema,
} from "@/components/container/StatusSummary";

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
import { LogsViewer } from "@/components/container/LogsViewer";
import {
  NamespacesList,
  namespacesListSchema,
} from "@/components/container/NamespacesList";
import {
  PersistentVolumesList,
  persistentVolumesListSchema,
} from "@/components/container/PersistentVolumesList";
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
import { ErrorDisplay, errorDisplaySchema } from "../components/ErrorDisplay";
import { MetricsPanel } from "@/components/container/metricsPanel";
import {
  ExplanationDisplay,
  TriageReport,
} from "@/components/container/Explanationcomponents";

// PHASE F: Import new multi-step components
import {
  MultiPanelView,
  multiPanelViewSchema,
} from "@/components/container/MultiPanelView";
import {
  ComparisonView,
  comparisonViewSchema,
} from "@/components/container/ComparisonView";

// Schemas
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
          cpu: z.object({ usage: z.string(), cores: z.number() }).optional(),
          memory: z.object({ usage: z.string(), bytes: z.number() }).optional(),
        })
        .optional(),
    }),
  ),
  namespace: z.string().optional(),
  explanation: z.string().optional(),
  autoExplained: z.boolean().optional(),
});

const logsViewerSchema = z.object({
  logs: z.union([z.string(), z.array(z.string())]),
  podName: z.string(),
  namespace: z.string().optional(),
  container: z.string().optional(),
  showTimestamps: z.boolean().optional(),
  highlightErrors: z.boolean().optional(),
  explanation: z.string().optional(),
  autoExplained: z.boolean().optional(),
  fixSuggestions: z
    .array(
      z.object({
        title: z.string(),
        category: z.string(),
        severity: z.enum(["critical", "high", "medium", "low"]),
        description: z.string(),
        steps: z.array(z.string()),
        commands: z.array(z.string()).optional(),
        documentation: z.string().optional(),
      }),
    )
    .optional(),
  hasErrors: z.boolean().optional(),
});

const metricsPanelSchema = z.object({
  podName: z.string(),
  namespace: z.string().optional(),
  cpu: z.object({ usage: z.string(), cores: z.number() }).optional(),
  memory: z.object({ usage: z.string(), bytes: z.number() }).optional(),
  restartCount: z.number().optional(),
  status: z.string().optional(),
});

const explanationDisplaySchema = z.object({
  explanation: z.string(),
  type: z.enum(["info", "warning", "error", "success"]).optional(),
  title: z.string().optional(),
  showIcon: z.boolean().optional(),
  className: z.string().optional(),
});

const triageReportSchema = z.object({
  report: z.string(),
  issues: z.array(
    z.object({
      type: z.string(),
      severity: z.enum(["critical", "warning", "info"]),
      podName: z.string(),
      namespace: z.string(),
      description: z.string(),
      metrics: z
        .object({
          restarts: z.number(),
          age: z.string().optional(),
          status: z.string().optional(),
        })
        .optional(),
    }),
  ),
  summary: z
    .object({
      total: z.number(),
      issuesFound: z.number(),
      critical: z.number(),
      warnings: z.number(),
    })
    .optional(),
});

/**
 * Tambo Components Configuration - PHASE F ENHANCED
 *
 * Now includes multi-step visualization components:
 * - MultiPanelView: Side-by-side panels for "show X and Y"
 * - ComparisonView: Comparison tables for "compare X and Y"
 */
export const components: TamboComponent[] = [
  // ============================================================================
  // ERROR HANDLING
  // ============================================================================
  {
    name: "ErrorDisplay",
    description: "Displays error messages with helpful hints and retry options",
    component: ErrorDisplay,
    propsSchema: errorDisplaySchema,
  },

  // ============================================================================
  // PHASE E: AI EXPLANATION COMPONENTS
  // ============================================================================
  {
    name: "ExplanationDisplay",
    description:
      "AI-generated explanations with markdown support and syntax highlighting. Auto-triggered when issues detected.",
    component: ExplanationDisplay,
    propsSchema: explanationDisplaySchema,
  },
  {
    name: "TriageReport",
    description:
      "Comprehensive health triage showing detected issues, severity classification, and recommendations",
    component: TriageReport,
    propsSchema: triageReportSchema,
  },

  // ============================================================================
  // PHASE F: MULTI-STEP VISUALIZATION COMPONENTS (NEW!)
  // ============================================================================
  {
    name: "MultiPanelView",
    description:
      "Displays multiple results from multi-step operations in tabs, grid, or vertical layout. Perfect for 'show X and their Y' queries like 'show failing pods and their logs'. Supports automatic component detection for pods, logs, events, and metrics. Each panel preserves context from the previous step.",
    component: MultiPanelView,
    propsSchema: multiPanelViewSchema,
  },
  {
    name: "ComparisonView",
    description:
      "Side-by-side comparison visualization for comparing pods, metrics, or resources. Shows comparison tables with visual indicators for highest/lowest values, trend arrows, and key insights. Use for queries like 'compare CPU of payment and billing pods' or 'compare resource usage across namespaces'. Automatically detects comparison type and generates actionable insights.",
    component: ComparisonView,
    propsSchema: comparisonViewSchema,
  },

  // ============================================================================
  // ENHANCED OVERVIEW & MONITORING
  // ============================================================================
  {
    name: "ClusterOverview",
    description:
      "Comprehensive cluster health dashboard with visual metrics, health scores, node status, resource usage",
    component: ClusterOverview,
    propsSchema: clusterOverviewSchema,
  },
  {
    name: "ResourceUsageChart",
    description:
      "Detailed resource usage visualization with charts for CPU, memory, storage, and network",
    component: ResourceUsageChart,
    propsSchema: resourceUsageChartSchema,
  },
  {
    name: "PodHealthMonitor",
    description:
      "Real-time pod health monitoring with health scores, restart counts, and auto-triggered AI explanations",
    component: PodHealthMonitor,
    propsSchema: podHealthMonitorSchema,
  },

  // ============================================================================
  // CORE POD MANAGEMENT
  // ============================================================================
  {
    name: "PodGrid",
    description:
      "Grid of Kubernetes pods with status badges, filtering, and auto-triggered triage reports",
    component: PodGrid,
    propsSchema: podGridSchema,
  },
  {
    name: "LogsViewer",
    description:
      "Pod logs viewer with error highlighting, live streaming, and AI-powered log analysis",
    component: LogsViewer,
    propsSchema: logsViewerSchema,
  },
  {
    name: "StatusSummary",
    description:
      "Detailed pod status including container states, conditions, and resource usage",
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

  // ============================================================================
  // NETWORKING
  // ============================================================================
  {
    name: "ServicesList",
    description:
      "Kubernetes services with type, ports, selectors, and IP addresses",
    component: ServicesList,
    propsSchema: servicesListSchema,
  },
  {
    name: "IngressList",
    description: "Ingress resources with routing rules and TLS configuration",
    component: IngressList,
    propsSchema: ingressListSchema,
  },

  // ============================================================================
  // EVENTS & MONITORING
  // ============================================================================
  {
    name: "EventsTimeline",
    description:
      "Chronological timeline of Kubernetes events with auto-triggered AI analysis for warnings",
    component: EventsTimeline,
    propsSchema: eventsTimelineSchema,
  },
  {
    name: "ClusterMetrics",
    description: "High-level cluster health dashboard",
    component: ClusterMetrics,
    propsSchema: clusterMetricsSchema,
  },

  // ============================================================================
  // INFRASTRUCTURE
  // ============================================================================
  {
    name: "NamespacesList",
    description: "All namespaces with resource counts and status",
    component: NamespacesList,
    propsSchema: namespacesListSchema,
  },
  {
    name: "NodesList",
    description: "Cluster nodes with health status, roles, and capacity",
    component: NodesList,
    propsSchema: nodesListSchema,
  },

  // ============================================================================
  // STORAGE
  // ============================================================================
  {
    name: "PersistentVolumesList",
    description: "Persistent volumes with capacity, access modes, and status",
    component: PersistentVolumesList,
    propsSchema: persistentVolumesListSchema,
  },

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  {
    name: "ConfigMapsList",
    description: "ConfigMaps with keys and expandable data preview",
    component: ConfigMapsList,
    propsSchema: configMapsListSchema,
  },
  {
    name: "ResourceQuota",
    description:
      "Namespace resource quotas showing CPU, memory, and pod limits vs usage",
    component: ResourceQuota,
    propsSchema: resourceQuotaSchema,
  },
];

export const tools = [];
