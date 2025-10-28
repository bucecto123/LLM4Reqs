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
      <div className={`${
        isUser 
          ? 'max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl px-4 py-3 rounded-lg shadow-sm bg-blue-500 text-white rounded-br-none' 
          : 'max-w-full w-full'
      }`}>
        <div className="text-sm leading-relaxed">
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">
              {content}
            </div>
          ) : (
            <div className="relative">
              <div className="prose prose-sm max-w-none text-gray-800" style={{ display: 'inline' }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0" style={{ display: 'inline' }}>{children}</p>
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
                    table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full divide-y divide-gray-500 border border-gray-600 bg-gray-100">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-gray-700 text-gray-100">{children}</thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="divide-y divide-gray-400 bg-gray-200">{children}</tbody>
                  ),
                  tr: ({ children }) => (
                    <tr className="hover:bg-gray-300 transition-colors duration-150">{children}</tr>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-100 border-r border-gray-600 last:border-r-0">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 text-sm text-gray-800 border-r border-gray-500 last:border-r-0">
                      {children}
                    </td>
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
                
                {/* Fish cursor - inline with text when streaming */}
                {isStreaming && (
                  <span 
                    className="fish-cursor-animate"
                    style={{ 
                      fontSize: '1.2em',
                      verticalAlign: 'middle',
                      display: 'inline',
                      lineHeight: 1,
                      transform: 'scaleX(-1)',
                      marginLeft: '2px'
                    }}
                  >
                    🐟
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        
        {isUser && (
          <div className="text-xs mt-2 text-blue-100">
            {formatTime(message.created_at)}
          </div>
        )}
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