import React from "react";
import {
  Send,
  Loader2,
  Search,
  Grid3x3,
  Globe,
  Paperclip,
  X,
} from "lucide-react";
import ModelSelector from "./ModelSelector";

const ActionButton = ({ icon, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 transition-all duration-200"
    >
      {icon}
    </button>
  );
};

const WelcomeScreen = ({
  message,
  setMessage,
  attachedFiles,
  removeAttachedFile,
  handleSendMessage,
  handleKeyPress,
  openFileUpload,
  isLoading,
  isInitializing,
  currentProjectId,
  models,
  selectedModelId,
  onSelectModel,
}) => {
  return (
    <div className="flex-1 flex flex-col relative z-10">
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-20 right-10 w-80 h-80 bg-indigo-100/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-50/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>

        <div className="w-full max-w-3xl text-center relative z-10">
          {/* Enhanced title with animation */}
          <div className="flex items-center justify-center space-x-3 mb-8 animate-fade-in">
            <div className="relative">
              <span className="text-6xl font-bold" style={{ color: "#112D4E" }}>
                Fishy
              </span>
              <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent rounded-full"></div>
            </div>
            <span
              className="text-3xl font-bold text-white px-5 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              style={{ backgroundColor: "#4A7BA7" }}
            >
              pro
            </span>
          </div>

          {/* Compact Input Area */}
          <div className="max-w-2xl mx-auto relative z-10">
            {/* Attached Files Display */}
            {attachedFiles.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Attached Files ({attachedFiles.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {attachedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 bg-white px-3 py-2 rounded-md border text-sm"
                    >
                      <Paperclip className="w-3 h-3 text-gray-500" />
                      <span className="truncate max-w-32">{file.name}</span>
                      <button
                        onClick={() => removeAttachedFile(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 backdrop-blur-sm bg-white/80 animate-fade-in"
              style={{ animationDelay: "0.4s" }}
            >
              {/* Textarea */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={
                  isInitializing
                    ? "Initializing..."
                    : "How can I help you today?"
                }
                className="w-full px-4 pt-3 pb-1 bg-transparent focus:outline-none resize-none text-gray-800 placeholder-gray-500 text-base font-medium"
                rows={3}
                disabled={isLoading || isInitializing}
              />

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
                {/* Left — attach + model */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={openFileUpload}
                    disabled={isLoading || isInitializing}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Paperclip size={15} />
                    <span className="hidden sm:inline">Attach</span>
                  </button>

                  {/* Model Selector */}
                  {models && models.length > 0 && (
                    <div className="flex items-center" title="Select AI model">
                      <ModelSelector
                        models={models}
                        selectedModelId={selectedModelId}
                        onSelect={onSelectModel}
                        isLoading={isLoading}
                        compact={true}
                        dropUp={true}
                      />
                    </div>
                  )}
                </div>

                {/* Right — send button */}
                <button
                  onClick={handleSendMessage}
                  disabled={
                    (!message.trim() && attachedFiles.length === 0) ||
                    isLoading ||
                    isInitializing ||
                    !currentProjectId
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-white ${
                    (message.trim() || attachedFiles.length > 0) &&
                    !isLoading &&
                    !isInitializing
                      ? "hover:shadow-md opacity-100"
                      : "opacity-40 cursor-not-allowed"
                  }`}
                  style={{ backgroundColor: "#4A7BA7" }}
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <>
                      <span className="hidden sm:inline">Send</span>
                      <Send size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
