import { z } from "zod";
import { Network, ExternalLink, Lock } from "lucide-react";

/**
 * ✅ Tambo-safe schema
 * NO z.record
 * NO dynamic keys
 */
export const servicesListSchema = z.object({
  services: z.array(
    z.object({
      name: z.string(),
      namespace: z.string().optional(),
      type: z.string().optional(),
      clusterIP: z.string().optional(),
      externalIP: z.string().optional(),
      age: z.string().optional(),

      ports: z
        .array(
          z.object({
            port: z.number(),
            targetPort: z.union([z.number(), z.string()]).optional(),
            protocol: z.string().optional(),
            name: z.string().optional(),
          }),
        )
        .optional(),

      // ✅ FIXED: explicit key/value array
      selector: z
        .array(
          z.object({
            key: z.string(),
            value: z.string(),
          }),
        )
        .optional(),
    }),
  ),
});

type ServicesListProps = z.infer<typeof servicesListSchema>;

export function ServicesList({ services }: ServicesListProps) {
  const getTypeColor = (type?: string) => {
    switch (type) {
      case "LoadBalancer":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "NodePort":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "ClusterIP":
        return "bg-zinc-500/20 text-zinc-300 border-zinc-500/30";
      case "ExternalName":
        return "bg-green-500/100/20 text-green-300 border-green-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-300 border-zinc-500/30";
    }
  };

  const getTypeIcon = (type?: string) => {
    if (type === "LoadBalancer") return <ExternalLink className="w-4 h-4" />;
    if (type === "ClusterIP") return <Lock className="w-4 h-4" />;
    return <Network className="w-4 h-4" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">
          Services ({services.length})
        </h3>
      </div>

      <div className="grid gap-3">
        {services.map((service, index) => (
          <div
            key={index}
            className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-4 hover:bg-zinc-800 transition-all duration-200"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-700/50 rounded-lg">
                  <Network className="w-5 h-5 text-blue-400" />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-mono text-sm font-medium text-white">
                      {service.name}
                    </h4>

                    {service.namespace && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-md">
                        {service.namespace}
                      </span>
                    )}
                  </div>

                  {service.age && (
                    <p className="text-xs text-zinc-500">{service.age}</p>
                  )}
                </div>
              </div>

              {service.type && (
                <div
                  className={`px-3 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${getTypeColor(service.type)}`}
                >
                  {getTypeIcon(service.type)}
                  {service.type}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="space-y-2 text-sm">
              {/* IPs */}
              <div className="flex flex-wrap gap-3">
                {service.clusterIP && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">Cluster IP:</span>
                    <code className="px-2 py-0.5 bg-zinc-900/50 rounded text-zinc-300 font-mono text-xs">
                      {service.clusterIP}
                    </code>
                  </div>
                )}

                {service.externalIP && service.externalIP !== "<none>" && (
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">External IP:</span>
                    <code className="px-2 py-0.5 bg-green-500/100/20 rounded text-green-300 font-mono text-xs">
                      {service.externalIP}
                    </code>
                  </div>
                )}
              </div>

              {/* Ports */}
              {service.ports && service.ports.length > 0 && (
                <div>
                  <span className="text-zinc-400 text-xs">Ports:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {service.ports.map((port, pIndex) => (
                      <div
                        key={pIndex}
                        className="px-2 py-1 bg-zinc-900/50 rounded-lg text-xs"
                      >
                        <span className="text-white font-medium">
                          {port.port}
                        </span>

                        {port.targetPort && (
                          <span className="text-zinc-400">
                            :{port.targetPort}
                          </span>
                        )}

                        {port.protocol && (
                          <span className="text-zinc-500 ml-1">
                            /{port.protocol}
                          </span>
                        )}

                        {port.name && (
                          <span className="text-blue-400 ml-1">
                            ({port.name})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selector */}
              {service.selector && service.selector.length > 0 && (
                <div>
                  <span className="text-zinc-400 text-xs">Selector:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {service.selector.map(({ key, value }, sIndex) => (
                      <code
                        key={sIndex}
                        className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs"
                      >
                        {key}={value}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-8 text-zinc-400">
          <Network className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No services found</p>
        </div>
      )}
    </div>
  );
}
