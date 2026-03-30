import React from "react";

const STATUS_COLORS = {
  healthy: "bg-green-100 text-green-800 border-green-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

function MetricCard({ label, value, suffix = "", status }) {
  return (
    <div className={`flex flex-col items-center justify-center p-4 rounded-xl border ${STATUS_COLORS[status] || "bg-gray-50 border-gray-200"}`}>
      <span className="text-3xl font-bold">{value}{suffix}</span>
      <span className="text-xs font-medium mt-1 opacity-80">{label}</span>
    </div>
  );
}

export default function ProjectDashboardCard({ dashboard, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!dashboard) return null;

  const conflictStatus =
    dashboard.unresolved_conflicts > 5 ? "critical"
    : dashboard.unresolved_conflicts > 0 ? "warning"
    : "healthy";

  const completionStatus =
    dashboard.completion_pct >= 70 ? "healthy"
    : dashboard.completion_pct >= 30 ? "warning"
    : "critical";

  const docStatus = dashboard.document_count > 0 ? "healthy" : "warning";

  return (
    <div className="bg-white rounded-xl border border-indigo-100 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-800">Project Dashboard</h2>
        <span className="text-xs text-gray-400">
          Last active: {dashboard.last_activity
            ? new Date(dashboard.last_activity).toLocaleDateString()
            : "—"}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Documents"
          value={dashboard.document_count}
          status={docStatus}
        />
        <MetricCard
          label="Requirements"
          value={dashboard.requirement_count}
          status={dashboard.requirement_count > 0 ? "healthy" : "warning"}
        />
        <MetricCard
          label="Conflicts"
          value={dashboard.unresolved_conflicts}
          suffix={dashboard.resolved_conflicts > 0 ? ` / ${dashboard.resolved_conflicts} resolved` : ""}
          status={conflictStatus}
        />
        <MetricCard
          label="Completion"
          value={dashboard.completion_pct}
          suffix="%"
          status={completionStatus}
        />
      </div>
      {dashboard.unresolved_conflicts > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span>⚠️</span>
          <span>
            {dashboard.unresolved_conflicts} unresolved conflict{dashboard.unresolved_conflicts !== 1 ? "s" : ""} detected.
            Review them before finalizing requirements.
          </span>
        </div>
      )}
    </div>
  );
}
