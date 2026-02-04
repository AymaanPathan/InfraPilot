"use client";

import { z } from "zod";
import { useState } from "react";
import { Grid, Layers } from "lucide-react";
import { PodGrid } from "./PodsGrid";
import { LogsViewer } from "./LogsViewer";
import { EventsTimeline } from "./EventsTimeline";

export const multiPanelViewSchema = z.object({
  panels: z.array(
    z.object({
      id: z.string(),
      step: z.number(),
      data: z.any(),
      success: z.boolean(),
      title: z.string().optional(),
      componentType: z.string().optional(),
    }),
  ),
  layout: z.enum(["tabs", "grid", "vertical"]).optional().default("tabs"),
  explanation: z.string().optional(),
});

type MultiPanelViewProps = z.infer<typeof multiPanelViewSchema>;

export function MultiPanelView({
  panels,
  layout = "tabs",
  explanation,
}: MultiPanelViewProps) {
  const [activeTab, setActiveTab] = useState(0);

  if (layout === "tabs") {
    return (
      <div className="space-y-4">
        {explanation && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-blue-900">{explanation}</p>
          </div>
        )}

        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="border-b border-neutral-200 bg-neutral-50 p-1 flex gap-1">
            {panels.map((panel, index) => (
              <button
                key={panel.id}
                onClick={() => setActiveTab(index)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === index
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {panel.title || `Step ${index + 1}`}
              </button>
            ))}
          </div>

          <div className="p-4">
            <PanelContent panel={panels[activeTab]} />
          </div>
        </div>
      </div>
    );
  }

  if (layout === "grid") {
    return (
      <div className="space-y-4">
        {explanation && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900">{explanation}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {panels.map((panel, index) => (
            <div
              key={panel.id}
              className="bg-white border border-neutral-200 rounded-xl overflow-hidden"
            >
              <div className="border-b border-neutral-200 bg-neutral-50 p-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  <Grid className="w-4 h-4 text-neutral-600" />
                  {panel.title || `Step ${index + 1}`}
                </h3>
              </div>
              <div className="p-4">
                <PanelContent panel={panel} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {explanation && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900">{explanation}</p>
        </div>
      )}

      {panels.map((panel, index) => (
        <div
          key={panel.id}
          className="bg-white border border-neutral-200 rounded-xl overflow-hidden"
        >
          <div className="border-b border-neutral-200 bg-neutral-50 p-3">
            <h3 className="flex items-center gap-2 font-semibold text-neutral-900">
              <Layers className="w-5 h-5 text-neutral-600" />
              {panel.title || `Step ${index + 1}`}
            </h3>
          </div>
          <div className="p-4">
            <PanelContent panel={panel} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PanelContent({ panel }: { panel: any }) {
  if (!panel.success) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        ✗ Step failed: {panel.error || "Unknown error"}
      </div>
    );
  }

  const data = panel.data;

  if (data.pods || Array.isArray(data)) {
    return <PodGrid pods={data.pods || data} />;
  }

  if (data.logs || typeof data === "string") {
    return (
      <LogsViewer
        logs={data.logs || data}
        podName={data.podName || data._itemContext?.name || "unknown"}
        namespace={data.namespace || data._itemContext?.namespace || "default"}
      />
    );
  }

  if (data.events) {
    return (
      <EventsTimeline
        events={data.events}
        podName={data.podName || data._itemContext?.name}
      />
    );
  }

  return (
    <div className="bg-neutral-50 rounded-lg p-4 overflow-auto max-h-96 border border-neutral-200">
      <pre className="text-xs text-neutral-700">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
