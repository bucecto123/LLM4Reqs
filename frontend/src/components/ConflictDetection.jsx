import React, { useState, useEffect } from "react";
import { AlertTriangle, X, CheckCircle, Clock, ChevronDown, Shield } from "lucide-react";
import { apiFetch } from "../utils/auth";

export const ConflictsDisplay = ({ projectId, onClose }) => {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    severity: "",
    search: "",
  });
  const [isSeverityDropdownOpen, setIsSeverityDropdownOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadConflicts();
    }
  }, [projectId]);

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

  // Apply filters
  const filteredConflicts = conflicts.filter((conflict) => {
    // Filter by severity
    if (filters.severity && conflict.severity?.toLowerCase() !== filters.severity.toLowerCase()) {
      return false;
    }
    
    // Filter by search text
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesTitle = conflict.title?.toLowerCase().includes(searchLower);
      const matchesDescription = conflict.description?.toLowerCase().includes(searchLower);
      const matchesRequirements = conflict.requirements?.some(req => 
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
            onClick={() => setIsSeverityDropdownOpen(!isSeverityDropdownOpen)}
            className="flex items-center space-x-2 pl-3 pr-8 py-2.5 rounded-lg border-2 border-orange-200 bg-white text-orange-900 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all shadow-sm hover:border-orange-300 hover:shadow-md text-sm"
          >
            <Shield size={16} className="text-orange-600" />
            <span>{filters.severity === "" ? "All Severities" : filters.severity.charAt(0).toUpperCase() + filters.severity.slice(1)}</span>
            <ChevronDown size={16} className="absolute right-2 text-orange-600" />
          </button>
          
          {isSeverityDropdownOpen && (
            <div className="absolute top-full mt-2 w-48 bg-white rounded-lg border-2 border-orange-200 shadow-xl overflow-hidden z-50">
              <button
                onClick={() => {
                  setFilters({ ...filters, severity: "" });
                  setIsSeverityDropdownOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-sm ${
                  filters.severity === "" ? "bg-orange-50 text-orange-900" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <Shield size={16} className={filters.severity === "" ? "text-orange-600" : "text-gray-500"} />
                <span className="font-medium">All Severities</span>
              </button>
              <button
                onClick={() => {
                  setFilters({ ...filters, severity: "high" });
                  setIsSeverityDropdownOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-sm ${
                  filters.severity === "high" ? "bg-orange-50 text-orange-900" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <Shield size={16} className={filters.severity === "high" ? "text-red-600" : "text-gray-500"} />
                <span className="font-medium">High</span>
              </button>
              <button
                onClick={() => {
                  setFilters({ ...filters, severity: "medium" });
                  setIsSeverityDropdownOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-sm ${
                  filters.severity === "medium" ? "bg-orange-50 text-orange-900" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <Shield size={16} className={filters.severity === "medium" ? "text-orange-600" : "text-gray-500"} />
                <span className="font-medium">Medium</span>
              </button>
              <button
                onClick={() => {
                  setFilters({ ...filters, severity: "low" });
                  setIsSeverityDropdownOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-sm ${
                  filters.severity === "low" ? "bg-orange-50 text-orange-900" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <Shield size={16} className={filters.severity === "low" ? "text-yellow-600" : "text-gray-500"} />
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
                    severityBadgeColors[conflict.severity] || severityBadgeColors.medium;
                  const confColor =
                    confidenceColors[conflict.confidence] || confidenceColors.medium;

                  return (
                    <div
                      key={conflict.id || index}
                      className={`border-2 rounded-xl p-5 transition-all duration-200 bg-white/90 backdrop-blur-sm hover:shadow-xl ${bgColor}`}
                      style={{
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                      }}
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
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
                              <p className="text-xs font-semibold mb-1 text-blue-900">💡 Suggestion:</p>
                              <p className="text-sm text-blue-800">{conflict.suggestion}</p>
                            </div>
                          )}

                          {conflict.detectedAt && (
                            <p className="text-xs text-slate-500 mt-3">
                              Detected: {new Date(conflict.detectedAt).toLocaleString()}
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
      </div>
    </div>
  );
};

export default ConflictsDisplay;
