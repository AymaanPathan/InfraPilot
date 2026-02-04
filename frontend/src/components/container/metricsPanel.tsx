"use client";

import {
  Activity,
  Cpu,
  HardDrive,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface MetricsPanelProps {
  podName: string;
  namespace?: string;
  cpu?: {
    usage: string;
    cores: number;
    usagePercent?: number;
  };
  memory?: {
    usage: string;
    bytes: number;
    usagePercent?: number;
  };
  restartCount?: number;
  status?: string;
  containers?: Array<{
    name: string;
    cpu?: {
      usage: string;
      cores: number;
    };
    memory?: {
      usage: string;
      bytes: number;
    };
  }>;
}

export function MetricsPanel({
  podName,
  namespace = "default",
  cpu,
  memory,
  restartCount = 0,
  status = "Unknown",
  containers,
}: MetricsPanelProps) {
  const getRestartTrend = () => {
    if (restartCount === 0) return "stable";
    if (restartCount <= 2) return "warning";
    return "critical";
  };

  const getTrendIcon = () => {
    const trend = getRestartTrend();
    if (trend === "stable") return <Minus className="w-4 h-4" />;
    if (trend === "warning") return <TrendingUp className="w-4 h-4" />;
    return <TrendingUp className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    const trend = getRestartTrend();
    if (trend === "stable")
      return "text-green-600 bg-green-50 border-green-200";
    if (trend === "warning")
      return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return "text-red-600 bg-red-50";
    if (percent >= 70) return "text-amber-600 bg-amber-50";
    return "text-green-600 bg-green-50";
  };

  const cpuPercent = cpu?.usagePercent || (cpu?.cores ? cpu.cores * 100 : 0);
  const memPercent = memory?.usagePercent || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Resource Metrics
          </h3>
          <p className="text-sm text-neutral-600">
            {podName} <span className="text-neutral-400">•</span> {namespace}
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full border text-xs font-medium ${
            status === "Running"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-neutral-100 text-neutral-600 border-neutral-200"
          }`}
        >
          {status}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50">
                <Cpu className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-neutral-700">CPU</span>
            </div>
            {cpu && (
              <span
                className={`text-xs px-2 py-1 rounded-full border ${getUsageColor(cpuPercent)}`}
              >
                {cpuPercent.toFixed(1)}%
              </span>
            )}
          </div>

          {cpu ? (
            <div className="space-y-2">
              <div className="text-2xl font-bold text-neutral-900">
                {cpu.usage}
              </div>
              <div className="text-sm text-neutral-600">
                {cpu.cores.toFixed(3)} cores
              </div>

              <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    cpuPercent >= 90
                      ? "bg-red-600"
                      : cpuPercent >= 70
                        ? "bg-amber-600"
                        : "bg-blue-600"
                  }`}
                  style={{ width: `${Math.min(cpuPercent, 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-neutral-500">No CPU data</div>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-50">
                <HardDrive className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-neutral-700">
                Memory
              </span>
            </div>
            {memory && memPercent > 0 && (
              <span
                className={`text-xs px-2 py-1 rounded-full border ${getUsageColor(memPercent)}`}
              >
                {memPercent.toFixed(1)}%
              </span>
            )}
          </div>

          {memory ? (
            <div className="space-y-2">
              <div className="text-2xl font-bold text-neutral-900">
                {memory.usage}
              </div>
              <div className="text-sm text-neutral-600">
                {formatBytes(memory.bytes)}
              </div>

              {memPercent > 0 && (
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      memPercent >= 90
                        ? "bg-red-600"
                        : memPercent >= 70
                          ? "bg-amber-600"
                          : "bg-purple-600"
                    }`}
                    style={{ width: `${Math.min(memPercent, 100)}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-neutral-500">No memory data</div>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${getTrendColor()}`}>
                <RefreshCw className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-neutral-700">
                Restarts
              </span>
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${getTrendColor()}`}
            >
              {getTrendIcon()}
              <span className="capitalize">{getRestartTrend()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-2xl font-bold text-neutral-900">
              {restartCount}
            </div>
            <div className="text-sm text-neutral-600">
              {restartCount === 0
                ? "Pod is stable"
                : restartCount === 1
                  ? "1 restart detected"
                  : `${restartCount} restarts detected`}
            </div>
          </div>

          {restartCount > 3 && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-700">
                High restart count may indicate instability
              </p>
            </div>
          )}
        </div>
      </div>

      {containers && containers.length > 1 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <h4 className="text-sm font-medium text-neutral-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-neutral-600" />
            Container Breakdown
          </h4>

          <div className="space-y-3">
            {containers.map((container, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 border border-neutral-200"
              >
                <span className="text-sm text-neutral-700 font-medium">
                  {container.name}
                </span>
                <div className="flex items-center gap-4 text-xs">
                  {container.cpu && (
                    <div className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-blue-600" />
                      <span className="text-neutral-600">
                        {container.cpu.usage}
                      </span>
                    </div>
                  )}
                  {container.memory && (
                    <div className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-purple-600" />
                      <span className="text-neutral-600">
                        {container.memory.usage}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!cpu && !memory && restartCount === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-neutral-50 rounded-xl border border-neutral-200">
          <Activity className="w-8 h-8 text-neutral-400 mb-3" />
          <h3 className="text-sm font-medium text-neutral-600 mb-1">
            No metrics available
          </h3>
          <p className="text-xs text-neutral-500">
            Metrics server may not be installed or pod is not running
          </p>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}
