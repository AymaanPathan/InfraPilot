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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [copied, setCopied] = useState(false);
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

  const errorCount = logLines.filter(
    (line) => getLogLevel(line) === "error",
  ).length;
  const warnCount = logLines.filter(
    (line) => getLogLevel(line) === "warn",
  ).length;

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
