import { z } from "zod";
import { Clock, AlertCircle, Info, CheckCircle, XCircle } from "lucide-react";

export const eventsTimelineSchema = z.object({
  events: z.array(
    z.object({
      type: z.string().optional(),
      reason: z.string().optional(),
      message: z.string(),
      timestamp: z.string().optional(),
      lastTimestamp: z.string().optional(),
      firstTimestamp: z.string().optional(),
      count: z.number().optional(),
      source: z.string().optional(),
    }),
  ),
  podName: z.string().optional(),
});

type EventsTimelineProps = z.infer<typeof eventsTimelineSchema>;

export function EventsTimeline({ events, podName }: EventsTimelineProps) {
  const getEventIcon = (type?: string, reason?: string) => {
    if (type === "Warning") return <AlertCircle className="w-4 h-4" />;
    if (type === "Error") return <XCircle className="w-4 h-4" />;
    if (reason?.includes("Pulled") || reason?.includes("Started")) {
      return <CheckCircle className="w-4 h-4" />;
    }
    return <Info className="w-4 h-4" />;
  };

  const getEventColor = (type?: string) => {
    switch (type) {
      case "Warning":
        return {
          bg: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-700",
          icon: "text-amber-700",
        };
      case "Error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-700",
          icon: "text-red-700",
        };
      default:
        return {
          bg: "bg-neutral-50",
          border: "border-neutral-200",
          text: "text-neutral-700",
          icon: "text-neutral-700",
        };
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "Unknown time";
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return timestamp;
    }
  };

  const sortedEvents = [...events].sort((a, b) => {
    const timeA = a.lastTimestamp || a.timestamp || a.firstTimestamp || "";
    const timeB = b.lastTimestamp || b.timestamp || b.firstTimestamp || "";
    return timeB.localeCompare(timeA);
  });

  return (
    <div className="space-y-4">
      {podName && (
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-neutral-700" />
          <h3 className="text-lg font-semibold text-neutral-900">
            Events for {podName}
          </h3>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-neutral-200" />

        <div className="space-y-3">
          {sortedEvents.map((event, index) => {
            const colors = getEventColor(event.type);
            const timestamp =
              event.lastTimestamp || event.timestamp || event.firstTimestamp;

            return (
              <div key={index} className="relative pl-12">
                <div
                  className={`absolute left-4 top-3 w-4 h-4 rounded-full border-2 ${colors.border} ${colors.bg} flex items-center justify-center`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${colors.icon.replace("text-", "bg-")}`}
                  />
                </div>

                <div
                  className={`${colors.bg} ${colors.border} border rounded-xl p-4 hover:shadow-sm transition-all duration-200`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={colors.icon}>
                        {getEventIcon(event.type, event.reason)}
                      </div>
                      {event.reason && (
                        <span
                          className={`font-semibold text-sm ${colors.text}`}
                        >
                          {event.reason}
                        </span>
                      )}
                      {event.count && event.count > 1 && (
                        <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded-full border border-neutral-200">
                          ×{event.count}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(timestamp)}
                    </div>
                  </div>

                  <p className="text-sm text-neutral-700 leading-relaxed">
                    {event.message}
                  </p>

                  {event.source && (
                    <div className="mt-2 text-xs text-neutral-500">
                      Source: {event.source}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {events.length === 0 && (
        <div className="text-center py-8 text-neutral-500">
          <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No events found</p>
        </div>
      )}

      {events.length > 0 && (
        <div className="text-xs text-neutral-500 text-center mt-4">
          Showing {events.length} event{events.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
