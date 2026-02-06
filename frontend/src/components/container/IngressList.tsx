import { z } from "zod";
import { Globe, Lock, ExternalLink, Shield } from "lucide-react";

export const ingressListSchema = z.object({
  ingresses: z.array(
    z.object({
      name: z.string(),
      namespace: z.string().optional(),
      hosts: z.array(z.string()).optional(),
      address: z.string().optional(),
      ports: z.array(z.string()).optional(),
      age: z.string().optional(),
      ingressClass: z.string().optional(),
      rules: z
        .array(
          z.object({
            host: z.string().optional(),
            paths: z
              .array(
                z.object({
                  path: z.string(),
                  pathType: z.string().optional(),
                  backend: z.string().optional(),
                  port: z.union([z.number(), z.string()]).optional(),
                }),
              )
              .optional(),
          }),
        )
        .optional(),
      tls: z
        .array(
          z.object({
            hosts: z.array(z.string()).optional(),
            secretName: z.string().optional(),
          }),
        )
        .optional(),
    }),
  ),
});

type IngressListProps = z.infer<typeof ingressListSchema>;

export function IngressList({ ingresses }: IngressListProps) {
  const hasTLS = (ingress: any) => {
    return ingress.tls && ingress.tls.length > 0;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">
          Ingresses ({ingresses.length})
        </h3>
      </div>

      <div className="grid gap-3">
        {ingresses.map((ingress, index) => {
          const hasSecure = hasTLS(ingress);

          return (
            <div
              key={index}
              className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl overflow-hidden hover:border-zinc-700/50 transition-all duration-200"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`p-2 rounded-lg ${hasSecure ? "bg-green-500/10" : "bg-zinc-800/50"}`}
                    >
                      {hasSecure ? (
                        <Lock className="w-5 h-5 text-green-400" />
                      ) : (
                        <Globe className="w-5 h-5 text-zinc-400 font-light" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-mono text-sm font-medium text-white truncate">
                          {ingress.name}
                        </h4>
                        {ingress.namespace && (
                          <span className="px-2 py-0.5 bg-zinc-800/50 text-zinc-400 font-light text-xs rounded-md border border-zinc-800/50">
                            {ingress.namespace}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {ingress.ingressClass && (
                          <span className="px-2 py-0.5 bg-zinc-800/50 text-zinc-400 font-light rounded-md border border-zinc-800/50">
                            {ingress.ingressClass}
                          </span>
                        )}
                        {hasSecure && (
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded-md border border-green-500/20 flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            TLS
                          </span>
                        )}
                        {ingress.age && (
                          <span className="text-zinc-500 font-light">
                            {ingress.age}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {ingress.address && (
                    <div className="ml-2 px-3 py-1 bg-zinc-800/50 rounded-lg text-xs font-mono text-zinc-300 border border-zinc-800/50">
                      {ingress.address}
                    </div>
                  )}
                </div>

                {ingress.hosts && ingress.hosts.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-zinc-400 font-light mb-1">
                      Hosts:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ingress.hosts.map((host, hIndex) => (
                        <a
                          key={hIndex}
                          href={`http${hasSecure ? "s" : ""}://${host}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-zinc-800/50 hover:bg-zinc-800/50 text-zinc-300 rounded-md text-xs font-mono flex items-center gap-1 transition-colors group border border-zinc-800/50"
                        >
                          {host}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {ingress.rules && ingress.rules.length > 0 && (
                  <div>
                    <div className="text-xs text-zinc-400 font-light mb-2">
                      Rules:
                    </div>
                    <div className="space-y-2">
                      {ingress.rules.map((rule, rIndex) => (
                        <div
                          key={rIndex}
                          className="bg-zinc-800/50 rounded-lg p-3 space-y-2 border border-zinc-800/50"
                        >
                          {rule.host && (
                            <div className="text-xs font-medium text-zinc-300 font-mono">
                              {rule.host}
                            </div>
                          )}
                          {rule.paths && rule.paths.length > 0 && (
                            <div className="space-y-1">
                              {rule.paths.map((path, pIndex) => (
                                <div
                                  key={pIndex}
                                  className="flex items-center justify-between text-xs bg-zinc-900/50 backdrop-blur-sm rounded px-2 py-1.5 border border-zinc-800/50"
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <code className="text-zinc-300 font-mono">
                                      {path.path}
                                    </code>
                                    {path.pathType && (
                                      <span className="text-zinc-500 font-light text-xs">
                                        ({path.pathType})
                                      </span>
                                    )}
                                  </div>
                                  {path.backend && (
                                    <div className="flex items-center gap-1 text-zinc-400 font-light">
                                      <span>→</span>
                                      <span className="font-mono">
                                        {path.backend}
                                      </span>
                                      {path.port && (
                                        <span className="text-zinc-300">
                                          :{path.port}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ingress.tls && ingress.tls.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/50">
                    <div className="text-xs text-zinc-400 font-light mb-1">
                      TLS Certificates:
                    </div>
                    <div className="space-y-1">
                      {ingress.tls.map((tls, tIndex) => (
                        <div
                          key={tIndex}
                          className="flex items-center gap-2 text-xs"
                        >
                          <Shield className="w-3 h-3 text-green-400" />
                          {tls.secretName && (
                            <code className="text-green-400 font-mono">
                              {tls.secretName}
                            </code>
                          )}
                          {tls.hosts && tls.hosts.length > 0 && (
                            <span className="text-zinc-500 font-light">
                              ({tls.hosts.join(", ")})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {ingresses.length === 0 && (
        <div className="text-center py-8 text-zinc-500 font-light">
          <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No ingresses found</p>
        </div>
      )}
    </div>
  );
}
