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
  Lightbulb,
  Wrench,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface FixSuggestion {
  title: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  steps: string[];
  commands?: string[];
  documentation?: string;
}

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
  fixSuggestions?: FixSuggestion[];
  hasErrors?: boolean;
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
  fixSuggestions = [],
  hasErrors = false,
}: LogsViewerProps) {
  const [selectedContainer, setSelectedContainer] = useState(
    container || containers[0] || "",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showFixPanel, setShowFixPanel] = useState(fixSuggestions.length > 0);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(
    0,
  );
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

  // Show fix panel when suggestions are available
  useEffect(() => {
    if (fixSuggestions.length > 0) {
      setShowFixPanel(true);
    }
  }, [fixSuggestions]);

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

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
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

      {/* Fix Suggestions Banner */}
      {fixSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">
                AI-Powered Fix Suggestions Available
              </h4>
              <p className="text-xs text-blue-700">
                We detected {fixSuggestions.length} actionable suggestion
                {fixSuggestions.length > 1 ? "s" : ""} to resolve errors in your
                logs
              </p>
            </div>
            <button
              onClick={() => setShowFixPanel(!showFixPanel)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5" />
              {showFixPanel ? "Hide" : "Show"} Fixes
            </button>
          </div>
        </div>
      )}

      {/* Fix Suggestions Panel */}
      {showFixPanel && fixSuggestions.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <h4 className="font-semibold text-neutral-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-600" />
              Fix Suggestions
            </h4>
            <button
              onClick={() => setShowFixPanel(false)}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {fixSuggestions.map((suggestion, index) => (
              <FixSuggestionCard
                key={index}
                suggestion={suggestion}
                isExpanded={expandedSuggestion === index}
                onToggle={() =>
                  setExpandedSuggestion(
                    expandedSuggestion === index ? null : index,
                  )
                }
                onCopyCommand={handleCopyCommand}
              />
            ))}
          </div>
        </div>
      )}

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

// Fix Suggestion Card Component
function FixSuggestionCard({
  suggestion,
  isExpanded,
  onToggle,
  onCopyCommand,
}: {
  suggestion: FixSuggestion;
  isExpanded: boolean;
  onToggle: () => void;
  onCopyCommand: (command: string) => void;
}) {
  const severityConfig = {
    critical: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      badge: "bg-red-100 text-red-700",
      icon: "bg-red-100",
    },
    high: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      text: "text-orange-700",
      badge: "bg-orange-100 text-orange-700",
      icon: "bg-orange-100",
    },
    medium: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      badge: "bg-amber-100 text-amber-700",
      icon: "bg-amber-100",
    },
    low: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      badge: "bg-blue-100 text-blue-700",
      icon: "bg-blue-100",
    },
  };

  const config = severityConfig[suggestion.severity];

  return (
    <div
      className={`${config?.bg} ${config?.border} border rounded-lg overflow-hidden transition-all duration-200`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          <div className={`${config?.icon} p-2 rounded-lg`}>
            <Wrench className={`w-4 h-4 ${config?.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className={`text-sm font-semibold ${config?.text} truncate`}>
              {suggestion?.title}
            </h5>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`${config?.badge} text-xs px-2 py-0.5 rounded-full font-medium`}
              >
                {suggestion?.severity?.toUpperCase()}
              </span>
              <span className="text-xs text-neutral-500">
                {suggestion?.category?.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-neutral-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-neutral-200 bg-white">
          {/* Description */}
          <div className="pt-4">
            <p className="text-sm text-neutral-700">
              {suggestion?.description}
            </p>
          </div>

          {/* Steps */}
          {suggestion?.steps?.length > 0 && (
            <div>
              <h6 className="text-xs font-semibold text-neutral-900 mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Steps to Fix
              </h6>
              <ol className="space-y-2">
                {suggestion?.steps?.map((step, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-xs text-neutral-600"
                  >
                    <span className="flex-shrink-0 w-5 h-5 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-700 font-medium text-xs">
                      {index + 1}
                    </span>
                    <span className="flex-1 pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Commands */}
          {suggestion?.commands && suggestion?.commands.length > 0 && (
            <div>
              <h6 className="text-xs font-semibold text-neutral-900 mb-2 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Commands
              </h6>
              <div className="space-y-2">
                {suggestion?.commands?.map((command, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-neutral-900 text-green-400 px-3 py-2 rounded-lg font-mono text-xs group"
                  >
                    <code className="flex-1">{command}</code>
                    <button
                      onClick={() => onCopyCommand(command)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-neutral-800 rounded"
                      title="Copy command"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documentation */}
          {suggestion?.documentation && (
            <a
              href={suggestion?.documentation}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              View Documentation
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// Individual log line component
function LogLine({
  line = "",
  index = 0,
  highlightErrors = true,
  searchTerm = "",
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
  return errorPatterns?.some((pattern) => pattern?.test(line));
}

function isWarningLine(line: string): boolean {
  const warningPatterns = [/warn/i, /warning/i, /\[WARN\]/i, /WARN:/i];
  return warningPatterns?.some((pattern) => pattern?.test(line));
}

function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm) return text;

  const regex = new RegExp(`(${searchTerm})`, "gi");
  return text?.replace(
    regex,
    '<mark class="bg-neutral-200 text-neutral-900 rounded px-0.5">$1</mark>',
  );
}
