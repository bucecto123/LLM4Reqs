/**
 * AgentStreamingOutput Component
 * Displays real-time agent message streaming
 */

import React, { useEffect, useRef } from 'react';
import { MessageCircle, Zap, AlertCircle } from 'lucide-react';
import { MESSAGE_TYPE, MESSAGE_ROLE } from '../utils/agentTypes.js';

export function AgentStreamingOutput({ task }) {
  const containerRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [task?.messages]);

  if (!task || !task.messages || task.messages.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-dashed text-center text-gray-500">
        <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No messages yet</p>
      </div>
    );
  }

  const renderMessage = (message) => {
    const isUser = message.role === MESSAGE_ROLE.USER;
    const isTool = message.role === MESSAGE_ROLE.TOOL;
    const isThinking = message.type === MESSAGE_TYPE.THINKING;

    return (
      <div
        key={message.id}
        className={`flex mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-none'
              : isThinking
              ? 'bg-purple-50 border border-purple-200 text-purple-900 rounded-bl-none'
              : isTool
              ? 'bg-green-50 border border-green-200 text-green-900 rounded-bl-none'
              : 'bg-gray-200 text-gray-900 rounded-bl-none'
          }`}
        >
          {/* Tool Call Icon */}
          {message.type === MESSAGE_TYPE.TOOL_CALL && (
            <div className="flex items-center space-x-2 mb-1">
              <Zap size={16} className="text-yellow-600" />
              <span className="text-xs font-semibold text-gray-700">
                {message.toolName}
              </span>
            </div>
          )}

          {/* Message Content */}
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>

          {/* Tool Input */}
          {message.toolInput && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer font-medium hover:underline">
                Input Parameters
              </summary>
              <pre className="mt-1 p-2 bg-gray-100 rounded text-gray-700 overflow-auto">
                {JSON.stringify(message.toolInput, null, 2)}
              </pre>
            </details>
          )}

          {/* Tool Output */}
          {message.toolOutput && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer font-medium hover:underline">
                Tool Result
              </summary>
              <pre className="mt-1 p-2 bg-gray-100 rounded text-gray-700 overflow-auto">
                {typeof message.toolOutput === 'string'
                  ? message.toolOutput
                  : JSON.stringify(message.toolOutput, null, 2)}
              </pre>
            </details>
          )}

          {/* Timestamp */}
          <span className="text-xs opacity-70 mt-1 block">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="space-y-2 p-4 bg-white rounded-lg border max-h-96 overflow-y-auto"
    >
      {task.messages.map((message) => renderMessage(message))}

      {/* Streaming Indicator */}
      {task.status === 'running' && (
        <div className="flex justify-start mb-3">
          <div className="bg-gray-200 rounded-lg rounded-bl-none px-4 py-2">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {task.error && (
        <div className="flex justify-center mb-3">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-700 text-sm flex items-start space-x-2 max-w-xs">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{task.error}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentStreamingOutput;
