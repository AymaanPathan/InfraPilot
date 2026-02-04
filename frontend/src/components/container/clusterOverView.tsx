"use client";

import {
  Activity,
  Server,
  Box,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import { z } from "zod";

export const clusterOverviewSchema = z.object({
  totalNodes: z.number(),
  activeNodes: z.number(),
  totalPods: z.number(),
  runningPods: z.number(),
  failedPods: z.number(),
  totalDeployments: z.number(),
  totalServices: z.number(),
  cpuUsage: z.number(),
  memoryUsage: z.number(),
  uptime: z.string().optional(),
  clusterVersion: z.string().optional(),
});

export function ClusterOverview(props: z.infer<typeof clusterOverviewSchema>) {
  const healthScore = Math.round(
    ((props.runningPods / props.totalPods) * 100 +
      (props.activeNodes / props.totalNodes) * 100) /
      2,
  );

  const getHealthColor = (score: number) => {
    if (score >= 90) return "text-green-700";
    if (score >= 70) return "text-amber-700";
    return "text-red-700";
  };

  const getHealthBg = (score: number) => {
    if (score >= 90) return "bg-green-50";
    if (score >= 70) return "bg-amber-50";
    return "bg-red-50";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cluster Health */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-sm transition-all">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-neutral-600 text-sm font-medium mb-1">
                Cluster Health
              </div>
              <div
                className={`text-5xl font-semibold ${getHealthColor(healthScore)}`}
              >
                {healthScore}%
              </div>
            </div>
            <div className={`p-3 rounded-xl ${getHealthBg(healthScore)}`}>
              <Activity className={`w-8 h-8 ${getHealthColor(healthScore)}`} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${healthScore >= 90 ? "bg-green-600" : healthScore >= 70 ? "bg-amber-600" : "bg-red-600"} transition-all duration-1000 ease-out`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
            <span className="text-neutral-600">
              {props.runningPods}/{props.totalPods} pods
            </span>
          </div>
        </div>

        {/* Node Status */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-sm transition-all">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-neutral-600 text-sm font-medium mb-1">
                Active Nodes
              </div>
              <div className="text-5xl font-semibold text-neutral-900">
                {props.activeNodes}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-100">
              <Server className="w-8 h-8 text-neutral-700" />
            </div>
          </div>
          <div className="text-sm text-neutral-600">
            {props.totalNodes} total nodes in cluster
          </div>
        </div>

        {/* Workload Summary */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-sm transition-all">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-neutral-600 text-sm font-medium mb-1">
                Workloads
              </div>
              <div className="text-5xl font-semibold text-neutral-900">
                {props.totalDeployments}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-100">
              <Box className="w-8 h-8 text-neutral-700" />
            </div>
          </div>
          <div className="text-sm text-neutral-600">
            {props.totalServices} services running
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CPU Usage */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-neutral-100">
                <Zap className="w-5 h-5 text-neutral-700" />
              </div>
              <div>
                <div className="text-sm text-neutral-600">CPU Usage</div>
                <div className="text-2xl font-semibold text-neutral-900">
                  {props.cpuUsage}%
                </div>
              </div>
            </div>
          </div>
          <div className="relative h-3 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-neutral-900 transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(props.cpuUsage, 100)}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            {props.cpuUsage < 70
              ? "Healthy utilization"
              : props.cpuUsage < 90
                ? "High usage"
                : "Critical usage"}
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-neutral-100">
                <Activity className="w-5 h-5 text-neutral-700" />
              </div>
              <div>
                <div className="text-sm text-neutral-600">Memory Usage</div>
                <div className="text-2xl font-semibold text-neutral-900">
                  {props.memoryUsage}%
                </div>
              </div>
            </div>
          </div>
          <div className="relative h-3 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-neutral-900 transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(props.memoryUsage, 100)}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            {props.memoryUsage < 70
              ? "Healthy utilization"
              : props.memoryUsage < 90
                ? "High usage"
                : "Critical usage"}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Running Pods"
          value={props.runningPods}
          color="green"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Failed Pods"
          value={props.failedPods}
          color="red"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Uptime"
          value={props.uptime || "N/A"}
          color="neutral"
        />
        <StatCard
          icon={<Server className="w-5 h-5" />}
          label="Version"
          value={props.clusterVersion || "N/A"}
          color="neutral"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  const colors = {
    green: "text-green-700 bg-green-50",
    red: "text-red-700 bg-red-50",
    neutral: "text-neutral-700 bg-neutral-100",
  };

  const colorClass = colors[color as keyof typeof colors];

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-sm transition-all">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colorClass}`}>
        {icon}
      </div>
      <div className="text-neutral-600 text-xs mb-1">{label}</div>
      <div className="text-xl font-semibold text-neutral-900">{value}</div>
    </div>
  );
}
