import { z } from "zod";
import {
  Server,
  Cpu,
  HardDrive,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

export const nodesListSchema = z.object({
  nodes: z.array(
    z.object({
      name: z.string(),
      status: z.string().optional(),
      roles: z.array(z.string()).optional(),
      version: z.string().optional(),
      age: z.string().optional(),
      internalIP: z.string().optional(),
      capacity: z
        .object({
          cpu: z.string().optional(),
          memory: z.string().optional(),
          pods: z.string().optional(),
        })
        .optional(),
      allocatable: z
        .object({
          cpu: z.string().optional(),
          memory: z.string().optional(),
          pods: z.string().optional(),
        })
        .optional(),
      conditions: z
        .array(
          z.object({
            type: z.string(),
            status: z.string(),
            reason: z.string().optional(),
          }),
        )
        .optional(),
    }),
  ),
});

type NodesListProps = z.infer<typeof nodesListSchema>;

export function NodesList({ nodes }: NodesListProps) {
  const getStatusColor = (status?: string) => {
    if (status === "Ready") return "text-green-400";
    if (status === "NotReady") return "text-red-400";
    return "text-yellow-400";
  };

  const getStatusIcon = (status?: string) => {
    if (status === "Ready") return <CheckCircle2 className="w-5 h-5" />;
    if (status === "NotReady") return <XCircle className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  const getRoleBadge = (role: string) => {
    if (role === "control-plane" || role === "master") {
      return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    }
    if (role === "worker") {
      return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    }
    return "bg-slate-500/20 text-slate-300 border-slate-500/30";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Cluster Nodes ({nodes.length})
        </h3>
      </div>

      <div className="grid gap-4">
        {nodes.map((node, index) => {
          const statusColor = getStatusColor(node.status);

          return (
            <div
              key={index}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800 transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-700/50 rounded-lg">
                    <Server className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-mono text-base font-semibold text-white">
                        {node.name}
                      </h4>
                      <div className={statusColor}>
                        {getStatusIcon(node.status)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      {node.version && (
                        <span className="font-mono">{node.version}</span>
                      )}
                      {node.age && (
                        <span className="text-slate-500">• {node.age}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status badge */}
                {node.status && (
                  <div
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      node.status === "Ready"
                        ? "bg-green-500/20 text-green-300"
                        : node.status === "NotReady"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-yellow-500/20 text-yellow-300"
                    }`}
                  >
                    {node.status}
                  </div>
                )}
              </div>

              {/* Roles & IP */}
              <div className="flex flex-wrap gap-2 mb-4">
                {node.roles && node.roles.length > 0 && (
                  <>
                    {node.roles.map((role, rIndex) => (
                      <span
                        key={rIndex}
                        className={`px-2 py-1 rounded-md text-xs font-medium border ${getRoleBadge(role)}`}
                      >
                        {role}
                      </span>
                    ))}
                  </>
                )}
                {node.internalIP && (
                  <span className="px-2 py-1 bg-slate-900/50 text-slate-300 rounded-md text-xs font-mono">
                    {node.internalIP}
                  </span>
                )}
              </div>

              {/* Resources */}
              {(node.capacity || node.allocatable) && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {/* CPU */}
                  {(node.capacity?.cpu || node.allocatable?.cpu) && (
                    <div className="bg-slate-900/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Cpu className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-slate-400">CPU</span>
                      </div>
                      <div className="text-sm">
                        <div className="text-white font-semibold">
                          {node.allocatable?.cpu || node.capacity?.cpu}
                        </div>
                        {node.capacity?.cpu &&
                          node.allocatable?.cpu &&
                          node.capacity.cpu !== node.allocatable.cpu && (
                            <div className="text-xs text-slate-500">
                              of {node.capacity.cpu}
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Memory */}
                  {(node.capacity?.memory || node.allocatable?.memory) && (
                    <div className="bg-slate-900/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <HardDrive className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-slate-400">Memory</span>
                      </div>
                      <div className="text-sm">
                        <div className="text-white font-semibold">
                          {node.allocatable?.memory || node.capacity?.memory}
                        </div>
                        {node.capacity?.memory &&
                          node.allocatable?.memory &&
                          node.capacity.memory !== node.allocatable.memory && (
                            <div className="text-xs text-slate-500">
                              of {node.capacity.memory}
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Pods */}
                  {(node.capacity?.pods || node.allocatable?.pods) && (
                    <div className="bg-slate-900/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-slate-400">Pods</span>
                      </div>
                      <div className="text-sm">
                        <div className="text-white font-semibold">
                          {node.allocatable?.pods || node.capacity?.pods}
                        </div>
                        {node.capacity?.pods &&
                          node.allocatable?.pods &&
                          node.capacity.pods !== node.allocatable.pods && (
                            <div className="text-xs text-slate-500">
                              of {node.capacity.pods}
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Conditions */}
              {node.conditions && node.conditions.length > 0 && (
                <div className="pt-3 border-t border-slate-700/30">
                  <div className="text-xs text-slate-400 mb-2">Conditions:</div>
                  <div className="flex flex-wrap gap-2">
                    {node.conditions
                      .filter(
                        (c) => c.status === "True" || c.status === "False",
                      )
                      .map((condition, cIndex) => (
                        <div
                          key={cIndex}
                          className={`px-2 py-1 rounded text-xs ${
                            condition.status === "True"
                              ? condition.type === "Ready"
                                ? "bg-green-500/20 text-green-300"
                                : "bg-yellow-500/20 text-yellow-300"
                              : "bg-slate-700/50 text-slate-400"
                          }`}
                        >
                          {condition.type}
                          {condition.reason && `: ${condition.reason}`}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {nodes.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No nodes found</p>
        </div>
      )}
    </div>
  );
}
