import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

const TYPING_SPEED = 20; // ms per character

const MessageBubble = ({
  message,
  streamingMessageId,
  shouldAnimate = false,
}) => {
  const isUser = message.role === "user";
  const content = message.content || "";

  // Check if this message is currently streaming
  const isCurrentlyStreaming =
    message.isStreaming === true || message.id === streamingMessageId;

  const hasAnimated = useRef(false);
  const [displayedContent, setDisplayedContent] = useState(
    shouldAnimate && !isUser ? "" : content
  );
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // If streaming, show content directly and don't run typing animation
    if (isCurrentlyStreaming) {
      setDisplayedContent(content);
      setIsTyping(false); // Let showCursor handle the cursor display
      return;
    }

    // Handle typing animation for AI messages (only after streaming is complete)
    if (!isUser && content && shouldAnimate && !hasAnimated.current) {
      hasAnimated.current = true;
      setIsTyping(true);
      setDisplayedContent("");

      let currentIndex = 0;

      const typeNextChar = () => {
        if (currentIndex < content.length) {
          setDisplayedContent(content.substring(0, currentIndex + 1));
          currentIndex++;
          setTimeout(typeNextChar, TYPING_SPEED);
        } else {
          setIsTyping(false);
        }
      };

      typeNextChar();
    } else if (!shouldAnimate || isUser) {
      setDisplayedContent(content);
      setIsTyping(false);
    }
  }, [content, isUser, shouldAnimate, isCurrentlyStreaming]);

  const finalContent = isUser ? content : displayedContent;

  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const userMessageStyles =
    "max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl px-4 py-3 rounded-lg shadow-sm bg-blue-500 text-white rounded-br-none";
  const aiMessageStyles =
    "max-w-full sm:max-w-[90%] md:max-w-[85%] lg:max-w-[80%] xl:max-w-[75%] px-4 py-3 rounded-lg shadow-sm bg-gray-100 text-gray-800 rounded-bl-none";

  const markdownComponents = {
    p: ({ children, node, ...props }) => (
      <p className="mb-2 inline" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, node }) => (
      <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
    ),
    ol: ({ children, node }) => (
      <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
    ),
    li: ({ children, ...props }) => (
      <li className="mb-1" {...props}>
        {children}
      </li>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
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
    tr: ({ children, ...props }) => (
      <tr
        className="hover:bg-gray-300 transition-colors duration-150"
        {...props}
      >
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-100 border-r border-gray-600 last:border-r-0">
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td
        className="px-3 py-2 text-sm text-gray-800 border-r border-gray-500 last:border-r-0"
        {...props}
      >
        {children}
      </td>
    ),
    code({ inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <SyntaxHighlighter
          style={tomorrow}
          language={match[1]}
          PreTag="div"
          className="rounded-md text-sm my-2"
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      ) : (
        <code
          className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono"
          {...props}
        >
          {children}
        </code>
      );
    },
  };

  // Check for duplicate content (if content is literally repeated)
  const cleanedContent = React.useMemo(() => {
    if (!finalContent || isUser) return finalContent;

    // Check if content is duplicated by splitting in half and comparing
    const halfLength = Math.floor(finalContent.length / 2);
    if (halfLength > 50) {
      // Only check for substantial content
      const firstHalf = finalContent.substring(0, halfLength).trim();
      const secondHalf = finalContent.substring(halfLength).trim();

      // If second half starts with the same content as first half, it's likely a duplicate
      if (
        secondHalf.startsWith(
          firstHalf.substring(0, Math.min(100, firstHalf.length))
        )
      ) {
        console.warn(
          "Detected duplicate content in message, using first half only"
        );
        return firstHalf;
      }
    }

    return finalContent;
  }, [finalContent, isUser]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={isUser ? userMessageStyles : aiMessageStyles}>
        <div className="text-sm leading-relaxed">
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{content}</div>
          ) : (
            <div className="relative">
              <div className="prose prose-sm max-w-none text-gray-800">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={markdownComponents}
                >
                  {cleanedContent || " "}
                </ReactMarkdown>
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
    </div>
  );
};

export default MessageBubble;
