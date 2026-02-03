import { z } from "zod";
import { useEffect, useState } from "react";
import {
  Server,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
} from "lucide-react";

/**
 * Status Summary Schema
 */
export const statusSummarySchema = z.object({
  totalPods: z.number(),
  runningPods: z.number(),
  failedPods: z.number(),
  pendingPods: z.number(),
  namespace: z.string().optional(),
});

type StatusSummaryProps = z.infer<typeof statusSummarySchema>;

/**
 * Enhanced Status Summary Component
 *
 * Displays cluster health metrics with animated counters and visual indicators
 */
export function StatusSummary({
  totalPods = 0,
  runningPods = 0,
  failedPods = 0,
  pendingPods = 0,
  namespace,
}: StatusSummaryProps) {
  // Calculate health percentage
  const safeTotalPods = Number.isFinite(totalPods) ? totalPods : 0;
  const safeRunningPods = Number.isFinite(runningPods) ? runningPods : 0;

  const healthPercentage =
    safeTotalPods > 0 ? Math.round((safeRunningPods / safeTotalPods) * 100) : 0;

  // Determine overall status
  const overallStatus =
    failedPods > 0 ? "critical" : pendingPods > 0 ? "warning" : "healthy";

  const statusConfig = {
    healthy: {
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      label: "Healthy",
      icon: CheckCircle2,
    },
    warning: {
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      label: "Warning",
      icon: Clock,
    },
    critical: {
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      label: "Critical",
      icon: AlertCircle,
    },
  };

  const config = statusConfig[overallStatus];
  const StatusIcon = config.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Cluster Status</h3>
          {namespace && (
            <p className="text-sm text-slate-400">Namespace: {namespace}</p>
          )}
        </div>
        <div
          className={`flex items-center gap-2 px-4 py-2 ${config.bg} ${config.border} border rounded-full`}
        >
          <StatusIcon className={`w-4 h-4 ${config.color}`} />
          <span className={`text-sm font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Health Circle */}
        <div className="relative bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 overflow-hidden group hover:bg-slate-800/60 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative flex flex-col items-center justify-center">
            <div className="relative mb-4">
              <CircularProgress percentage={healthPercentage} />
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white mb-1">
                {healthPercentage}%
              </p>
              <p className="text-sm text-slate-400">Cluster Health</p>
            </div>
          </div>
        </div>

        {/* Pods Breakdown */}
        <div className="space-y-3">
          <MetricCard
            label="Total Pods"
            value={totalPods}
            icon={Server}
            color="text-blue-400"
            bgColor="bg-blue-500/10"
            borderColor="border-blue-500/30"
            delay={0}
          />
          <MetricCard
            label="Running"
            value={runningPods}
            icon={CheckCircle2}
            color="text-emerald-400"
            bgColor="bg-emerald-500/10"
            borderColor="border-emerald-500/30"
            delay={100}
          />
          <MetricCard
            label="Failed"
            value={failedPods}
            icon={AlertCircle}
            color="text-red-400"
            bgColor="bg-red-500/10"
            borderColor="border-red-500/30"
            delay={200}
            pulse={failedPods > 0}
          />
          <MetricCard
            label="Pending"
            value={pendingPods}
            icon={Clock}
            color="text-amber-400"
            bgColor="bg-amber-500/10"
            borderColor="border-amber-500/30"
            delay={300}
          />
        </div>
      </div>

      {/* Insights */}
      {failedPods > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-slide-up">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400 mb-1">
              Action Required
            </p>
            <p className="text-sm text-red-400/80">
              {failedPods} pod{failedPods > 1 ? "s are" : " is"} experiencing
              failures. Check logs and events for more details.
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * Circular Progress Component
 */
function CircularProgress({ percentage }: { percentage: number }) {
  const safePercentage = Number.isFinite(percentage)
    ? Math.min(100, Math.max(0, percentage))
    : 0;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setProgress(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safePercentage / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct >= 80) return "#34d399"; // emerald
    if (pct >= 60) return "#fbbf24"; // amber
    return "#f87171"; // red
  };

  return (
    <div className="relative w-40 h-40">
      <svg className="transform -rotate-90 w-40 h-40">
        {/* Background circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-slate-700/30"
        />
        {/* Progress circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke={getColor(percentage)}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${getColor(percentage)}40)` }}
        />
      </svg>

      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <TrendingUp
          className="w-8 h-8 transition-all duration-300"
          style={{ color: getColor(percentage) }}
        />
      </div>
    </div>
  );
}

/**
 * Metric Card Component
 */
function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  borderColor,
  delay,
  pulse = false,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  delay: number;
  pulse?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 20;
    const safeValue = Number.isFinite(value) ? value : 0;
    const increment = safeValue / steps;
    const stepDuration = duration / steps;

    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div
      className={`relative group ${bgColor} ${borderColor} border rounded-xl p-4 hover:scale-105 transition-all duration-300 overflow-hidden`}
      style={{ animation: `slide-up 0.4s ease-out ${delay}ms both` }}
    >
      {pulse && (
        <div className="absolute top-2 right-2">
          <div className="relative">
            <div
              className={`absolute w-2 h-2 ${bgColor.replace("/10", "/40")} rounded-full animate-ping`}
            />
            <div
              className={`w-2 h-2 ${bgColor.replace("/10", "")} rounded-full`}
            />
          </div>
        </div>
      )}

      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color} tabular-nums`}>
            {displayValue}
          </p>
        </div>
        <Icon
          className={`w-6 h-6 ${color} opacity-40 group-hover:opacity-60 transition-opacity duration-300`}
        />
      </div>
    </div>
  );
}
