import React, { useState } from "react";
import { Loader2, Paperclip, FolderOpen, MessageCircle, X, BarChart2 } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import WelcomeScreen from "./WelcomeScreen";
import ThinkingIndicator from "../ThinkingIndicator.jsx";
import GraphView from "../GraphView.jsx";

const ChatArea = ({
  selectedConversation,
  messages,
  isLoading,
  isLoadingMessages,
  conversationDocuments,
  error,
  setError,
  message,
  setMessage,
  attachedFiles,
  setAttachedFiles,
  handleSendMessage,
  sendMessage,
  handleKeyPress,
  openFileUpload,
  removeAttachedFile,
  isInitializing,
  currentProjectId,
  chatMode,
  onSwitchToNormalMode,
  streamingMessageId,
  streamingMessage,
  isStreaming,
  isNewChatMode,
  latestAIMessageId,
  messagesEndRef,
  isMobile,
  isSidebarOpen,
  onToggleSidebar,
  onScroll,
  models,
  selectedModelId,
  onSelectModel,
  user,
  webSearchEnabled,
  setWebSearchEnabled,
  showContextPanel,
  setShowContextPanel,
  conflictCount = 0,
}) => {
  const [showGraphs, setShowGraphs] = useState(false);

  const showWelcome =
    !selectedConversation || (messages.length === 0 && !isLoading);

  // Show "thinking" indicator (fish icon) while a request is in-flight or streaming
  const isThinking = isLoading || !!streamingMessageId;

  const modeBadgeStyles =
    chatMode === "project"
      ? { backgroundColor: "#DBEAFE", borderColor: "#93C5FD", color: "#1E40AF" }
      : { backgroundColor: "#DBE2EF", color: "#112D4E" };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative z-[60]">
      {/* Header */}
      <header
        className={`bg-white border-b-2 border-indigo-100 py-6 ${
          isMobile && !isSidebarOpen ? "pl-14 pr-6" : "px-6"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4 flex-wrap">
            {/* Mode Badge */}
            {chatMode === "project" ? (
              <div
                className="flex items-center space-x-2 px-2 md:px-3 py-1.5 rounded-lg border text-xs md:text-sm flex-shrink-0"
                style={modeBadgeStyles}
              >
                <FolderOpen className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                <span className="font-medium truncate max-w-[100px] md:max-w-none">
                  Project Mode
                </span>
                <button
                  onClick={onSwitchToNormalMode}
                  className="ml-1 md:ml-2 hover:bg-blue-200 rounded p-0.5 transition-colors flex-shrink-0"
                  title="Switch to Normal Chat"
                  aria-label="Switch to Normal Chat"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                className="flex items-center space-x-2 px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm flex-shrink-0"
                style={modeBadgeStyles}
              >
                <MessageCircle className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">
                  Normal Chat
                </span>
              </div>
            )}

            <span className="text-xs md:text-sm text-gray-600 truncate max-w-[150px] sm:max-w-[200px] md:max-w-none flex-shrink-0">
              {selectedConversation
                ? selectedConversation.title || "New Chat"
                : "Fishy.ai"}
            </span>

            {/* Documents indicator */}
            {conversationDocuments.length > 0 && selectedConversation && (
              <div className="hidden lg:flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                <Paperclip className="w-3 h-3" />
                <span>
                  {conversationDocuments.length} document
                  {conversationDocuments.length !== 1 ? "s" : ""} loaded
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 md:space-x-3">
            {error && (
              <div className="text-red-600 text-xs md:text-sm bg-red-50 px-2 md:px-3 py-1 rounded-lg flex items-center space-x-2 max-w-[150px] sm:max-w-[200px] md:max-w-none">
                <span className="truncate">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700 flex-shrink-0"
                >
                  ×
                </button>
              </div>
            )}
            {selectedConversation && (
              <button
                onClick={() => setShowGraphs((v) => !v)}
                title={showGraphs ? "Back to chat" : "View graphs"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  showGraphs
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                <span className="hidden sm:inline">Graphs</span>
              </button>
            )}
            <button
              onClick={() => setShowContextPanel((v) => !v)}
              title={showContextPanel ? "Hide context panel" : "Show context panel"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                showContextPanel
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="text-base leading-none">📋</span>
              <span className="hidden sm:inline">Context</span>
            </button>
          </div>
        </div>
      </header>

      {/* Collapsible Context Panel */}
      {showContextPanel && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Context Panel</span>
            <button
              onClick={() => setShowContextPanel(false)}
              className="text-indigo-400 hover:text-indigo-700 text-xs"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-indigo-200">
              <span>🧠</span>
              <span className="text-gray-600">Memory</span>
              <span className="font-medium text-indigo-700">ON</span>
            </span>
            <span className={`flex items-center gap-1 px-2 py-1 rounded border ${
              webSearchEnabled ? "bg-green-100 border-green-300" : "bg-white border-gray-200"
            }`}>
              <span>🌐</span>
              <span className="text-gray-600">Web Search</span>
              <span className={`font-medium ${webSearchEnabled ? "text-green-700" : "text-gray-400"}`}>
                {webSearchEnabled ? "ON" : "OFF"}
              </span>
            </span>
            <span className={`flex items-center gap-1 px-2 py-1 rounded border ${
              conflictCount > 0 ? "bg-amber-100 border-amber-300" : "bg-white border-gray-200"
            }`}>
              <span>⚠️</span>
              <span className="text-gray-600">Conflicts</span>
              <span className={`font-medium ${conflictCount > 0 ? "text-amber-700" : "text-gray-400"}`}>
                {conflictCount > 0 ? `${conflictCount} unresolved` : "None"}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Chat Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {showGraphs ? (
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F8FAFC" }}>
            <GraphView messages={messages} />
          </div>
        ) : showWelcome ? (
          <WelcomeScreen
            message={message}
            setMessage={setMessage}
            attachedFiles={attachedFiles}
            removeAttachedFile={removeAttachedFile}
            handleSendMessage={handleSendMessage}
            handleKeyPress={handleKeyPress}
            openFileUpload={openFileUpload}
            isLoading={isLoading}
            isInitializing={isInitializing}
            currentProjectId={currentProjectId}
            models={models}
            selectedModelId={selectedModelId}
            onSelectModel={onSelectModel}
          />
        ) : (
          <>
            {/* Messages Area */}
            <div
              className="flex-1 overflow-y-auto p-4 md:p-6"
              onScroll={onScroll}
              style={{
                backgroundColor: chatMode === "project" ? "#F8FAFC" : "#FFFFFF",
                overscrollBehavior: "contain",
              }}
            >
              <div className="space-y-4 pb-4">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    streamingMessageId={streamingMessageId}
                    shouldAnimate={false}
                    user={user}
                  />
                ))}

                {isThinking && <ThinkingIndicator />}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <ChatInput
              message={message}
              setMessage={setMessage}
              attachedFiles={attachedFiles}
              removeAttachedFile={removeAttachedFile}
              sendMessage={sendMessage}
              handleKeyPress={handleKeyPress}
              openFileUpload={openFileUpload}
              isLoading={isLoading}
              isInitializing={isInitializing}
              chatMode={chatMode}
              currentProjectId={currentProjectId}
              models={models}
              selectedModelId={selectedModelId}
              onSelectModel={onSelectModel}
              webSearchEnabled={webSearchEnabled}
              setWebSearchEnabled={setWebSearchEnabled}
              conflictCount={conflictCount}
              onConflictBadgeClick={() => setShowContextPanel(true)}
            />
          </>
        )}
      </div>
    </div>
  );
};


export default ChatArea;
