import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  X,
  CheckCircle,
  Clock,
  ChevronDown,
  Shield,
  Download,
  Bot,
  PenTool,
} from "lucide-react";
import { apiFetch } from "../utils/auth";
import ExportModal from "./ExportModal.jsx";

// Format resolution notes for better display
const formatResolutionNotes = (text) => {
  if (!text) return "";

  let formatted = text;

  // Handle bold text (**text** or **text**)
  formatted = formatted.replace(
    /\*\*([^\*]+)\*\*/g,
    "<strong class='font-semibold text-blue-900'>$1</strong>"
  );

  // Handle italic text (*text* but not **text**)
  formatted = formatted.replace(
    /(?<!\*)\*([^\*]+)\*(?!\*)/g,
    "<em class='italic'>$1</em>"
  );

  // Handle numbered lists with proper formatting (1., 2., etc.)
  // First, ensure numbered items are on separate lines
  formatted = formatted.replace(/(\d+\.)\s+/g, "\n$1 ");

  // Handle bullet points (•, -, *)
  formatted = formatted.replace(/^[\-\*]\s+/gm, "\n• ");

  // Split by double newlines for paragraphs, or single newline for list items
  const lines = formatted.split(/\n/);
  const elements = [];
  let currentParagraph = [];
  let inList = false;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentParagraph.length > 0) {
        elements.push({
          type: "paragraph",
          content: currentParagraph.join(" "),
        });
        currentParagraph = [];
      }
      inList = false;
      return;
    }

    // Check if it's a numbered list item
    if (trimmed.match(/^\d+\.\s/)) {
      if (currentParagraph.length > 0) {
        elements.push({
          type: "paragraph",
          content: currentParagraph.join(" "),
        });
        currentParagraph = [];
      }
      elements.push({ type: "numbered", content: trimmed });
      inList = true;
      return;
    }

    // Check if it's a bullet point
    if (trimmed.match(/^[\•\-\*]\s/)) {
      if (currentParagraph.length > 0) {
        elements.push({
          type: "paragraph",
          content: currentParagraph.join(" "),
        });
        currentParagraph = [];
      }
      elements.push({ type: "bullet", content: trimmed });
      inList = true;
      return;
    }

    // Regular text
    if (inList && currentParagraph.length > 0) {
      elements.push({ type: "paragraph", content: currentParagraph.join(" ") });
      currentParagraph = [];
    }
    currentParagraph.push(trimmed);
    inList = false;
  });

  // Add remaining paragraph
  if (currentParagraph.length > 0) {
    elements.push({ type: "paragraph", content: currentParagraph.join(" ") });
  }

  return elements.map((element, idx) => {
    if (element.type === "numbered") {
      return (
        <div key={idx} className="mb-2 ml-4 pl-3 border-l-4 border-blue-300">
          <div
            className="text-sm"
            dangerouslySetInnerHTML={{ __html: element.content }}
          />
        </div>
      );
    }

    if (element.type === "bullet") {
      return (
        <div key={idx} className="mb-2 ml-4">
          <div
            className="text-sm"
            dangerouslySetInnerHTML={{ __html: element.content }}
          />
        </div>
      );
    }

    // Regular paragraph
    return (
      <p
        key={idx}
        className="mb-3 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: element.content }}
      />
    );
  });
};

export const ConflictsDisplay = ({ projectId, onClose }) => {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    severity: "",
    search: "",
  });
  const [isSeverityDropdownOpen, setIsSeverityDropdownOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [resolveModal, setResolveModal] = useState({
    isOpen: false,
    conflict: null,
    mode: null, // 'ai' or 'manual'
    manualNotes: "",
  });

  useEffect(() => {
    if (projectId) {
      loadConflicts();
      fetchProjectName();
    }
  }, [projectId]);

  const fetchProjectName = async () => {
    try {
      const response = await apiFetch(`/api/projects/${projectId}`);
      if (response && response.name) {
        setProjectName(response.name);
      }
    } catch (err) {
      console.error("Failed to load project name:", err);
      setProjectName("Project");
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

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
          conflictNumber: conflict.conflict_number,
          title: conflict.conflict_number
            ? `Conflict ${conflict.conflict_number}`
            : `Conflict ${conflict.id}`,
          description: conflict.conflict_description,
          severity: conflict.severity,
          confidence: conflict.confidence || "medium",
          requirements: [
            `[${
              conflict.requirement1?.requirement_number ||
              conflict.requirement1?.id
            }] ${
              conflict.requirement1?.title ||
              conflict.requirement1?.description ||
              conflict.requirement1?.requirement_text
            }`,
            `[${
              conflict.requirement2?.requirement_number ||
              conflict.requirement2?.id
            }] ${
              conflict.requirement2?.title ||
              conflict.requirement2?.description ||
              conflict.requirement2?.requirement_text
            }`,
          ],
          suggestion: conflict.resolution_notes,
          status: conflict.resolution_status,
          detectedAt: conflict.detected_at,
        }));

        // Sort by severity: high -> medium -> low
        const severityOrder = { high: 1, medium: 2, low: 3 };
        formattedConflicts.sort((a, b) => {
          const orderA = severityOrder[a.severity?.toLowerCase()] || 2;
          const orderB = severityOrder[b.severity?.toLowerCase()] || 2;
          return orderA - orderB;
        });

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

  const handleResolveWithAI = async (conflict) => {
    try {
      if (!conflict || !conflict.id) return;

      if (conflict.status === "resolved") {
        alert("This conflict is already resolved");
        return;
      }

      // Show confirmation modal
      setResolveModal({
        isOpen: true,
        conflict: conflict,
        mode: "ai",
        manualNotes: "",
      });
    } catch (err) {
      console.error("Failed to open resolve modal:", err);
    }
  };

  const handleResolveManually = async (conflict) => {
    try {
      if (!conflict || !conflict.id) return;

      if (conflict.status === "resolved") {
        alert("This conflict is already resolved");
        return;
      }

      // Show manual resolution modal
      setResolveModal({
        isOpen: true,
        conflict: conflict,
        mode: "manual",
        manualNotes: "",
      });
    } catch (err) {
      console.error("Failed to open resolve modal:", err);
    }
  };

  const confirmResolveWithAI = async () => {
    const { conflict } = resolveModal;
    if (!conflict) return;

    try {
      setLoading(true);
      setResolveModal({
        isOpen: false,
        conflict: null,
        mode: null,
        manualNotes: "",
      });

      const response = await apiFetch(
        `/api/conflicts/${conflict.id}/resolve-ai`,
        {
          method: "POST",
        }
      );

      if (response.success) {
        await loadConflicts();
      } else {
        throw new Error(
          response.message || "Failed to resolve conflict with AI"
        );
      }
    } catch (err) {
      console.error("Failed to resolve conflict with AI:", err);
      setError(err.message || "Failed to resolve conflict with AI");
    } finally {
      setLoading(false);
    }
  };

  const confirmResolveManually = async () => {
    const { conflict, manualNotes } = resolveModal;
    if (!conflict || !manualNotes || !manualNotes.trim()) {
      return;
    }

    try {
      setLoading(true);
      setResolveModal({
        isOpen: false,
        conflict: null,
        mode: null,
        manualNotes: "",
      });

      await apiFetch(`/api/conflicts/${conflict.id}/resolve`, {
        method: "PUT",
        body: { resolution_notes: manualNotes.trim() },
      });

      await loadConflicts();
    } catch (err) {
      console.error("Failed to resolve conflict:", err);
      setError(err.message || "Failed to resolve conflict");
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredConflicts = conflicts.filter((conflict) => {
    // Filter by severity
    if (
      filters.severity &&
      conflict.severity?.toLowerCase() !== filters.severity.toLowerCase()
    ) {
      return false;
    }

    // Filter by search text
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesTitle = conflict.title?.toLowerCase().includes(searchLower);
      const matchesDescription = conflict.description
        ?.toLowerCase()
        .includes(searchLower);
      const matchesRequirements = conflict.requirements?.some((req) =>
        req.toLowerCase().includes(searchLower)
      );

      if (!matchesTitle && !matchesDescription && !matchesRequirements) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header - Always visible */}
      <div className="flex items-center justify-between px-6 py-5 bg-white/90 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          Conflict Detection
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadConflicts}
            className="px-4 py-2 rounded-lg bg-white hover:bg-orange-50 transition-colors font-medium text-orange-600 hover:text-orange-700 border border-orange-200 shadow-sm hover:shadow-md"
          >
            Refresh
          </button>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-white hover:bg-green-50 transition-colors font-medium text-green-600 hover:text-green-700 border border-green-200 shadow-sm hover:shadow-md"
          >
            <Download className="w-4 h-4 mr-2 inline" />
            Export
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 transition-colors font-medium text-slate-600 hover:text-slate-900 border border-slate-300 shadow-sm hover:shadow-md"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="ml-3 text-gray-600">Loading conflicts...</span>
          </div>
        ) : error ? (
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
        ) : conflicts.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No Conflicts Detected
            </h3>
            <p className="text-gray-600 text-sm">
              All requirements are consistent and conflict-free.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800">
                Detected Conflicts ({filteredConflicts.length})
              </h3>
            </div>

            {/* Filters */}
            <div className="flex space-x-3 mb-4 relative z-40">
              {/* Severity Filter Dropdown */}
              <div className="relative z-50">
                <button
                  onClick={() =>
                    setIsSeverityDropdownOpen(!isSeverityDropdownOpen)
                  }
                  className="flex items-center space-x-2 pl-3 pr-8 py-2.5 rounded-lg border-2 border-orange-200 bg-white text-orange-900 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all shadow-sm hover:border-orange-300 hover:shadow-md text-sm"
                >
                  <Shield size={16} className="text-orange-600" />
                  <span>
                    {filters.severity === ""
                      ? "All Severities"
                      : filters.severity.charAt(0).toUpperCase() +
                        filters.severity.slice(1)}
                  </span>
                  <ChevronDown
                    size={16}
                    className="absolute right-2 text-orange-600"
                  />
                </button>

                {isSeverityDropdownOpen && (
                  <div className="absolute top-full mt-2 w-48 bg-white rounded-lg border-2 border-orange-200 shadow-xl overflow-hidden z-50">
                    <button
                      onClick={() => {
                        setFilters({ ...filters, severity: "" });
                        setIsSeverityDropdownOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-sm ${
                        filters.severity === ""
                          ? "bg-orange-50 text-orange-900"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <Shield
                        size={16}
                        className={
                          filters.severity === ""
                            ? "text-orange-600"
                            : "text-gray-500"
                        }
                      />
                      <span className="font-medium">All Severities</span>
                    </button>
                    <button
                      onClick={() => {
                        setFilters({ ...filters, severity: "high" });
                        setIsSeverityDropdownOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-sm ${
                        filters.severity === "high"
                          ? "bg-orange-50 text-orange-900"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <Shield
                        size={16}
                        className={
                          filters.severity === "high"
                            ? "text-red-600"
                            : "text-gray-500"
                        }
                      />
                      <span className="font-medium">High</span>
                    </button>
                    <button
                      onClick={() => {
                        setFilters({ ...filters, severity: "medium" });
                        setIsSeverityDropdownOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-sm ${
                        filters.severity === "medium"
                          ? "bg-orange-50 text-orange-900"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <Shield
                        size={16}
                        className={
                          filters.severity === "medium"
                            ? "text-orange-600"
                            : "text-gray-500"
                        }
                      />
                      <span className="font-medium">Medium</span>
                    </button>
                    <button
                      onClick={() => {
                        setFilters({ ...filters, severity: "low" });
                        setIsSeverityDropdownOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-sm ${
                        filters.severity === "low"
                          ? "bg-orange-50 text-orange-900"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <Shield
                        size={16}
                        className={
                          filters.severity === "low"
                            ? "text-yellow-600"
                            : "text-gray-500"
                        }
                      />
                      <span className="font-medium">Low</span>
                    </button>
                  </div>
                )}
              </div>

              <input
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search conflicts..."
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white shadow-sm hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all flex-1 text-sm"
              />
            </div>

            {filteredConflicts.length === 0 ? (
              <div className="p-8 text-center bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No Conflicts Match Filters
                </h3>
                <p className="text-gray-600 text-sm">
                  Try adjusting your filters to see more results.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredConflicts.map((conflict, index) => {
                  const severityColors = {
                    high: "border-red-300 bg-red-50/50",
                    medium: "border-orange-300 bg-orange-50/50",
                    low: "border-yellow-300 bg-yellow-50/50",
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
                    severityBadgeColors[conflict.severity] ||
                    severityBadgeColors.medium;
                  const confColor =
                    confidenceColors[conflict.confidence] ||
                    confidenceColors.medium;

                  return (
                    <div
                      key={conflict.id || index}
                      className={`border-2 rounded-xl p-5 transition-all duration-200 bg-white/90 backdrop-blur-sm hover:shadow-xl ${bgColor}`}
                      style={{
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">
                              {conflict.title ||
                                (conflict.conflictNumber
                                  ? `Conflict ${conflict.conflictNumber}`
                                  : `Conflict ${index + 1}`)}
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

                              {/* Resolve buttons - AI or Manual */}
                              {conflict.status !== "resolved" ? (
                                <div className="ml-2 flex items-center space-x-2">
                                  <button
                                    onClick={() =>
                                      handleResolveWithAI(conflict)
                                    }
                                    disabled={loading}
                                    className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="Resolve automatically using AI"
                                  >
                                    Resolve with AI
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleResolveManually(conflict)
                                    }
                                    disabled={loading}
                                    className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="Resolve manually with your own notes"
                                  >
                                    Resolve by your own
                                  </button>
                                </div>
                              ) : (
                                <span className="ml-2 text-xs text-slate-500">
                                  Resolved
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-sm mb-3">{conflict.description}</p>

                          {conflict.requirements &&
                            conflict.requirements.length > 0 && (
                              <div className="space-y-2 mb-3">
                                <p className="text-xs font-semibold uppercase text-slate-600">
                                  Conflicting Requirements:
                                </p>
                                {conflict.requirements.map((req, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-white border border-slate-200 rounded-lg p-3 text-sm shadow-sm"
                                  >
                                    {req}
                                  </div>
                                ))}
                              </div>
                            )}

                          {conflict.suggestion && (
                            <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
                              <p className="text-xs font-semibold mb-3 text-blue-900">
                                💡 Resolution Suggestion:
                              </p>
                              <div className="text-sm text-blue-800 whitespace-pre-wrap leading-relaxed">
                                {formatResolutionNotes(conflict.suggestion)}
                              </div>
                            </div>
                          )}

                          {conflict.detectedAt && (
                            <p className="text-xs text-slate-500 mt-3">
                              Detected:{" "}
                              {new Date(conflict.detectedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Export Modal */}
        <ExportModal
          projectId={projectId}
          projectName={projectName}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />

        {/* Resolve Conflict Modal */}
        {resolveModal.isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
              onClick={() =>
                setResolveModal({
                  isOpen: false,
                  conflict: null,
                  mode: null,
                  manualNotes: "",
                })
              }
            ></div>

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${
                        resolveModal.mode === "ai"
                          ? "bg-blue-100"
                          : "bg-green-100"
                      }`}
                    >
                      {resolveModal.mode === "ai" ? (
                        <Bot
                          className={`w-6 h-6 ${
                            resolveModal.mode === "ai"
                              ? "text-blue-600"
                              : "text-green-600"
                          }`}
                        />
                      ) : (
                        <PenTool
                          className={`w-6 h-6 ${
                            resolveModal.mode === "ai"
                              ? "text-blue-600"
                              : "text-green-600"
                          }`}
                        />
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {resolveModal.mode === "ai"
                        ? "Resolve with AI"
                        : "Resolve Manually"}
                    </h3>
                  </div>
                  <button
                    onClick={() =>
                      setResolveModal({
                        isOpen: false,
                        conflict: null,
                        mode: null,
                        manualNotes: "",
                      })
                    }
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                  {resolveModal.mode === "ai" ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-blue-800">
                          AI will automatically generate resolution notes for
                          this conflict based on the conflicting requirements.
                        </p>
                      </div>

                      {resolveModal.conflict && (
                        <>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                              Conflict Description
                            </p>
                            <p className="text-sm text-slate-700">
                              {resolveModal.conflict.description}
                            </p>
                          </div>

                          {resolveModal.conflict.requirements &&
                            resolveModal.conflict.requirements.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                  Conflicting Requirements
                                </p>
                                <div className="space-y-2">
                                  {resolveModal.conflict.requirements.map(
                                    (req, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm"
                                      >
                                        {req}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <p className="text-sm text-green-800">
                          Enter your own resolution notes for this conflict. Be
                          specific about how to resolve the conflict between the
                          requirements.
                        </p>
                      </div>

                      {resolveModal.conflict && (
                        <>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                              Conflict Description
                            </p>
                            <p className="text-sm text-slate-700">
                              {resolveModal.conflict.description}
                            </p>
                          </div>

                          {resolveModal.conflict.requirements &&
                            resolveModal.conflict.requirements.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                  Conflicting Requirements
                                </p>
                                <div className="space-y-2">
                                  {resolveModal.conflict.requirements.map(
                                    (req, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm"
                                      >
                                        {req}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Resolution Notes
                            </label>
                            <textarea
                              value={resolveModal.manualNotes}
                              onChange={(e) =>
                                setResolveModal({
                                  ...resolveModal,
                                  manualNotes: e.target.value,
                                })
                              }
                              placeholder="Enter detailed resolution notes explaining how to resolve this conflict..."
                              className="w-full h-32 px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                              autoFocus
                            />
                            <p className="text-xs text-slate-500 mt-1">
                              {resolveModal.manualNotes.length} characters
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-200">
                  <button
                    onClick={() =>
                      setResolveModal({
                        isOpen: false,
                        conflict: null,
                        mode: null,
                        manualNotes: "",
                      })
                    }
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors font-medium text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={
                      resolveModal.mode === "ai"
                        ? confirmResolveWithAI
                        : confirmResolveManually
                    }
                    disabled={
                      loading ||
                      (resolveModal.mode === "manual" &&
                        (!resolveModal.manualNotes ||
                          !resolveModal.manualNotes.trim()))
                    }
                    className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                      resolveModal.mode === "ai"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-green-600 hover:bg-green-700"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading
                      ? "Processing..."
                      : resolveModal.mode === "ai"
                      ? "Resolve with AI"
                      : "Resolve Conflict"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConflictsDisplay;
