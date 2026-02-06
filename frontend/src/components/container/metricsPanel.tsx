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
  if (!available || error) {
    return (
      <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-zinc-400" strokeWidth={2} />
          <div>
            <h3 className="text-lg font-medium text-white">Resource Metrics</h3>
            <p className="text-sm text-zinc-400 font-mono font-light">
              {podName} • {namespace}
            </p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
              strokeWidth={2}
            />
            <div>
              <p className="text-sm font-medium text-amber-300">
                Metrics Unavailable
              </p>
              <p className="text-sm text-amber-200 mt-1 font-light">
                {error || "Metrics Server is not installed or unavailable"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const restartSeverity =
    restartCount === 0 ? "ok" : restartCount < 5 ? "warning" : "critical";

  const cpuUsagePercent = cpu?.usagePercent ?? 0;
  const memoryUsagePercent = memory?.usagePercent ?? 0;

  const formatPercent = (percent: number): string => {
    if (percent === 0) return "0%";
    if (percent < 0.01) return "<0.01%";
    if (percent < 1) return percent.toFixed(2) + "%";
    if (percent < 10) return percent.toFixed(1) + "%";
    return Math.round(percent) + "%";
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="w-5 h-5 text-zinc-400" strokeWidth={2} />
        <div>
          <h3 className="text-lg font-medium text-white">Resource Metrics</h3>
          <p className="text-sm text-zinc-400 font-mono font-light">
            {podName} • {namespace}
          </p>
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          icon={<Activity className="w-5 h-5" strokeWidth={2} />}
          label="CPU"
          value={formatPercent(cpuUsagePercent)}
          subValue={cpu?.usage || "0m"}
          detail={`${cpu?.cores || 0} cores`}
          percent={cpuUsagePercent}
          color={getCpuColor(cpuUsagePercent)}
        />

        <MetricCard
          icon={<HardDrive className="w-5 h-5" strokeWidth={2} />}
          label="Memory"
          value={formatPercent(memoryUsagePercent)}
          subValue={memory?.usage || "0Mi"}
          detail={formatBytes(memory?.bytes || 0)}
          percent={memoryUsagePercent}
          color={getMemoryColor(memoryUsagePercent)}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-zinc-400" strokeWidth={2} />
            <span className="text-sm font-medium text-zinc-300">Restarts</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-lg font-medium ${getRestartColor(restartSeverity)}`}
            >
              {restartCount}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-lg ${getRestartBadgeColor(restartSeverity)}`}
            >
              {restartSeverity}
            </span>
          </div>
        </div>
        {restartCount > 0 && (
          <p className="text-xs text-zinc-500 mt-2 font-light">
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
    Running: "bg-green-500/10 text-green-400 border-green-500/20",
    Pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Failed: "bg-red-500/10 text-red-400 border-red-500/20",
    CrashLoopBackOff: "bg-red-500/10 text-red-400 border-red-500/20",
    Unknown: "bg-zinc-800/50 text-zinc-400 border-zinc-700/50",
  };

  const colorClass = statusColors[status] || statusColors.Unknown;

  return (
    <span
      className={`inline-block text-xs px-2 py-1 rounded border mt-1 ${colorClass}`}
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
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={color}>{icon}</div>
        <span className="text-sm font-medium text-zinc-300">{label}</span>
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-medium text-white">{value}</div>
        <div className="text-sm font-mono text-zinc-400 font-light">
          {subValue}
        </div>
        <div className="text-xs text-zinc-500 font-light">{detail}</div>
      </div>

      <div className="mt-3">
        <div className="w-full bg-zinc-700/50 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(percent)}`}
            style={{
              width: `${Math.max(0.5, Math.min(percent, 100))}%`,
              minWidth: percent > 0 ? "2px" : "0px",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function getCpuColor(percent: number): string {
  if (percent >= 80) return "text-red-400";
  if (percent >= 60) return "text-amber-400";
  return "text-green-400";
}

function getMemoryColor(percent: number): string {
  if (percent >= 85) return "text-red-400";
  if (percent >= 70) return "text-amber-400";
  return "text-blue-400";
}

function getProgressBarColor(percent: number): string {
  if (percent >= 80) return "bg-red-500";
  if (percent >= 60) return "bg-amber-500";
  return "bg-green-500";
}

function getRestartColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-red-400";
    case "warning":
      return "text-amber-400";
    default:
      return "text-green-400";
  }
}

function getRestartBadgeColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-500/10 text-red-400 border border-red-500/20";
    case "warning":
      return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    default:
      return "bg-green-500/10 text-green-400 border border-green-500/20";
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
