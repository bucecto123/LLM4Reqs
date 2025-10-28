import React from 'react';
import { MessageSquare, Loader2, Paperclip, FolderOpen, MessageCircle, X, Database, Upload } from 'lucide-react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';

const ChatArea = ({
  selectedConversation,
  messages,
  isLoading,
  isLoadingMessages,
  conversationDocuments,
  error,
  setError,
  // Message sending
  message,
  setMessage,
  attachedFiles,
  setAttachedFiles,
  handleSendMessage,
  sendMessage,
  handleKeyPress,
  // File upload
  openFileUpload,
  removeAttachedFile,
  // State
  isInitializing,
  currentProjectId,
  // Chat mode
  chatMode,
  currentProject,
  onSwitchToNormalMode,
  // KB management
  onOpenKBUpload,
  // Requirements viewer
  onToggleRequirements,
  // Streaming props
  streamingMessageId,
  isNewChatMode,
  // Scroll ref
  messagesEndRef
}) => {
  // Show WelcomeScreen if no conversation is selected OR if conversation has no messages
  const showWelcome = !selectedConversation || (messages.length === 0 && !isLoading);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header 
        className="border-b px-6 py-4"
        style={{ 
          backgroundColor: chatMode === 'project' ? '#F0F9FF' : '#FFFFFF',
          borderColor: chatMode === 'project' ? '#BFDBFE' : '#E5E7EB'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mode Badge */}
            {chatMode === 'project' && currentProject ? (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border" style={{ backgroundColor: '#DBEAFE', borderColor: '#93C5FD', color: '#1E40AF' }}>
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm font-medium">{currentProject.name}</span>
                <button
                  onClick={onSwitchToNormalMode}
                  className="ml-2 hover:bg-blue-200 rounded p-0.5 transition-colors"
                  title="Switch to Normal Chat"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Normal Chat</span>
              </div>
            )}
            
            <span className="text-sm text-gray-600">
              {selectedConversation ? selectedConversation.title || 'New Chat' : 'Fishy.ai'}
            </span>
            
            {/* Documents indicator */}
            {conversationDocuments.length > 0 && selectedConversation && (
              <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                <Paperclip className="w-3 h-3" />
                <span>{conversationDocuments.length} document{conversationDocuments.length !== 1 ? 's' : ''} loaded</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Project Mode Buttons */}
            {chatMode === 'project' && currentProjectId && (
              <>
                {/* View Requirements Button */}
                <button
                  onClick={onToggleRequirements}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all hover:shadow-md"
                  style={{ 
                    backgroundColor: '#3B82F6',
                    borderColor: '#3B82F6',
                    color: '#FFFFFF'
                  }}
                  title="View project requirements"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium">View Requirements</span>
                </button>
                
                {/* Knowledge Base Upload Button */}
                <button
                  onClick={onOpenKBUpload}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all hover:shadow-md"
                  style={{ 
                    backgroundColor: '#FFFFFF',
                    borderColor: '#3B82F6',
                    color: '#3B82F6'
                  }}
                  title="Upload documents to Knowledge Base"
                >
                  <Database className="w-4 h-4" />
                  <span className="text-sm font-medium">Build KB</span>
                </button>
              </>
            )}
            
            {error && (
              <div className="text-red-600 text-sm bg-red-50 px-3 py-1 rounded-lg flex items-center space-x-2">
                <span>{error}</span>
                <button 
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Chat Content */}
      <div className="flex-1 flex flex-col">
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
              className="flex-1 overflow-y-auto p-6" 
              style={{ 
                maxHeight: 'calc(100vh - 200px)',
                backgroundColor: chatMode === 'project' ? '#F8FAFC' : '#FFFFFF'
              }}
            >
              <div className="min-h-full">
                <div className="space-y-4 pb-4">
                  {messages.map((msg) => (
                    <MessageBubble 
                      key={msg.id} 
                      message={msg}
                      streamingMessageId={streamingMessageId}
                    />
                  ))}
                  {/* Removed the "AI is thinking..." indicator */}
                  {isLoadingMessages && (
                    <div className="flex justify-center py-4">
                      <div className="flex items-center space-x-2 text-gray-500">
                        <Loader2 className="animate-spin h-4 w-4" />
                        <span className="text-sm">Loading messages...</span>
                      </div>
                    </div>
                  )}
                  {/* Scroll anchor */}
                  <div ref={messagesEndRef} />
                </div>
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
              currentProjectId={currentProjectId}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatArea;