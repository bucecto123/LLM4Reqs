import React from "react";
import { AnimateIn } from './AnimateIn.jsx';
import { timeAgo } from '../utils/time.js';

const ACTION_ICONS = {
  document_uploaded: "📄",
  requirement_created: "✨",
  requirement_updated: "✏️",
  conflict_detected: "⚠️",
  conflict_resolved: "✅",
  collaborator_added: "👤+",
  collaborator_removed: "👤−",
};

const ACTION_COLORS = {
  document_uploaded: "bg-blue-50 border-blue-200",
  requirement_created: "bg-green-50 border-green-200",
  requirement_updated: "bg-purple-50 border-purple-200",
  conflict_detected: "bg-red-50 border-red-200",
  conflict_resolved: "bg-green-50 border-green-200",
  collaborator_added: "bg-indigo-50 border-indigo-200",
  collaborator_removed: "bg-gray-50 border-gray-200",
};

const ActivityFeed = React.memo(function ActivityFeed({ activities, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No activity yet. Upload a document or create a requirement to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
      <AnimateIn direction="right" delayMs={60}>
      {activities.map((item) => (
        <div
          key={item.id}
          className={`flex items-start gap-3 p-3 rounded-lg border ${ACTION_COLORS[item.action_type] || "bg-gray-50 border-gray-200"}`}
        >
          <span className="text-xl flex-shrink-0 mt-0.5">
            {ACTION_ICONS[item.action_type] || "📌"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800">{item.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400">
                {item.user?.name || "System"}
              </span>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-400">{timeAgo(item.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
      </AnimateIn>
    </div>
  );
});

export default ActivityFeed;
