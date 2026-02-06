"use client";

import { useState } from "react";
import {
  Play,
  Pause,
  RefreshCw,
  Terminal,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Activity,
  Copy,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface Pod {
  name: string;
  namespace: string;
  status: "Running" | "Pending" | "Failed" | "CrashLoopBackOff" | "Unknown";
  restarts: number;
  age: string;
  node?: string;
  metrics?: {
    cpu?: {
      usage: string;
      cores: number;
    };
    memory?: {
      usage: string;
      bytes: number;
    };
  };
}

interface PodGridProps {
  pods: Pod[];
  namespace?: string;
  onPodClick?: (pod: Pod) => void;
  onGetLogs?: (pod: Pod) => void;
  onRestartPod?: (pod: Pod) => void;
  onExplainIssue?: (pod: Pod) => void;
}

export function PodGrid({
  pods,
  namespace = "default",
  onPodClick,
  onGetLogs,
  onRestartPod,
  onExplainIssue,
}: PodGridProps) {
  const [selectedPod, setSelectedPod] = useState<Pod | null>(null);
  const [copiedPod, setCopiedPod] = useState<string | null>(null);

  const handlePodClick = (pod: Pod) => {
    setSelectedPod(pod);
    onPodClick?.(pod);
  };

  const handleCopyName = (podName: string) => {
    navigator.clipboard.writeText(podName);
    setCopiedPod(podName);
    setTimeout(() => setCopiedPod(null), 2000);
  };

  const getStatusIcon = (status: Pod["status"]) => {
    switch (status) {
      case "Running":
        return (
          <CheckCircle className="w-4 h-4 text-green-400" strokeWidth={2} />
        );
      case "Pending":
        return <Clock className="w-4 h-4 text-amber-400" strokeWidth={2} />;
      case "Failed":
        return <XCircle className="w-4 h-4 text-red-400" strokeWidth={2} />;
      case "CrashLoopBackOff":
        return (
          <AlertCircle className="w-4 h-4 text-orange-400" strokeWidth={2} />
        );
      default:
        return (
          <AlertCircle className="w-4 h-4 text-zinc-500" strokeWidth={2} />
        );
    }
  };

  const getStatusColor = (status: Pod["status"]) => {
    switch (status) {
      case "Running":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "Pending":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Failed":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "CrashLoopBackOff":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      default:
        return "bg-zinc-800/50 text-zinc-400 border-zinc-700/50";
    }
  };

  const shouldHighlight = (pod: Pod) => {
    return (
      pod.status === "Failed" ||
      pod.status === "CrashLoopBackOff" ||
      pod.restarts > 3
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/50">
        <div>
          <h3 className="text-lg font-medium text-white">
            Pods in {namespace}
          </h3>
          <p className="text-sm text-zinc-400 font-light">
            {pods?.length} pod{pods?.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-xs text-green-400 font-medium">
              {pods?.filter((p) => p.status === "Running").length} running
            </span>
          </div>
          {pods?.filter((p) => shouldHighlight(p))?.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-xs text-red-400 font-medium">
                {pods?.filter((p) => shouldHighlight(p))?.length} need attention
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Pod Table */}
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/50 bg-zinc-800/30">
                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Pod Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Namespace
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Restarts
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Age
                </th>
                {pods?.some((p) => p.metrics) && (
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Resources
                  </th>
                )}
                <th className="px-6 py-4 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {pods?.map((pod, index) => (
                <tr
                  key={`${pod.namespace}-${pod.name}-${index}`}
                  className={`
                    transition-all duration-200
                    ${shouldHighlight(pod) ? "bg-red-500/5" : "hover:bg-zinc-800/30"}
                    ${selectedPod?.name === pod.name ? "bg-zinc-800/50" : ""}
                    cursor-pointer group
                  `}
                  onClick={() => handlePodClick(pod)}
                >
                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${getStatusColor(pod.status)}`}
                    >
                      {getStatusIcon(pod.status)}
                      {pod.status}
                    </div>
                  </td>

                  {/* Pod Name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white font-mono">
                        {pod.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyName(pod.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700/50 rounded transition-all"
                        title="Copy pod name"
                      >
                        {copiedPod === pod.name ? (
                          <CheckCircle
                            className="w-3.5 h-3.5 text-green-400"
                            strokeWidth={2}
                          />
                        ) : (
                          <Copy
                            className="w-3.5 h-3.5 text-zinc-500"
                            strokeWidth={2}
                          />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Namespace */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-zinc-400 font-light">
                      {pod.namespace}
                    </span>
                  </td>

                  {/* Restarts */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {pod.restarts > 3 && (
                        <AlertCircle
                          className="w-4 h-4 text-amber-400"
                          strokeWidth={2}
                        />
                      )}
                      <span
                        className={`text-sm font-medium ${pod.restarts > 3 ? "text-amber-400" : "text-zinc-300"}`}
                      >
                        {pod.restarts}
                      </span>
                    </div>
                  </td>

                  {/* Age */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-zinc-400 font-light">
                      {pod.age}
                    </span>
                  </td>

                  {/* Metrics (if available) */}
                  {pods?.some((p) => p.metrics) && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {pod?.metrics ? (
                        <div className="flex items-center gap-3 text-xs">
                          {pod?.metrics?.cpu && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-md">
                              <Activity
                                className="w-3 h-3 text-zinc-400"
                                strokeWidth={2}
                              />
                              <span className="text-zinc-300 font-medium">
                                {pod?.metrics?.cpu?.usage}
                              </span>
                            </div>
                          )}
                          {pod?.metrics?.memory && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-md">
                              <Activity
                                className="w-3 h-3 text-zinc-400"
                                strokeWidth={2}
                              />
                              <span className="text-zinc-300 font-medium">
                                {pod?.metrics?.memory?.usage}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600">
                          No metrics
                        </span>
                      )}
                    </td>
                  )}

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* View Logs */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onGetLogs?.(pod);
                        }}
                        className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800/50 text-zinc-300 transition-all duration-200"
                        title="View logs"
                      >
                        <Terminal className="w-4 h-4" strokeWidth={2} />
                      </button>

                      {/* Restart Pod */}
                      {(pod.status === "Failed" ||
                        pod.status === "CrashLoopBackOff") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestartPod?.(pod);
                          }}
                          className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 transition-all duration-200"
                          title="Restart pod"
                        >
                          <RefreshCw className="w-4 h-4" strokeWidth={2} />
                        </button>
                      )}

                      {/* Explain Issue */}
                      {shouldHighlight(pod) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onExplainIssue?.(pod);
                          }}
                          className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 text-zinc-300 transition-all duration-200"
                          title="Explain issue"
                        >
                          <AlertCircle className="w-4 h-4" strokeWidth={2} />
                        </button>
                      )}

                      {/* Open Details */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePodClick(pod);
                        }}
                        className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800/50 text-zinc-300 transition-all duration-200"
                        title="View details"
                      >
                        <ChevronRight className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {pods?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl">
          <div className="p-4 rounded-full bg-zinc-800/50 mb-4">
            <AlertCircle className="w-8 h-8 text-zinc-600" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No pods found</h3>
          <p className="text-sm text-zinc-400 max-w-md font-light">
            No pods match the current filters in the {namespace} namespace.
          </p>
        </div>
      )}
    </div>
  );
}
