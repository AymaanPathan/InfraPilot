import { z } from "zod";
import { Gauge, TrendingUp, AlertTriangle } from "lucide-react";

export const resourceQuotaSchema = z.object({
  namespace: z.string(),
  quotas: z
    .array(
      z.object({
        name: z.string(),
        resources: z.array(
          z.object({
            resource: z.string(),
            used: z.string(),
            hard: z.string(),
            percentage: z.number().optional(),
          }),
        ),
      }),
    )
    .optional(),
  summary: z
    .object({
      cpuUsed: z.string().optional(),
      cpuLimit: z.string().optional(),
      memoryUsed: z.string().optional(),
      memoryLimit: z.string().optional(),
      podsUsed: z.number().optional(),
      podsLimit: z.number().optional(),
    })
    .optional(),
});

type ResourceQuotaProps = z.infer<typeof resourceQuotaSchema>;

export function ResourceQuota({
  namespace,
  quotas,
  summary,
}: ResourceQuotaProps) {
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-400 bg-red-500/20";
    if (percentage >= 70) return "text-yellow-400 bg-yellow-500/20";
    return "text-green-400 bg-green-500/20";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const calculatePercentage = (used: string, hard: string): number => {
    // Parse resource strings (e.g., "2Gi", "500m", "10")
    const parseResource = (value: string): number => {
      const match = value.match(/^(\d+(?:\.\d+)?)(.*)?$/);
      if (!match) return 0;

      const num = parseFloat(match[1]);
      const unit = match[2]?.toLowerCase();

      // Handle memory units
      if (unit === "gi") return num * 1024 * 1024 * 1024;
      if (unit === "mi") return num * 1024 * 1024;
      if (unit === "ki") return num * 1024;
      if (unit === "g") return num * 1000 * 1000 * 1000;
      if (unit === "m" && value.includes("i")) return num * 1000 * 1000;

      // Handle CPU millicores
      if (unit === "m") return num;

      return num;
    };

    const usedNum = parseResource(used);
    const hardNum = parseResource(hard);

    if (hardNum === 0) return 0;
    return Math.min(Math.round((usedNum / hardNum) * 100), 100);
  };

  const formatResource = (resource: string) => {
    // Make resource names more readable
    return resource
      .replace(/requests\./g, "")
      .replace(/limits\./g, "")
      .replace(/^cpu$/, "CPU")
      .replace(/^memory$/, "Memory")
      .replace(/^pods$/, "Pods");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Gauge className="w-6 h-6 text-blue-400" />
        <div>
          <h3 className="text-lg font-semibold text-white">Resource Quotas</h3>
          <p className="text-sm text-slate-400">Namespace: {namespace}</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {summary.cpuUsed && summary.cpuLimit && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="text-sm text-slate-400 mb-2">CPU Usage</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {summary.cpuUsed}
                </span>
                <span className="text-slate-400">/ {summary.cpuLimit}</span>
              </div>
              <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getProgressColor(
                    calculatePercentage(summary.cpuUsed, summary.cpuLimit),
                  )}`}
                  style={{
                    width: `${calculatePercentage(summary.cpuUsed, summary.cpuLimit)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {summary.memoryUsed && summary.memoryLimit && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="text-sm text-slate-400 mb-2">Memory Usage</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {summary.memoryUsed}
                </span>
                <span className="text-slate-400">/ {summary.memoryLimit}</span>
              </div>
              <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getProgressColor(
                    calculatePercentage(
                      summary.memoryUsed,
                      summary.memoryLimit,
                    ),
                  )}`}
                  style={{
                    width: `${calculatePercentage(summary.memoryUsed, summary.memoryLimit)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {summary.podsUsed !== undefined &&
            summary.podsLimit !== undefined && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="text-sm text-slate-400 mb-2">Pod Count</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">
                    {summary.podsUsed}
                  </span>
                  <span className="text-slate-400">/ {summary.podsLimit}</span>
                </div>
                <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getProgressColor(
                      Math.round((summary.podsUsed / summary.podsLimit) * 100),
                    )}`}
                    style={{
                      width: `${(summary.podsUsed / summary.podsLimit) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
        </div>
      )}

      {/* Detailed Quotas */}
      {quotas && quotas.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-300">
            Detailed Quotas
          </h4>

          {quotas.map((quota, qIndex) => (
            <div
              key={qIndex}
              className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4"
            >
              <div className="text-sm font-mono text-slate-300 mb-3">
                {quota.name}
              </div>

              <div className="space-y-3">
                {quota.resources.map((resource, rIndex) => {
                  const percentage =
                    resource.percentage ||
                    calculatePercentage(resource.used, resource.hard);
                  const usageColor = getUsageColor(percentage);
                  const progressColor = getProgressColor(percentage);

                  return (
                    <div key={rIndex} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">
                          {formatResource(resource.resource)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">
                            {resource.used}
                          </span>
                          <span className="text-slate-500">/</span>
                          <span className="text-slate-400">
                            {resource.hard}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${usageColor} flex items-center gap-1`}
                          >
                            {percentage >= 90 && (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            {percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${progressColor}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {(!quotas || quotas.length === 0) && !summary && (
        <div className="text-center py-8 text-slate-400">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No resource quotas defined for this namespace</p>
        </div>
      )}
    </div>
  );
}
