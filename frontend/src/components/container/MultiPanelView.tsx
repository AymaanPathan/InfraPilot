"use client";

import { z } from "zod";
import { LogsViewer } from "./LogsViewer";
import { EventsTimeline } from "./EventsTimeline";
import {
  AlertCircle,
  XCircle,
  CheckCircle2,
  FileText,
  Activity,
} from "lucide-react";

/**
 * MultiPanelView Component - FIXED LOG DISPLAY
 *
 * Key Fix: Properly extracts logs data from the panel.data object
 * The issue was that panel.data contains the full transformed object
 * with structure: { podName, namespace, logs, container, containers }
 * But we need to extract just the logs array and pass it correctly.
 */

export const multiPanelViewSchema = z.object({
  panels: z
    .array(
      z.object({
        id: z.string(),
        step: z.number(),
        data: z.any().nullable(),
        success: z.boolean(),
        error: z.string().optional(),
        podName: z.string().optional(), // Added to support explicit pod name
      }),
    )
    .optional(),
  items: z.array(z.any()).optional(),
  comparison: z
    .array(
      z.object({
        step: z.number(),
        success: z.boolean(),
        data: z.any().nullable(),
        error: z.string().optional(),
        podName: z.string().optional(),
      }),
    )
    .optional(),
  comparisonType: z.string().optional(),
});

type MultiPanelViewProps = z.infer<typeof multiPanelViewSchema>;

export function MultiPanelView({
  panels,
  items,
  comparison,
  comparisonType,
}: MultiPanelViewProps) {
  // Support both formats: panels array OR comparison array
  const panelData =
    panels ||
    comparison?.map((c, index) => ({
      id: `panel-${index}`,
      step: c.step,
      data: c.data,
      success: c.success,
      error: c.error,
      podName: c.podName,
    })) ||
    [];

  const successfulPanels = panelData.filter((p) => p.success);
  const errorPanels = panelData.filter((p) => !p.success);

  // Detect panel type from data
  const panelType = detectPanelType(successfulPanels[0]?.data);

  console.log("🔍 MultiPanelView Debug:", {
    totalPanels: panelData.length,
    successfulPanels: successfulPanels.length,
    errorPanels: errorPanels.length,
    detectedType: panelType,
    firstPanelData: successfulPanels[0]?.data,
  });

  return (
    <div className="space-y-6">
      {/* Error Summary */}
      {errorPanels.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-900 mb-2">
                {errorPanels.length} item(s) could not be loaded
              </h3>
              <div className="space-y-1 text-sm text-amber-800">
                {errorPanels.map((panel: any, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    <span className="font-mono">
                      {panel.podName || panel.id || `Panel ${panel.step}`}
                    </span>
                    <span className="text-amber-600">
                      - {panel.error || "Unknown error"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel Grid */}
      {successfulPanels.length > 0 ? (
        <div
          className={`grid gap-6 ${successfulPanels.length === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}
        >
          {successfulPanels.map((panel, index) => (
            <PanelCard
              key={panel.id}
              panel={panel}
              index={index}
              type={panelType}
            />
          ))}
        </div>
      ) : (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-8 text-center">
          <XCircle className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            No data available
          </h3>
          <p className="text-sm text-neutral-600">
            All requested items failed to load. Check pod names and try again.
          </p>
        </div>
      )}
    </div>
  );
}

function PanelCard({
  panel,
  index,
  type,
}: {
  panel: any;
  index: number;
  type: "logs" | "events" | "generic";
}) {
  // CRITICAL FIX: Extract pod name and namespace from the data object
  // The panel.data has structure: { podName, namespace, logs, container, containers }
  const podName =
    panel.data?.podName || panel.podName || panel.id || `Panel ${index + 1}`;
  const namespace = panel.data?.namespace || "default";

  // CRITICAL FIX: Extract logs properly
  // The logs could be:
  // 1. An array of strings: panel.data.logs = ["line 1", "line 2"]
  // 2. A string with newlines: panel.data.logs = "line 1\nline 2"
  // 3. Directly in panel.data if it's a string: panel.data = "line 1\nline 2"
  const extractedLogs =
    panel.data?.logs || // First try the logs property
    (typeof panel.data === "string" ? panel.data : []) || // Then try if data itself is a string
    [];

  console.log(`📋 Panel ${index + 1} (${podName}) Debug:`, {
    podName,
    namespace,
    dataType: typeof panel.data,
    hasLogsProperty: !!panel.data?.logs,
    logsType: typeof extractedLogs,
    logsLength: Array.isArray(extractedLogs)
      ? extractedLogs.length
      : typeof extractedLogs === "string"
        ? extractedLogs.split("\n").length
        : 0,
    sampleData: JSON.stringify(panel.data).substring(0, 200),
  });

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
      {/* Panel Header */}
      <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {type === "logs" && <FileText className="w-5 h-5 text-blue-600" />}
            {type === "events" && (
              <Activity className="w-5 h-5 text-purple-600" />
            )}
            {type === "generic" && (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            )}

            <div>
              <h3 className="font-semibold text-neutral-900 font-mono text-sm">
                {podName}
              </h3>
              <p className="text-xs text-neutral-500">{namespace}</p>
            </div>
          </div>

          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
            ✓ Loaded
          </span>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {type === "logs" && (
          <LogsViewer
            logs={extractedLogs}
            podName={podName}
            namespace={namespace}
            container={panel.data?.container}
            containers={panel.data?.containers}
            showTimestamps={true}
            highlightErrors={true}
          />
        )}

        {type === "events" && (
          <EventsTimeline events={panel.data?.events || []} podName={podName} />
        )}

        {type === "generic" && (
          <div className="p-4 overflow-auto h-full">
            <pre className="text-xs text-neutral-700 whitespace-pre-wrap">
              {JSON.stringify(panel.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function detectPanelType(data: any): "logs" | "events" | "generic" {
  if (!data) return "generic";

  // Check for logs - logs property takes precedence
  if (data.logs || typeof data === "string") {
    return "logs";
  }

  // Check for events
  if (
    data.events ||
    (Array.isArray(data) && data[0]?.type && data[0]?.reason)
  ) {
    return "events";
  }

  return "generic";
}
