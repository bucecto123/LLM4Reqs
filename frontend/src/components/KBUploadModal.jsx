import React, { useState, useEffect } from "react";
import { X, Upload, FileText, Loader2, Check, AlertCircle } from "lucide-react";
import { apiFetch } from "../utils/auth";
import echo from "../utils/echo";

const KBUploadModal = ({ onClose, onUpload, projectId, projectName }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    completed: 0,
    total: 0,
  });
  const [error, setError] = useState(null);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStage, setBuildStage] = useState("");
  const [isListening, setIsListening] = useState(false);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    addFiles(files);
  };

  const addFiles = (files) => {
    const validFiles = files.filter((file) => {
      const isValidType = ["pdf", "doc", "docx", "txt", "md"].some((ext) =>
        file.name.toLowerCase().endsWith(`.${ext}`)
      );
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });
    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  // Listen to KB build progress via WebSocket
  useEffect(() => {
    if (!isListening || !projectId) return;

    console.log(`Subscribing to project.${projectId} channel`);

    // Subscribe to project-specific channel
    const channel = echo.channel(`project.${projectId}`);

    // Listen for KB progress updates
    channel.listen(".kb.progress", (data) => {
      console.log("KB Progress Update:", data);

      setBuildProgress(data.progress || 0);
      setBuildStage(data.stage || "");

      // Handle completion or failure
      if (data.status === "ready") {
        setIsListening(false);
        setIsUploading(false);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else if (data.status === "failed") {
        setIsListening(false);
        setIsUploading(false);
        setError(data.error || "KB build failed");
      }
    });

    // Cleanup: unsubscribe when component unmounts or listening stops
    return () => {
      console.log(`Unsubscribing from project.${projectId} channel`);
      echo.leaveChannel(`project.${projectId}`);
    };
  }, [isListening, projectId, onClose]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress({ completed: 0, total: selectedFiles.length });

    try {
      await onUpload(selectedFiles, (completed) => {
        setUploadProgress({ completed, total: selectedFiles.length });
      });

      // Start listening for build progress via WebSocket
      setIsListening(true);
      setBuildProgress(0);
      setBuildStage("initializing");
    } catch (err) {
      console.error("KB upload failed:", err);
      setError(err.message || "Failed to upload documents. Please try again.");
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getBuildStageText = (stage) => {
    const stageTexts = {
      initializing: "Initializing build...",
      building_index: "Building Knowledge Base",
      detecting_conflicts: "Initializing Conflict Detection",
      processing_conflicts: "Detecting Conflicts",
      saving_conflicts: "Saving Results",
      completed: "Build Complete!",
      failed: "Build Failed",
    };
    return stageTexts[stage] || "Processing...";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold" style={{ color: "#112D4E" }}>
              Build Knowledge Base
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload documents for{" "}
              <span className="font-semibold">{projectName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <Upload
              size={48}
              className={`mx-auto mb-4 ${
                isDragging ? "text-blue-500" : "text-gray-400"
              }`}
            />
            <p
              className="text-lg font-medium mb-2"
              style={{ color: "#112D4E" }}
            >
              Drop documents here or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Support for PDF, DOC, DOCX, TXT, MD files (max 10MB each)
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.md"
              onChange={handleFileSelect}
              className="hidden"
              id="kb-file-input"
              disabled={isUploading}
            />
            <label
              htmlFor="kb-file-input"
              className={`inline-block px-6 py-2 rounded-lg font-medium cursor-pointer transition-all ${
                isUploading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:shadow-md"
              }`}
              style={{ backgroundColor: "#4A7BA7", color: "#FFFFFF" }}
            >
              Select Files
            </label>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold" style={{ color: "#112D4E" }}>
                  Selected Files ({selectedFiles.length})
                </h3>
                {!isUploading && (
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <FileText
                        size={20}
                        className="text-gray-500 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "#112D4E" }}
                        >
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    {!isUploading ? (
                      <button
                        onClick={() => removeFile(index)}
                        className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <X size={16} className="text-gray-600" />
                      </button>
                    ) : index < uploadProgress.completed ? (
                      <Check size={20} className="text-green-600 ml-2" />
                    ) : (
                      <Loader2
                        size={20}
                        className="text-blue-600 animate-spin ml-2"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && !isListening && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: "#112D4E" }}
                >
                  Uploading documents...
                </span>
                <span className="text-sm text-gray-600">
                  {uploadProgress.completed} / {uploadProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (uploadProgress.completed / uploadProgress.total) * 100
                    }%`,
                    backgroundColor: "#4A7BA7",
                  }}
                />
              </div>
            </div>
          )}

          {/* KB Build Progress */}
          {isListening && (
            <div className="mt-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: "#112D4E" }}
                >
                  {getBuildStageText(buildStage)}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "#4A7BA7" }}
                >
                  {buildProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                  style={{
                    width: `${buildProgress}%`,
                    background:
                      "linear-gradient(90deg, #9333ea 0%, #7c3aed 50%, #6366f1 100%)",
                  }}
                >
                  {buildProgress > 10 && (
                    <Loader2 size={12} className="text-white animate-spin" />
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center space-x-2 text-xs text-gray-600">
                {buildStage === "building_index" && (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>
                      Processing documents and building knowledge base...
                    </span>
                  </>
                )}
                {buildStage === "detecting_conflicts" && (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Starting conflict detection...</span>
                  </>
                )}
                {buildStage === "processing_conflicts" && (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Analyzing requirements for conflicts...</span>
                  </>
                )}
                {buildStage === "saving_conflicts" && (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving detected conflicts...</span>
                  </>
                )}
                {buildStage === "completed" && (
                  <>
                    <Check size={14} className="text-green-600" />
                    <span className="text-green-600">
                      Build completed successfully!
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle
                size={20}
                className="text-red-600 flex-shrink-0 mt-0.5"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">
                  Upload Failed
                </p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between rounded-b-xl">
          <p className="text-sm text-gray-600">
            {selectedFiles.length === 0
              ? "No files selected"
              : `${selectedFiles.length} file${
                  selectedFiles.length !== 1 ? "s" : ""
                } ready to upload`}
          </p>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className="px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md flex items-center space-x-2"
              style={{ backgroundColor: "#4A7BA7", color: "#FFFFFF" }}
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Upload & Build KB</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KBUploadModal;
