import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MessageBubble = ({ message, streamingMessageId }) => {
  const isUser = message.role === 'user';
  
  // Check if this message is currently streaming
  const isStreaming = message.id === streamingMessageId || message.isStreaming === true;
  
  const content = message.content || '';
  
  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '';
    }
  };
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl px-4 py-3 rounded-lg shadow-sm ${
        isUser 
          ? 'bg-blue-500 text-white rounded-br-none' 
          : 'bg-gray-100 text-gray-800 rounded-bl-none border'
      }`}>
        <div className="text-sm leading-relaxed">
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">
              {content}
            </div>
          ) : (
            <div className="relative">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="mb-1">{children}</li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic">{children}</em>
                    ),
                    code({ inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={tomorrow}
                          language={match[1]}
                          PreTag="div"
                          className="rounded-md text-sm my-2"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
              
              {/* Fish cursor - only show when streaming */}
              {isStreaming && (
                <span 
                  className="inline-block ml-1 fish-cursor-animate"
                  style={{ 
                    fontSize: '1.2em',
                    verticalAlign: 'middle',
                    display: 'inline-block',
                    lineHeight: 1,
                    transform: 'scaleX(-1)'
                  }}
                >
                  🐟
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className={`text-xs mt-2 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
          {formatTime(message.created_at)}
          {message.model_used && !isUser && (
            <span className="ml-2 opacity-75">• {message.model_used}</span>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes fishBlink {
          0%, 100% { 
            opacity: 1;
          }
          50% { 
            opacity: 0.2;
          }
        }
        
        .fish-cursor-animate {
          animation: fishBlink 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default MessageBubble;