import React, { useState } from "react";
import {
  Download,
  FileText,
  File,
  BookOpen,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "../utils/auth.js";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8001";

export default function ExportModal({
  projectId,
  projectName,
  onClose,
  isOpen,
}) {
  const [exportFormat, setExportFormat] = useState("pdf");
  const [exportContent, setExportContent] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);

  const formatOptions = [
    {
      value: "pdf",
      label: "PDF Document",
      icon: FileText,
      description: "Professional PDF report with formatting",
    },
    {
      value: "word",
      label: "Word Document",
      icon: File,
      description: "Microsoft Word document (.docx)",
    },
    {
      value: "markdown",
      label: "Markdown",
      icon: BookOpen,
      description: "Plain text with markdown formatting",
    },
  ];

  const contentOptions = [
    {
      value: "all",
      label: "Everything",
      description: "Requirements + Conflicts + Project Overview",
    },
    {
      value: "requirements",
      label: "Requirements Only",
      description: "Only the extracted requirements",
    },
    {
      value: "conflicts",
      label: "Conflicts Only",
      description: "Only the detected conflicts",
    },
  ];

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportStatus(null);

    try {
      // Create the export URL with query parameters
      const params = new URLSearchParams({
        format: exportFormat,
        include: exportContent,
      });

      console.log("Starting export:", {
        projectId,
        exportFormat,
        exportContent,
      });

      const response = await fetch(
        `${API_BASE}/api/projects/${projectId}/export?${params}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            Accept: "*/*",
          },
        }
      );

      console.log("Export response status:", response.status);
      console.log(
        "Export response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        let errorMessage = "Export failed";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${projectName}_export.${
        exportFormat === "word" ? "docx" : exportFormat
      }`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(
          /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
        );
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, "");
        }
      }

      console.log("Downloading file:", filename);

      // Download the file
      const blob = await response.blob();
      console.log("Blob size:", blob.size, "Blob type:", blob.type);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportStatus({
        type: "success",
        message: "Export completed successfully!",
      });

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Export error:", error);
      setExportStatus({
        type: "error",
        message: error.message || "Failed to export. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Export Project</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={isExporting}
          >
            <span className="sr-only">Close</span>✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Project Info */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-semibold text-slate-800 mb-1">
                Project: {projectName}
              </h4>
              <p className="text-sm text-slate-600">
                Choose your export format and what content to include
              </p>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Export Format
              </label>
              <div className="grid grid-cols-1 gap-3">
                {formatOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <label
                      key={option.value}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                        exportFormat === option.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={option.value}
                        checked={exportFormat === option.value}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="sr-only"
                        disabled={isExporting}
                      />
                      <IconComponent
                        className={`w-5 h-5 mr-3 ${
                          exportFormat === option.value
                            ? "text-blue-600"
                            : "text-slate-400"
                        }`}
                      />
                      <div className="flex-1">
                        <div
                          className={`font-medium ${
                            exportFormat === option.value
                              ? "text-blue-900"
                              : "text-slate-700"
                          }`}
                        >
                          {option.label}
                        </div>
                        <div className="text-sm text-slate-600">
                          {option.description}
                        </div>
                      </div>
                      {exportFormat === option.value && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Content Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                What to Include
              </label>
              <div className="grid grid-cols-1 gap-3">
                {contentOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                      exportContent === option.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="content"
                      value={option.value}
                      checked={exportContent === option.value}
                      onChange={(e) => setExportContent(e.target.value)}
                      className="sr-only"
                      disabled={isExporting}
                    />
                    <div className="flex-1">
                      <div
                        className={`font-medium ${
                          exportContent === option.value
                            ? "text-blue-900"
                            : "text-slate-700"
                        }`}
                      >
                        {option.label}
                      </div>
                      <div className="text-sm text-slate-600">
                        {option.description}
                      </div>
                    </div>
                    {exportContent === option.value && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Status Message */}
            {exportStatus && (
              <div
                className={`p-4 rounded-lg border ${
                  exportStatus.type === "success"
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                <div className="flex items-center">
                  {exportStatus.type === "success" ? (
                    <CheckCircle className="w-5 h-5 mr-2" />
                  ) : (
                    <AlertCircle className="w-5 h-5 mr-2" />
                  )}
                  {exportStatus.message}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                isExporting
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
              }`}
            >
              {isExporting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-500 border-t-transparent mr-2"></div>
                  Exporting...
                </div>
              ) : (
                <div className="flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  Export{" "}
                  {formatOptions.find((f) => f.value === exportFormat)?.label}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
