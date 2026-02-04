"use client";

import { z } from "zod";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Zap,
} from "lucide-react";
import { useState } from "react";

export const podHealthMonitorSchema = z.object({
  pods: z.array(
    z.object({
      name: z.string(),
      namespace: z.string(),
      status: z.enum([
        "Running",
        "Pending",
        "Failed",
        "CrashLoopBackOff",
        "Unknown",
      ]),
      restarts: z.number(),
      age: z.string(),
      readiness: z.string().optional(),
      cpuUsage: z.number().optional(),
      memoryUsage: z.number().optional(),
      lastRestart: z.string().optional(),
    }),
  ),
  autoRefresh: z.boolean().optional(),
});

export function PodHealthMonitor(
  props: z.infer<typeof podHealthMonitorSchema>,
) {
  const [filter, setFilter] = useState<string>("all");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Running":
        return "text-green-600 bg-green-50";
      case "Pending":
        return "text-amber-600 bg-amber-50";
      case "Failed":
        return "text-red-600 bg-red-50";
      case "CrashLoopBackOff":
        return "text-orange-600 bg-orange-50";
      default:
        return "text-neutral-600 bg-neutral-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Running":
        return <CheckCircle2 className="w-4 h-4" />;
      case "Pending":
        return <Clock className="w-4 h-4" />;
      case "Failed":
        return <XCircle className="w-4 h-4" />;
      case "CrashLoopBackOff":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin" />;
    }
  };

  const getHealthScore = (pod: any) => {
    let score = 100;
    if (pod.status !== "Running") score -= 50;
    if (pod.restarts > 5) score -= 30;
    if (pod.restarts > 0 && pod.restarts <= 5) score -= 20;
    return Math.max(score, 0);
  };

  const filteredPods = props?.pods?.filter((pod) => {
    if (filter === "all") return true;
    if (filter === "healthy")
      return pod.status === "Running" && pod.restarts === 0;
    if (filter === "unhealthy")
      return pod.status !== "Running" || pod.restarts > 0;
    return pod.status.toLowerCase() === filter.toLowerCase();
  });

  const stats = {
    total: props?.pods?.length,
    running: props?.pods?.filter((p) => p.status === "Running")?.length,
    failed: props?.pods?.filter(
      (p) => p.status === "Failed" || p.status === "CrashLoopBackOff",
    )?.length,
    pending: props?.pods?.filter((p) => p.status === "Pending")?.length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-neutral-600">Total Pods</span>
          </div>
          <div className="text-3xl font-bold text-neutral-900">
            {stats.total}
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-xs text-neutral-600">Running</span>
          </div>
          <div className="text-3xl font-bold text-green-600">
            {stats.running}
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs text-neutral-600">Failed</span>
          </div>
          <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-neutral-600">Pending</span>
          </div>
          <div className="text-3xl font-bold text-amber-600">
            {stats.pending}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", "healthy", "unhealthy", "running", "failed", "pending"].map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                filter === f
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ),
        )}
      </div>

      <div className="space-y-3">
        {filteredPods?.map((pod, index) => {
          const healthScore = getHealthScore(pod);
          const isUnhealthy = healthScore < 70;

          return (
            <div
              key={index}
              className={`bg-white border rounded-xl p-5 transition-all duration-200 hover:shadow-sm ${
                isUnhealthy ? "border-red-200" : "border-neutral-200"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div
                    className={`p-2.5 rounded-xl ${getStatusColor(pod.status)}`}
                  >
                    {getStatusIcon(pod.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-base font-semibold text-neutral-900 truncate">
                        {pod.name}
                      </h4>
                      {pod.restarts > 0 && (
                        <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded-md font-medium border border-orange-200">
                          ↻ {pod.restarts} restarts
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-neutral-600">
                      <span>ns/{pod.namespace}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {pod.age}
                      </span>
                      {pod.readiness && (
                        <>
                          <span>•</span>
                          <span>{pod.readiness}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right ml-4">
                  <div
                    className={`text-2xl font-bold ${healthScore >= 70 ? "text-green-600" : "text-red-600"}`}
                  >
                    {healthScore}
                  </div>
                  <div className="text-xs text-neutral-500">health</div>
                </div>
              </div>

              {(pod.cpuUsage !== undefined ||
                pod.memoryUsage !== undefined) && (
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-200">
                  {pod.cpuUsage !== undefined && (
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-neutral-600">CPU:</span>
                      <span className="text-sm font-medium text-neutral-900">
                        {pod.cpuUsage}%
                      </span>
                      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden ml-2">
                        <div
                          className="h-full bg-amber-600"
                          style={{ width: `${Math.min(pod.cpuUsage, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {pod.memoryUsage !== undefined && (
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-600" />
                      <span className="text-sm text-neutral-600">Memory:</span>
                      <span className="text-sm font-medium text-neutral-900">
                        {pod.memoryUsage}%
                      </span>
                      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden ml-2">
                        <div
                          className="h-full bg-cyan-600"
                          style={{
                            width: `${Math.min(pod.memoryUsage, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredPods?.length === 0 && (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
          <div className="text-neutral-600">
            No pods found matching filter: {filter}
          </div>
        </div>
      )}
    </div>
  );
}
