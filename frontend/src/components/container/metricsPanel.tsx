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
    return <TrendingUp className="w-4 h-4 animate-pulse" />;
  };

  const getTrendColor = () => {
    const trend = getRestartTrend();
    if (trend === "stable")
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (trend === "warning")
      return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-red-500 bg-red-500/10 border-red-500/20";
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return "text-red-500 bg-red-500/10";
    if (percent >= 70) return "text-amber-500 bg-amber-500/10";
    return "text-emerald-500 bg-emerald-500/10";
  };

  const cpuPercent = cpu?.usagePercent || (cpu?.cores ? cpu.cores * 100 : 0);
  const memPercent = memory?.usagePercent || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Resource Metrics
          </h3>
          <p className="text-sm text-slate-400">
            {podName} <span className="text-slate-600">•</span> {namespace}
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full border text-xs font-medium ${
            status === "Running"
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
          }`}
        >
          {status}
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 hover:border-blue-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Cpu className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-slate-300">CPU</span>
            </div>
            {cpu && (
              <span
                className={`text-xs px-2 py-1 rounded-full ${getUsageColor(cpuPercent)}`}
              >
                {cpuPercent.toFixed(1)}%
              </span>
            )}
          </div>

          {cpu ? (
            <div className="space-y-2">
              <div className="text-2xl font-bold text-white">{cpu.usage}</div>
              <div className="text-sm text-slate-400">
                {cpu.cores.toFixed(3)} cores
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    cpuPercent >= 90
                      ? "bg-red-500"
                      : cpuPercent >= 70
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(cpuPercent, 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">No CPU data</div>
          )}
        </div>

        {/* Memory Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 hover:border-purple-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <HardDrive className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-sm font-medium text-slate-300">Memory</span>
            </div>
            {memory && memPercent > 0 && (
              <span
                className={`text-xs px-2 py-1 rounded-full ${getUsageColor(memPercent)}`}
              >
                {memPercent.toFixed(1)}%
              </span>
            )}
          </div>

          {memory ? (
            <div className="space-y-2">
              <div className="text-2xl font-bold text-white">
                {memory.usage}
              </div>
              <div className="text-sm text-slate-400">
                {formatBytes(memory.bytes)}
              </div>

              {/* Progress bar */}
              {memPercent > 0 && (
                <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      memPercent >= 90
                        ? "bg-red-500"
                        : memPercent >= 70
                          ? "bg-amber-500"
                          : "bg-purple-500"
                    }`}
                    style={{ width: `${Math.min(memPercent, 100)}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-slate-500">No memory data</div>
          )}
        </div>

        {/* Restart Trend Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 hover:border-slate-600/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${getTrendColor()}`}>
                <RefreshCw className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-300">
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
            <div className="text-2xl font-bold text-white">{restartCount}</div>
            <div className="text-sm text-slate-400">
              {restartCount === 0
                ? "Pod is stable"
                : restartCount === 1
                  ? "1 restart detected"
                  : `${restartCount} restarts detected`}
            </div>
          </div>

          {restartCount > 3 && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <p className="text-xs text-red-400">
                High restart count may indicate instability
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Container Breakdown (if available) */}
      {containers && containers.length > 1 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
          <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            Container Breakdown
          </h4>

          <div className="space-y-3">
            {containers.map((container, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/30"
              >
                <span className="text-sm text-slate-300 font-medium">
                  {container.name}
                </span>
                <div className="flex items-center gap-4 text-xs">
                  {container.cpu && (
                    <div className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-blue-400" />
                      <span className="text-slate-400">
                        {container.cpu.usage}
                      </span>
                    </div>
                  )}
                  {container.memory && (
                    <div className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-purple-400" />
                      <span className="text-slate-400">
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

      {/* No Data State */}
      {!cpu && !memory && restartCount === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-800/30 rounded-xl border border-slate-700/30">
          <Activity className="w-8 h-8 text-slate-600 mb-3" />
          <h3 className="text-sm font-medium text-slate-400 mb-1">
            No metrics available
          </h3>
          <p className="text-xs text-slate-500">
            Metrics server may not be installed or pod is not running
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}
