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
} from "lucide-react";
import { ExplanationDisplay } from "./Explanationcomponents";

/**
 * Comparison View Component - PHASE F
 *
 * Displays side-by-side comparison of pods, metrics, or other resources.
 * Used for queries like "compare CPU of payment and billing pods"
 */

export const comparisonViewSchema = z.object({
  comparison: z.array(
    z.object({
      step: z.number(),
      data: z.any(),
    }),
  ),
  items: z.array(z.any()),
  comparisonType: z.enum(["pods", "metrics", "resources"]).optional(),
  explanation: z.string().optional(),
});

type ComparisonViewProps = z.infer<typeof comparisonViewSchema>;

export function ComparisonView({
  comparison,
  items,
  comparisonType = "metrics",
  explanation,
}: ComparisonViewProps) {
  // Detect comparison type if not provided
  const detectedType = detectComparisonType(items);
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
            Comparison: {items.length} Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {type === "metrics" && <MetricsComparison items={items} />}
          {type === "pods" && <PodsComparison items={items} />}
          {type === "resources" && <ResourcesComparison items={items} />}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Detect comparison type from data structure
 */
function detectComparisonType(items: any[]): "pods" | "metrics" | "resources" {
  if (!items || items.length === 0) return "metrics";

  const first = items[0];

  if (first.cpu || first.memory || first.containers) {
    return "metrics";
  }

  if (first.status || first.restarts !== undefined) {
    return "pods";
  }

  return "resources";
}

/**
 * Metrics Comparison View
 */
function MetricsComparison({ items }: { items: any[] }) {
  const metrics = items.map((item, index) => ({
    name: item.metadata?.name || item.name || `Item ${index + 1}`,
    namespace: item.metadata?.namespace || item.namespace || "default",
    cpu: extractMetricValue(item, "cpu"),
    memory: extractMetricValue(item, "memory"),
    restarts: item.restartCount || 0,
  }));

  // Calculate comparison stats
  const cpuValues = metrics.map((m) => m.cpu).filter((v) => v !== null);
  const memoryValues = metrics.map((m) => m.memory).filter((v) => v !== null);

  const cpuMax = Math.max(...cpuValues);
  const memoryMax = Math.max(...memoryValues);

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
                  {metric.name}
                </td>
                <td className="py-3 px-4 text-slate-300">
                  <Badge variant="outline" className="text-xs">
                    {metric.namespace}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-white">
                      {metric.cpu !== null ? `${metric.cpu}m` : "N/A"}
                    </span>
                    {metric.cpu === cpuMax && cpuValues.length > 1 && (
                      <TrendingUp className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-white">
                      {metric.memory !== null ? `${metric.memory}Mi` : "N/A"}
                    </span>
                    {metric.memory === memoryMax && memoryValues.length > 1 && (
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

      {/* Visual Comparison Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      {/* Winner/Insights */}
      <ComparisonInsights metrics={metrics} />
    </div>
  );
}

/**
 * Pods Comparison View
 */
function PodsComparison({ items }: { items: any[] }) {
  return (
    <div className="space-y-4">
      {items.map((pod, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg"
        >
          <div>
            <h4 className="font-medium text-white">{pod.name}</h4>
            <p className="text-sm text-slate-400">{pod.namespace}</p>
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
function ResourcesComparison({ items }: { items: any[] }) {
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
  items,
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
          const percentage = (item.value / item.max) * 100 || 0;
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 truncate max-w-[150px]">
                  {item.label}
                </span>
                <span className="text-white font-medium">
                  {item.value}
                  {item.unit}
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
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
  const cpuValues = metrics.map((m) => m.cpu).filter((v) => v !== null);
  const memoryValues = metrics.map((m) => m.memory).filter((v) => v !== null);

  if (cpuValues.length === 0 && memoryValues.length === 0) {
    return null;
  }

  const highestCpu = metrics.find((m) => m.cpu === Math.max(...cpuValues));
  const highestMemory = metrics.find(
    (m) => m.memory === Math.max(...memoryValues),
  );

  const insights = [];

  if (highestCpu) {
    insights.push({
      icon: <Cpu className="w-4 h-4" />,
      text: `${highestCpu.name} has the highest CPU usage (${highestCpu.cpu}m)`,
      color: "text-blue-400",
    });
  }

  if (highestMemory) {
    insights.push({
      icon: <MemoryStick className="w-4 h-4" />,
      text: `${highestMemory.name} has the highest memory usage (${highestMemory.memory}Mi)`,
      color: "text-purple-400",
    });
  }

  const highRestarts = metrics.filter((m) => m.restarts > 5);
  if (highRestarts.length > 0) {
    insights.push({
      icon: <AlertTriangle className="w-4 h-4" />,
      text: `${highRestarts.length} pod(s) have high restart counts`,
      color: "text-amber-400",
    });
  }

  return (
    <div className="p-4 bg-slate-900/50 rounded-lg space-y-2">
      <h4 className="text-sm font-medium text-slate-300 mb-3">Key Insights</h4>
      {insights.map((insight, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span className={insight.color}>{insight.icon}</span>
          <span className="text-slate-300">{insight.text}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Extract metric value from pod data
 */
function extractMetricValue(item: any, type: "cpu" | "memory"): number | null {
  if (item[type]) {
    if (typeof item[type] === "object") {
      // Extract from cores/bytes
      const value = type === "cpu" ? item[type].cores : item[type].bytes;
      return value || null;
    }
    if (typeof item[type] === "string") {
      // Parse "250m" or "512Mi"
      const match = item[type].match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }
  }

  // Try containers array
  if (item.containers && Array.isArray(item.containers)) {
    const total = item.containers.reduce((sum: number, c: any) => {
      const val = extractMetricValue(c, type);
      return sum + (val || 0);
    }, 0);
    return total || null;
  }

  return null;
}

/**
 * Status Badge
 */
function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "Running"
      ? "default"
      : status === "Pending"
        ? "secondary"
        : "destructive";

  return <Badge variant={variant}>{status}</Badge>;
}
