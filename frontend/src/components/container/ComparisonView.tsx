"use client";

import { z } from "zod";
import { ArrowUp, ArrowDown, Minus, GitCompare } from "lucide-react";

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
  if (!comparison || comparison.length < 2) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <p className="text-neutral-600">Comparison requires at least 2 items</p>
      </div>
    );
  }

  const itemsToCompare = items || comparison.map((c) => c.data);

  if (comparisonType === "metrics") {
    return <MetricsComparison items={itemsToCompare} />;
  }

  if (comparisonType === "pods") {
    return <PodsComparison items={itemsToCompare} />;
  }

  return <GenericComparison items={itemsToCompare} />;
}

function MetricsComparison({ items }: { items: any[] }) {
  const metrics = [
    { key: "cpu", label: "CPU Usage", unit: "%" },
    { key: "memory", label: "Memory Usage", unit: "%" },
    { key: "restarts", label: "Restart Count", unit: "" },
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
              {items.map((item, index) => (
                <th
                  key={index}
                  className="text-left p-4 text-sm font-semibold text-neutral-900"
                >
                  {item.pod?.name || item.name || `Item ${index + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {metrics.map((metric, mIndex) => {
              const values = items.map((item) => {
                if (metric.key === "cpu") {
                  return (
                    item.pod?.metrics?.cpu?.usagePercent ||
                    item.metrics?.cpu?.usagePercent ||
                    0
                  );
                }
                if (metric.key === "memory") {
                  return (
                    item.pod?.metrics?.memory?.usagePercent ||
                    item.metrics?.memory?.usagePercent ||
                    0
                  );
                }
                if (metric.key === "restarts") {
                  return item.pod?.restarts || item.restarts || 0;
                }
                return 0;
              });

              const maxValue = Math.max(...values);
              const minValue = Math.min(...values);

              return (
                <tr key={mIndex} className="hover:bg-neutral-50">
                  <td className="p-4 text-sm text-neutral-700 font-medium">
                    {metric.label}
                  </td>
                  {values.map((value, vIndex) => {
                    const isHighest = value === maxValue && values.length > 1;
                    const isLowest = value === minValue && values.length > 1;

                    return (
                      <td key={vIndex} className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-neutral-900">
                            {value}
                            {metric.unit}
                          </span>
                          {isHighest && value !== 0 && (
                            <ArrowUp className="w-4 h-4 text-red-600" />
                          )}
                          {isLowest && maxValue !== minValue && (
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
      </div>
    </div>
  );
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
        {items.map((item, index) => (
          <div
            key={index}
            className="bg-white border border-neutral-200 rounded-xl p-4"
          >
            <h4 className="font-mono text-sm font-semibold text-neutral-900 mb-4">
              {item.name || `Pod ${index + 1}`}
            </h4>

            <div className="space-y-3">
              {fields.map((field, fIndex) => {
                const value = item[field.key] || "-";
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
        {items.map((item, index) => (
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
