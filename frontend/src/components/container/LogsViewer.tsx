"use client";

import { useState, useRef, useEffect } from "react";
import {
  Terminal,
  Copy,
  Download,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  X,
  ChevronDown,
} from "lucide-react";

interface LogsViewerProps {
  logs: string | string[];
  podName: string;
  namespace?: string;
  container?: string;
  containers?: string[];
  showTimestamps?: boolean;
  highlightErrors?: boolean;
  onRefresh?: () => void;
  onContainerChange?: (container: string) => void;
}

export function LogsViewer({
  logs,
  podName,
  namespace = "default",
  container,
  containers = [],
  showTimestamps = true,
  highlightErrors = true,
  onRefresh,
  onContainerChange,
}: LogsViewerProps) {
  const [selectedContainer, setSelectedContainer] = useState(
    container || containers[0] || "",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse logs to array
  const logLines = Array.isArray(logs)
    ? logs
    : typeof logs === "string"
      ? logs.split("\n")
      : [];

  // Filter logs
  const filteredLogs = logLines.filter((line) => {
    const matchesSearch = searchTerm
      ? line.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    const isError = isErrorLine(line);
    const matchesErrorFilter = showOnlyErrors ? isError : true;

    return matchesSearch && matchesErrorFilter;
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredLogs, autoScroll]);

  // Detect manual scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
      setAutoScroll(isAtBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCopy = () => {
    const text = filteredLogs.join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = logLines.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${podName}-${selectedContainer || "logs"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleContainerSelect = (cont: string) => {
    setSelectedContainer(cont);
    onContainerChange?.(cont);
  };

  const errorCount = logLines.filter(isErrorLine).length;
  const warningCount = logLines.filter(isWarningLine).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-neutral-700" />
            Logs: {podName}
          </h3>
          <p className="text-sm text-neutral-600">
            {namespace}
            {selectedContainer && ` • ${selectedContainer}`}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 border border-neutral-200 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
            <span className="text-neutral-700 font-medium">
              {filteredLogs.length} lines
            </span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
              <span className="text-red-700 font-medium">
                {errorCount} errors
              </span>
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-600" />
              <span className="text-amber-700 font-medium">
                {warningCount} warnings
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Container selector */}
        {containers.length > 1 && (
          <div className="relative">
            <select
              value={selectedContainer}
              onChange={(e) => handleContainerSelect(e.target.value)}
              className="appearance-none px-4 py-2 pr-10 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent hover:bg-neutral-50 transition-colors"
            >
              {containers.map((cont) => (
                <option key={cont} value={cont}>
                  {cont}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          </div>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-10 pr-10 py-2 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-100 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          )}
        </div>

        {/* Error filter */}
        {highlightErrors && (
          <button
            onClick={() => setShowOnlyErrors(!showOnlyErrors)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              showOnlyErrors
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            <Filter className="w-4 h-4" />
            Errors only
          </button>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition-all duration-200"
              title="Refresh logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition-all duration-200"
            title="Copy logs"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleDownload}
            className="p-2 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition-all duration-200"
            title="Download logs"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Container */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div
          ref={containerRef}
          className="overflow-y-auto scrollbar-thin"
          style={{ maxHeight: "600px" }}
        >
          <div className="p-4 font-mono text-xs space-y-0.5">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((line, index) => (
                <LogLine
                  key={index}
                  line={line}
                  index={index}
                  highlightErrors={highlightErrors}
                  searchTerm={searchTerm}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Terminal className="w-8 h-8 text-neutral-300 mb-3" />
                <p className="text-neutral-500 text-sm">
                  {logLines.length === 0
                    ? "No logs available"
                    : "No logs match your filters"}
                </p>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Auto-scroll indicator */}
        {!autoScroll && filteredLogs.length > 0 && (
          <button
            onClick={() => {
              setAutoScroll(true);
              logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className="absolute bottom-4 right-4 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2"
          >
            <RefreshCw className="w-3 h-3" />
            Scroll to bottom
          </button>
        )}
      </div>
    </div>
  );
}

// Individual log line component
function LogLine({
  line,
  index,
  highlightErrors,
  searchTerm,
}: {
  line: string;
  index: number;
  highlightErrors: boolean;
  searchTerm: string;
}) {
  const isError = isErrorLine(line);
  const isWarning = isWarningLine(line);

  // Highlight search term
  const highlightedText = searchTerm
    ? highlightSearchTerm(line, searchTerm)
    : line;

  return (
    <div
      className={`flex items-start gap-3 px-2 py-1 hover:bg-neutral-50 rounded group ${
        highlightErrors && isError
          ? "bg-red-50 border-l-2 border-red-600"
          : highlightErrors && isWarning
            ? "bg-amber-50 border-l-2 border-amber-600"
            : ""
      }`}
    >
      {/* Line number */}
      <span className="text-neutral-400 select-none w-10 text-right flex-shrink-0 text-xs">
        {index + 1}
      </span>

      {/* Icon */}
      {highlightErrors && (isError || isWarning) && (
        <div className="flex-shrink-0 mt-0.5">
          {isError ? (
            <AlertTriangle className="w-3 h-3 text-red-700" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-amber-700" />
          )}
        </div>
      )}

      {/* Log text */}
      <span
        className={`flex-1 ${
          isError
            ? "text-red-700"
            : isWarning
              ? "text-amber-700"
              : "text-neutral-700"
        }`}
        dangerouslySetInnerHTML={{ __html: highlightedText }}
      />
    </div>
  );
}

// Helper functions
function isErrorLine(line: string): boolean {
  const errorPatterns = [
    /error/i,
    /exception/i,
    /fail/i,
    /fatal/i,
    /panic/i,
    /\[ERR\]/i,
    /ERROR:/i,
  ];
  return errorPatterns.some((pattern) => pattern.test(line));
}

function isWarningLine(line: string): boolean {
  const warningPatterns = [/warn/i, /warning/i, /\[WARN\]/i, /WARN:/i];
  return warningPatterns.some((pattern) => pattern.test(line));
}

function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm) return text;

  const regex = new RegExp(`(${searchTerm})`, "gi");
  return text.replace(
    regex,
    '<mark class="bg-neutral-200 text-neutral-900 rounded px-0.5">$1</mark>',
  );
}
