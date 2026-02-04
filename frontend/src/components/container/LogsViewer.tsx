"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Search,
  Download,
  Copy,
  Check,
  RefreshCw,
  Filter,
  Terminal,
  XCircle,
} from "lucide-react";
import { z } from "zod";

// Zod schema for props validation
export const logsViewerSchema = z.object({
  logs: z.union([z.string(), z.array(z.string())]),
  podName: z.string(),
  namespace: z.string().optional().default("default"),
  container: z.string().optional(),
  showTimestamps: z.boolean().optional().default(true),
  highlightErrors: z.boolean().optional().default(true),
  explanation: z.string().optional(),
  autoExplained: z.boolean().optional(),
  tail: z.number().optional(),
  follow: z.boolean().optional(),
});

type LogsViewerProps = z.infer<typeof logsViewerSchema>;

interface LogLine {
  lineNumber: number;
  timestamp?: string;
  level: "error" | "warn" | "info" | "debug" | "unknown";
  content: string;
  rawLine: string;
}

export function LogsViewer({
  logs,
  podName,
  namespace = "default",
  container,
  showTimestamps = true,
  highlightErrors = true,
  explanation,
  autoExplained,
}: LogsViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Parse logs into structured format
  const parsedLogs = useMemo(() => {
    const logLines = Array.isArray(logs) ? logs : logs.split("\n");
    return logLines
      .filter((line) => line.trim().length > 0)
      .map((line, index) => parseLine(line, index + 1));
  }, [logs]);

  // Filter logs based on search and level
  const filteredLogs = useMemo(() => {
    return parsedLogs.filter((log) => {
      const matchesSearch =
        !searchTerm ||
        log.content.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLevel = filterLevel === "all" || log.level === filterLevel;

      return matchesSearch && matchesLevel;
    });
  }, [parsedLogs, searchTerm, filterLevel]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredLogs, autoScroll]);

  // Count log levels
  const levelCounts = useMemo(() => {
    return parsedLogs.reduce(
      (acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [parsedLogs]);

  const handleCopyLogs = async () => {
    const logText = filteredLogs.map((log) => log.rawLine).join("\n");
    await navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const logText = filteredLogs.map((log) => log.rawLine).join("\n");
    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${podName}-${container || "logs"}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="bg-neutral-50 border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-neutral-700" />
            <div>
              <h3 className="font-semibold text-neutral-900">Pod Logs</h3>
              <p className="text-xs text-neutral-600">
                {podName} {container && `(${container})`} • {namespace}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLogs}
              className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
              title="Copy logs"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-neutral-600" />
              )}
            </button>
            <button
              onClick={handleDownloadLogs}
              className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
              title="Download logs"
            >
              <Download className="w-4 h-4 text-neutral-600" />
            </button>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`p-2 rounded-lg transition-colors ${
                autoScroll
                  ? "bg-neutral-900 text-white"
                  : "hover:bg-neutral-200 text-neutral-600"
              }`}
              title={
                autoScroll ? "Auto-scroll enabled" : "Auto-scroll disabled"
              }
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="all">All Levels ({parsedLogs.length})</option>
            {levelCounts.error > 0 && (
              <option value="error">Errors ({levelCounts.error})</option>
            )}
            {levelCounts.warn > 0 && (
              <option value="warn">Warnings ({levelCounts.warn})</option>
            )}
            {levelCounts.info > 0 && (
              <option value="info">Info ({levelCounts.info})</option>
            )}
            {levelCounts.debug > 0 && (
              <option value="debug">Debug ({levelCounts.debug})</option>
            )}
          </select>
        </div>

        {/* Level Summary */}
        {highlightErrors && (
          <div className="flex items-center gap-3 mt-3 text-xs">
            {levelCounts.error > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-3 h-3" />
                <span>{levelCounts.error} errors</span>
              </div>
            )}
            {levelCounts.warn > 0 && (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="w-3 h-3" />
                <span>{levelCounts.warn} warnings</span>
              </div>
            )}
            {levelCounts.info > 0 && (
              <div className="flex items-center gap-1 text-blue-600">
                <Info className="w-3 h-3" />
                <span>{levelCounts.info} info</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-neutral-600">
              <Filter className="w-3 h-3" />
              <span>
                Showing {filteredLogs.length} of {parsedLogs.length} lines
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Logs Content */}
      <div
        ref={logsContainerRef}
        className="flex-1 overflow-y-auto bg-neutral-950 font-mono text-xs"
        style={{ maxHeight: "600px" }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400 py-12">
            <XCircle className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">
              {searchTerm || filterLevel !== "all"
                ? "No logs match your filters"
                : "No logs available"}
            </p>
          </div>
        ) : (
          <div className="p-4">
            {filteredLogs.map((log) => (
              <LogLineComponent
                key={log.lineNumber}
                log={log}
                showTimestamps={showTimestamps}
                highlightErrors={highlightErrors}
                searchTerm={searchTerm}
              />
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="bg-neutral-50 border-t border-neutral-200 px-4 py-2 text-xs text-neutral-600">
        <div className="flex items-center justify-between">
          <span>
            {filteredLogs.length} lines{" "}
            {searchTerm && `matching "${searchTerm}"`}
          </span>
          <span className="font-mono">
            {namespace}/{podName}
          </span>
        </div>
      </div>
    </div>
  );
}

// Log Line Component
function LogLineComponent({
  log,
  showTimestamps,
  highlightErrors,
  searchTerm,
}: {
  log: LogLine;
  showTimestamps: boolean;
  highlightErrors: boolean;
  searchTerm: string;
}) {
  const levelColors = {
    error: "text-red-400 bg-red-950/30",
    warn: "text-amber-400 bg-amber-950/30",
    info: "text-blue-400 bg-blue-950/30",
    debug: "text-green-400 bg-green-950/30",
    unknown: "text-neutral-300",
  };

  const levelIcons = {
    error: <AlertCircle className="w-3 h-3" />,
    warn: <AlertTriangle className="w-3 h-3" />,
    info: <Info className="w-3 h-3" />,
    debug: <Info className="w-3 h-3" />,
    unknown: null,
  };

  const highlightText = (text: string) => {
    if (!searchTerm) return text;

    const regex = new RegExp(`(${searchTerm})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <span key={i} className="bg-yellow-400 text-neutral-900 px-1 rounded">
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  return (
    <div
      className={`flex items-start gap-3 py-1 px-2 rounded hover:bg-neutral-900/50 ${
        highlightErrors && log.level !== "unknown"
          ? levelColors[log.level]
          : "text-neutral-300"
      }`}
    >
      {/* Line Number */}
      <span className="text-neutral-600 select-none w-12 text-right flex-shrink-0">
        {log.lineNumber}
      </span>

      {/* Level Icon */}
      {highlightErrors && log.level !== "unknown" && (
        <span className="flex-shrink-0 mt-0.5">{levelIcons[log.level]}</span>
      )}

      {/* Timestamp */}
      {showTimestamps && log.timestamp && (
        <span className="text-neutral-500 flex-shrink-0">{log.timestamp}</span>
      )}

      {/* Content */}
      <span className="flex-1 break-words whitespace-pre-wrap">
        {highlightText(log.content)}
      </span>
    </div>
  );
}

// Parse individual log line
function parseLine(line: string, lineNumber: number): LogLine {
  // Detect timestamp (ISO 8601 or common formats)
  const timestampRegex =
    /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/;
  const timestampMatch = line.match(timestampRegex);
  const timestamp = timestampMatch ? timestampMatch[1] : undefined;

  // Remove timestamp from content
  const content = timestamp ? line.slice(timestamp.length).trim() : line;

  // Detect log level
  let level: LogLine["level"] = "unknown";
  const lowerContent = content.toLowerCase();

  if (
    lowerContent.includes("error") ||
    lowerContent.includes("exception") ||
    lowerContent.includes("fatal") ||
    lowerContent.includes("panic") ||
    lowerContent.includes("fail")
  ) {
    level = "error";
  } else if (
    lowerContent.includes("warn") ||
    lowerContent.includes("warning")
  ) {
    level = "warn";
  } else if (lowerContent.includes("info")) {
    level = "info";
  } else if (lowerContent.includes("debug") || lowerContent.includes("trace")) {
    level = "debug";
  }

  return {
    lineNumber,
    timestamp,
    level,
    content,
    rawLine: line,
  };
}
