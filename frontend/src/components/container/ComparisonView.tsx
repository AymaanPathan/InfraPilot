"use client";

import { z } from "zod";
import { ArrowUp, ArrowDown, GitCompare } from "lucide-react";
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
  comparisonType = "pods",
}: ComparisonViewProps) {
  if (!comparison || comparison?.length < 2) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <p className="text-neutral-600">Comparison requires at least 2 items</p>
      </div>
    );
  }

  const itemsToCompare = items || comparison?.map((c) => c?.data);

  if (comparisonType === "metrics") {
    return <MetricsComparison items={itemsToCompare} />;
  }

  if (comparisonType === "pods") {
    return <PodsComparison items={itemsToCompare} />;
  }

  return <GenericComparison items={itemsToCompare} />;
}

/**
 * FIXED: Properly extracts CPU/memory metrics from the data structure
 */
function MetricsComparison({ items }: { items: any[] }) {
  const metrics = [
    { key: "cpu", label: "CPU Cores", getDisplay: getCpuDisplay },
    { key: "memory", label: "Memory", getDisplay: getMemoryDisplay },
    { key: "restarts", label: "Restart Count", getDisplay: getRestartDisplay },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare className="w-5 h-5 text-neutral-700" />
        <h3 className="text-lg font-semibold text-neutral-900">
          Metrics Comparison
        </h3>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="text-left p-4 text-sm font-semibold text-neutral-900">
                Metric
              </th>
              {items?.map((item, index) => {
                const podName = getPodName(item);

                return (
                  <th
                    key={index}
                    className="text-left p-4 text-sm font-semibold text-neutral-900"
                  >
                    <div>
                      <div className="font-mono text-xs text-neutral-600">
                        {podName}
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">
                        {item?.namespace || "default"}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {metrics?.map((metric, mIndex) => {
              const values = items?.map((item, itemIndex) => {
                const extractedValue = extractMetricValue(item, metric.key);

                return extractedValue;
              });

              const numericValues = values.map((v) => v.numeric);
              const maxValue = Math.max(...numericValues);
              const minValue = Math.min(...numericValues);

              return (
                <tr key={mIndex} className="hover:bg-neutral-50">
                  <td className="p-4 text-sm text-neutral-700 font-medium">
                    {metric.label}
                  </td>
                  {values?.map((value, vIndex) => {
                    const isHighest =
                      value.numeric === maxValue &&
                      numericValues.length > 1 &&
                      maxValue > 0;
                    const isLowest =
                      value.numeric === minValue &&
                      numericValues.length > 1 &&
                      maxValue !== minValue;

                    return (
                      <td key={vIndex} className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-neutral-900">
                              {metric.getDisplay(value)}
                            </span>
                            {value.raw && (
                              <span className="text-xs text-neutral-500 font-mono">
                                {value.raw}
                              </span>
                            )}
                          </div>
                          {isHighest && (
                            <ArrowUp className="w-4 h-4 text-red-600" />
                          )}
                          {isLowest && (
                            <ArrowDown className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Key insights */}
        <div className="bg-neutral-50 p-4 border-t border-neutral-200">
          <h4 className="text-sm font-semibold text-neutral-900 mb-2">
            Key Insights
          </h4>
          <div className="text-sm text-neutral-700 space-y-1">
            {generateInsights(items, metrics)}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Extract pod name from various possible data structures
 */
function getPodName(item: any): string {
  return (
    item?.podName ||
    item?.name ||
    item?.pod?.name ||
    item?.metadata?.name ||
    "Unknown"
  );
}

/**
 * Extract metric value with proper handling of nested structures
 */
/**
 * Extract metric value with proper handling of nested structures
 * FIXED: Removed console.log calls to prevent setState during render
 */
function extractMetricValue(
  item: any,
  metricKey: string,
): { numeric: number; raw: string; formatted: string } {
  if (metricKey === "cpu") {
    // Try multiple paths
    const cpuData =
      item?.cpu || // Direct from get_pod_metrics
      item?.metrics?.cpu || // Nested in metrics
      item?.pod?.metrics?.cpu; // Nested in pod.metrics

    if (cpuData) {
      // FIX: Use cores directly, not usage string!
      const cores = cpuData.cores || 0;
      const millicores = cpuData.millicores || cores * 1000;

      return {
        numeric: cores, // Use cores as numeric value
        raw: `${millicores}m`, // Display millicores
        formatted: `${cores.toFixed(2)} cores`, // Display cores with 2 decimals
      };
    }
  }

  if (metricKey === "memory") {
    const memoryData =
      item?.memory || item?.metrics?.memory || item?.pod?.metrics?.memory;

    if (memoryData) {
      // Use bytes and format properly
      const bytes = memoryData.bytes || 0;
      const mb = bytes / (1024 * 1024);
      const gb = bytes / (1024 * 1024 * 1024);

      const formatted = gb >= 1 ? `${gb.toFixed(2)} GB` : `${mb.toFixed(2)} MB`;

      return {
        numeric: mb, // Use MB for comparison
        raw: memoryData.usage || "0Mi",
        formatted: formatted,
      };
    }
  }

  if (metricKey === "restarts") {
    const restartCount =
      item?.restartCount || item?.restarts || item?.pod?.restarts || 0;

    return {
      numeric: restartCount,
      raw: "",
      formatted: `${restartCount}`,
    };
  }

  return {
    numeric: 0,
    raw: "",
    formatted: "N/A",
  };
}

function getCpuDisplay(value: {
  numeric: number;
  raw: string;
  formatted: string;
}): string {
  if (value.numeric === 0) return "N/A";
  return value.formatted;
}

function getMemoryDisplay(value: {
  numeric: number;
  raw: string;
  formatted: string;
}): string {
  if (value.numeric === 0) return "N/A";
  return value.formatted;
}

function getRestartDisplay(value: {
  numeric: number;
  raw: string;
  formatted: string;
}): string {
  return value.formatted;
}

function generateInsights(items: any[], metrics: any[]): JSX.Element[] {
  const insights: JSX.Element[] = [];

  // CPU insights
  const cpuValues = items.map((item) => extractMetricValue(item, "cpu"));
  const maxCpu = Math.max(...cpuValues.map((v) => v.numeric));
  const maxCpuIndex = cpuValues.findIndex((v) => v.numeric === maxCpu);

  if (maxCpu > 0 && items.length > 1) {
    const podName = getPodName(items[maxCpuIndex]);
    const cpuFormatted = cpuValues[maxCpuIndex].formatted; // ✅ Use formatted value
    insights.push(
      <div key="cpu">
        <span className="font-medium">{podName}</span> has the highest CPU usage
        at <span className="font-medium">{cpuFormatted}</span>
      </div>,
    );
  }

  // Memory insights
  const memValues = items.map((item) => extractMetricValue(item, "memory"));
  const maxMem = Math.max(...memValues.map((v) => v.numeric));
  const maxMemIndex = memValues.findIndex((v) => v.numeric === maxMem);

  if (maxMem > 0 && items.length > 1) {
    const podName = getPodName(items[maxMemIndex]);
    const memFormatted = memValues[maxMemIndex].formatted; // ✅ Use formatted value
    insights.push(
      <div key="memory">
        <span className="font-medium">{podName}</span> has the highest memory
        usage at <span className="font-medium">{memFormatted}</span>
      </div>,
    );
  }

  // Restart insights
  const restartValues = items.map((item) =>
    extractMetricValue(item, "restarts"),
  );
  const maxRestarts = Math.max(...restartValues.map((v) => v.numeric));
  const maxRestartIndex = restartValues.findIndex(
    (v) => v.numeric === maxRestarts,
  );

  if (maxRestarts > 0) {
    const podName = getPodName(items[maxRestartIndex]);
    insights.push(
      <div key="restarts">
        <span className="font-medium">{podName}</span> has restarted{" "}
        <span className="font-medium">{maxRestarts}</span> time
        {maxRestarts !== 1 ? "s" : ""}
      </div>,
    );
  }

  if (insights.length === 0) {
    insights.push(
      <div key="none" className="text-neutral-500">
        No significant differences detected
      </div>,
    );
  }

  return insights;
}

function PodsComparison({ items }: { items: any[] }) {
  const fields = [
    { key: "status", label: "Status" },
    { key: "namespace", label: "Namespace" },
    { key: "restarts", label: "Restarts" },
    { key: "age", label: "Age" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare className="w-5 h-5 text-neutral-700" />
        <h3 className="text-lg font-semibold text-neutral-900">
          Pod Comparison
        </h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items?.map((item, index) => (
          <div
            key={index}
            className="bg-white border border-neutral-200 rounded-xl p-4"
          >
            <h4 className="font-mono text-sm font-semibold text-neutral-900 mb-4">
              {item?.name || `Pod ${index + 1}`}
            </h4>

            <div className="space-y-3">
              {fields?.map((field, fIndex) => {
                const value = item?.[field.key] || "-";
                return (
                  <div
                    key={fIndex}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm text-neutral-600">
                      {field.label}
                    </span>
                    <span className="text-sm font-medium text-neutral-900">
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
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
        <GitCompare className="w-5 h-5 text-neutral-700" />
        <h3 className="text-lg font-semibold text-neutral-900">Comparison</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items?.map((item, index) => (
          <div
            key={index}
            className="bg-white border border-neutral-200 rounded-xl p-4"
          >
            <h4 className="font-semibold text-neutral-900 mb-3">
              Item {index + 1}
            </h4>
            <pre className="text-xs text-neutral-700 bg-neutral-50 rounded p-3 overflow-auto max-h-96 border border-neutral-200">
              {JSON.stringify(item, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
