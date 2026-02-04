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
          <h3 className="text-xl font-bold text-neutral-900 mb-1">
            Cluster Status
          </h3>
          {namespace && (
            <p className="text-sm text-neutral-600">Namespace: {namespace}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-neutral-900">
            {healthPercentage}%
          </div>
          <div className="text-sm text-neutral-600">healthy</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-neutral-600">Total</span>
          </div>
          <div className="text-2xl font-bold text-neutral-900">{totalPods}</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-xs text-neutral-600">Running</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{runningPods}</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs text-neutral-600">Failed</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{failedPods}</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-neutral-600">Pending</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{pendingPods}</div>
        </div>
      </div>

      {failedPods > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900 mb-1">
              Action Required
            </p>
            <p className="text-sm text-red-700">
              {failedPods} pod{failedPods > 1 ? "s are" : " is"} experiencing
              failures. Check logs and events for details.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
