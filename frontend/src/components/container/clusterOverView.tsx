"use client";

import {
  Activity,
  Server,
  Box,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
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
    ((props?.runningPods / props?.totalPods || 0) * 100 +
      (props?.activeNodes / props?.totalNodes || 0) * 100) /
      2,
  );

  const getHealthColor = (score: number) => {
    if (score >= 90) return "text-green-400";
    if (score >= 70) return "text-amber-400";
    return "text-red-400";
  };

  const getHealthBg = (score: number) => {
    if (score >= 90) return "bg-green-500/10";
    if (score >= 70) return "bg-amber-500/10";
    return "bg-red-500/10";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cluster Health */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6 hover:border-zinc-700/50 transition-all duration-300">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-zinc-400 text-sm font-light mb-2">
                Cluster Health
              </div>
              <div
                className={`text-5xl font-medium ${getHealthColor(healthScore)}`}
              >
                {healthScore}%
              </div>
            </div>
            <div className={`p-3 rounded-xl ${getHealthBg(healthScore)}`}>
              <Activity
                className={`w-8 h-8 ${getHealthColor(healthScore)}`}
                strokeWidth={1.5}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${healthScore >= 90 ? "bg-green-500" : healthScore >= 70 ? "bg-amber-500" : "bg-red-500"} transition-all duration-1000 ease-out`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
            <span className="text-zinc-500 text-xs font-light">
              {props?.runningPods}/{props?.totalPods} pods
            </span>
          </div>
        </div>

        {/* Node Status */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6 hover:border-zinc-700/50 transition-all duration-300">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-zinc-400 text-sm font-light mb-2">
                Active Nodes
              </div>
              <div className="text-5xl font-medium text-white">
                {props?.activeNodes || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-800/50">
              <Server className="w-8 h-8 text-zinc-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-zinc-500 font-light">
            {props?.totalNodes || 0} total nodes in cluster
          </div>
        </div>

        {/* Workload Summary */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6 hover:border-zinc-700/50 transition-all duration-300">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-zinc-400 text-sm font-light mb-2">
                Workloads
              </div>
              <div className="text-5xl font-medium text-white">
                {props?.totalDeployments || 0}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-800/50">
              <Box className="w-8 h-8 text-zinc-400" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-sm text-zinc-500 font-light">
            {props?.totalServices || 0} services running
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CPU Usage */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-800/50">
                <Zap className="w-5 h-5 text-zinc-400" strokeWidth={2} />
              </div>
              <div>
                <div className="text-sm text-zinc-400 font-light">
                  CPU Usage
                </div>
                <div className="text-2xl font-medium text-white">
                  {props?.cpuUsage || 0}%
                </div>
              </div>
            </div>
          </div>
          <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-white transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(props?.cpuUsage || 0, 100)}%` }}
            />
          </div>
          <div className="mt-3 text-xs text-zinc-500 font-light">
            {(props?.cpuUsage || 0) < 70
              ? "Healthy utilization"
              : (props?.cpuUsage || 0) < 90
                ? "High usage"
                : "Critical usage"}
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-800/50">
                <Activity className="w-5 h-5 text-zinc-400" strokeWidth={2} />
              </div>
              <div>
                <div className="text-sm text-zinc-400 font-light">
                  Memory Usage
                </div>
                <div className="text-2xl font-medium text-white">
                  {props?.memoryUsage || 0}%
                </div>
              </div>
            </div>
          </div>
          <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-white transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(props?.memoryUsage || 0, 100)}%` }}
            />
          </div>
          <div className="mt-3 text-xs text-zinc-500 font-light">
            {(props?.memoryUsage || 0) < 70
              ? "Healthy utilization"
              : (props?.memoryUsage || 0) < 90
                ? "High usage"
                : "Critical usage"}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" strokeWidth={2} />}
          label="Running Pods"
          value={props?.runningPods || 0}
          color="green"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" strokeWidth={2} />}
          label="Failed Pods"
          value={props?.failedPods || 0}
          color="red"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" strokeWidth={2} />}
          label="Uptime"
          value={props?.uptime || "N/A"}
          color="neutral"
        />
        <StatCard
          icon={<Server className="w-5 h-5" strokeWidth={2} />}
          label="Version"
          value={props?.clusterVersion || "N/A"}
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
    green: "text-green-400 bg-green-500/10",
    red: "text-red-400 bg-red-500/10",
    neutral: "text-zinc-400 bg-zinc-800/50",
  };

  const colorClass = colors[color as keyof typeof colors];

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-4 hover:border-zinc-700/50 transition-all duration-300">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colorClass}`}>
        {icon}
      </div>
      <div className="text-zinc-400 text-xs mb-1 font-light">{label}</div>
      <div className="text-xl font-medium text-white">{value}</div>
    </div>
  );
}
