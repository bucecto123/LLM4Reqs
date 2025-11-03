import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";
import { apiFetch } from "../utils/auth.js";

/**
 * ConflictDetectionButton - Triggers conflict detection for a project
 */
export function ConflictDetectionButton({ projectId, onDetectionComplete }) {
  const [detecting, setDetecting] = useState(false);
  const [progress, setProgress] = useState("");

  const startDetection = async () => {
    setDetecting(true);
    setProgress("Starting conflict detection...");

    try {
      // Start conflict detection
      const response = await apiFetch(
        `/api/projects/${projectId}/conflicts/detect`,
        {
          method: "POST",
        }
      );

      if (!response.success) {
        throw new Error(
          response.message || "Failed to start conflict detection"
        );
      }

      const { job_id } = response;
      setProgress("Detection in progress...");

      // Poll for completion
      await pollConflictStatus(job_id);
    } catch (error) {
      console.error("Conflict detection failed:", error);
      alert("Failed to detect conflicts: " + error.message);
      setDetecting(false);
      setProgress("");
    }
  };

  const pollConflictStatus = async (jobId) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await apiFetch(`/api/conflicts/status/${jobId}`);

        if (!response.success) {
          throw new Error("Failed to get job status");
        }

        const { status, progress: jobProgress, conflicts } = response.data;

        // Update progress message
        if (jobProgress) {
          setProgress(jobProgress);
        }

        if (status === "completed") {
          // Process and save conflicts
          setProgress("Saving results...");

          await apiFetch(`/api/conflicts/process/${jobId}`, {
            method: "POST",
            body: { project_id: projectId },
          });

          setProgress("Detection complete!");
          setDetecting(false);

          // Notify parent component
          if (onDetectionComplete) {
            onDetectionComplete(conflicts);
          }

          return;
        }

        if (status === "failed") {
          throw new Error("Conflict detection failed");
        }

        // Continue polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          throw new Error("Conflict detection timed out");
        }
      } catch (error) {
        console.error("Failed to poll status:", error);
        setDetecting(false);
        setProgress("");
        alert("Conflict detection failed: " + error.message);
      }
    };

    poll();
  };

  return (
    <button
      onClick={startDetection}
      disabled={detecting}
      className={`btn ${detecting ? "btn-disabled" : "btn-primary"} gap-2`}
    >
      {detecting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{progress || "Detecting..."}</span>
        </>
      ) : (
        <>
          <AlertTriangle className="w-4 h-4" />
          <span>Detect Conflicts</span>
        </>
      )}
    </button>
  );
}

/**
 * ConflictsDisplay - Shows list of detected conflicts
 */
export function ConflictsDisplay({ projectId }) {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [filter, setFilter] = useState("all"); // all, pending, resolved

  useEffect(() => {
    loadConflicts();
  }, [projectId]);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/projects/${projectId}/conflicts`);

      if (response.success) {
        setConflicts(response.data);
      }
    } catch (error) {
      console.error("Failed to load conflicts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDetectionComplete = (newConflicts) => {
    loadConflicts(); // Reload conflicts after detection
  };

  const getSeverityColor = (severity) => {
    const colors = {
      high: "border-l-error bg-error/10",
      medium: "border-l-warning bg-warning/10",
      low: "border-l-info bg-info/10",
    };
    return colors[severity] || colors.medium;
  };

  const getConfidenceBadge = (confidence) => {
    const badges = {
      high: "badge-error",
      medium: "badge-warning",
      low: "badge-info",
    };
    return badges[confidence] || badges.medium;
  };

  const filteredConflicts = conflicts.filter((conflict) => {
    if (filter === "pending") return conflict.resolution_status === "pending";
    if (filter === "resolved") return conflict.resolution_status === "resolved";
    return true;
  });

  const pendingCount = conflicts.filter(
    (c) => c.resolution_status === "pending"
  ).length;
  const resolvedCount = conflicts.filter(
    (c) => c.resolution_status === "resolved"
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading conflicts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with detection button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Requirement Conflicts</h3>
          <p className="text-sm text-gray-600">
            {pendingCount} pending, {resolvedCount} resolved
          </p>
        </div>
        <ConflictDetectionButton
          projectId={projectId}
          onDetectionComplete={handleDetectionComplete}
        />
      </div>

      {/* Filter tabs */}
      {conflicts.length > 0 && (
        <div className="tabs tabs-boxed">
          <button
            className={`tab ${filter === "all" ? "tab-active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({conflicts.length})
          </button>
          <button
            className={`tab ${filter === "pending" ? "tab-active" : ""}`}
            onClick={() => setFilter("pending")}
          >
            Pending ({pendingCount})
          </button>
          <button
            className={`tab ${filter === "resolved" ? "tab-active" : ""}`}
            onClick={() => setFilter("resolved")}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      )}

      {/* Conflicts list */}
      {filteredConflicts.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 mx-auto text-success mb-2" />
          <p className="text-gray-600">
            {conflicts.length === 0
              ? 'No conflicts detected yet. Click "Detect Conflicts" to analyze requirements.'
              : `No ${filter} conflicts found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredConflicts.map((conflict) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              onResolve={() => setSelectedConflict(conflict)}
              onDelete={loadConflicts}
            />
          ))}
        </div>
      )}

      {/* Resolve modal */}
      {selectedConflict && (
        <ResolveConflictModal
          conflict={selectedConflict}
          onClose={() => setSelectedConflict(null)}
          onResolved={() => {
            setSelectedConflict(null);
            loadConflicts();
          }}
        />
      )}
    </div>
  );
}

/**
 * ConflictCard - Individual conflict display
 */
function ConflictCard({ conflict, onResolve, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const getSeverityColor = (severity) => {
    const colors = {
      high: "border-l-error bg-error/5",
      medium: "border-l-warning bg-warning/5",
      low: "border-l-info bg-info/5",
    };
    return colors[severity] || colors.medium;
  };

  const getConfidenceBadge = (confidence) => {
    const badges = {
      high: "badge-error",
      medium: "badge-warning",
      low: "badge-info",
    };
    return badges[confidence] || badges.medium;
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this conflict?")) {
      return;
    }

    setDeleting(true);
    try {
      await apiFetch(`/api/conflicts/${conflict.id}`, { method: "DELETE" });
      onDelete();
    } catch (error) {
      console.error("Failed to delete conflict:", error);
      alert("Failed to delete conflict");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`border-l-4 p-4 rounded-lg ${getSeverityColor(
        conflict.severity
      )}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-2 flex-wrap">
          <span className={`badge ${getConfidenceBadge(conflict.confidence)}`}>
            {conflict.confidence} confidence
          </span>
          <span className="badge badge-neutral">
            Cluster {conflict.cluster_id}
          </span>
          {conflict.resolution_status === "resolved" && (
            <span className="badge badge-success gap-1">
              <CheckCircle className="w-3 h-3" />
              Resolved
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {conflict.resolution_status === "pending" && (
            <button onClick={onResolve} className="btn btn-sm btn-primary">
              Resolve
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn btn-sm btn-ghost text-error"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Conflict description */}
      <p className="text-sm font-semibold mb-3 text-gray-800">
        {conflict.conflict_description}
      </p>

      {/* Requirements comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white p-3 rounded border">
          <p className="text-xs text-gray-500 mb-1 font-medium">
            Requirement #{conflict.requirement_id_1}
          </p>
          <p className="text-sm">
            {conflict.requirement1?.requirement_text || "No text available"}
          </p>
        </div>

        <div className="bg-white p-3 rounded border">
          <p className="text-xs text-gray-500 mb-1 font-medium">
            Requirement #{conflict.requirement_id_2}
          </p>
          <p className="text-sm">
            {conflict.requirement2?.requirement_text || "No text available"}
          </p>
        </div>
      </div>

      {/* Resolution notes (if resolved) */}
      {conflict.resolution_status === "resolved" &&
        conflict.resolution_notes && (
          <div className="mt-3 p-3 bg-success/10 rounded border border-success/20">
            <p className="text-xs text-gray-600 mb-1 font-medium">
              Resolution Notes:
            </p>
            <p className="text-sm text-gray-800">{conflict.resolution_notes}</p>
            {conflict.resolved_at && (
              <p className="text-xs text-gray-500 mt-1">
                Resolved on{" "}
                {new Date(conflict.resolved_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

      {/* Detection timestamp */}
      {conflict.detected_at && (
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Detected {new Date(conflict.detected_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

/**
 * ResolveConflictModal - Modal for resolving conflicts
 */
function ResolveConflictModal({ conflict, onClose, onResolved }) {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  const handleResolve = async () => {
    if (!resolutionNotes.trim()) {
      alert("Please enter resolution notes");
      return;
    }

    setResolving(true);

    try {
      await apiFetch(`/api/conflicts/${conflict.id}/resolve`, {
        method: "PUT",
        body: { resolution_notes: resolutionNotes },
      });

      onResolved();
    } catch (error) {
      console.error("Failed to resolve conflict:", error);
      alert("Failed to resolve conflict: " + error.message);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Resolve Conflict</h3>

        {/* Conflict description */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2 font-medium">
            Conflict Description:
          </p>
          <div className="bg-gray-100 p-3 rounded">
            <p className="text-sm">{conflict.conflict_description}</p>
          </div>
        </div>

        {/* Requirements */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="border p-3 rounded">
            <p className="text-xs text-gray-500 mb-1">
              Requirement #{conflict.requirement_id_1}
            </p>
            <p className="text-sm">{conflict.requirement1?.requirement_text}</p>
          </div>
          <div className="border p-3 rounded">
            <p className="text-xs text-gray-500 mb-1">
              Requirement #{conflict.requirement_id_2}
            </p>
            <p className="text-sm">{conflict.requirement2?.requirement_text}</p>
          </div>
        </div>

        {/* Resolution notes input */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Resolution Notes *</span>
          </label>
          <textarea
            className="textarea textarea-bordered h-24"
            placeholder="Explain how this conflict was resolved, which requirement takes priority, or how they were reconciled..."
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
          />
          <label className="label">
            <span className="label-text-alt text-gray-500">
              Be specific about the decision made and reasoning
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="modal-action">
          <button
            onClick={onClose}
            className="btn btn-ghost"
            disabled={resolving}
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            className="btn btn-primary"
            disabled={resolving || !resolutionNotes.trim()}
          >
            {resolving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Resolving...
              </>
            ) : (
              "Mark as Resolved"
            )}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}

export default ConflictsDisplay;
