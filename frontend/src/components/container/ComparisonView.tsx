"use client";

import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GitCompare,
  Cpu,
  MemoryStick,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  PackageOpen,
} from "lucide-react";
import { ExplanationDisplay } from "./Explanationcomponents";

/**
 * Comparison View Component - PHASE F - FIXED
 *
 * Displays side-by-side comparison of pods, metrics, or other resources.
 * Used for queries like "compare CPU of payment and billing pods"
 *
 * FIXES:
 * - Properly extracts pod data from multi-step execution results
 * - Shows pod names and namespaces
 * - Handles missing metrics gracefully
 * - Better data structure detection
 */

export const comparisonViewSchema = z.object({
  comparison: z
    .array(
      z.object({
        step: z.number(),
        data: z.any(),
      }),
    )
    .optional(),
  items: z.array(z.any()).optional(),
  comparisonType: z.enum(["pods", "metrics", "resources"]).optional(),
  explanation: z.string().optional(),
  // Multi-step execution result format
  panels: z
    .array(
      z.object({
        id: z.string(),
        step: z.number(),
        data: z.any(),
        success: z.boolean(),
      }),
    )
    .optional(),
});

type ComparisonViewProps = z.infer<typeof comparisonViewSchema>;

export function ComparisonView({
  comparison = [],
  items = [],
  panels = [],
  comparisonType,
  explanation,
}: ComparisonViewProps) {
  // Extract items from different possible data structures
  const extractedItems = extractItems(comparison, items, panels);

  console.log("🔍 ComparisonView Debug:", {
    comparison,
    items,
    panels,
    extractedItems,
  });

  // Detect comparison type if not provided
  const detectedType = detectComparisonType(extractedItems);
  const type = comparisonType || detectedType;

  return (
    <div className="space-y-4">
      {explanation && (
        <ExplanationDisplay
          explanation={explanation}
          type="info"
          className="mb-4"
        />
      )}

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <GitCompare className="w-5 h-5 text-blue-400" />
            Comparison: {extractedItems.length} Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {extractedItems.length === 0 ? (
            <EmptyComparison />
          ) : (
            <>
              {type === "metrics" && (
                <MetricsComparison items={extractedItems} />
              )}
              {type === "pods" && <PodsComparison items={extractedItems} />}
              {type === "resources" && (
                <ResourcesComparison items={extractedItems} />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Extract items from various data structure formats
 */
function extractItems(
  comparison: any[] = [],
  items: any[] = [],
  panels: any[] = [],
): any[] {
  // Priority 1: Use items if directly provided
  if (items && items.length > 0) {
    return items;
  }

  // Priority 2: Extract from comparison array (multi-step result)
  if (comparison && comparison.length > 0) {
    return comparison.map((c) => c.data).filter(Boolean);
  }

  // Priority 3: Extract from panels (multi-step result alternate format)
  if (panels && panels.length > 0) {
    return panels.map((p) => p.data).filter(Boolean);
  }

  return [];
}

/**
 * Detect comparison type from data structure
 */
function detectComparisonType(items: any[]): "pods" | "metrics" | "resources" {
  if (!items || items.length === 0) return "metrics";

  const first = items[0];

  // Check if it's pod data with metrics
  if (first?.pod || first?.metadata?.name || first?.name) {
    return "metrics";
  }

  // Check if it's a pod list
  if (first?.status || first?.restarts !== undefined) {
    return "pods";
  }

  return "resources";
}

/**
 * Empty state
 */
function EmptyComparison() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <PackageOpen className="w-12 h-12 text-slate-600 mb-4" />
      <h3 className="text-lg font-medium text-slate-400 mb-2">
        No Data to Compare
      </h3>
      <p className="text-sm text-slate-500 max-w-md">
        The comparison didn't return any data. This might happen if the pods
        don't exist or if there was an error fetching their information.
      </p>
    </div>
  );
}

/**
 * Metrics Comparison View - FIXED
 */
function MetricsComparison({ items = [] }: { items?: any[] }) {
  // Extract pod information and metrics
  const metrics = items.map((item, index) => {
    // Handle different data structures
    const pod = item.pod || item;
    const metadata = pod.metadata || {};
    const status = pod.status || {};

    // Extract name from various possible locations
    const name = metadata.name || pod.name || item.name || `Pod ${index + 1}`;
    const namespace =
      metadata.namespace || pod.namespace || item.namespace || "default";

    // Extract metrics
    const cpu = extractMetricValue(item, "cpu");
    const memory = extractMetricValue(item, "memory");
    const restarts = extractRestartCount(item);
    const podStatus = status.phase || pod.status || "Unknown";

    return {
      name,
      namespace,
      cpu,
      memory,
      restarts,
      status: podStatus,
      rawData: item, // Keep for debugging
    };
  });

  console.log("📊 Metrics extracted:", metrics);

  // Calculate comparison stats
  const cpuValues = metrics
    .map((m) => m.cpu)
    .filter((v) => v !== null && v > 0);
  const memoryValues = metrics
    .map((m) => m.memory)
    .filter((v) => v !== null && v > 0);

  const cpuMax = cpuValues.length > 0 ? Math.max(...cpuValues as any) : 0;
  const memoryMax = memoryValues.length > 0 ? Math.max(...memoryValues as any) : 0;

  return (
    <div className="space-y-6">
      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-slate-400 font-medium">
                Pod Name
              </th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">
                Namespace
              </th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">
                Status
              </th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  CPU
                </div>
              </th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">
                <div className="flex items-center gap-2">
                  <MemoryStick className="w-4 h-4" />
                  Memory
                </div>
              </th>
              <th className="text-left py-3 px-4 text-slate-400 font-medium">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Restarts
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, index) => (
              <tr
                key={index}
                className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
              >
                <td className="py-3 px-4 font-medium text-white">
                  <div className="flex items-center gap-2">
                    <span
                      className="truncate max-w-[200px]"
                      title={metric.name}
                    >
                      {metric.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-300">
                  <Badge variant="outline" className="text-xs">
                    {metric.namespace}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={metric.status} />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-white">
                      {metric.cpu !== null ? `${metric.cpu}m` : "N/A"}
                    </span>
                    {metric.cpu === cpuMax &&
                      cpuValues.length > 1 &&
                      metric.cpu > 0 && (
                        <TrendingUp className="w-4 h-4 text-red-400" />
                      )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-white">
                      {metric.memory !== null ? `${metric.memory}Mi` : "N/A"}
                    </span>
                    {metric.memory === memoryMax &&
                      memoryValues.length > 1 &&
                      metric.memory > 0 && (
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                      )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <Badge
                    variant={metric.restarts > 5 ? "destructive" : "secondary"}
                  >
                    {metric.restarts}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visual Comparison Bars - Only show if we have data */}
      {(cpuValues.length > 0 || memoryValues.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cpuValues.length > 0 && (
            <ComparisonBar
              title="CPU Usage"
              items={metrics.map((m) => ({
                label: m.name,
                value: m.cpu || 0,
                max: cpuMax,
                unit: "m",
              }))}
              icon={<Cpu className="w-4 h-4" />}
            />
          )}
          {memoryValues.length > 0 && (
            <ComparisonBar
              title="Memory Usage"
              items={metrics.map((m) => ({
                label: m.name,
                value: m.memory || 0,
                max: memoryMax,
                unit: "Mi",
              }))}
              icon={<MemoryStick className="w-4 h-4" />}
            />
          )}
        </div>
      )}

      {/* Winner/Insights */}
      <ComparisonInsights metrics={metrics} />
    </div>
  );
}

/**
 * Pods Comparison View
 */
function PodsComparison({ items = [] }: { items?: any[] }) {
  return (
    <div className="space-y-4">
      {items.map((pod, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700/50"
        >
          <div className="flex-1">
            <h4 className="font-medium text-white">
              {pod.name || `Pod ${index + 1}`}
            </h4>
            <p className="text-sm text-slate-400">
              {pod.namespace || "default"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={pod.status} />
            <Badge variant="outline">Restarts: {pod.restarts || 0}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Resources Comparison View
 */
function ResourcesComparison({ items = [] }: { items?: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, index) => (
        <Card key={index} className="bg-slate-900/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-sm text-white">
              {item.name || `Item ${index + 1}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-slate-300 overflow-auto max-h-48">
              {JSON.stringify(item, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Comparison Bar Chart
 */
function ComparisonBar({
  title,
  items = [],
  icon,
}: {
  title: string;
  items: Array<{ label: string; value: number; max: number; unit: string }>;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
        {icon}
        {title}
      </div>
      <div className="space-y-2">
        {items.map((item, index) => {
          const percentage = item.max > 0 ? (item.value / item.max) * 100 : 0;
          const hasValue = item.value > 0;

          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span
                  className="text-slate-400 truncate max-w-[150px]"
                  title={item.label}
                >
                  {item.label}
                </span>
                <span
                  className={`font-medium ${hasValue ? "text-white" : "text-slate-600"}`}
                >
                  {hasValue ? `${item.value}${item.unit}` : "N/A"}
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    hasValue
                      ? "bg-gradient-to-r from-blue-500 to-blue-600"
                      : "bg-slate-700"
                  }`}
                  style={{ width: `${hasValue ? percentage : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Comparison Insights
 */
function ComparisonInsights({ metrics }: { metrics: any[] }) {
  const cpuValues = metrics
    .map((m) => m.cpu)
    .filter((v) => v !== null && v > 0);
  const memoryValues = metrics
    .map((m) => m.memory)
    .filter((v) => v !== null && v > 0);

  const insights = [];

  // CPU insights
  if (cpuValues.length > 0) {
    const maxCpu = Math.max(...cpuValues);
    const highestCpu = metrics.find((m) => m.cpu === maxCpu);
    if (highestCpu) {
      insights.push({
        icon: <Cpu className="w-4 h-4" />,
        text: `${highestCpu.name} has the highest CPU usage (${highestCpu.cpu}m)`,
        color: "text-blue-400",
      });
    }
  }

  // Memory insights
  if (memoryValues.length > 0) {
    const maxMemory = Math.max(...memoryValues);
    const highestMemory = metrics.find((m) => m.memory === maxMemory);
    if (highestMemory) {
      insights.push({
        icon: <MemoryStick className="w-4 h-4" />,
        text: `${highestMemory.name} has the highest memory usage (${highestMemory.memory}Mi)`,
        color: "text-purple-400",
      });
    }
  }

  // Restart insights
  const highRestarts = metrics.filter((m) => m.restarts > 5);
  if (highRestarts.length > 0) {
    insights.push({
      icon: <AlertTriangle className="w-4 h-4" />,
      text: `${highRestarts.length} pod(s) have high restart counts`,
      color: "text-amber-400",
    });
  }

  // Status insights
  const failedPods = metrics.filter(
    (m) =>
      m.status &&
      (m.status.includes("Failed") || m.status.includes("CrashLoop")),
  );
  if (failedPods.length > 0) {
    insights.push({
      icon: <AlertTriangle className="w-4 h-4" />,
      text: `${failedPods.length} pod(s) are in a failed state`,
      color: "text-red-400",
    });
  }

  // No metrics available warning
  if (cpuValues.length === 0 && memoryValues.length === 0) {
    insights.push({
      icon: <AlertTriangle className="w-4 h-4" />,
      text: "Metrics unavailable - install Kubernetes Metrics Server",
      color: "text-amber-400",
    });
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 space-y-2">
      <h4 className="text-sm font-medium text-slate-300 mb-3">Key Insights</h4>
      {insights.map((insight, index) => (
        <div key={index} className="flex items-start gap-2 text-sm">
          <span className={`${insight.color} mt-0.5`}>{insight.icon}</span>
          <span className="text-slate-300">{insight.text}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Extract metric value from pod data - FIXED
 */
function extractMetricValue(item: any, type: "cpu" | "memory"): number | null {
  // Try direct metric access
  if (item[type]) {
    if (typeof item[type] === "object") {
      const value = type === "cpu" ? item[type].cores : item[type].bytes;
      if (value) {
        // Convert to appropriate unit
        if (type === "cpu") {
          return Math.round(value * 1000); // cores to millicores
        } else {
          return Math.round(value / (1024 * 1024)); // bytes to Mi
        }
      }
    }
    if (typeof item[type] === "string") {
      const match = item[type].match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }
  }

  // Try pod.metrics
  if (item.pod?.metrics) {
    return extractMetricValue(item.pod.metrics, type);
  }

  // Try item.metrics
  if (item.metrics) {
    return extractMetricValue(item.metrics, type);
  }

  // Try containers array
  if (item.containers && Array.isArray(item.containers)) {
    const total = item.containers.reduce((sum: number, c: any) => {
      const val = extractMetricValue(c, type);
      return sum + (val || 0);
    }, 0);
    return total > 0 ? total : null;
  }

  return null;
}

/**
 * Extract restart count from various locations
 */
function extractRestartCount(item: any): number {
  // Direct restarts/restartCount field
  if (typeof item.restarts === "number") return item.restarts;
  if (typeof item.restartCount === "number") return item.restartCount;

  // From pod object
  if (item.pod) {
    if (typeof item.pod.restarts === "number") return item.pod.restarts;
    if (typeof item.pod.restartCount === "number") return item.pod.restartCount;
  }

  // From metrics
  if (item.metrics?.restartCount) return item.metrics.restartCount;

  // From status.containerStatuses
  if (item.status?.containerStatuses?.[0]?.restartCount) {
    return item.status.containerStatuses[0].restartCount;
  }

  return 0;
}

/**
 * Status Badge
 */
function StatusBadge({ status }: { status?: string }) {
  if (!status) {
    return <Badge variant="secondary">Unknown</Badge>;
  }

  const statusLower = status.toLowerCase();

  const variant =
    statusLower === "running"
      ? "default"
      : statusLower === "pending"
        ? "secondary"
        : statusLower.includes("crash") || statusLower.includes("fail")
          ? "destructive"
          : "outline";

  return <Badge variant={variant}>{status}</Badge>;
}
