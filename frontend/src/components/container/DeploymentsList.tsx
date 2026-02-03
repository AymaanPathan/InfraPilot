import { z } from "zod";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";

export const deploymentsListSchema = z.object({
  deployments: z.array(
    z.object({
      name: z.string(),
      namespace: z.string().optional(),
      replicas: z
        .object({
          desired: z.number(),
          ready: z.number(),
          available: z.number(),
          unavailable: z.number().optional(),
        })
        .optional(),
      status: z.string().optional(),
      age: z.string().optional(),
      strategy: z.string().optional(),
    }),
  ),
});

type DeploymentsListProps = z.infer<typeof deploymentsListSchema>;

export function DeploymentsList({ deployments }: DeploymentsListProps) {
  const getStatusColor = (deployment: any) => {
    const { desired, ready } = deployment.replicas || {};
    if (ready === desired && desired > 0) return "text-green-400";
    if (ready === 0) return "text-red-400";
    return "text-yellow-400";
  };

  const getStatusIcon = (deployment: any) => {
    const { desired, ready } = deployment.replicas || {};
    if (ready === desired && desired > 0)
      return <CheckCircle2 className="w-5 h-5" />;
    if (ready === 0) return <XCircle className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Deployments ({deployments?.length})
        </h3>
      </div>

      <div className="grid gap-3">
        {deployments?.map((deployment, index) => {
          const {
            desired = 0,
            ready = 0,
            available = 0,
          } = deployment.replicas || {};
          const statusColor = getStatusColor(deployment);

          return (
            <div
              key={index}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800 transition-all duration-200 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`mt-1 ${statusColor}`}>
                    {getStatusIcon(deployment)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-mono text-sm font-semibold text-white truncate">
                        {deployment.name}
                      </h4>
                      {deployment.namespace && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-md">
                          {deployment.namespace}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="font-semibold text-white">
                          {ready}
                        </span>
                        <span>/</span>
                        <span>{desired}</span>
                        <span>ready</span>
                      </span>
                      {available > 0 && (
                        <span>
                          <span className="font-semibold text-green-400">
                            {available}
                          </span>{" "}
                          available
                        </span>
                      )}
                      {deployment.age && (
                        <span className="text-slate-500">{deployment.age}</span>
                      )}
                    </div>

                    {deployment.strategy && (
                      <div className="mt-2 text-xs text-slate-500">
                        Strategy: {deployment.strategy}
                      </div>
                    )}
                  </div>
                </div>

                {/* Replica Progress Bar */}
                <div className="ml-4 w-24">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        ready === desired && desired > 0
                          ? "bg-green-500"
                          : ready === 0
                            ? "bg-red-500"
                            : "bg-yellow-500"
                      }`}
                      style={{ width: `${(ready / desired) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 text-center mt-1">
                    {Math.round((ready / desired) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {deployments?.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No deployments found</p>
        </div>
      )}
    </div>
  );
}
