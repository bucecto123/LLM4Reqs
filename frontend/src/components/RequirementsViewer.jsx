import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  FileText,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Layers,
  Flag,
  Download,
  Calendar,
  Upload,
} from "lucide-react";
import { apiFetch } from "../utils/auth.js";
import { cache } from "../utils/cache.js";
import { AnimateIn } from './AnimateIn.jsx';
import ExportModal from "./ExportModal.jsx";
import ImportModal from "./ImportModal.jsx";

// Skeleton row placeholder shown while loading more items
function RequirementSkeletonRow() {
  return (
    <div className="border-2 rounded-xl p-5 bg-white/80 animate-pulse">
      <div className="flex items-start space-x-3">
        <div className="w-5 h-5 rounded bg-slate-200 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="flex space-x-2">
              <div className="h-5 w-16 rounded bg-slate-200" />
              <div className="h-5 w-20 rounded bg-slate-200" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-full rounded bg-slate-200" />
            <div className="h-3 w-3/4 rounded bg-slate-200" />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="h-3 w-32 rounded bg-slate-200" />
            <div className="h-3 w-24 rounded bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

const RequirementsViewer = React.memo(function RequirementsViewer({ projectId, onClose, refreshKey }) {
  const [requirements, setRequirements] = useState([]);       // full dataset for current filter
  const [displayedRequirements, setDisplayedRequirements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: "",
    priority: "",
    search: "",
  });
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [page, setPage] = useState(1);                          // next page to fetch
  const [totalCount, setTotalCount] = useState(0);              // total items (from API)
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef(null);
  const isFetchingRef = useRef(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    // Reset pagination state on filter changes so we start fresh
    setPage(1);
    setDisplayedRequirements([]);
    setRequirements([]);
    setHasMore(true);
    fetchRequirements();
    fetchProjectName();
    // eslint-disable-next-line
  }, [projectId, filters, refreshKey]);

  // Build a stable cache key per filter set — memoized to avoid recomputation on every render
  const cacheKey = useMemo(
    () => `requirements_${projectId}_${filters.type}_${filters.priority}_${filters.search}`,
    [projectId, filters.type, filters.priority, filters.search]
  );

  // Fetch a single page of requirements and append to displayed list
  const fetchPage = useCallback(async (pageNum) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const params = new URLSearchParams({
        type: filters.type,
        priority: filters.priority,
        search: filters.search,
        per_page: 10,
        page: pageNum,
      });

      const response = await apiFetch(
        `/api/projects/${projectId}/requirements?${params}`,
      );

      if (!response || response.success === false) {
        throw new Error(response?.message || "Failed to fetch requirements");
      }

      const newItems = response.data || [];
      const total = response.total || 0;

      setRequirements((prev) =>
        pageNum === 1 ? newItems : [...prev, ...newItems],
      );
      setDisplayedRequirements((prev) =>
        pageNum === 1 ? newItems : [...prev, ...newItems],
      );
      setTotalCount(total);
      setHasMore(pageNum < (response.last_page || 1));

      // Cache page 1 so subsequent visits are instant
      if (pageNum === 1) {
        cache.set(cacheKey, { data: newItems, total }, 5 * 60 * 1000, 'requirements');
      }
    } catch (err) {
      console.error("Failed to load requirements:", err);
      setError(err.message || "Failed to load requirements.");
    } finally {
      isFetchingRef.current = false;
    }
  }, [projectId, filters, cacheKey]);

  // IntersectionObserver for auto-load on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isFetchingRef.current) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) observer.unobserve(loadMoreRef.current);
    };
  }, [hasMore, isLoadingMore]);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    await fetchPage(nextPage);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

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

  const fetchRequirements = async () => {
    setIsLoading(true);
    setError(null);
    // Try cache first for instant page-1 render
    const cached = cache.getFresh(cacheKey, 'requirements');
    if (cached) {
      setRequirements(cached.data);
      setDisplayedRequirements(cached.data);
      setTotalCount(cached.total);
      setHasMore(cached.data.length < cached.total);
      setIsLoading(false);
      // Refresh in background
      fetchPage(1);
      return;
    }
    await fetchPage(1);
    setIsLoading(false);
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
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
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-white hover:bg-green-50 transition-colors font-medium text-green-600 hover:text-green-700 border border-green-200 shadow-sm hover:shadow-md"
          >
            <Download className="w-4 h-4 mr-2 inline" />
            Export
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-white hover:bg-indigo-50 transition-colors font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 shadow-sm hover:shadow-md"
          >
            <Upload className="w-4 h-4 mr-2 inline" />
            Import
          </button>
          <button
            onClick={() => {
              setPage(1);
              setDisplayedRequirements([]);
              setRequirements([]);
              setHasMore(true);
              fetchRequirements();
            }}
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
      <div className="p-4 bg-white/80 backdrop-blur-sm border-b border-slate-200 shadow-sm relative z-40">
        <div className="flex space-x-3">
          {/* Type Filter Dropdown */}
          <div className="relative z-50">
            <button
              onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              className="flex items-center space-x-2 pl-3 pr-8 py-2.5 rounded-lg border-2 border-indigo-200 bg-white text-indigo-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all shadow-sm hover:border-indigo-300 hover:shadow-md text-sm"
            >
              <Layers size={16} className="text-indigo-600" />
              <span>
                {filters.type === ""
                  ? "All Types"
                  : filters.type === "functional"
                    ? "Functional"
                    : "Non-Functional"}
              </span>
              <ChevronDown
                size={16}
                className="absolute right-2 text-indigo-600"
              />
            </button>

            {isTypeDropdownOpen && (
              <div className="absolute top-full mt-2 w-48 bg-white rounded-lg border-2 border-indigo-200 shadow-xl overflow-hidden z-50">
                <button
                  onClick={() => {
                    setFilters({ ...filters, type: "" });
                    setIsTypeDropdownOpen(false);
                    setPage(1);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-sm ${
                    filters.type === ""
                      ? "bg-indigo-50 text-indigo-900"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <Layers
                    size={16}
                    className={
                      filters.type === "" ? "text-indigo-600" : "text-gray-500"
                    }
                  />
                  <span className="font-medium">All Types</span>
                </button>
                <button
                  onClick={() => {
                    setFilters({ ...filters, type: "functional" });
                    setIsTypeDropdownOpen(false);
                    setPage(1);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-sm ${
                    filters.type === "functional"
                      ? "bg-indigo-50 text-indigo-900"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <Layers
                    size={16}
                    className={
                      filters.type === "functional"
                        ? "text-indigo-600"
                        : "text-gray-500"
                    }
                  />
                  <span className="font-medium">Functional</span>
                </button>
                <button
                  onClick={() => {
                    setFilters({ ...filters, type: "non-functional" });
                    setIsTypeDropdownOpen(false);
                    setPage(1);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-sm ${
                    filters.type === "non-functional"
                      ? "bg-indigo-50 text-indigo-900"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <Layers
                    size={16}
                    className={
                      filters.type === "non-functional"
                        ? "text-indigo-600"
                        : "text-gray-500"
                    }
                  />
                  <span className="font-medium">Non-Functional</span>
                </button>
              </div>
            )}
          </div>

          {/* Priority Filter Dropdown */}
          <div className="relative z-50">
            <button
              onClick={() => setIsPriorityDropdownOpen(!isPriorityDropdownOpen)}
              className="flex items-center space-x-2 pl-3 pr-8 py-2.5 rounded-lg border-2 border-indigo-200 bg-white text-indigo-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all shadow-sm hover:border-indigo-300 hover:shadow-md text-sm"
            >
              <Flag size={16} className="text-indigo-600" />
              <span>
                {filters.priority === ""
                  ? "All Priorities"
                  : filters.priority.charAt(0).toUpperCase() +
                    filters.priority.slice(1)}
              </span>
              <ChevronDown
                size={16}
                className="absolute right-2 text-indigo-600"
              />
            </button>

            {isPriorityDropdownOpen && (
              <div className="absolute top-full mt-2 w-48 bg-white rounded-lg border-2 border-indigo-200 shadow-xl overflow-hidden z-50">
                <button
                  onClick={() => {
                    setFilters({ ...filters, priority: "" });
                    setIsPriorityDropdownOpen(false);
                    setPage(1);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-sm ${
                    filters.priority === ""
                      ? "bg-indigo-50 text-indigo-900"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <Flag
                    size={16}
                    className={
                      filters.priority === ""
                        ? "text-indigo-600"
                        : "text-gray-500"
                    }
                  />
                  <span className="font-medium">All Priorities</span>
                </button>
                <button
                  onClick={() => {
                    setFilters({ ...filters, priority: "high" });
                    setIsPriorityDropdownOpen(false);
                    setPage(1);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-sm ${
                    filters.priority === "high"
                      ? "bg-indigo-50 text-indigo-900"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <Flag
                    size={16}
                    className={
                      filters.priority === "high"
                        ? "text-red-600"
                        : "text-gray-500"
                    }
                  />
                  <span className="font-medium">High</span>
                </button>
                <button
                  onClick={() => {
                    setFilters({ ...filters, priority: "medium" });
                    setIsPriorityDropdownOpen(false);
                    setPage(1);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-sm ${
                    filters.priority === "medium"
                      ? "bg-indigo-50 text-indigo-900"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <Flag
                    size={16}
                    className={
                      filters.priority === "medium"
                        ? "text-orange-600"
                        : "text-gray-500"
                    }
                  />
                  <span className="font-medium">Medium</span>
                </button>
                <button
                  onClick={() => {
                    setFilters({ ...filters, priority: "low" });
                    setIsPriorityDropdownOpen(false);
                    setPage(1);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors text-sm ${
                    filters.priority === "low"
                      ? "bg-indigo-50 text-indigo-900"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <Flag
                    size={16}
                    className={
                      filters.priority === "low"
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
            placeholder="Search requirements..."
            className="px-4 py-2.5 rounded-lg border-2 border-indigo-200 bg-white shadow-sm hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all flex-1 text-sm text-slate-700 placeholder-slate-400"
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
        ) : displayedRequirements.length === 0 ? (
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
          <AnimateIn direction="up" delayMs={40}>
          <div className="space-y-3">
            {displayedRequirements.map((req) => {
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
                priorityColors[req.priority] || "border-gray-300 bg-gray-50/50";
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
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">
                          Requirement #{req.requirement_number || req.id}
                        </h4>
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
          </AnimateIn>
        )}
      </div>
      {/* Infinite scroll load-more footer */}
      <div className="p-4 bg-white/90 backdrop-blur-sm border-t border-slate-200 shadow-lg">
        {totalCount > 0 && (
          <p className="text-xs text-slate-500 text-center mb-2">
            Showing {displayedRequirements.length} of {totalCount} requirements
          </p>
        )}
        <div ref={loadMoreRef} className="flex justify-center py-2">
          {isLoadingMore ? (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              <span className="text-sm font-medium">Loading more...</span>
            </div>
          ) : hasMore ? (
            <button
              onClick={handleLoadMore}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              Load more ({totalCount - displayedRequirements.length} remaining)
            </button>
          ) : displayedRequirements.length > 0 ? (
            <span className="text-sm text-slate-400 italic">
              All requirements loaded
            </span>
          ) : null}
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
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="px-6 py-4 border-b flex items-center justify-between"
                style={{ backgroundColor: "#112D4E", borderColor: "#0a1f33" }}
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-white" />
                  <h3 className="text-lg font-semibold text-white">
                    Requirement Details
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedRequirement(null)}
                  className="text-white hover:text-gray-300 text-xl"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {/* ID Badge */}
                <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600 uppercase">
                      Requirement ID
                    </span>
                    <span
                      className="px-3 py-1 rounded-md font-semibold"
                      style={{ backgroundColor: "#4A7BA7", color: "white" }}
                    >
                      #
                      {selectedRequirement.requirement_number ||
                        selectedRequirement.id}
                    </span>
                  </div>
                </div>

                {/* Type & Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-2">
                      Type
                    </div>
                    <span
                      className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${
                        selectedRequirement.requirement_type === "functional"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {selectedRequirement.requirement_type}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-2">
                      Priority
                    </div>
                    <span
                      className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${
                        selectedRequirement.priority === "high"
                          ? "bg-red-100 text-red-700"
                          : selectedRequirement.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {selectedRequirement.priority?.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Confidence Score */}
                <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-2">
                    Confidence Score
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${
                            (selectedRequirement.confidence_score || 0) * 100
                          }%`,
                          backgroundColor: "#4A7BA7",
                        }}
                      ></div>
                    </div>
                    <span className="font-semibold text-sm text-gray-700 min-w-[50px] text-right">
                      {(
                        (selectedRequirement.confidence_score || 0) * 100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>

                {/* Full Text */}
                <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-2">
                    Requirement Text
                  </div>
                  <div className="text-gray-800 leading-relaxed text-sm bg-white p-3 rounded border border-gray-200">
                    {selectedRequirement.requirement_text}
                  </div>
                </div>

                {/* Source Information */}
                <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-3">
                    Source Information
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-start space-x-2">
                      <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">
                          Document
                        </div>
                        <div className="text-gray-800 text-sm">
                          {selectedRequirement.document?.original_filename ||
                            selectedRequirement.document?.title ||
                            "Unknown"}
                        </div>
                      </div>
                    </div>
                    {selectedRequirement.created_at && (
                      <div className="flex items-start space-x-2">
                        <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <div className="text-xs text-gray-500 mb-0.5">
                            Extracted
                          </div>
                          <div className="text-gray-800 text-sm">
                            {new Date(
                              selectedRequirement.created_at,
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Export Modal */}
      <ExportModal
        projectId={projectId}
        projectName={projectName}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Import Modal */}
      {isImportModalOpen && (
        <ImportModal
          projectId={projectId}
          onClose={() => setIsImportModalOpen(false)}
          onImport={(count) => {
            setIsImportModalOpen(false);
            // Bust the requirements cache so the import is reflected immediately
            cache.invalidateNamespace('requirements');
            // Refresh requirements list
            setPage(1);
            setDisplayedRequirements([]);
            setRequirements([]);
            setHasMore(true);
            fetchRequirements();
          }}
        />
      )}
    </div>
  );
});

export default RequirementsViewer;
