import React from 'react';
import { MessageSquare, Loader2, Paperclip, FolderOpen, MessageCircle, X } from 'lucide-react';
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
  onSwitchToNormalMode
}) => {
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
      </header>

      {/* Chat Content */}
      <div className="flex-1 flex flex-col">
        {!selectedConversation ? (
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
                {messages.length === 0 && !isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 min-h-[400px]">
                    <MessageSquare size={48} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium">No messages yet</p>
                    <p className="text-sm">Start the conversation by typing a message below</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-lg p-4 max-w-xs border rounded-bl-none">
                          <div className="flex items-center space-x-2">
                            <Loader2 className="animate-spin h-4 w-4 text-gray-500" />
                            <span className="text-gray-500 text-sm">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {isLoadingMessages && (
                      <div className="flex justify-center py-4">
                        <div className="flex items-center space-x-2 text-gray-500">
                          <Loader2 className="animate-spin h-4 w-4" />
                          <span className="text-sm">Loading messages...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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