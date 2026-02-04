"use client";

import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PodGrid } from "./PodsGrid";
import { LogsViewer } from "./LogsViewer";
import { EventsTimeline } from "./EventsTimeline";
import { ExplanationDisplay } from "./Explanationcomponents";
import { Grid, Columns, Layers } from "lucide-react";

/**
 * Multi-Panel View Component - PHASE F
 *
 * Displays multiple results side-by-side or in tabs.
 * Used for complex queries like "show failing pods and their logs"
 */

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
  if (layout === "tabs") {
    return (
      <div className="space-y-4">
        {explanation && (
          <ExplanationDisplay
            explanation={explanation}
            type="info"
            className="mb-4"
          />
        )}

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Layers className="w-5 h-5 text-blue-400" />
              Multi-Step Results ({panels.length} panels)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={panels[0]?.id} className="w-full">
              <TabsList
                className="grid w-full"
                style={{ gridTemplateColumns: `repeat(${panels.length}, 1fr)` }}
              >
                {panels.map((panel, index) => (
                  <TabsTrigger
                    key={panel.id}
                    value={panel.id}
                    className="data-[state=active]:bg-blue-600"
                  >
                    {panel.title || `Step ${index + 1}`}
                  </TabsTrigger>
                ))}
              </TabsList>

              {panels.map((panel) => (
                <TabsContent key={panel.id} value={panel.id} className="mt-4">
                  <PanelContent panel={panel} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (layout === "grid") {
    return (
      <div className="space-y-4">
        {explanation && (
          <ExplanationDisplay
            explanation={explanation}
            type="info"
            className="mb-4"
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {panels.map((panel, index) => (
            <Card key={panel.id} className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white text-sm">
                  <Grid className="w-4 h-4 text-blue-400" />
                  {panel.title || `Step ${index + 1}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PanelContent panel={panel} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Vertical layout
  return (
    <div className="space-y-4">
      {explanation && (
        <ExplanationDisplay
          explanation={explanation}
          type="info"
          className="mb-4"
        />
      )}

      {panels.map((panel, index) => (
        <Card key={panel.id} className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Columns className="w-5 h-5 text-blue-400" />
              {panel.title || `Step ${index + 1}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PanelContent panel={panel} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Render individual panel content based on data type
 */
function PanelContent({ panel }: { panel: any }) {
  if (!panel.success) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-300">
        ❌ Step failed: {panel.error || "Unknown error"}
      </div>
    );
  }

  const data = panel.data;

  // Auto-detect component type based on data structure
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

  // Fallback: JSON view
  return (
    <div className="bg-slate-900/50 rounded-lg p-4 overflow-auto max-h-96">
      <pre className="text-xs text-slate-300">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
