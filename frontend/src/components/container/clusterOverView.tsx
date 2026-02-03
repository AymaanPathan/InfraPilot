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
    if (score >= 90) return "text-emerald-400";
    if (score >= 70) return "text-yellow-400";
    return "text-red-400";
  };

  const getHealthBg = (score: number) => {
    if (score >= 90) return "bg-emerald-500/10";
    if (score >= 70) return "bg-yellow-500/10";
    return "bg-red-500/10";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cluster Health */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
          <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-slate-400 text-sm font-medium mb-1">
                  Cluster Health
                </div>
                <div
                  className={`text-5xl font-bold ${getHealthColor(healthScore)}`}
                >
                  {healthScore}%
                </div>
              </div>
              <div className={`p-3 rounded-xl ${getHealthBg(healthScore)}`}>
                <Activity
                  className={`w-8 h-8 ${getHealthColor(healthScore)}`}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${healthScore >= 90 ? "bg-emerald-500" : healthScore >= 70 ? "bg-yellow-500" : "bg-red-500"} transition-all duration-1000 ease-out`}
                  style={{ width: `${healthScore}%` }}
                />
              </div>
              <span className="text-slate-400">
                {props.runningPods}/{props.totalPods} pods
              </span>
            </div>
          </div>
        </div>

        {/* Node Status */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
          <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-slate-400 text-sm font-medium mb-1">
                  Active Nodes
                </div>
                <div className="text-5xl font-bold text-blue-400">
                  {props.activeNodes}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Server className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="text-sm text-slate-400">
              {props.totalNodes} total nodes in cluster
            </div>
          </div>
        </div>

        {/* Workload Summary */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
          <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 hover:border-purple-500/30 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-slate-400 text-sm font-medium mb-1">
                  Workloads
                </div>
                <div className="text-5xl font-bold text-purple-400">
                  {props.totalDeployments}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Box className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <div className="text-sm text-slate-400">
              {props.totalServices} services running
            </div>
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CPU Usage */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-sm text-slate-400">CPU Usage</div>
                <div className="text-2xl font-bold text-white">
                  {props.cpuUsage}%
                </div>
              </div>
            </div>
            <TrendingUp className="w-5 h-5 text-slate-500" />
          </div>
          <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(props.cpuUsage, 100)}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {props.cpuUsage < 70
              ? "Healthy utilization"
              : props.cpuUsage < 90
                ? "High usage"
                : "Critical usage"}
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-sm text-slate-400">Memory Usage</div>
                <div className="text-2xl font-bold text-white">
                  {props.memoryUsage}%
                </div>
              </div>
            </div>
            <TrendingUp className="w-5 h-5 text-slate-500" />
          </div>
          <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(props.memoryUsage, 100)}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {props.memoryUsage < 70
              ? "Healthy utilization"
              : props.memoryUsage < 90
                ? "High usage"
                : "Critical usage"}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Running Pods"
          value={props.runningPods}
          color="emerald"
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
          color="blue"
        />
        <StatCard
          icon={<Server className="w-5 h-5" />}
          label="Version"
          value={props.clusterVersion || "N/A"}
          color="purple"
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
    emerald: "text-emerald-400 bg-emerald-500/10",
    red: "text-red-400 bg-red-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    purple: "text-purple-400 bg-purple-500/10",
  };

  const colorClass = colors[color as keyof typeof colors];

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-4 hover:border-slate-700 transition-colors">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colorClass}`}>
        {icon}
      </div>
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}
