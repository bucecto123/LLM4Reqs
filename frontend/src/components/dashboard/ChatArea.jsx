import React from "react";
import { Loader2, Paperclip, FolderOpen, MessageCircle, X } from "lucide-react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import WelcomeScreen from "./WelcomeScreen";
import ThinkingIndicator from "../ThinkingIndicator.jsx";

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
}) => {
  const showWelcome =
    !selectedConversation || (messages.length === 0 && !isLoading);

  // Show "thinking" indicator (fish icon) while a request is in-flight or streaming
  const isThinking = isLoading || !!streamingMessageId;

  const modeBadgeStyles =
    chatMode === "project"
      ? { backgroundColor: "#DBEAFE", borderColor: "#93C5FD", color: "#1E40AF" }
      : { backgroundColor: "#DBE2EF", color: "#112D4E" };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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
          </div>
        </div>
      </header>

      {/* Chat Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {showWelcome ? (
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
                    shouldAnimate={msg.id === latestAIMessageId}
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
            />
          </>
        )}
      </div>

    </div>
  );
};

export default ChatArea;
