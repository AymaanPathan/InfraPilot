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
          bg: "bg-green-50",
          text: "text-green-700",
          border: "border-green-200",
          icon: <CheckCircle className="w-5 h-5" />,
        };
      case "warning":
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          icon: <AlertTriangle className="w-5 h-5" />,
        };
      case "critical":
        return {
          bg: "bg-red-50",
          text: "text-red-700",
          border: "border-red-200",
          icon: <AlertTriangle className="w-5 h-5" />,
        };
      default:
        return {
          bg: "bg-neutral-50",
          text: "text-neutral-700",
          border: "border-neutral-200",
          icon: <Activity className="w-5 h-5" />,
        };
    }
  };

  const healthConfig = getHealthColor(health?.status);

  const getTrendIcon = (change?: number) => {
    if (!change) return null;
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return null;
  };

  const getUsageColor = (percent?: number) => {
    if (!percent) return "bg-neutral-300";
    if (percent >= 90) return "bg-red-600";
    if (percent >= 70) return "bg-amber-600";
    return "bg-green-600";
  };

  return (
    <div className="space-y-4">
      {/* Header with Health Status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-neutral-700" />
          <h3 className="text-xl font-semibold text-neutral-900">
            Cluster Metrics
          </h3>
        </div>
        {health && (
          <div
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${healthConfig.bg} ${healthConfig.text} ${healthConfig.border}`}
          >
            {healthConfig.icon}
            <span className="font-semibold capitalize">{health.status}</span>
          </div>
        )}
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Nodes */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
          <div className="text-sm text-neutral-600 mb-2">Nodes</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-neutral-900">
              {summary.healthyNodes}
            </span>
            <span className="text-neutral-500">/ {summary.totalNodes}</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            {((summary.healthyNodes / summary.totalNodes) * 100).toFixed(0)}%
            healthy
          </div>
        </div>

        {/* Pods */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
          <div className="text-sm text-neutral-600 mb-2 flex items-center justify-between">
            <span>Pods</span>
            {trends?.podsChange !== undefined &&
              getTrendIcon(trends.podsChange)}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-neutral-900">
              {summary.runningPods}
            </span>
            <span className="text-neutral-500">/ {summary.totalPods}</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            {summary.pendingPods !== undefined && summary.pendingPods > 0 && (
              <span className="text-amber-600">
                {summary.pendingPods} pending
              </span>
            )}
            {summary.failedPods !== undefined && summary.failedPods > 0 && (
              <span className="text-red-600 ml-2">
                {summary.failedPods} failed
              </span>
            )}
          </div>
        </div>

        {/* Deployments */}
        {summary.totalDeployments !== undefined && (
          <div className="bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
            <div className="text-sm text-neutral-600 mb-2 flex items-center justify-between">
              <span>Deployments</span>
              {trends?.deploymentsChange !== undefined &&
                getTrendIcon(trends.deploymentsChange)}
            </div>
            <div className="text-3xl font-semibold text-neutral-900">
              {summary.totalDeployments}
            </div>
            <div className="mt-2 text-xs text-neutral-500">active</div>
          </div>
        )}

        {/* Services */}
        {summary.totalServices !== undefined && (
          <div className="bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
            <div className="text-sm text-neutral-600 mb-2">Services</div>
            <div className="text-3xl font-semibold text-neutral-900">
              {summary.totalServices}
            </div>
            <div className="mt-2 text-xs text-neutral-500">exposed</div>
          </div>
        )}
      </div>

      {/* Resource Usage */}
      {resourceUsage && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-neutral-600" />
            Resource Usage
          </h4>
          <div className="space-y-4">
            {resourceUsage.cpuUsagePercent !== undefined && (
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-neutral-600">CPU</span>
                  <span className="text-neutral-900 font-semibold">
                    {resourceUsage.cpuUsagePercent}%
                  </span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
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
                  <span className="text-neutral-600">Memory</span>
                  <span className="text-neutral-900 font-semibold">
                    {resourceUsage.memoryUsagePercent}%
                  </span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
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
                  <span className="text-neutral-600">Pod Capacity</span>
                  <span className="text-neutral-900 font-semibold">
                    {resourceUsage.podUsagePercent}%
                  </span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
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
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
            <h4 className="text-sm font-semibold text-amber-900">
              Active Issues ({health.issues.length})
            </h4>
          </div>
          <ul className="space-y-2">
            {health.issues.map((issue, index) => (
              <li
                key={index}
                className="text-sm text-amber-800 flex items-start gap-2"
              >
                <span className="text-amber-600 mt-1">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Last Check */}
      {health?.lastCheck && (
        <div className="text-xs text-neutral-500 text-center">
          Last checked: {health.lastCheck}
        </div>
      )}
    </div>
  );
}
