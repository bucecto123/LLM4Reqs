import React from "react";
import { Link } from "react-router-dom";
import { Play, Zap, Wifi, Code, Home } from "lucide-react";

/**
 * Demo Index Page
 * Navigate to different typing animation demos
 */
const DemoIndex = () => {
  const demos = [
    {
      path: "/demo/comparison",
      title: "Streaming vs Client-Side",
      description: "See side-by-side comparison of both approaches",
      icon: <Wifi className="w-8 h-8" />,
      color: "blue",
      recommended: true,
    },
    {
      path: "/demo/typing-styles",
      title: "All Typing Styles",
      description: "Try 5 different animation styles interactively",
      icon: <Zap className="w-8 h-8" />,
      color: "purple",
      recommended: true,
    },
    {
      path: "/demo/basic",
      title: "Basic Example",
      description: "Simple usage example with API integration",
      icon: <Code className="w-8 h-8" />,
      color: "green",
      recommended: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Typing Animation Demos
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Explore different ways to create AI typing effects on the
            client-side
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-100 border border-blue-300 rounded-lg p-6 mb-8">
          <h2 className="font-bold text-blue-900 mb-2">🎯 What You'll See:</h2>
          <p className="text-blue-800 mb-4">
            These demos show how to create smooth AI typing animations{" "}
            <strong>without server streaming</strong>. All animations happen on
            the client-side after receiving the complete response.
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong className="text-blue-900">Benefits:</strong>
              <ul className="list-disc list-inside text-blue-800 mt-1">
                <li>Simpler backend (no WebSocket)</li>
                <li>More reliable</li>
                <li>Full animation control</li>
              </ul>
            </div>
            <div>
              <strong className="text-blue-900">Your Code:</strong>
              <ul className="list-disc list-inside text-blue-800 mt-1">
                <li>MessageBubble already has this!</li>
                <li>Just set shouldAnimate: true</li>
                <li>No streaming needed</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Demo Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {demos.map((demo) => (
            <Link
              key={demo.path}
              to={demo.path}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-6 border-2 border-transparent hover:border-blue-400 relative"
            >
              {demo.recommended && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                  ⭐ Recommended
                </div>
              )}

              <div className={`text-${demo.color}-500 mb-4`}>{demo.icon}</div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {demo.title}
              </h3>

              <p className="text-gray-600 mb-4">{demo.description}</p>

              <div className="flex items-center text-blue-600 font-medium">
                <span>Try Demo</span>
                <Play className="w-4 h-4 ml-2" />
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Start Guide */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🚀 Quick Start: Using in Your App
          </h2>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded p-4">
              <h3 className="font-bold text-gray-800 mb-2">
                1. Your MessageBubble Already Works!
              </h3>
              <p className="text-sm text-gray-700 mb-2">
                The typing animation is already implemented in your{" "}
                <code className="bg-gray-200 px-1 rounded">
                  MessageBubble.jsx
                </code>
              </p>
              <pre className="bg-gray-800 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                {`// When adding AI messages:
const aiMessage = {
  id: response.data.id,
  role: 'assistant',
  content: response.data.content,  // Full text
  shouldAnimate: true              // ← Enable typing!
};
setMessages(prev => [...prev, aiMessage]);`}
              </pre>
            </div>

            <div className="bg-gray-50 rounded p-4">
              <h3 className="font-bold text-gray-800 mb-2">
                2. No Backend Changes Needed
              </h3>
              <p className="text-sm text-gray-700">
                Just return complete responses as JSON (no streaming required)
              </p>
            </div>

            <div className="bg-gray-50 rounded p-4">
              <h3 className="font-bold text-gray-800 mb-2">3. That's It! 🎉</h3>
              <p className="text-sm text-gray-700">
                Your messages will type out automatically with a smooth
                animation
              </p>
            </div>
          </div>
        </div>

        {/* Documentation Links */}
        <div className="mt-8 text-center">
          <h3 className="font-bold text-gray-800 mb-4">📚 Documentation</h3>
          <div className="flex flex-wrap justify-center gap-3">
            <span className="bg-white px-4 py-2 rounded shadow text-sm">
              <code>SIMPLE_TYPING_GUIDE.md</code> - Quick start
            </span>
            <span className="bg-white px-4 py-2 rounded shadow text-sm">
              <code>CLIENT_SIDE_TYPING_GUIDE.md</code> - Complete guide
            </span>
            <span className="bg-white px-4 py-2 rounded shadow text-sm">
              <code>CHECKLIST.md</code> - Implementation checklist
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoIndex;
