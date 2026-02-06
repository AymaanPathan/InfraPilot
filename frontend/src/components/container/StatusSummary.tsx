import { z } from "zod";
import { Server, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export const statusSummarySchema = z.object({
  totalPods: z.number(),
  runningPods: z.number(),
  failedPods: z.number(),
  pendingPods: z.number(),
  namespace: z.string().optional(),
});

type StatusSummaryProps = z.infer<typeof statusSummarySchema>;

export function StatusSummary({
  totalPods = 0,
  runningPods = 0,
  failedPods = 0,
  pendingPods = 0,
  namespace,
}: StatusSummaryProps) {
  const healthPercentage =
    totalPods > 0 ? Math.round((runningPods / totalPods) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-medium text-white mb-1">
            Cluster Status
          </h3>
          {namespace && (
            <p className="text-sm text-zinc-400 font-light">
              Namespace: {namespace}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-3xl font-medium text-white">
            {healthPercentage}%
          </div>
          <div className="text-sm text-zinc-400 font-light">healthy</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-zinc-400 font-light">Total</span>
          </div>
          <div className="text-2xl font-medium text-white">{totalPods}</div>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs text-zinc-400 font-light">Running</span>
          </div>
          <div className="text-2xl font-medium text-green-400">
            {runningPods}
          </div>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-zinc-400 font-light">Failed</span>
          </div>
          <div className="text-2xl font-medium text-red-400">{failedPods}</div>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-zinc-400 font-light">Pending</span>
          </div>
          <div className="text-2xl font-medium text-amber-400">
            {pendingPods}
          </div>
        </div>
      </div>

      {failedPods > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900 mb-1">
              Action Required
            </p>
            <p className="text-sm text-red-400">
              {failedPods} pod{failedPods > 1 ? "s are" : " is"} experiencing
              failures. Check logs and events for details.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
