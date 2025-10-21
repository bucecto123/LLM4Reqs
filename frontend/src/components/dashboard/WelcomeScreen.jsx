import React from 'react';
import { Send, Loader2, Search, Sparkles, Grid3x3, Globe, Paperclip, Mic, X } from 'lucide-react';

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
  currentProjectId
}) => {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-3xl text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <span className="text-5xl font-bold" style={{ color: '#112D4E' }}>Fishy</span>
            <span 
              className="text-3xl font-bold text-white px-4 py-1 rounded-lg"
              style={{ backgroundColor: '#4A7BA7' }}
            >
              pro
            </span>
          </div>
          <p className="text-gray-600 mb-8">Ask anything. Type a message to start a new conversation.</p>
          
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
            
            <div className="bg-white rounded-xl shadow-sm border-2 border-gray-300 p-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={openFileUpload}
                  disabled={isLoading || isInitializing}
                  className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 transition-all duration-200 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Paperclip size={18} />
                </button>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={isInitializing ? "Initializing..." : "How can I help you today?"}
                  className="flex-1 bg-transparent border-none outline-none resize-none text-gray-800 placeholder-gray-400 text-sm"
                  rows={1}
                  disabled={isLoading || isInitializing}
                  style={{ minHeight: '24px', maxHeight: '120px' }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={(!message.trim() && attachedFiles.length === 0) || isLoading || isInitializing || !currentProjectId}
                  className={`p-2 rounded-lg text-white transition-all duration-200 flex-shrink-0 ${
                    (message.trim() || attachedFiles.length > 0) && !isLoading && !isInitializing
                      ? 'hover:shadow-md opacity-100'
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                  style={{ backgroundColor: '#4A7BA7' }}
                >
                  {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                </button>
              </div>
            </div>
            
            {/* Action buttons below input */}
            <div className="flex items-center justify-center space-x-2 mt-3">
              <button 
                className="px-3 py-1.5 rounded-md font-medium text-xs transition-all hover:shadow-sm flex items-center space-x-1.5"
                style={{ backgroundColor: '#DBE2EF', color: '#112D4E' }}
              >
                <Search size={12} />
                <span>Search</span>
              </button>
              <button 
                className="px-3 py-1.5 rounded-md font-medium text-xs transition-all hover:shadow-sm flex items-center space-x-1.5"
                style={{ backgroundColor: '#DBE2EF', color: '#112D4E' }}
              >
                <Sparkles size={12} />
                <span>Research</span>
              </button>
              <ActionButton icon={<Grid3x3 size={14} />} />
              <ActionButton icon={<Globe size={14} />} />
              <ActionButton icon={<Mic size={14} />} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;