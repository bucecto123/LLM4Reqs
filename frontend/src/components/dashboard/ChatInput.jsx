import React from "react";
import { Send, Loader2, Paperclip, X } from "lucide-react";
import ModelSelector from "./ModelSelector";

const ChatInput = ({
  message,
  setMessage,
  attachedFiles,
  removeAttachedFile,
  sendMessage,
  handleKeyPress,
  openFileUpload,
  isLoading,
  isInitializing,
  chatMode,
  currentProjectId,
  models,
  selectedModelId,
  onSelectModel,
  webSearchEnabled,
  setWebSearchEnabled,
  conflictCount = 0,
  onConflictBadgeClick = () => {},
}) => {
  const isDisabled = isLoading || isInitializing;
  const canSend =
    (message.trim() || attachedFiles.length > 0) &&
    !isDisabled &&
    currentProjectId;

  const handleTextareaInput = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="max-w-4xl mx-auto">
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
                    aria-label="Remove file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Input with toolbar */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-300">
          {/* Textarea */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            onInput={handleTextareaInput}
            placeholder={chatMode === "project" ? "Ask about this project..." : "Type your message here..."}
            className="w-full px-4 pt-3 pb-1 bg-transparent focus:outline-none resize-none text-gray-800 placeholder-gray-400 text-sm"
            rows={3}
            disabled={isDisabled}
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
            {/* Left — attach + model */}
            <div className="flex items-center gap-1">
              <button
                onClick={openFileUpload}
                disabled={isDisabled}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Attach file"
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

              {/* Web Search Toggle */}
              <button
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                title={webSearchEnabled ? "Web Search: ON — click to disable" : "Web Search: OFF — click to enable"}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  webSearchEnabled
                    ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-200"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <span className="text-base leading-none">🌐</span>
                <span className="hidden sm:inline">Web</span>
              </button>

              {/* Conflicts Badge */}
              {conflictCount > 0 && (
                <button
                  onClick={onConflictBadgeClick}
                  title={`${conflictCount} unresolved conflicts`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 transition-all"
                >
                  <span className="text-base leading-none">⚠️</span>
                  <span className="hidden sm:inline">{conflictCount}</span>
                </button>
              )}
            </div>

            {/* Right — send button */}
            <button
              onClick={sendMessage}
              disabled={!canSend}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-white ${
                canSend
                  ? "hover:shadow-md opacity-100"
                  : "opacity-40 cursor-not-allowed"
              }`}
              style={{ backgroundColor: "#4A7BA7" }}
              aria-label="Send message"
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
  );
};

export default ChatInput;
