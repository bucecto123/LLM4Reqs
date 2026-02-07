import React from "react";
import {
  Send,
  Loader2,
  Search,
  Grid3x3,
  Globe,
  Paperclip,
  Mic,
  X,
} from "lucide-react";

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
}) => {
  return (
    <div className="flex-1 flex flex-col">
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
          <div className="max-w-2xl mx-auto">
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
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 p-4 backdrop-blur-sm bg-white/80 animate-fade-in"
              style={{ animationDelay: "0.4s" }}
            >
              <div className="flex items-center space-x-3">
                <button
                  onClick={openFileUpload}
                  disabled={isLoading || isInitializing}
                  className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 transition-all duration-200 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 active:scale-95"
                >
                  <Paperclip size={20} />
                </button>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    isInitializing
                      ? "Initializing..."
                      : "How can I help you today?"
                  }
                  className="flex-1 bg-transparent border-none outline-none resize-none text-gray-800 placeholder-gray-500 text-base font-medium"
                  rows={1}
                  disabled={isLoading || isInitializing}
                  style={{ minHeight: "24px", maxHeight: "120px" }}
                  onInput={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height =
                      Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={
                    (!message.trim() && attachedFiles.length === 0) ||
                    isLoading ||
                    isInitializing ||
                    !currentProjectId
                  }
                  className={`p-2.5 rounded-xl text-white transition-all duration-300 flex-shrink-0 shadow-md hover:shadow-lg transform ${
                    (message.trim() || attachedFiles.length > 0) &&
                    !isLoading &&
                    !isInitializing
                      ? "hover:scale-105 active:scale-95 opacity-100"
                      : "opacity-40 cursor-not-allowed"
                  }`}
                  style={{ backgroundColor: "#4A7BA7" }}
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Send size={18} />
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
