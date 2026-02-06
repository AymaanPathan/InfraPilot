"use client";

import { z } from "zod";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Cpu,
  HardDrive,
  Network,
  Database,
} from "lucide-react";

export const resourceUsageChartSchema = z.object({
  namespace: z.string().optional(),
  resources: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["cpu", "memory", "storage", "network"]),
      current: z.number(),
      limit: z.number(),
      unit: z.string(),
      trend: z.enum(["up", "down", "stable"]).optional(),
    }),
  ),
  timestamp: z.string().optional(),
});

export function ResourceUsageChart(
  props: z.infer<typeof resourceUsageChartSchema>,
) {
  const getIcon = (type: string) => {
    switch (type) {
      case "cpu":
        return <Cpu className="w-5 h-5" />;
      case "memory":
        return <HardDrive className="w-5 h-5" />;
      case "storage":
        return <Database className="w-5 h-5" />;
      case "network":
        return <Network className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "cpu":
        return {
          bg: "bg-amber-500/100/10",
          text: "text-amber-400",
          bar: "from-amber-500 to-orange-500",
        };
      case "memory":
        return {
          bg: "bg-cyan-500/10",
          text: "text-cyan-400",
          bar: "from-cyan-500 to-blue-500",
        };
      case "storage":
        return {
          bg: "bg-purple-500/100/10",
          text: "text-purple-400",
          bar: "from-purple-500 to-pink-500",
        };
      case "network":
        return {
          bg: "bg-green-500/100/10",
          text: "text-green-400",
          bar: "from-green-500 to-emerald-500",
        };
      default:
        return {
          bg: "bg-zinc-500/10",
          text: "text-zinc-400",
          bar: "from-slate-500 to-gray-500",
        };
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-red-400" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-green-400" />;
      default:
        return <Minus className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-medium text-white mb-1">
            Resource Usage
          </h3>
          <p className="text-sm text-zinc-400">
            {props.namespace
              ? `Namespace: ${props.namespace}`
              : "Cluster-wide metrics"}
          </p>
        </div>
        {props.timestamp && (
          <div className="text-xs text-zinc-500">
            Last updated: {new Date(props.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {props?.resources?.map((resource, index) => {
          const percentage = (resource.current / resource.limit) * 100;
          const colors = getColor(resource.type);
          const isHigh = percentage > 80;
          const isMedium = percentage > 60;

          return (
            <div
              key={index}
              className="bg-zinc-900/50 backdrop-blur-sm backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6 hover:border-zinc-700 transition-all duration-300 group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>
                    {getIcon(resource.type)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {resource.name}
                    </div>
                    <div className="text-xs text-zinc-400 capitalize">
                      {resource.type} usage
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {resource.trend && getTrendIcon(resource.trend)}
                  <div className="text-right">
                    <div className="text-2xl font-medium text-white">
                      {resource.current}
                      {resource.unit}
                    </div>
                    <div className="text-xs text-zinc-400">
                      of {resource.limit}
                      {resource.unit}
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage Bar */}
              <div className="relative">
                <div className="flex justify-between text-xs text-zinc-400 mb-2">
                  <span>{percentage.toFixed(1)}% used</span>
                  <span>
                    {isHigh ? "⚠️ High" : isMedium ? "⚡ Medium" : "✓ Normal"}
                  </span>
                </div>
                <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 h-full bg-gradient-to-r ${colors.bar} transition-all duration-1000 ease-out group-hover:brightness-110`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                  {isHigh && (
                    <div className="absolute top-0 right-0 h-full w-1 bg-red-500/100 animate-pulse" />
                  )}
                </div>

                {/* Threshold Markers */}
                <div className="relative h-2 mt-1">
                  <div className="absolute left-[60%] top-0 w-px h-2 bg-yellow-500/30" />
                  <div className="absolute left-[80%] top-0 w-px h-2 bg-red-500/100/30" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {props?.resources?.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          No resource usage data available
        </div>
      )}
    </div>
  );
}
