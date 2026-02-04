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
    if (status === "Ready") return "text-green-600";
    if (status === "NotReady") return "text-red-600";
    return "text-amber-600";
  };

  const getStatusIcon = (status?: string) => {
    if (status === "Ready") return <CheckCircle2 className="w-5 h-5" />;
    if (status === "NotReady") return <XCircle className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  const getRoleBadge = (role: string) => {
    if (role === "control-plane" || role === "master") {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    if (role === "worker") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    return "bg-neutral-100 text-neutral-700 border-neutral-200";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">
          Cluster Nodes ({nodes.length})
        </h3>
      </div>

      <div className="grid gap-4">
        {nodes.map((node, index) => {
          const statusColor = getStatusColor(node.status);

          return (
            <div
              key={index}
              className="bg-white border border-neutral-200 rounded-xl p-5 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-neutral-100 rounded-lg">
                    <Server className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-mono text-base font-semibold text-neutral-900">
                        {node.name}
                      </h4>
                      <div className={statusColor}>
                        {getStatusIcon(node.status)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      {node.version && (
                        <span className="font-mono">{node.version}</span>
                      )}
                      {node.age && (
                        <span className="text-neutral-500">• {node.age}</span>
                      )}
                    </div>
                  </div>
                </div>

                {node.status && (
                  <div
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      node.status === "Ready"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : node.status === "NotReady"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {node.status}
                  </div>
                )}
              </div>

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
                  <span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded-md text-xs font-mono border border-neutral-200">
                    {node.internalIP}
                  </span>
                )}
              </div>

              {(node.capacity || node.allocatable) && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {(node.capacity?.cpu || node.allocatable?.cpu) && (
                    <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Cpu className="w-4 h-4 text-blue-600" />
                        <span className="text-xs text-neutral-600">CPU</span>
                      </div>
                      <div className="text-sm">
                        <div className="text-neutral-900 font-semibold">
                          {node.allocatable?.cpu || node.capacity?.cpu}
                        </div>
                        {node.capacity?.cpu &&
                          node.allocatable?.cpu &&
                          node.capacity.cpu !== node.allocatable.cpu && (
                            <div className="text-xs text-neutral-500">
                              of {node.capacity.cpu}
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {(node.capacity?.memory || node.allocatable?.memory) && (
                    <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                      <div className="flex items-center gap-2 mb-2">
                        <HardDrive className="w-4 h-4 text-purple-600" />
                        <span className="text-xs text-neutral-600">Memory</span>
                      </div>
                      <div className="text-sm">
                        <div className="text-neutral-900 font-semibold">
                          {node.allocatable?.memory || node.capacity?.memory}
                        </div>
                        {node.capacity?.memory &&
                          node.allocatable?.memory &&
                          node.capacity.memory !== node.allocatable.memory && (
                            <div className="text-xs text-neutral-500">
                              of {node.capacity.memory}
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {(node.capacity?.pods || node.allocatable?.pods) && (
                    <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-neutral-600">Pods</span>
                      </div>
                      <div className="text-sm">
                        <div className="text-neutral-900 font-semibold">
                          {node.allocatable?.pods || node.capacity?.pods}
                        </div>
                        {node.capacity?.pods &&
                          node.allocatable?.pods &&
                          node.capacity.pods !== node.allocatable.pods && (
                            <div className="text-xs text-neutral-500">
                              of {node.capacity.pods}
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {node.conditions && node.conditions.length > 0 && (
                <div className="pt-3 border-t border-neutral-200">
                  <div className="text-xs text-neutral-600 mb-2">
                    Conditions:
                  </div>
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
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-neutral-100 text-neutral-600 border border-neutral-200"
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
        <div className="text-center py-8 text-neutral-500">
          <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No nodes found</p>
        </div>
      )}
    </div>
  );
}
