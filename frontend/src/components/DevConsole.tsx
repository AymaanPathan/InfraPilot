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

    // Intercept console methods
    // this.interceptConsole();
  }

  static getInstance(): LogStore {
    if (!LogStore.instance) {
      LogStore.instance = new LogStore();
    }
    return LogStore.instance;
  }

  private interceptConsole() {
    if (typeof window === "undefined") return;

    const originalConsole = { ...console };

    console.log = (...args) => {
      // Defer the log addition to avoid setState during render
      queueMicrotask(() => {
        this.addLog("info", "console", this.formatArgs(args));
      });
      originalConsole.log(...args);
    };

    console.error = (...args) => {
      queueMicrotask(() => {
        this.addLog("error", "console", this.formatArgs(args));
      });
      originalConsole?.error(...args);
    };

    console.warn = (...args) => {
      queueMicrotask(() => {
        this.addLog("warn", "console", this.formatArgs(args));
      });
      originalConsole?.warn(...args);
    };

    console.info = (...args) => {
      queueMicrotask(() => {
        this.addLog("info", "console", this.formatArgs(args));
      });
      originalConsole?.info(...args);
    };

    console.debug = (...args) => {
      queueMicrotask(() => {
        this.addLog("debug", "console", this.formatArgs(args));
      });
      originalConsole?.debug(...args);
    };
  }

  private formatArgs(args: any[]): string {
    return args
      .map((arg) => {
        if (typeof arg === "object") {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(" ");
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
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchTerm ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.category.toLowerCase().includes(searchTerm.toLowerCase());

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
        className="fixed bottom-4 right-4 bg-neutral-900 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-neutral-800 flex items-center gap-2 z-50"
      >
        <Terminal className="w-4 h-4 text-white" />
        <span className="text-sm font-medium text-white">Dev Console</span>
      </button>
    );
  }

  const positionClasses = {
    bottom: "bottom-0 left-0 right-0",
    right: "right-0 top-0 bottom-0 w-96",
    floating: "bottom-4 right-4 w-[600px] rounded-lg shadow-2xl",
  };

  const heightClass = isMaximized
    ? "h-screen"
    : position === "bottom"
      ? "h-96"
      : position === "floating"
        ? "h-[600px]"
        : "h-full";

  return (
    <div
      ref={containerRef}
      className={`fixed ${positionClasses[position]} ${heightClass} bg-neutral-950 border-t border-neutral-800 flex flex-col z-50 font-mono text-xs`}
    >
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-white" />
          <span className="text-white font-semibold">Dev Console</span>
          <span className="text-white">
            {filteredLogs.length} / {logs.length} logs
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1 rounded ${autoScroll ? "bg-neutral-700 text-white" : "text-neutral-500 hover:bg-neutral-800"}`}
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
            className="p-1 text-neutral-500 hover:bg-neutral-800 rounded"
            title={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleDownload}
            className="p-1 text-neutral-500 hover:bg-neutral-800 rounded"
            title="Download logs"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleClear}
            className="p-1 text-neutral-500 hover:bg-neutral-800 rounded"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 text-neutral-500 hover:bg-neutral-800 rounded"
            title="Close"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-2 flex items-center gap-2">
        <Search className="w-4 h-4 text-neutral-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search logs..."
          className="flex-1 bg-neutral-800 text-neutral-200 px-2 py-1 rounded border border-neutral-700 focus:outline-none focus:border-neutral-600"
        />

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as LogLevel | "all")}
          className="bg-neutral-800 text-neutral-200 px-2 py-1 rounded border border-neutral-700 focus:outline-none focus:border-neutral-600"
        >
          <option value="all">All Levels</option>
          <option value="debug">
            Debug {levelCounts.debug ? `(${levelCounts.debug})` : ""}
          </option>
          <option value="info">
            Info {levelCounts.info ? `(${levelCounts.info})` : ""}
          </option>
          <option value="success">
            Success {levelCounts.success ? `(${levelCounts.success})` : ""}
          </option>
          <option value="warn">
            Warn {levelCounts.warn ? `(${levelCounts.warn})` : ""}
          </option>
          <option value="error">
            Error {levelCounts.error ? `(${levelCounts.error})` : ""}
          </option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-neutral-800 text-neutral-200 px-2 py-1 rounded border border-neutral-700 focus:outline-none focus:border-neutral-600"
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
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-600">
            <Info className="w-8 h-8 mb-2 opacity-50" />
            <p>No logs to display</p>
          </div>
        ) : (
          filteredLogs.map((log) => <LogLine key={log.id} log={log} />)
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

function LogLine({ log }: { log: LogEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const levelColors = {
    debug: "text-blue-400",
    info: "text-neutral-400",
    warn: "text-amber-400",
    error: "text-red-400",
    success: "text-green-400",
  };

  const levelBg = {
    debug: "bg-blue-950/30",
    info: "bg-neutral-900/30",
    warn: "bg-amber-950/30",
    error: "bg-red-950/30",
    success: "bg-green-950/30",
  };

  const levelIcons = {
    debug: <Info className="w-3 h-3" />,
    info: <Info className="w-3 h-3" />,
    warn: <AlertCircle className="w-3 h-3" />,
    error: <XCircle className="w-3 h-3" />,
    success: <Check className="w-3 h-3" />,
  };

  return (
    <div
      className={`rounded px-2 py-1 hover:bg-neutral-900 ${levelBg[log.level]}`}
    >
      <div
        className="flex items-start gap-2 cursor-pointer"
        onClick={() => log.data && setIsExpanded(!isExpanded)}
      >
        <span className="text-neutral-600 text-[10px] mt-0.5">
          {log.timestamp.toLocaleTimeString()}
        </span>

        <span className={`${levelColors[log.level]} mt-0.5`}>
          {levelIcons[log.level]}
        </span>

        {log.emoji && <span className="text-xs">{log.emoji}</span>}

        <span className="text-neutral-500 text-[10px] px-1.5 py-0.5 bg-neutral-800 rounded">
          {log.category}
        </span>

        <span className={`flex-1 ${levelColors[log.level]}`}>
          {log.message}
        </span>
      </div>

      {log.data && isExpanded && (
        <pre className="mt-1 ml-6 text-neutral-500 text-[10px] bg-neutral-900 p-2 rounded overflow-x-auto">
          {JSON.stringify(log.data, null, 2)}
        </pre>
      )}
    </div>
  );
}
