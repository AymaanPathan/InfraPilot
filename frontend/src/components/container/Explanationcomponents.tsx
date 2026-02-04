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
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      iconColor: "text-blue-600",
      titleColor: "text-blue-900",
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      iconColor: "text-amber-600",
      titleColor: "text-amber-900",
    },
    error: {
      icon: <XCircle className="w-5 h-5" />,
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      iconColor: "text-red-600",
      titleColor: "text-red-900",
    },
    success: {
      icon: <CheckCircle className="w-5 h-5" />,
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      iconColor: "text-emerald-600",
      titleColor: "text-emerald-900",
    },
  };

  const { icon, bgColor, borderColor, iconColor, titleColor } = config[type];

  return (
    <div
      className={`rounded-xl border ${borderColor} ${bgColor} p-6 backdrop-blur-sm ${className} animate-slideUp`}
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
          <div className="prose prose-sm max-w-none prose-slate">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-slate-900 mb-4 mt-6 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-slate-800 mb-3 mt-5 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold text-slate-700 mb-2 mt-4 first:mt-0">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-slate-700 leading-relaxed mb-3">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 mb-3 text-slate-700">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 mb-3 text-slate-700">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="ml-4">{children}</li>,
                code: ({ inline, children }: any) =>
                  inline ? (
                    <code className="bg-slate-200 text-blue-700 px-1.5 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-slate-100 text-slate-800 p-3 rounded-lg text-sm font-mono overflow-x-auto mb-3 border border-slate-200">
                      {children}
                    </code>
                  ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-slate-900">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-slate-600">{children}</em>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-600 my-3">
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
          <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
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
          <h3 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Warnings to Investigate
          </h3>
          {warningIssues.slice(0, 5).map((issue, idx) => (
            <IssueCard key={idx} issue={issue} />
          ))}
          {warningIssues.length > 5 && (
            <p className="text-sm text-slate-600 ml-7">
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
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-red-50 border-red-200 text-red-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
  };

  return (
    <div
      className={`rounded-xl border ${colors[color]} p-4 backdrop-blur-sm hover:scale-105 transition-transform`}
    >
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-600">{label}</div>
    </div>
  );
}

function IssueCard({ issue }: { issue: TriageReportProps["issues"][0] }) {
  const severityConfig = {
    critical: {
      icon: <XCircle className="w-4 h-4" />,
      color: "text-red-700",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    info: {
      icon: <Info className="w-4 h-4" />,
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
  };

  const config = severityConfig[issue.severity];

  return (
    <div
      className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-4 backdrop-blur-sm hover:shadow-md transition-all`}
    >
      <div className="flex items-start gap-3">
        <div className={`${config.color} flex-shrink-0 mt-0.5`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-slate-900 truncate">
              {issue.podName}
            </h4>
            <span className="text-xs text-slate-500">({issue.namespace})</span>
          </div>
          <p className="text-sm text-slate-700 mb-2">{issue.description}</p>
          {issue.metrics && (
            <div className="flex items-center gap-4 text-xs text-slate-600">
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
    <div className="rounded-xl border border-slate-200 bg-white p-6 backdrop-blur-sm shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-amber-600" />
        <h3 className="text-lg font-semibold text-slate-900">
          Smart Suggestions
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions.slice(0, 6).map((suggestion, idx) => (
          <button
            key={idx}
            className="text-left px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-blue-300 text-sm text-slate-700 hover:text-slate-900 transition-all hover:scale-105"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

<style jsx global>{`
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-slideUp {
    animation: slideUp 0.4s ease-out;
  }
`}</style>;
