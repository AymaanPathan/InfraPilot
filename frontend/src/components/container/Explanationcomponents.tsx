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
      icon: <Info className="w-5 h-5" />,
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      iconColor: "text-blue-400",
      titleColor: "text-blue-300",
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
      iconColor: "text-amber-400",
      titleColor: "text-amber-300",
    },
    error: {
      icon: <XCircle className="w-5 h-5" />,
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      iconColor: "text-red-400",
      titleColor: "text-red-300",
    },
    success: {
      icon: <CheckCircle className="w-5 h-5" />,
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
      iconColor: "text-green-400",
      titleColor: "text-green-300",
    },
  };

  const { icon, bgColor, borderColor, iconColor, titleColor } = config[type];

  return (
    <div
      className={`rounded-xl border ${borderColor} ${bgColor} p-6 backdrop-blur-sm ${className} animate-slide-up`}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {showIcon && (
          <div className={`${iconColor} flex-shrink-0 mt-1`}>{icon}</div>
        )}
        <div className="flex-1">
          {title && (
            <h3 className={`text-lg font-semibold ${titleColor} mb-3`}>
              {title}
            </h3>
          )}

          {/* Markdown Content */}
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-white mb-4 mt-6 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-slate-200 mb-3 mt-5 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold text-slate-300 mb-2 mt-4 first:mt-0">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-slate-300 leading-relaxed mb-3">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 mb-3 text-slate-300">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 mb-3 text-slate-300">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="ml-4">{children}</li>,
                code: ({ inline, children }: any) =>
                  inline ? (
                    <code className="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-slate-900 text-slate-200 p-3 rounded-lg text-sm font-mono overflow-x-auto mb-3">
                      {children}
                    </code>
                  ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-white">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-slate-400">{children}</em>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-slate-600 pl-4 italic text-slate-400 my-3">
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
    <div className="space-y-6 animate-slide-up">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total Pods"
            value={summary.total}
            icon={<TrendingUp className="w-4 h-4" />}
            color="blue"
          />
          <MetricCard
            label="Issues Found"
            value={summary.issuesFound}
            icon={<AlertTriangle className="w-4 h-4" />}
            color="amber"
          />
          <MetricCard
            label="Critical"
            value={summary.critical}
            icon={<XCircle className="w-4 h-4" />}
            color="red"
          />
          <MetricCard
            label="Warnings"
            value={summary.warnings}
            icon={<Info className="w-4 h-4" />}
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
          <h3 className="text-lg font-semibold text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Critical Issues Requiring Immediate Attention
          </h3>
          {criticalIssues.map((issue, idx) => (
            <IssueCard key={idx} issue={issue} />
          ))}
        </div>
      )}

      {warningIssues.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-amber-300 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Warnings to Investigate
          </h3>
          {warningIssues.slice(0, 5).map((issue, idx) => (
            <IssueCard key={idx} issue={issue} />
          ))}
          {warningIssues.length > 5 && (
            <p className="text-sm text-slate-400 ml-7">
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
  color: "blue" | "amber" | "red" | "orange" | "green";
}) {
  const colors = {
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    red: "bg-red-500/10 border-red-500/30 text-red-400",
    orange: "bg-orange-500/10 border-orange-500/30 text-orange-400",
    green: "bg-green-500/10 border-green-500/30 text-green-400",
  };

  return (
    <div
      className={`rounded-lg border ${colors[color]} p-4 backdrop-blur-sm hover:scale-105 transition-transform`}
    >
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function IssueCard({ issue }: { issue: TriageReportProps["issues"][0] }) {
  const severityConfig = {
    critical: {
      icon: <XCircle className="w-4 h-4" />,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
    },
    info: {
      icon: <Info className="w-4 h-4" />,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
    },
  };

  const config = severityConfig[issue.severity];

  return (
    <div
      className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4 backdrop-blur-sm hover:border-opacity-50 transition-all`}
    >
      <div className="flex items-start gap-3">
        <div className={`${config.color} flex-shrink-0 mt-0.5`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white truncate">
              {issue.podName}
            </h4>
            <span className="text-xs text-slate-500">({issue.namespace})</span>
          </div>
          <p className="text-sm text-slate-300 mb-2">{issue.description}</p>
          {issue.metrics && (
            <div className="flex items-center gap-4 text-xs text-slate-400">
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
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-semibold text-white">Smart Suggestions</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions.slice(0, 6).map((suggestion, idx) => (
          <button
            key={idx}
            className="text-left px-4 py-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-500/30 text-sm text-slate-300 hover:text-white transition-all hover:scale-105"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

<style jsx global>{`
  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-slide-up {
    animation: slide-up 0.4s ease-out;
  }
`}</style>;
