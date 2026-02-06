"use client";

import { z } from "zod";
import {
  ArrowUp,
  ArrowDown,
  GitCompare,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { JSX } from "react";

export const comparisonViewSchema = z.object({
  comparison: z.array(
    z.object({
      step: z.number(),
      data: z.any(),
    }),
  ),
  items: z.array(z.any()).optional(),
  comparisonType: z.enum(["pods", "metrics", "resources"]).optional(),
});

type ComparisonViewProps = z.infer<typeof comparisonViewSchema>;

export function ComparisonView({
  comparison,
  items,
  comparisonType = "metrics",
}: ComparisonViewProps) {
  console.group("🔍 ComparisonView Debug");
  console.log("comparison:", comparison);
  console.log("items:", items);
  console.log("comparisonType:", comparisonType);
  console.groupEnd();

  if (!comparison || comparison?.length < 2) {
    return (
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6">
        <div className="flex items-center gap-3 text-amber-400">
          <AlertCircle className="w-5 h-5" />
          <p className="font-medium">Comparison requires at least 2 items</p>
        </div>
      </div>
    );
  }

  // Use items array - it contains the unwrapped data
  const itemsToCompare = items || [];

  if (itemsToCompare.length === 0) {
    return (
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6">
        <div className="flex items-center gap-3 text-amber-400">
          <AlertCircle className="w-5 h-5" />
          <p className="font-medium">No items available for comparison</p>
        </div>
      </div>
    );
  }

  if (comparisonType === "metrics") {
    return <MetricsComparison items={itemsToCompare} />;
  }

  if (comparisonType === "pods") {
    return <PodsComparison items={itemsToCompare} />;
  }

  return <GenericComparison items={itemsToCompare} />;
}

/**
 * Enhanced Metrics Comparison with better UX
 */
function MetricsComparison({ items }: { items: any[] }) {
  const metrics = [
    { key: "cpu", label: "CPU Usage", icon: TrendingUp, color: "blue" },
    { key: "memory", label: "Memory Usage", icon: TrendingUp, color: "purple" },
    {
      key: "restarts",
      label: "Restart Count",
      icon: AlertCircle,
      color: "red",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-zinc-800/50">
        <div className="bg-blue-500/10 p-3 rounded-xl">
          <GitCompare className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-xl font-medium text-white">
            Pod Metrics Comparison
          </h3>
          <p className="text-sm text-zinc-400 font-light mt-1">
            Comparing {items.length} pods across key metrics
          </p>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-neutral-50 to-neutral-100 border-b border-zinc-800/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-white w-48">
                Metric
              </th>
              {items?.map((item, index) => {
                const podName = getPodName(item);
                const namespace = getNamespace(item);
                const status = item?.status || "Unknown";

                return (
                  <th
                    key={index}
                    className="text-left p-4 text-sm font-medium text-white"
                  >
                    <div className="space-y-2">
                      <div className="font-mono text-sm bg-neutral-900 text-white px-3 py-1.5 rounded-lg inline-block">
                        {podName}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-500 font-light">ns:</span>
                        <span className="font-mono bg-zinc-800/50 px-2 py-0.5 rounded text-zinc-300">
                          {namespace}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            status === "Running"
                              ? "bg-green-500/100"
                              : "bg-red-500/100"
                          }`}
                        />
                        <span className="text-xs text-zinc-400 font-light">
                          {status}
                        </span>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {metrics?.map((metric, mIndex) => {
              const Icon = metric.icon;
              const values = items?.map((item) =>
                extractMetricValue(item, metric.key),
              );
              const numericValues = values.map((v) => v.numeric);
              const maxValue = Math.max(...numericValues);
              const minValue = Math.min(...numericValues.filter((n) => n > 0));

              return (
                <tr
                  key={mIndex}
                  className="hover:bg-zinc-800/50/50 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`bg-${metric.color}-50 p-2 rounded-lg`}>
                        <Icon className={`w-4 h-4 text-${metric.color}-600`} />
                      </div>
                      <span className="text-sm font-medium text-white">
                        {metric.label}
                      </span>
                    </div>
                  </td>
                  {values?.map((value, vIndex) => {
                    const isHighest =
                      value.numeric === maxValue &&
                      numericValues.length > 1 &&
                      maxValue > 0;
                    const isLowest =
                      value.numeric === minValue &&
                      numericValues.length > 1 &&
                      maxValue !== minValue &&
                      minValue > 0;

                    return (
                      <td key={vIndex} className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-lg font-medium text-white">
                              {value.formatted}
                            </span>
                            {value.raw && value.raw !== value.formatted && (
                              <span className="text-xs text-zinc-500 font-light font-mono mt-0.5">
                                {value.raw}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            {isHighest && (
                              <div className="flex items-center gap-1 bg-red-500/10 text-red-400 px-2 py-1 rounded-md text-xs font-medium">
                                <ArrowUp className="w-3 h-3" />
                                Highest
                              </div>
                            )}
                            {isLowest && (
                              <div className="flex items-center gap-1 bg-green-500/10 text-green-400 px-2 py-1 rounded-md text-xs font-medium">
                                <ArrowDown className="w-3 h-3" />
                                Lowest
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Key Insights */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-t border-zinc-800/50">
          <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Key Insights
          </h4>
          <div className="space-y-2">{generateInsights(items, metrics)}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Direct extraction from backend response structure
 */
function extractMetricValue(
  item: any,
  metricKey: string,
): { numeric: number; raw: string; formatted: string } {
  if (metricKey === "cpu") {
    const cpuData = item?.cpu;

    if (cpuData && typeof cpuData === "object") {
      const millicores = cpuData.millicores ?? 0;
      const cores = cpuData.cores ?? millicores / 1000;
      const usage = cpuData.usage || `${millicores.toFixed(6)}m`;

      return {
        numeric: millicores,
        raw: usage,
        formatted:
          millicores >= 1000
            ? `${(millicores / 1000).toFixed(3)} cores`
            : `${millicores.toFixed(3)}m`,
      };
    }

    return { numeric: 0, raw: "0m", formatted: "0.000m" };
  }

  if (metricKey === "memory") {
    const memoryData = item?.memory;

    if (memoryData && typeof memoryData === "object") {
      const bytes = memoryData.bytes ?? 0;
      const usage = memoryData.usage || "0Mi";

      const kb = bytes / 1024;
      const mb = bytes / (1024 * 1024);
      const gb = bytes / (1024 * 1024 * 1024);

      let formatted: string;
      if (gb >= 1) {
        formatted = `${gb.toFixed(2)} GB`;
      } else if (mb >= 1) {
        formatted = `${mb.toFixed(0)} MB`;
      } else if (kb >= 1) {
        formatted = `${kb.toFixed(0)} KB`;
      } else {
        formatted = `${bytes} B`;
      }

      return {
        numeric: bytes,
        raw: usage,
        formatted: formatted,
      };
    }

    return { numeric: 0, raw: "0Mi", formatted: "0 MB" };
  }

  if (metricKey === "restarts") {
    const restartCount = item?.restartCount ?? 0;

    return {
      numeric: restartCount,
      raw: String(restartCount),
      formatted: String(restartCount),
    };
  }

  return { numeric: 0, raw: "0", formatted: "0" };
}

function getPodName(item: any): string {
  return item?.podName || item?.name || "Unknown";
}

function getNamespace(item: any): string {
  return item?.namespace || "default";
}

function generateInsights(items: any[], metrics: any[]): JSX.Element[] {
  const insights: JSX.Element[] = [];

  // CPU insights
  const cpuValues = items.map((item) => extractMetricValue(item, "cpu"));
  const cpuNumerics = cpuValues.map((v) => v.numeric);
  const maxCpu = Math.max(...cpuNumerics);
  const minCpu = Math.min(...cpuNumerics.filter((n) => n > 0));
  const maxCpuIndex = cpuNumerics.findIndex((v) => v === maxCpu);

  if (maxCpu > 0 && items.length > 1) {
    const podName = getPodName(items[maxCpuIndex]);
    const cpuDisplay = cpuValues[maxCpuIndex].formatted;

    if (minCpu > 0 && maxCpu !== minCpu) {
      const ratio = (maxCpu / minCpu).toFixed(2);
      insights.push(
        <div key="cpu" className="flex items-start gap-2 text-sm">
          <div className="bg-blue-100 p-1 rounded">
            <TrendingUp className="w-3 h-3 text-blue-400" />
          </div>
          <p className="text-zinc-300">
            <span className="font-medium text-white">{podName}</span> uses{" "}
            <span className="font-medium text-blue-400">{cpuDisplay}</span> CPU
            — <span className="font-medium">{ratio}×</span> more than the lowest
          </p>
        </div>,
      );
    } else {
      insights.push(
        <div key="cpu" className="flex items-start gap-2 text-sm">
          <div className="bg-blue-100 p-1 rounded">
            <TrendingUp className="w-3 h-3 text-blue-400" />
          </div>
          <p className="text-zinc-300">
            <span className="font-medium text-white">{podName}</span> has the
            highest CPU at{" "}
            <span className="font-medium text-blue-400">{cpuDisplay}</span>
          </p>
        </div>,
      );
    }
  }

  // Memory insights
  const memValues = items.map((item) => extractMetricValue(item, "memory"));
  const memNumerics = memValues.map((v) => v.numeric);
  const maxMem = Math.max(...memNumerics);
  const minMem = Math.min(...memNumerics.filter((n) => n > 0));
  const maxMemIndex = memNumerics.findIndex((v) => v === maxMem);

  if (maxMem > 0 && items.length > 1) {
    const podName = getPodName(items[maxMemIndex]);
    const memDisplay = memValues[maxMemIndex].formatted;

    if (minMem > 0 && maxMem !== minMem) {
      const ratio = (maxMem / minMem).toFixed(2);
      insights.push(
        <div key="memory" className="flex items-start gap-2 text-sm">
          <div className="bg-purple-100 p-1 rounded">
            <TrendingUp className="w-3 h-3 text-purple-400" />
          </div>
          <p className="text-zinc-300">
            <span className="font-medium text-white">{podName}</span> uses{" "}
            <span className="font-medium text-purple-400">{memDisplay}</span>{" "}
            memory — <span className="font-medium">{ratio}×</span> more than the
            lowest
          </p>
        </div>,
      );
    }
  }

  // Restart insights
  const restartValues = items.map((item) =>
    extractMetricValue(item, "restarts"),
  );
  const totalRestarts = restartValues.reduce((sum, v) => sum + v.numeric, 0);
  const maxRestarts = Math.max(...restartValues.map((v) => v.numeric));

  if (totalRestarts > 0) {
    const maxRestartIndex = restartValues.findIndex(
      (v) => v.numeric === maxRestarts,
    );
    const podName = getPodName(items[maxRestartIndex]);

    insights.push(
      <div key="restarts" className="flex items-start gap-2 text-sm">
        <div className="bg-red-100 p-1 rounded">
          <AlertCircle className="w-3 h-3 text-red-400" />
        </div>
        <p className="text-zinc-300">
          <span className="font-medium text-white">{podName}</span> has{" "}
          <span className="font-medium text-red-400">{maxRestarts}</span>{" "}
          restart
          {maxRestarts !== 1 ? "s" : ""}
          {totalRestarts > maxRestarts && (
            <span className="text-zinc-500 font-light">
              {" "}
              (total across all pods: {totalRestarts})
            </span>
          )}
        </p>
      </div>,
    );
  }

  if (insights.length === 0) {
    insights.push(
      <div key="none" className="text-sm text-zinc-500 font-light italic">
        No significant differences detected between pods
      </div>,
    );
  }

  return insights;
}

function PodsComparison({ items }: { items: any[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare className="w-5 h-5 text-zinc-300" />
        <h3 className="text-lg font-medium text-white">Pod Comparison</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items?.map((item, index) => (
          <div
            key={index}
            className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-4"
          >
            <h4 className="font-mono text-sm font-medium text-white mb-4">
              {getPodName(item)}
            </h4>
            <pre className="text-xs text-zinc-300 bg-zinc-800/50 rounded p-3 overflow-auto max-h-96">
              {JSON.stringify(item, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

function GenericComparison({ items }: { items: any[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare className="w-5 h-5 text-zinc-300" />
        <h3 className="text-lg font-medium text-white">Comparison</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items?.map((item, index) => (
          <div
            key={index}
            className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-4"
          >
            <h4 className="font-medium text-white mb-3">{getPodName(item)}</h4>
            <pre className="text-xs text-zinc-300 bg-zinc-800/50 rounded p-3 overflow-auto max-h-96 border border-zinc-800/50">
              {JSON.stringify(item, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
