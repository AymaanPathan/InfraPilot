import { z } from "zod";
import { Folder, Activity, Box } from "lucide-react";

export const namespacesListSchema = z.object({
  namespaces: z.array(
    z.object({
      name: z.string(),
      status: z.string().optional(),
      age: z.string().optional(),
      labels: z
        .array(
          z.object({
            key: z.string(),
            value: z.string(),
          }),
        )
        .optional(),
      resourceCounts: z
        .object({
          pods: z.number().optional(),
          services: z.number().optional(),
          deployments: z.number().optional(),
        })
        .optional(),
    }),
  ),
});

type NamespacesListProps = z.infer<typeof namespacesListSchema>;

export function NamespacesList({ namespaces }: NamespacesListProps) {
  const getNamespaceColor = (name: string) => {
    // System namespaces
    if (
      name === "kube-system" ||
      name === "kube-public" ||
      name === "kube-node-lease"
    ) {
      return "border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10";
    }
    // Default namespace
    if (name === "default") {
      return "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10";
    }
    // Custom namespaces
    return "border-zinc-800/50 bg-zinc-800/30 hover:bg-zinc-900/50 backdrop-blur-sm";
  };

  const getStatusBadge = (status?: string) => {
    if (status === "Active") {
      return (
        <span className="px-2 py-0.5 bg-green-500/100/20 text-green-300 text-xs rounded-full flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Active
        </span>
      );
    }
    if (status === "Terminating") {
      return (
        <span className="px-2 py-0.5 bg-red-500/100/20 text-red-300 text-xs rounded-full">
          Terminating
        </span>
      );
    }
    return null;
  };

  const getNamespaceIcon = (name: string) => {
    if (
      name === "kube-system" ||
      name === "kube-public" ||
      name === "kube-node-lease"
    ) {
      return <Activity className="w-5 h-5 text-purple-400" />;
    }
    if (name === "default") {
      return <Box className="w-5 h-5 text-blue-400" />;
    }
    return <Folder className="w-5 h-5 text-zinc-400" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">
          Namespaces ({namespaces.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {namespaces.map((namespace, index) => (
          <div
            key={index}
            className={`border rounded-xl p-4 transition-all duration-200 group ${getNamespaceColor(namespace.name)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900/50 rounded-lg group-hover:scale-110 transition-transform duration-200">
                  {getNamespaceIcon(namespace.name)}
                </div>
                <div>
                  <h4 className="font-mono text-sm font-medium text-white">
                    {namespace.name}
                  </h4>
                  {namespace.age && (
                    <p className="text-xs text-zinc-500">{namespace.age}</p>
                  )}
                </div>
              </div>
              {getStatusBadge(namespace.status)}
            </div>

            {/* Resource counts */}
            {namespace.resourceCounts && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {namespace.resourceCounts.pods !== undefined && (
                  <div className="text-center p-2 bg-zinc-900/30 rounded-lg">
                    <div className="text-lg font-bold text-white">
                      {namespace.resourceCounts.pods}
                    </div>
                    <div className="text-xs text-zinc-400">Pods</div>
                  </div>
                )}
                {namespace.resourceCounts.services !== undefined && (
                  <div className="text-center p-2 bg-zinc-900/30 rounded-lg">
                    <div className="text-lg font-bold text-white">
                      {namespace.resourceCounts.services}
                    </div>
                    <div className="text-xs text-zinc-400">Services</div>
                  </div>
                )}
                {namespace.resourceCounts.deployments !== undefined && (
                  <div className="text-center p-2 bg-zinc-900/30 rounded-lg">
                    <div className="text-lg font-bold text-white">
                      {namespace.resourceCounts.deployments}
                    </div>
                    <div className="text-xs text-zinc-400">Deploys</div>
                  </div>
                )}
              </div>
            )}

            {/* Labels */}
            {namespace.labels && Object.keys(namespace.labels).length > 0 && (
              <div className="pt-2 border-t border-zinc-700/30">
                <div className="text-xs text-zinc-400 mb-1">Labels:</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(namespace.labels)
                    .slice(0, 2)
                    .map(([key, value], lIndex) => (
                      <code
                        key={lIndex}
                        className="px-1.5 py-0.5 bg-zinc-900/50 text-zinc-400 rounded text-xs"
                      >
                        {key}
                      </code>
                    ))}
                  {Object.keys(namespace.labels).length > 2 && (
                    <span className="px-1.5 py-0.5 text-zinc-500 text-xs">
                      +{Object.keys(namespace.labels).length - 2}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {namespaces.length === 0 && (
        <div className="text-center py-8 text-zinc-400">
          <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No namespaces found</p>
        </div>
      )}
    </div>
  );
}
