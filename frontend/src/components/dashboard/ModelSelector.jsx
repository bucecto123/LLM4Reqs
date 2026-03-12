import React from "react";
import { ChevronDown, Cpu, Zap, AlertTriangle } from "lucide-react";

const ModelSelector = ({
  models,
  selectedModelId,
  onSelect,
  isLoading,
  compact = false,
  iconOnly = false,
  dropUp = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showAllModels, setShowAllModels] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedModel =
    models.find((m) => m.model_id === selectedModelId) || models[0];

  if (!models || models.length === 0) return null;

  // Define featured models (top 2 recommended models)
  const featuredModelIds = [
    "llama-3.3-70b-versatile", // Top Groq model
    "gemma2-9b-it", // Top Gemini model
  ];

  // Separate featured and other models
  const featuredModels = models.filter((m) =>
    featuredModelIds.includes(m.model_id),
  );
  const otherModels = models.filter(
    (m) => !featuredModelIds.includes(m.model_id),
  );
  // Set a high z-index and ensure it creates a stacking context
  return (
    <div className="relative z-[9999]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${iconOnly ? "px-2" : ""}`}
        title={selectedModel ? selectedModel.name : "Select AI Model"}
      >
        {(compact || iconOnly) && <Cpu className="w-4 h-4 text-indigo-500" />}
        {!iconOnly && (
          <span className="font-medium truncate max-w-[150px]">
            {selectedModel ? selectedModel.name : "Loading..."}
          </span>
        )}
        {!iconOnly && (
          <ChevronDown
            className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? "transform rotate-180" : ""}`}
          />
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 w-72 bg-white rounded-xl shadow-lg border border-gray-100 z-[100] overflow-hidden ${dropUp ? "bottom-full mb-2" : "mt-2"}`}
        >
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
              Select Model
            </div>
            <div className="max-h-80 overflow-y-auto">
              {displayedModels.map((model) => (
                <button
                  key={model.model_id}
                  onClick={() => {
                    onSelect(model.model_id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start space-x-3 border-b border-gray-50 last:border-0 ${
                    selectedModelId === model.model_id ? "bg-indigo-50/50" : ""
                  }`}
                >
                  <div
                    className={`mt-0.5 p-1.5 rounded-md ${
                      model.provider === "groq"
                        ? "bg-orange-100 text-orange-600"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-medium ${
                          selectedModelId === model.model_id
                            ? "text-indigo-700"
                            : "text-gray-900"
                        }`}
                      >
                        {model.name}
                      </span>
                      {selectedModelId === model.model_id && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 block"></span>
                      )}
                    </div>
                    <div className="flex items-center mt-0.5 space-x-2">
                      <span className="text-xs text-gray-500 uppercase px-1.5 py-0.5 bg-gray-100 rounded">
                        {model.provider}
                      </span>
                      {!model.supports_tools && (
                        <span
                          className="flex items-center text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100"
                          title="This model does not support tools and may perform poorly with RAG"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          No Tools
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {/* Show all models toggle - like Claude */}
              {otherModels.length > 0 && (
                <button
                  onClick={() => setShowAllModels(!showAllModels)}
                  className="w-full text-center px-4 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors border-t border-gray-100"
                >
                  {showAllModels
                    ? `Show fewer models`
                    : `Show more models (${otherModels.length} more)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
