"use client";

import { Activity, HardDrive, RefreshCw, AlertTriangle } from "lucide-react";
import { z } from "zod";

export const metricsPanelSchema = z.object({
  podName: z.string(),
  namespace: z.string().optional(),
  cpu: z
    .object({
      usage: z.string(),
      cores: z.number(),
      usagePercent: z.number().optional(),
    })
    .optional(),
  memory: z
    .object({
      usage: z.string(),
      bytes: z.number(),
      usagePercent: z.number().optional(),
    })
    .optional(),
  restartCount: z.number().optional(),
  status: z.string().optional(),
  available: z.boolean().optional(),
  error: z.string().optional(),
});

type MetricsPanelProps = z.infer<typeof metricsPanelSchema>;

export function MetricsPanel({
  podName,
  namespace = "default",
  cpu,
  memory,
  restartCount = 0,
  status = "Unknown",
  available = true,
  error,
}: MetricsPanelProps) {
  // Handle metrics unavailable case
  if (!available || error) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-neutral-700" />
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">
              Resource Metrics
            </h3>
            <p className="text-sm text-neutral-600 font-mono">
              {podName} • {namespace}
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900">
                Metrics Unavailable
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                {error || "Metrics Server is not installed or unavailable"}
              </p>
              <details className="mt-3">
                <summary className="text-xs text-yellow-800 cursor-pointer hover:text-yellow-900">
                  How to fix this
                </summary>
                <div className="mt-2 text-xs text-yellow-700 space-y-1">
                  <p className="font-semibold">Install Metrics Server:</p>
                  <p className="font-mono bg-yellow-100 p-2 rounded">
                    kubectl apply -f
                    https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
                  </p>
                  <p className="mt-2">
                    Or for Minikube:{" "}
                    <code className="bg-yellow-100 px-1 rounded">
                      minikube addons enable metrics-server
                    </code>
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate severity for restarts
  const restartSeverity =
    restartCount === 0 ? "ok" : restartCount < 5 ? "warning" : "critical";

  const cpuUsagePercent = cpu?.usagePercent || 0;
  const memoryUsagePercent = memory?.usagePercent || 0;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-5 h-5 text-neutral-700" />
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">
            Resource Metrics
          </h3>
          <p className="text-sm text-neutral-600 font-mono">
            {podName} • {namespace}
          </p>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* CPU Metric */}
        <MetricCard
          icon={<Activity className="w-5 h-5" />}
          label="CPU"
          value={cpuUsagePercent > 0 ? `${cpuUsagePercent}%` : "N/A"}
          subValue={cpu?.usage || "0m"}
          detail={`${cpu?.cores || 0} cores`}
          percent={cpuUsagePercent}
          color={getCpuColor(cpuUsagePercent)}
        />

        {/* Memory Metric */}
        <MetricCard
          icon={<HardDrive className="w-5 h-5" />}
          label="Memory"
          value={memoryUsagePercent > 0 ? `${memoryUsagePercent}%` : "N/A"}
          subValue={memory?.usage || "0Mi"}
          detail={formatBytes(memory?.bytes || 0)}
          percent={memoryUsagePercent}
          color={getMemoryColor(memoryUsagePercent)}
        />
      </div>

      {/* Restarts */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-neutral-600" />
            <span className="text-sm font-medium text-neutral-700">
              Restarts
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-lg font-semibold ${getRestartColor(restartSeverity)}`}
            >
              {restartCount}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded ${getRestartBadgeColor(restartSeverity)}`}
            >
              {restartSeverity}
            </span>
          </div>
        </div>
        {restartCount > 0 && (
          <p className="text-xs text-neutral-600 mt-2">
            {restartCount >= 5
              ? "High restart count may indicate instability"
              : `${restartCount} restart${restartCount > 1 ? "s" : ""} detected`}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    Running: "bg-green-100 text-green-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Failed: "bg-red-100 text-red-800",
    CrashLoopBackOff: "bg-red-100 text-red-800",
    Unknown: "bg-neutral-100 text-neutral-800",
  };

  const colorClass = statusColors[status] || statusColors.Unknown;

  return (
    <span
      className={`inline-block text-xs px-2 py-1 rounded mt-1 ${colorClass}`}
    >
      {status}
    </span>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subValue,
  detail,
  percent,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  detail: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={color}>{icon}</div>
        <span className="text-sm font-medium text-neutral-700">{label}</span>
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-bold text-neutral-900">{value}</div>
        <div className="text-sm font-mono text-neutral-600">{subValue}</div>
        <div className="text-xs text-neutral-500">{detail}</div>
      </div>

      {/* Progress bar */}
      {percent > 0 && (
        <div className="mt-3">
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(percent)}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function getCpuColor(percent: number): string {
  if (percent >= 80) return "text-red-600";
  if (percent >= 60) return "text-yellow-600";
  return "text-green-600";
}

function getMemoryColor(percent: number): string {
  if (percent >= 85) return "text-red-600";
  if (percent >= 70) return "text-yellow-600";
  return "text-blue-600";
}

function getProgressBarColor(percent: number): string {
  if (percent >= 80) return "bg-red-500";
  if (percent >= 60) return "bg-yellow-500";
  return "bg-green-500";
}

function getRestartColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-red-600";
    case "warning":
      return "text-yellow-600";
    default:
      return "text-green-600";
  }
}

function getRestartBadgeColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800";
    case "warning":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-green-100 text-green-800";
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
