"use client";

import {
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  Lightbulb,
  Zap,
  TrendingUp,
  Clock,
  Brain,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ExplanationDisplayProps {
  explanation: string;
  type?: "info" | "warning" | "error" | "success";
  title?: string;
  showIcon?: boolean;
  className?: string;
}

export function ExplanationDisplay({
  explanation,
  type = "info",
  title,
  showIcon = true,
  className = "",
}: ExplanationDisplayProps) {
  const config = {
    info: {
      icon: <Info className="w-5 h-5" strokeWidth={2} />,
      bgColor: "bg-zinc-900/50",
      borderColor: "border-zinc-800/50",
      iconColor: "text-zinc-400",
      titleColor: "text-white",
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" strokeWidth={2} />,
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      iconColor: "text-amber-400",
      titleColor: "text-amber-300",
    },
    error: {
      icon: <XCircle className="w-5 h-5" strokeWidth={2} />,
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      iconColor: "text-red-400",
      titleColor: "text-red-300",
    },
    success: {
      icon: <CheckCircle className="w-5 h-5" strokeWidth={2} />,
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      iconColor: "text-green-400",
      titleColor: "text-green-300",
    },
  };

  const {
    icon = null,
    bgColor = "bg-zinc-900/50",
    borderColor = "border-zinc-800/50",
    iconColor = "text-zinc-400",
    titleColor = "text-white",
  } = config[type] || {};

  return (
    <div
      className={`rounded-xl border backdrop-blur-sm ${borderColor} ${bgColor} p-6 ${className} animate-slideUp`}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {showIcon && (
          <div className={`${iconColor} flex-shrink-0 mt-1`}>{icon}</div>
        )}
        <div className="flex-1">
          {title && (
            <h3 className={`text-lg font-medium ${titleColor} mb-3`}>
              {title}
            </h3>
          )}

          {/* Markdown Content */}
          <div className="prose prose-sm max-w-none prose-invert">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-medium text-white mb-4 mt-6 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-medium text-zinc-200 mb-3 mt-5 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-medium text-zinc-300 mb-2 mt-4 first:mt-0">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-zinc-300 leading-relaxed mb-3 font-light">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 mb-3 text-zinc-300">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 mb-3 text-zinc-300">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="ml-4 font-light">{children}</li>
                ),
                code: ({ inline, children }: any) =>
                  inline ? (
                    <code className="bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded text-sm font-mono border border-zinc-700">
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-zinc-800 text-zinc-200 p-3 rounded-lg text-sm font-mono overflow-x-auto mb-3 border border-zinc-700">
                      {children}
                    </code>
                  ),
                strong: ({ children }) => (
                  <strong className="font-medium text-white">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-zinc-400">{children}</em>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-zinc-700 pl-4 italic text-zinc-400 my-3">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {explanation}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TriageReportProps {
  report: string;
  issues: Array<{
    type: string;
    severity: "critical" | "warning" | "info";
    podName: string;
    namespace: string;
    description: string;
    metrics?: {
      restarts: number;
      age?: string;
      status?: string;
    };
  }>;
  summary?: {
    total: number;
    issuesFound: number;
    critical: number;
    warnings: number;
  };
}

export function TriageReport({ report, issues, summary }: TriageReportProps) {
  const criticalIssues = issues.filter((i) => i.severity === "critical");
  const warningIssues = issues.filter((i) => i.severity === "warning");

  return (
    <div className="space-y-6 animate-slideUp">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total Pods"
            value={summary.total}
            icon={<TrendingUp className="w-4 h-4" strokeWidth={2} />}
            color="neutral"
          />
          <MetricCard
            label="Issues Found"
            value={summary.issuesFound}
            icon={<AlertTriangle className="w-4 h-4" strokeWidth={2} />}
            color="amber"
          />
          <MetricCard
            label="Critical"
            value={summary.critical}
            icon={<XCircle className="w-4 h-4" strokeWidth={2} />}
            color="red"
          />
          <MetricCard
            label="Warnings"
            value={summary.warnings}
            icon={<Info className="w-4 h-4" strokeWidth={2} />}
            color="orange"
          />
        </div>
      )}

      {/* AI Report */}
      <ExplanationDisplay
        explanation={report}
        type={
          criticalIssues.length > 0
            ? "error"
            : warningIssues.length > 0
              ? "warning"
              : "success"
        }
        title="🧠 AI Health Analysis"
        showIcon={false}
      />

      {/* Issue Details */}
      {criticalIssues.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" strokeWidth={2} />
            Critical Issues Requiring Immediate Attention
          </h3>
          {criticalIssues.map((issue, idx) => (
            <IssueCard key={idx} issue={issue} />
          ))}
        </div>
      )}

      {warningIssues.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-amber-300 flex items-center gap-2">
            <Info className="w-5 h-5" strokeWidth={2} />
            Warnings to Investigate
          </h3>
          {warningIssues.slice(0, 5).map((issue, idx) => (
            <IssueCard key={idx} issue={issue} />
          ))}
          {warningIssues.length > 5 && (
            <p className="text-sm text-zinc-500 ml-7 font-light">
              ... and {warningIssues.length - 5} more warnings
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "neutral" | "amber" | "red" | "orange" | "green";
}) {
  const colors = {
    neutral: "bg-zinc-800/50 border-zinc-700/50 text-zinc-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
  };

  return (
    <div
      className={`rounded-xl border backdrop-blur-sm ${colors[color]} p-4 hover:scale-105 transition-all duration-300`}
    >
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <div className="text-2xl font-medium text-white">{value}</div>
      <div className="text-xs text-zinc-400 font-light">{label}</div>
    </div>
  );
}

function IssueCard({ issue }: { issue: TriageReportProps["issues"][0] }) {
  const severityConfig = {
    critical: {
      icon: <XCircle className="w-4 h-4" strokeWidth={2} />,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4" strokeWidth={2} />,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
    info: {
      icon: <Info className="w-4 h-4" strokeWidth={2} />,
      color: "text-zinc-400",
      bgColor: "bg-zinc-800/50",
      borderColor: "border-zinc-700/50",
    },
  };

  const config = severityConfig[issue.severity];

  return (
    <div
      className={`rounded-xl border backdrop-blur-sm ${config.borderColor} ${config.bgColor} p-4 hover:border-opacity-50 transition-all duration-300`}
    >
      <div className="flex items-start gap-3">
        <div className={`${config.color} flex-shrink-0 mt-0.5`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-white truncate">{issue.podName}</h4>
            <span className="text-xs text-zinc-500">({issue.namespace})</span>
          </div>
          <p className="text-sm text-zinc-300 mb-2 font-light">
            {issue.description}
          </p>
          {issue.metrics && (
            <div className="flex items-center gap-4 text-xs text-zinc-400">
              {issue.metrics.status && (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {issue.metrics.status}
                </span>
              )}
              {issue.metrics.restarts !== undefined && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {issue.metrics.restarts} restarts
                </span>
              )}
              {issue.metrics.age && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {issue.metrics.age}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SmartSuggestions({ suggestions }: { suggestions: string[] }) {
  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-zinc-400" strokeWidth={2} />
        <h3 className="text-lg font-medium text-white">Smart Suggestions</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions.slice(0, 6).map((suggestion, idx) => (
          <button
            key={idx}
            className="text-left px-4 py-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600/50 text-sm text-zinc-300 hover:text-white transition-all duration-300 font-light"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
