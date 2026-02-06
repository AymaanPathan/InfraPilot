"use client";

import { useState, useEffect, useRef } from "react";
import {
  Terminal,
  XCircle,
  AlertCircle,
  Info,
  Check,
  Loader2,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export type LogLevel = "debug" | "info" | "warn" | "error" | "success";

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  emoji?: string;
}

interface DevConsoleProps {
  maxLogs?: number;
  defaultExpanded?: boolean;
  position?: "bottom" | "right" | "floating";
  persistLogs?: boolean;
}

// Global log store (singleton)
class LogStore {
  private static instance: LogStore;
  private logs: LogEntry[] = [];
  private listeners: Set<(logs: LogEntry[]) => void> = new Set();
  private maxLogs: number = 1000;

  private constructor() {
    // Restore logs from localStorage if available
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("devConsole_logs");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          this.logs = parsed.map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp),
          }));
        } catch (e) {
          console.error("Failed to restore logs:", e);
        }
      }
    }
  }

  static getInstance(): LogStore {
    if (!LogStore.instance) {
      LogStore.instance = new LogStore();
    }
    return LogStore.instance;
  }

  addLog(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    emoji?: string,
  ) {
    const log: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      emoji,
    };

    this?.logs?.push(log);

    // Keep only max logs
    if (this?.logs?.length > this?.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Persist to localStorage
    this.persistLogs();

    // Notify listeners
    this.notifyListeners();
  }

  private persistLogs() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("devConsole_logs", JSON.stringify(this.logs));
      } catch (e) {
        // Storage full, clear old logs
        this.logs = this.logs.slice(-500);
        try {
          localStorage.setItem("devConsole_logs", JSON.stringify(this.logs));
        } catch {
          // Still failing, give up
        }
      }
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.persistLogs();
    this.notifyListeners();
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.getLogs()));
  }
}

// Singleton logger instance
export const logger = {
  debug: (category: string, message: string, data?: any) =>
    LogStore.getInstance().addLog("debug", category, message, data, "🔵"),
  info: (category: string, message: string, data?: any) =>
    LogStore.getInstance().addLog("info", category, message, data, "ℹ️"),
  warn: (category: string, message: string, data?: any) =>
    LogStore.getInstance().addLog("warn", category, message, data, "⚠️"),
  error: (category: string, message: string, data?: any) =>
    LogStore.getInstance().addLog("error", category, message, data, "❌"),
  success: (category: string, message: string, data?: any) =>
    LogStore.getInstance().addLog("success", category, message, data, "✅"),

  // Special formatted logs
  group: (title: string) =>
    LogStore.getInstance().addLog(
      "info",
      "group",
      `━━━ ${title} ━━━`,
      null,
      "📋",
    ),
  api: (method: string, url: string, status?: number) =>
    LogStore.getInstance().addLog(
      status && status >= 400 ? "error" : "info",
      "api",
      `${method} ${url} ${status ? `→ ${status}` : ""}`,
      null,
      "📡",
    ),
  tool: (tool: string, action: string, data?: any) =>
    LogStore.getInstance().addLog(
      "info",
      "tool",
      `${tool}: ${action}`,
      data,
      "🔧",
    ),
  planner: (message: string, data?: any) =>
    LogStore.getInstance().addLog("info", "planner", message, data, "🧠"),
  executor: (message: string, data?: any) =>
    LogStore.getInstance().addLog("info", "executor", message, data, "⚙️"),
};

export function DevConsole({
  maxLogs = 1000,
  defaultExpanded = false,
  position = "bottom",
  persistLogs = true,
}: DevConsoleProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isMaximized, setIsMaximized] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [height, setHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);

  // Subscribe to log store
  useEffect(() => {
    const store = LogStore.getInstance();
    setLogs(store.getLogs());

    const unsubscribe = store.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    return unsubscribe;
  }, []);

  // Auto scroll
  useEffect(() => {
    if (autoScroll && logsEndRef.current && isExpanded) {
      requestAnimationFrame(() => {
        logsEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      });
    }
  }, [logs, autoScroll, isExpanded]);

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = height;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = resizeStartY.current - e.clientY;
      const newHeight = Math.max(
        200,
        Math.min(window.innerHeight - 100, resizeStartHeight.current + delta),
      );
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchTerm ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.data &&
        JSON.stringify(log.data)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    const matchesLevel = levelFilter === "all" || log.level === levelFilter;

    const matchesCategory =
      categoryFilter === "all" || log.category === categoryFilter;

    return matchesSearch && matchesLevel && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(new Set(logs.map((log) => log.category)));

  // Level counts
  const levelCounts = logs.reduce(
    (acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    },
    {} as Record<LogLevel, number>,
  );

  const handleClear = () => {
    LogStore.getInstance().clearLogs();
  };

  const handleDownload = () => {
    const logText = filteredLogs
      .map(
        (log) =>
          `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${
            log.data ? `\n${JSON.stringify(log.data, null, 2)}` : ""
          }`,
      )
      .join("\n\n");

    const blob = new Blob([logText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dev-console-${Date.now()}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 bg-black text-white px-5 py-3 rounded-xl shadow-2xl hover:bg-zinc-900 flex items-center gap-3 z-50 border border-zinc-800 transition-all duration-300 hover:scale-105"
      >
        <Terminal className="w-5 h-5" />
        <span className="text-sm font-medium">Dev Console</span>
      </button>
    );
  }

  const containerHeight = isMaximized ? "100vh" : `${height}px`;

  return (
    <div
      ref={containerRef}
      className={`fixed bottom-0 left-0 right-0 bg-black border-t-2 border-white flex flex-col z-50 font-mono text-sm shadow-2xl ${isResizing ? "select-none" : ""}`}
      style={{ height: containerHeight }}
    >
      {/* Resize Handle */}
      {!isMaximized && (
        <div
          onMouseDown={handleResizeStart}
          className={`absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/10 transition-colors group ${isResizing ? "bg-white/20" : ""}`}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1">
            <div
              className={`w-8 h-0.5 bg-zinc-700 group-hover:bg-white transition-colors ${isResizing ? "bg-white" : ""}`}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-black border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0 mt-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-white" />
            <span className="text-white font-bold text-base">Dev Console</span>
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          <span className="text-zinc-400 text-sm">
            {filteredLogs.length} {filteredLogs.length === 1 ? "log" : "logs"}
            {filteredLogs.length !== logs.length && ` of ${logs.length}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              autoScroll
                ? "bg-white text-black"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
            title={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
          >
            {autoScroll ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-2 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-all duration-200"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleDownload}
            className="p-2 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-all duration-200"
            title="Download logs"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleClear}
            className="p-2 bg-zinc-900 text-zinc-400 hover:bg-red-900 hover:text-red-400 rounded-lg transition-all duration-200"
            title="Clear all logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-lg transition-all duration-200"
            title="Close console"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-black border-b border-zinc-800 px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs, categories, or data..."
            className="w-full bg-zinc-900 text-white pl-10 pr-4 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all duration-200"
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as LogLevel | "all")}
          className="bg-zinc-900 text-white px-4 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all duration-200 min-w-[140px]"
        >
          <option value="all">All Levels ({logs.length})</option>
          <option value="debug">
            🔵 Debug {levelCounts.debug ? `(${levelCounts.debug})` : ""}
          </option>
          <option value="info">
            ℹ️ Info {levelCounts.info ? `(${levelCounts.info})` : ""}
          </option>
          <option value="success">
            ✅ Success {levelCounts.success ? `(${levelCounts.success})` : ""}
          </option>
          <option value="warn">
            ⚠️ Warn {levelCounts.warn ? `(${levelCounts.warn})` : ""}
          </option>
          <option value="error">
            ❌ Error {levelCounts.error ? `(${levelCounts.error})` : ""}
          </option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-zinc-900 text-white px-4 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all duration-200 min-w-[160px]"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Logs */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-black"
        style={{ scrollbarGutter: "stable" }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <Info className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-base font-medium">No logs to display</p>
            <p className="text-sm text-zinc-700 mt-1">
              {searchTerm || levelFilter !== "all" || categoryFilter !== "all"
                ? "Try adjusting your filters"
                : "Logs will appear here as they're generated"}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => <LogLine key={log.id} log={log} />)
        )}
        <div ref={logsEndRef} className="h-2" />
      </div>

      <style jsx global>{`
        /* Custom scrollbar for dev console */
        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: black;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 4px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}

function LogLine({ log }: { log: LogEntry }) {
  const levelColors = {
    debug: "text-blue-400",
    info: "text-zinc-300",
    warn: "text-amber-400",
    error: "text-red-400",
    success: "text-green-400",
  };

  const levelBg = {
    debug: "bg-blue-950/20 border-blue-900/30",
    info: "bg-zinc-900/50 border-zinc-800",
    warn: "bg-amber-950/20 border-amber-900/30",
    error: "bg-red-950/20 border-red-900/30",
    success: "bg-green-950/20 border-green-900/30",
  };

  const levelIcons = {
    debug: <Info className="w-4 h-4" />,
    info: <Info className="w-4 h-4" />,
    warn: <AlertCircle className="w-4 h-4" />,
    error: <XCircle className="w-4 h-4" />,
    success: <Check className="w-4 h-4" />,
  };

  const hasData = log.data !== undefined && log.data !== null;

  return (
    <div
      className={`rounded-lg border ${levelBg[log.level]} overflow-hidden transition-all duration-200 hover:border-zinc-700`}
    >
      {/* Main log line */}
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="text-zinc-600 text-xs font-mono mt-0.5 shrink-0 min-w-[80px]">
          {log.timestamp.toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
          })}
        </span>

        <span className={`${levelColors[log.level]} mt-0.5 shrink-0`}>
          {levelIcons[log.level]}
        </span>

        {log.emoji && <span className="text-base shrink-0">{log.emoji}</span>}

        <span className="text-xs px-2.5 py-1 bg-black border border-zinc-800 rounded-md text-zinc-400 font-medium shrink-0">
          {log.category}
        </span>

        <span
          className={`flex-1 ${levelColors[log.level]} font-medium leading-relaxed`}
        >
          {log.message}
        </span>
      </div>

      {/* Data section - always expanded */}
      {hasData && (
        <div className="px-4 pb-3">
          <div className="ml-[100px] pl-4 border-l-2 border-zinc-800">
            <div className="bg-black rounded-lg border border-zinc-800 overflow-hidden">
              <div className="px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
                <span className="text-xs text-zinc-500 font-medium">Data</span>
              </div>
              <pre className="text-xs text-zinc-400 p-3 overflow-x-auto leading-relaxed">
                {typeof log.data === "string"
                  ? log.data
                  : JSON.stringify(log.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
