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
  Sparkles,
  Loader2,
  Lightbulb,
  ExternalLink,
  Code,
  AlertCircle,
  CheckCircle2,
  XCircle,
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

interface FixSuggestion {
  title: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  steps: string[];
  commands?: string[];
  documentation?: string;
}

interface LogAnalysisResult {
  hasErrors: boolean;
  errorCount: number;
  warningCount: number;
  suggestions: FixSuggestion[];
  summary: string;
  criticalIssues: string[];
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [copied, setCopied] = useState(false);
  const [showFixSuggestions, setShowFixSuggestions] = useState(false);
  const [loadingFixes, setLoadingFixes] = useState(false);
  const [fixAnalysis, setFixAnalysis] = useState<LogAnalysisResult | null>(
    null,
  );
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const logLines = Array.isArray(logs)
    ? logs
    : typeof logs === "string"
      ? logs.split("\n")
      : [];

  const getLogLevel = (line: string): string => {
    const upperLine = line.toUpperCase();
    if (upperLine.includes("ERROR") || upperLine.includes("FATAL"))
      return "error";
    if (upperLine.includes("WARN")) return "warn";
    if (upperLine.includes("INFO")) return "info";
    if (upperLine.includes("DEBUG")) return "debug";
    return "default";
  };

  const getLogLevelColor = (level: string): string => {
    switch (level) {
      case "error":
        return "text-red-400";
      case "warn":
        return "text-amber-400";
      case "info":
        return "text-blue-400";
      case "debug":
        return "text-zinc-500";
      default:
        return "text-zinc-300";
    }
  };

  const filteredLogs = logLines.filter((line) => {
    const matchesSearch = searchTerm
      ? line.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    const matchesLevel =
      filterLevel === "all" ? true : getLogLevel(line) === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logLines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const blob = new Blob([logLines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${podName}-${container || "logs"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateFixSuggestions = async () => {
    setLoadingFixes(true);
    setShowFixSuggestions(true);

    try {
      const response = await fetch("http://localhost:8000/api/ai/log-fixes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          logs: logLines.join("\n"),
          podName,
          namespace,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate fix suggestions");
      }

      const data = await response.json();
      setFixAnalysis(data);
    } catch (error) {
      console.error("Failed to generate fix suggestions:", error);
      setFixAnalysis({
        hasErrors: false,
        errorCount: 0,
        warningCount: 0,
        suggestions: [],
        summary: "Failed to generate fix suggestions. Please try again.",
        criticalIssues: [],
      });
    } finally {
      setLoadingFixes(false);
    }
  };

  const errorCount = logLines.filter(
    (line) => getLogLevel(line) === "error",
  ).length;
  const warnCount = logLines.filter(
    (line) => getLogLevel(line) === "warn",
  ).length;

  const hasErrors = errorCount > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 bg-zinc-900/30">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-zinc-400" strokeWidth={2} />
          <div>
            <h3 className="text-sm font-medium text-white">{podName}</h3>
            <p className="text-xs text-zinc-500 font-light">{namespace}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Fix Button */}
          {hasErrors && (
            <button
              onClick={handleGenerateFixSuggestions}
              disabled={loadingFixes}
              className="group relative px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg transition-all duration-200 flex items-center gap-2 font-medium text-sm shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg blur opacity-30 group-hover:opacity-50 transition-opacity duration-200" />

              <div className="relative flex items-center gap-2">
                {loadingFixes ? (
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                ) : (
                  <Sparkles className="w-4 h-4" strokeWidth={2} />
                )}
                <span>AI Fix</span>
              </div>
            </button>
          )}

          {/* Container Selector */}
          {containers.length > 0 && (
            <select
              value={container || containers[0]}
              onChange={(e) => onContainerChange?.(e.target.value)}
              className="px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-600"
            >
              {containers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Action Buttons */}
          <button
            onClick={handleCopyLogs}
            className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 transition-all text-zinc-300"
            title="Copy logs"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-green-400" strokeWidth={2} />
            ) : (
              <Copy className="w-4 h-4" strokeWidth={2} />
            )}
          </button>

          <button
            onClick={handleDownloadLogs}
            className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 transition-all text-zinc-300"
            title="Download logs"
          >
            <Download className="w-4 h-4" strokeWidth={2} />
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 transition-all text-zinc-300"
              title="Refresh logs"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Fix Suggestions Panel */}
      {showFixSuggestions && (
        <div className="border-b border-zinc-800/50 bg-gradient-to-br from-zinc-900/80 to-zinc-800/60">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Lightbulb
                    className="w-5 h-5 text-purple-400"
                    strokeWidth={2}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    AI Fix Suggestions
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {loadingFixes
                      ? "Analyzing error patterns..."
                      : fixAnalysis?.summary}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFixSuggestions(false)}
                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" strokeWidth={2} />
              </button>
            </div>

            {loadingFixes ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader2
                    className="w-8 h-8 text-purple-400 animate-spin"
                    strokeWidth={2}
                  />
                  <p className="text-sm text-zinc-400">
                    Analyzing logs with AI...
                  </p>
                </div>
              </div>
            ) : fixAnalysis && fixAnalysis.suggestions.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {fixAnalysis.suggestions.map((suggestion, index) => (
                  <FixSuggestionCard
                    key={index}
                    suggestion={suggestion}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                <CheckCircle2 className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">
                  {fixAnalysis?.hasErrors
                    ? "No specific fix suggestions available"
                    : "No errors detected in logs"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800/50 bg-zinc-900/20">
        {/* Search */}
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
            strokeWidth={2}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-zinc-300 placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X
                className="w-4 h-4 text-zinc-500 hover:text-zinc-300"
                strokeWidth={2}
              />
            </button>
          )}
        </div>

        {/* Level Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" strokeWidth={2} />
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-600"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        {/* Stats */}
        {highlightErrors && (errorCount > 0 || warnCount > 0) && (
          <div className="flex items-center gap-3 text-xs">
            {errorCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertTriangle
                  className="w-3 h-3 text-red-400"
                  strokeWidth={2}
                />
                <span className="text-red-400 font-medium">
                  {errorCount} errors
                </span>
              </div>
            )}
            {warnCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle
                  className="w-3 h-3 text-amber-400"
                  strokeWidth={2}
                />
                <span className="text-amber-400 font-medium">
                  {warnCount} warnings
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logs Content */}
      <div
        ref={logsContainerRef}
        className="flex-1 overflow-y-auto font-mono text-xs p-4 bg-black"
      >
        {filteredLogs.length > 0 ? (
          filteredLogs.map((line, index) => {
            const level = getLogLevel(line);
            const color = getLogLevelColor(level);

            return (
              <div
                key={index}
                className={`py-0.5 hover:bg-zinc-900/30 ${
                  level === "error" ? "bg-red-500/5" : ""
                } ${level === "warn" ? "bg-amber-500/5" : ""}`}
              >
                <span className="text-zinc-600 select-none mr-3">
                  {String(index + 1).padStart(4, " ")}
                </span>
                <span className={`${color} font-light`}>{line}</span>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <Terminal className="w-12 h-12 mb-3 opacity-50" strokeWidth={1.5} />
            <p className="font-light">
              {searchTerm || filterLevel !== "all"
                ? "No logs match your filters"
                : "No logs available"}
            </p>
          </div>
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-zinc-800/50 bg-zinc-900/20 text-xs text-zinc-500 font-light">
        Showing {filteredLogs.length} of {logLines.length} lines
      </div>
    </div>
  );
}

function FixSuggestionCard({
  suggestion,
  index,
}: {
  suggestion: FixSuggestion;
  index: number;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const [copiedCommand, setCopiedCommand] = useState<number | null>(null);

  const severityConfig = {
    critical: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      text: "text-red-400",
      icon: <XCircle className="w-4 h-4" strokeWidth={2} />,
    },
    high: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      text: "text-orange-400",
      icon: <AlertCircle className="w-4 h-4" strokeWidth={2} />,
    },
    medium: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
      icon: <AlertTriangle className="w-4 h-4" strokeWidth={2} />,
    },
    low: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-400",
      icon: <AlertCircle className="w-4 h-4" strokeWidth={2} />,
    },
  };

  const config = severityConfig[suggestion.severity];

  const handleCopyCommand = (command: string, cmdIndex: number) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(cmdIndex);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  return (
    <div
      className={`border ${config.border} ${config.bg} rounded-xl overflow-hidden transition-all duration-200`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={config.text}>{config.icon}</div>
          <div className="text-left">
            <h4 className="text-sm font-semibold text-white">
              {suggestion.title}
            </h4>
            <p className="text-xs text-zinc-500 capitalize">
              {suggestion.category.replace(/_/g, " ")} •{" "}
              {suggestion.severity.toUpperCase()}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Description */}
          <p className="text-sm text-zinc-300 leading-relaxed">
            {suggestion.description}
          </p>

          {/* Steps */}
          {suggestion.steps.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                <Lightbulb className="w-3 h-3" strokeWidth={2} />
                RESOLUTION STEPS
              </h5>
              <ol className="space-y-2">
                {suggestion.steps.map((step, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 text-xs flex items-center justify-center font-medium">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-zinc-300 leading-relaxed">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Commands */}
          {suggestion.commands && suggestion.commands.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                <Code className="w-3 h-3" strokeWidth={2} />
                COMMANDS
              </h5>
              <div className="space-y-2">
                {suggestion.commands.map((command, idx) => (
                  <div
                    key={idx}
                    className="relative group bg-black border border-zinc-800 rounded-lg p-3"
                  >
                    <code className="text-xs text-green-400 font-mono break-all">
                      {command}
                    </code>
                    <button
                      onClick={() => handleCopyCommand(command, idx)}
                      className="absolute top-2 right-2 p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy command"
                    >
                      {copiedCommand === idx ? (
                        <CheckCircle
                          className="w-3 h-3 text-green-400"
                          strokeWidth={2}
                        />
                      ) : (
                        <Copy
                          className="w-3 h-3 text-zinc-400"
                          strokeWidth={2}
                        />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documentation Link */}
          {suggestion.documentation && (
            <a
              href={suggestion.documentation}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" strokeWidth={2} />
              <span>View documentation</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
