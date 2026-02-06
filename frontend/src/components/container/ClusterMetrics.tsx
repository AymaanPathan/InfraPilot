import { z } from "zod";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export const clusterMetricsSchema = z.object({
  summary: z.object({
    totalNodes: z.number(),
    healthyNodes: z.number(),
    totalPods: z.number(),
    runningPods: z.number(),
    pendingPods: z.number().optional(),
    failedPods: z.number().optional(),
    totalNamespaces: z.number().optional(),
    totalDeployments: z.number().optional(),
    totalServices: z.number().optional(),
  }),
  resourceUsage: z
    .object({
      cpuUsagePercent: z.number().optional(),
      memoryUsagePercent: z.number().optional(),
      podUsagePercent: z.number().optional(),
    })
    .optional(),
  health: z
    .object({
      status: z.enum(["healthy", "warning", "critical"]),
      issues: z.array(z.string()).optional(),
      lastCheck: z.string().optional(),
    })
    .optional(),
  trends: z
    .object({
      podsChange: z.number().optional(),
      deploymentsChange: z.number().optional(),
    })
    .optional(),
});

type ClusterMetricsProps = z.infer<typeof clusterMetricsSchema>;

export function ClusterMetrics({
  summary,
  resourceUsage,
  health,
  trends,
}: ClusterMetricsProps) {
  const getHealthColor = (status?: string) => {
    switch (status) {
      case "healthy":
        return {
          bg: "bg-green-500/10",
          text: "text-green-400",
          border: "border-green-500/20",
          icon: <CheckCircle className="w-5 h-5" />,
        };
      case "warning":
        return {
          bg: "bg-amber-500/10",
          text: "text-amber-400",
          border: "border-amber-500/20",
          icon: <AlertTriangle className="w-5 h-5" />,
        };
      case "critical":
        return {
          bg: "bg-red-500/10",
          text: "text-red-400",
          border: "border-red-500/20",
          icon: <AlertTriangle className="w-5 h-5" />,
        };
      default:
        return {
          bg: "bg-zinc-800/50",
          text: "text-zinc-400",
          border: "border-zinc-700/50",
          icon: <Activity className="w-5 h-5" />,
        };
    }
  };

  const healthConfig = getHealthColor(health?.status);

  const getTrendIcon = (change?: number) => {
    if (!change) return null;
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return null;
  };

  const getUsageColor = (percent?: number) => {
    if (!percent) return "bg-zinc-700";
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-amber-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6">
      {/* Header with Health Status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-white" strokeWidth={1.5} />
          <h3 className="text-xl font-medium text-white">Cluster Metrics</h3>
        </div>
        {health && (
          <div
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${healthConfig.bg} ${healthConfig.text} ${healthConfig.border}`}
          >
            {healthConfig.icon}
            <span className="font-medium capitalize">{health.status}</span>
          </div>
        )}
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Nodes */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-5 hover:border-zinc-700/50 transition-all duration-300">
          <div className="text-sm text-zinc-400 mb-3 font-light">Nodes</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-medium text-white">
              {summary.healthyNodes}
            </span>
            <span className="text-zinc-500">/ {summary.totalNodes}</span>
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            {((summary.healthyNodes / summary.totalNodes) * 100).toFixed(0)}%
            healthy
          </div>
        </div>

        {/* Pods */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-5 hover:border-zinc-700/50 transition-all duration-300">
          <div className="text-sm text-zinc-400 mb-3 flex items-center justify-between font-light">
            <span>Pods</span>
            {trends?.podsChange !== undefined &&
              getTrendIcon(trends.podsChange)}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-medium text-white">
              {summary.runningPods}
            </span>
            <span className="text-zinc-500">/ {summary.totalPods}</span>
          </div>
          <div className="mt-3 text-xs text-zinc-500 flex gap-2">
            {summary.pendingPods !== undefined && summary.pendingPods > 0 && (
              <span className="text-amber-400">
                {summary.pendingPods} pending
              </span>
            )}
            {summary.failedPods !== undefined && summary.failedPods > 0 && (
              <span className="text-red-400">{summary.failedPods} failed</span>
            )}
          </div>
        </div>

        {/* Deployments */}
        {summary.totalDeployments !== undefined && (
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-5 hover:border-zinc-700/50 transition-all duration-300">
            <div className="text-sm text-zinc-400 mb-3 flex items-center justify-between font-light">
              <span>Deployments</span>
              {trends?.deploymentsChange !== undefined &&
                getTrendIcon(trends.deploymentsChange)}
            </div>
            <div className="text-3xl font-medium text-white">
              {summary.totalDeployments}
            </div>
            <div className="mt-3 text-xs text-zinc-500">active</div>
          </div>
        )}

        {/* Services */}
        {summary.totalServices !== undefined && (
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-5 hover:border-zinc-700/50 transition-all duration-300">
            <div className="text-sm text-zinc-400 mb-3 font-light">
              Services
            </div>
            <div className="text-3xl font-medium text-white">
              {summary.totalServices}
            </div>
            <div className="mt-3 text-xs text-zinc-500">exposed</div>
          </div>
        )}
      </div>

      {/* Resource Usage */}
      {resourceUsage && (
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6">
          <h4 className="text-sm font-medium text-white mb-5 flex items-center gap-2">
            <Zap className="w-4 h-4 text-zinc-400" strokeWidth={2} />
            Resource Usage
          </h4>
          <div className="space-y-5">
            {resourceUsage.cpuUsagePercent !== undefined && (
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-zinc-400 font-light">CPU</span>
                  <span className="text-white font-medium">
                    {resourceUsage.cpuUsagePercent}%
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getUsageColor(resourceUsage.cpuUsagePercent)}`}
                    style={{ width: `${resourceUsage.cpuUsagePercent}%` }}
                  />
                </div>
              </div>
            )}

            {resourceUsage.memoryUsagePercent !== undefined && (
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-zinc-400 font-light">Memory</span>
                  <span className="text-white font-medium">
                    {resourceUsage.memoryUsagePercent}%
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getUsageColor(resourceUsage.memoryUsagePercent)}`}
                    style={{ width: `${resourceUsage.memoryUsagePercent}%` }}
                  />
                </div>
              </div>
            )}

            {resourceUsage.podUsagePercent !== undefined && (
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-zinc-400 font-light">Pod Capacity</span>
                  <span className="text-white font-medium">
                    {resourceUsage.podUsagePercent}%
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getUsageColor(resourceUsage.podUsagePercent)}`}
                    style={{ width: `${resourceUsage.podUsagePercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Health Issues */}
      {health?.issues && health.issues.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-medium text-amber-300">
              Active Issues ({health.issues.length})
            </h4>
          </div>
          <ul className="space-y-2">
            {health.issues.map((issue, index) => (
              <li
                key={index}
                className="text-sm text-amber-200 flex items-start gap-2 font-light"
              >
                <span className="text-amber-400 mt-1">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Last Check */}
      {health?.lastCheck && (
        <div className="text-xs text-zinc-600 text-center font-light">
          Last checked: {health.lastCheck}
        </div>
      )}
    </div>
  );
}
