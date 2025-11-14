import React, { useState, useEffect } from "react";
import { Play, Zap, Wifi } from "lucide-react";

/**
 * Visual comparison between streaming and client-side typing
 * This component demonstrates both approaches side-by-side
 */
const StreamingVsClientSideDemo = () => {
  const [streamingText, setStreamingText] = useState("");
  const [clientText, setClientText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle, fetching, showing

  const fullText =
    "This is a demonstration of how AI text generation can appear to users. Both methods create a smooth experience, but the implementation is different under the hood.";

  const simulateStreaming = () => {
    setPhase("fetching");
    setStreamingText("");
    setClientText("");
    setIsStreaming(true);

    // Simulate network delay
    setTimeout(() => {
      setPhase("showing");
      let index = 0;

      const streamInterval = setInterval(() => {
        if (index < fullText.length) {
          setStreamingText(fullText.substring(0, index + 1));
          index++;
        } else {
          clearInterval(streamInterval);
          setIsStreaming(false);
        }
      }, 30); // Simulate chunk arrival
    }, 1500); // Simulate backend processing
  };

  const simulateClientSide = () => {
    setPhase("fetching");
    setStreamingText("");
    setClientText("");

    // Simulate network delay + backend processing
    setTimeout(() => {
      setPhase("showing");
      setIsTyping(true);
      let index = 0;

      const typeInterval = setInterval(() => {
        if (index < fullText.length) {
          setClientText(fullText.substring(0, index + 1));
          index++;
        } else {
          clearInterval(typeInterval);
          setIsTyping(false);
        }
      }, 30); // Client-side typing speed
    }, 1500); // Complete response arrives
  };

  const simulateBoth = () => {
    simulateStreaming();
    simulateClientSide();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">
        Streaming vs Client-Side Typing
      </h1>
      <p className="text-gray-600 mb-6">
        See the difference between server streaming and client-side animation
      </p>

      {/* Control Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={simulateBoth}
          disabled={isStreaming || isTyping}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          Start Demo
        </button>

        <button
          onClick={simulateStreaming}
          disabled={isStreaming}
          className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wifi className="w-4 h-4" />
          Streaming Only
        </button>

        <button
          onClick={simulateClientSide}
          disabled={isTyping}
          className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="w-4 h-4" />
          Client-Side Only
        </button>
      </div>

      {/* Comparison Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Streaming Approach */}
        <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
          <div className="flex items-center gap-2 mb-3">
            <Wifi className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-purple-900">
              Server Streaming
            </h2>
          </div>

          <div className="bg-white rounded-lg p-4 min-h-[200px] mb-4 border border-purple-200">
            {phase === "idle" && (
              <p className="text-gray-400 italic">
                Click "Start Demo" to begin...
              </p>
            )}
            {phase === "fetching" && (
              <div className="flex items-center gap-2 text-purple-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent" />
                <span>Generating & streaming...</span>
              </div>
            )}
            {phase === "showing" && (
              <p className="text-gray-800">
                {streamingText}
                {isStreaming && <span className="animate-pulse ml-1">▋</span>}
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <h3 className="font-semibold text-purple-900">How it works:</h3>
            <ul className="space-y-1 text-gray-700">
              <li>✓ Backend generates token by token</li>
              <li>✓ Sends chunks via WebSocket/SSE</li>
              <li>✓ Frontend receives & displays immediately</li>
              <li>⚠️ Complex setup (WebSocket required)</li>
              <li>⚠️ Connection management needed</li>
            </ul>
          </div>
        </div>

        {/* Client-Side Approach */}
        <div className="border border-green-200 rounded-lg p-4 bg-green-50">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-bold text-green-900">
              Client-Side Typing
            </h2>
          </div>

          <div className="bg-white rounded-lg p-4 min-h-[200px] mb-4 border border-green-200">
            {phase === "idle" && (
              <p className="text-gray-400 italic">
                Click "Start Demo" to begin...
              </p>
            )}
            {phase === "fetching" && (
              <div className="flex items-center gap-2 text-green-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent" />
                <span>Generating complete response...</span>
              </div>
            )}
            {phase === "showing" && (
              <p className="text-gray-800">
                {clientText}
                {isTyping && <span className="animate-pulse ml-1">▋</span>}
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <h3 className="font-semibold text-green-900">How it works:</h3>
            <ul className="space-y-1 text-gray-700">
              <li>✓ Backend generates complete text</li>
              <li>✓ Returns via simple JSON response</li>
              <li>✓ Frontend animates character-by-character</li>
              <li>✓ Simple REST API (no WebSocket)</li>
              <li>✓ Easy to implement & maintain</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-blue-900 mb-2">👁️ What Users See:</h3>
        <p className="text-gray-700 mb-3">
          Both approaches create a smooth typing effect! The difference is in
          the implementation:
        </p>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong className="text-purple-700">Streaming:</strong>
            <ul className="list-disc list-inside text-gray-700 mt-1">
              <li>Slightly faster to start</li>
              <li>Shows text as it's generated</li>
              <li>More complex backend</li>
            </ul>
          </div>
          <div>
            <strong className="text-green-700">Client-Side:</strong>
            <ul className="list-disc list-inside text-gray-700 mt-1">
              <li>Small delay before typing</li>
              <li>Smooth, controlled animation</li>
              <li>Simple backend</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="mt-6 bg-green-100 border border-green-300 rounded-lg p-4">
        <h3 className="font-bold text-green-900 mb-2">
          💡 Our Recommendation:
        </h3>
        <p className="text-gray-800">
          <strong>Use Client-Side Typing</strong> for most applications. It's
          simpler, more reliable, and provides an excellent user experience
          without the complexity of WebSocket management. Your MessageBubble
          component already has this implemented!
        </p>
      </div>
    </div>
  );
};

export default StreamingVsClientSideDemo;
