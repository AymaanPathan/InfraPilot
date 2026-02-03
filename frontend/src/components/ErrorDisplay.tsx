import { z } from "zod";
import { AlertCircle, RefreshCw, ExternalLink } from "lucide-react";

export const errorDisplaySchema = z.object({
  error: z.string(),
  hint: z.string().optional(),
  details: z.string().optional(),
  code: z.string().optional(),
  action: z.string().optional(),
});

type ErrorDisplayProps = z.infer<typeof errorDisplaySchema>;

export function ErrorDisplay({
  error,
  hint,
  details,
  code,
  action = "Retry",
}: ErrorDisplayProps) {
  return (
    <div className="my-4 p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-400 mb-2">{error}</h3>

          {code && (
            <div className="mb-2 text-sm text-red-300/70">
              Error Code:{" "}
              <code className="bg-red-500/20 px-2 py-0.5 rounded">{code}</code>
            </div>
          )}

          {hint && <p className="text-sm text-red-300/90 mb-3">💡 {hint}</p>}

          {details && (
            <details className="text-sm text-red-300/70 mb-3">
              <summary className="cursor-pointer hover:text-red-300">
                View Details
              </summary>
              <pre className="mt-2 p-3 bg-red-950/30 rounded text-xs overflow-x-auto">
                {details}
              </pre>
            </details>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {action}
            </button>

            <a
              href="http://localhost:8000/api/ai/health"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Check Backend Status
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
