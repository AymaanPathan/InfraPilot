"use client";

import { AlertCircle, Server, RefreshCw } from "lucide-react";
import { z } from "zod";

export const errorDisplaySchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  hint: z.string().optional(),
  details: z.string().optional(),
});

export type ErrorDisplayProps = z.infer<typeof errorDisplaySchema>;

export function ErrorDisplay({
  error,
  code,
  hint,
  details,
}: ErrorDisplayProps) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-1">
              {code || "Error"}
            </h3>
            <p className="text-red-200">{error}</p>
          </div>

          {hint && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-300">
                <strong>Hint:</strong> {hint}
              </p>
            </div>
          )}

          {details && (
            <details className="text-xs text-red-300/70">
              <summary className="cursor-pointer hover:text-red-300">
                Technical details
              </summary>
              <pre className="mt-2 p-2 bg-black/20 rounded overflow-x-auto">
                {details}
              </pre>
            </details>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm text-red-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>

            <a
              href="http://localhost:8000/health"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300 transition-colors"
            >
              <Server className="w-4 h-4" />
              Check Backend
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
