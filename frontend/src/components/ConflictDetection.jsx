import React, { useState, useEffect } from "react";
import { AlertTriangle, X, CheckCircle, Clock } from "lucide-react";
import { apiFetch } from "../utils/auth";

export const ConflictsDisplay = ({ projectId }) => {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (projectId) {
      loadConflicts();
    }
  }, [projectId]);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load conflicts from the backend API
      const data = await apiFetch(`/api/projects/${projectId}/conflicts`);

      if (data.success && data.data) {
        // Transform backend conflicts to UI format
        const formattedConflicts = data.data.map((conflict) => ({
          id: conflict.id,
          title: `Requirements ${conflict.requirement1?.id} ↔ ${conflict.requirement2?.id}`,
          description: conflict.conflict_description,
          severity: conflict.severity,
          confidence: conflict.confidence || "medium",
          requirements: [
            `[${conflict.requirement1?.id}] ${
              conflict.requirement1?.title || conflict.requirement1?.description
            }`,
            `[${conflict.requirement2?.id}] ${
              conflict.requirement2?.title || conflict.requirement2?.description
            }`,
          ],
          suggestion: conflict.resolution_notes,
          status: conflict.resolution_status,
          detectedAt: conflict.detected_at,
        }));
        setConflicts(formattedConflicts);
      } else {
        setConflicts([]);
      }
    } catch (err) {
      console.error("Error loading conflicts:", err);
      setError(err.message || "Failed to load conflicts");
      setConflicts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <span className="ml-3 text-gray-600">Loading conflicts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-900 font-medium">
              Error Loading Conflicts
            </h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <div className="p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No Conflicts Detected
        </h3>
        <p className="text-gray-600 text-sm">
          All requirements are consistent and conflict-free.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Detected Conflicts ({conflicts.length})
        </h3>
        <button
          onClick={loadConflicts}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {conflicts.map((conflict, index) => {
        const severityColors = {
          high: "bg-red-50 border-red-200 text-red-900",
          medium: "bg-orange-50 border-orange-200 text-orange-900",
          low: "bg-yellow-50 border-yellow-200 text-yellow-900",
        };
        const severityBadgeColors = {
          high: "bg-red-100 text-red-800",
          medium: "bg-orange-100 text-orange-800",
          low: "bg-yellow-100 text-yellow-800",
        };
        const confidenceColors = {
          high: "text-green-700",
          medium: "text-yellow-700",
          low: "text-gray-600",
        };

        const bgColor =
          severityColors[conflict.severity] || severityColors.medium;
        const badgeColor =
          severityBadgeColors[conflict.severity] || severityBadgeColors.medium;
        const confColor =
          confidenceColors[conflict.confidence] || confidenceColors.medium;

        return (
          <div
            key={conflict.id || index}
            className={`border rounded-lg p-4 ${bgColor}`}
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">
                    {conflict.title || `Conflict ${index + 1}`}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${badgeColor}`}
                    >
                      {conflict.severity?.toUpperCase() || "MEDIUM"}
                    </span>
                    {conflict.confidence && (
                      <span className={`text-xs ${confColor}`}>
                        {conflict.confidence} confidence
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm mb-3">{conflict.description}</p>

                {conflict.requirements && conflict.requirements.length > 0 && (
                  <div className="space-y-2 mb-3">
                    <p className="text-xs font-medium uppercase opacity-70">
                      Conflicting Requirements:
                    </p>
                    {conflict.requirements.map((req, idx) => (
                      <div
                        key={idx}
                        className="bg-white border rounded p-2 text-sm"
                      >
                        {req}
                      </div>
                    ))}
                  </div>
                )}

                {conflict.suggestion && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <p className="text-xs font-medium mb-1">💡 Suggestion:</p>
                    <p className="text-sm">{conflict.suggestion}</p>
                  </div>
                )}

                {conflict.detectedAt && (
                  <p className="text-xs opacity-60 mt-2">
                    Detected: {new Date(conflict.detectedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConflictsDisplay;
