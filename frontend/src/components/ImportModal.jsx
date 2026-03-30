import React, { useState, useRef } from "react";
import { apiFetch } from "../utils/auth.js";

export default function ImportModal({ projectId, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);

    // Read first few lines for preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split("\n").slice(0, 6);
      setPreview(lines.join("\n"));
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await fetch(`/api/projects/${projectId}/requirements/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("api_token")}`,
        },
        body: formData,
      }).then((r) => r.json());

      setResult(data);
      if (data.imported > 0) {
        onImport(data.imported);
      }
    } catch (err) {
      setError(err.message || "Import failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
        <h2 className="text-xl font-bold mb-4 text-slate-800">Import Requirements from CSV</h2>

        {!result ? (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Upload a CSV file with columns: <code className="bg-gray-100 px-1 rounded">title</code>, <code className="bg-gray-100 px-1 rounded">requirement_text</code>, <code className="bg-gray-100 px-1 rounded">requirement_type</code>, <code className="bg-gray-100 px-1 rounded">priority</code>, <code className="bg-gray-100 px-1 rounded">status</code>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>

            {preview && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-1">Preview (first 5 rows):</p>
                <pre className="text-xs bg-gray-50 border rounded p-2 overflow-x-auto whitespace-pre font-mono">
                  {preview}
                </pre>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!file || isLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {isLoading ? "Importing..." : "Import"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-2xl">&#x2705;</span>
                <div>
                  <p className="font-semibold text-green-800">{result.imported} requirement(s) imported</p>
                  {result.skipped > 0 && (
                    <p className="text-sm text-green-600">{result.skipped} row(s) skipped</p>
                  )}
                </div>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Warnings:</p>
                  <ul className="text-xs text-amber-600 space-y-0.5">
                    {result.errors.slice(0, 5).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>...and {result.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
