import React, { useState, useEffect } from "react";
import { FileText, AlertCircle, CheckCircle } from "lucide-react";
import { apiFetch } from "../utils/auth.js";

export default function RequirementsViewer({ projectId, onClose, refreshKey }) {
  const [requirements, setRequirements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: "",
    priority: "",
    search: "",
  });
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchRequirements();
    // eslint-disable-next-line
  }, [projectId, filters, page, refreshKey]);

  const fetchRequirements = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        type: filters.type,
        priority: filters.priority,
        search: filters.search,
        per_page: 10,
        page,
      });
      console.log("Fetching requirements with params:", {
        projectId,
        filters,
        page,
        params: params.toString(),
      });

      const response = await apiFetch(
        `/api/projects/${projectId}/requirements?${params}`
      );
      console.log("Requirements API Response:", {
        success: response?.success,
        total: response?.total,
        dataLength: response?.data?.length,
        fullResponse: response,
      });

      if (!response || response.success === false) {
        console.error("API Error Response:", response);
        throw new Error(response?.message || "Failed to fetch requirements");
      }

      // Ensure we're always using the data array from the response
      const requirementsData = response.data || [];
      console.log("Requirements data:", requirementsData); // Debug log

      setRequirements(requirementsData);
      setTotalPages(response.last_page || 1);
    } catch (err) {
      console.error("Failed to load requirements:", err);
      setError(err.message || "Failed to load requirements.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  };

  return (
    <div
      className="fixed right-0 top-0 h-full w-1/2 bg-gradient-to-br from-slate-50 to-blue-50 shadow-2xl z-40 flex flex-col border-l border-slate-200"
      style={{ minWidth: 400 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 bg-white/90 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Requirements
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchRequirements}
            className="px-4 py-2 rounded-lg bg-white hover:bg-blue-50 transition-colors font-medium text-blue-600 hover:text-blue-700 border border-blue-200 shadow-sm hover:shadow-md"
          >
            Refresh
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 transition-colors font-medium text-slate-600 hover:text-slate-900 border border-slate-300 shadow-sm hover:shadow-md"
          >
            Close
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="p-4 bg-white/80 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="flex space-x-3">
          <select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium"
          >
            <option value="">All Types</option>
            <option value="functional">Functional</option>
            <option value="non-functional">Non-Functional</option>
          </select>
          <select
            name="priority"
            value={filters.priority}
            onChange={handleFilterChange}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium"
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Search requirements..."
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all flex-1 text-sm"
          />
        </div>
      </div>
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading requirements...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-red-900 font-medium">
                  Error Loading Requirements
                </h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        ) : requirements.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No Requirements Found
            </h3>
            <p className="text-gray-600 text-sm">
              No requirements match your current filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requirements.map((req) => {
              const priorityColors = {
                high: "border-red-300 bg-red-50/50",
                medium: "border-orange-300 bg-orange-50/50",
                low: "border-yellow-300 bg-yellow-50/50",
              };
              const priorityBadgeColors = {
                high: "bg-red-100 text-red-800",
                medium: "bg-orange-100 text-orange-800",
                low: "bg-yellow-100 text-yellow-800",
              };
              const typeColors = {
                functional: "bg-blue-100 text-blue-800",
                "non-functional": "bg-purple-100 text-purple-800",
              };

              const borderColor =
                priorityColors[req.priority] ||
                "border-gray-300 bg-gray-50/50";
              const badgeColor =
                priorityBadgeColors[req.priority] ||
                "bg-gray-100 text-gray-800";
              const typeColor =
                typeColors[req.requirement_type] || "bg-gray-100 text-gray-800";

              return (
                <div
                  key={req.id}
                  className={`border-2 rounded-xl p-5 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 bg-white/90 backdrop-blur-sm ${borderColor}`}
                  onClick={() => setSelectedRequirement(req)}
                  style={{
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">Requirement #{req.id}</h4>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-xs px-2 py-1 rounded font-medium ${badgeColor}`}
                          >
                            {req.priority?.toUpperCase() || "MEDIUM"}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded font-medium ${typeColor}`}
                          >
                            {req.requirement_type || "N/A"}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm mb-3">{req.requirement_text}</p>

                      <div className="flex items-center justify-between text-xs opacity-70">
                        <div className="flex items-center space-x-4">
                          <span>
                            Confidence: {req.confidence_score || "N/A"}
                          </span>
                          <span>
                            Source:{" "}
                            {req.document?.title ||
                              req.document_id ||
                              "Unknown"}
                          </span>
                        </div>
                        {req.created_at && (
                          <span>
                            Extracted:{" "}
                            {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Pagination */}
      <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-slate-200 shadow-lg flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">
          Page {page} of {totalPages}
        </span>
        <div className="flex space-x-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm shadow-sm hover:shadow-md"
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm shadow-sm hover:shadow-md"
          >
            Next
          </button>
        </div>
      </div>
      {/* Detail Modal */}
      {selectedRequirement && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setSelectedRequirement(null)}
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
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Requirement Details
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedRequirement(null)}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto flex-1 space-y-3">
                {/* ID Badge */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Requirement ID
                    </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold">
                      #{selectedRequirement.id}
                    </span>
                  </div>
                </div>

                {/* Type & Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Type
                    </div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      selectedRequirement.requirement_type === "functional"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {selectedRequirement.requirement_type}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Priority
                    </div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      selectedRequirement.priority === "high"
                        ? "bg-red-100 text-red-700"
                        : selectedRequirement.priority === "medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {selectedRequirement.priority?.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Confidence Score */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Confidence Score
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(selectedRequirement.confidence_score || 0) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="font-bold text-slate-700 text-sm min-w-[50px] text-right">
                      {((selectedRequirement.confidence_score || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Full Text */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Requirement Text
                  </div>
                  <div className="text-slate-700 leading-relaxed text-sm bg-white p-3 rounded border border-slate-200">
                    {selectedRequirement.requirement_text}
                  </div>
                </div>

                {/* Source Document & Extracted Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Source Document
                    </div>
                    <div className="text-slate-700 text-sm font-medium">
                      {selectedRequirement.document?.title ||
                        selectedRequirement.document_id ||
                        "Unknown"}
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Extracted At
                    </div>
                    <div className="text-slate-700 text-sm font-medium">
                      {selectedRequirement.created_at
                        ? new Date(selectedRequirement.created_at).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                {selectedRequirement.document && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Document Metadata
                    </div>
                    <pre className="bg-slate-900 text-green-400 p-3 rounded text-xs overflow-x-auto font-mono max-h-40">
                      {JSON.stringify(selectedRequirement.document, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
