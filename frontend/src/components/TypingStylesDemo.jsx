import React, { useState } from "react";
import {
  typeCharByChar,
  typeWordByWord,
  typeWithVariableSpeed,
  typeInChunks,
  instantRevealWithCursor,
} from "../utils/typingAnimations";

/**
 * Demo component showing different typing animation styles
 */
const TypingStylesDemo = () => {
  const [demos, setDemos] = useState({
    charByChar: "",
    wordByWord: "",
    variableSpeed: "",
    chunks: "",
    instant: "",
  });

  const [isTyping, setIsTyping] = useState({
    charByChar: false,
    wordByWord: false,
    variableSpeed: false,
    chunks: false,
    instant: false,
  });

  const sampleText =
    "Hello! I'm an AI assistant. I can help you with various tasks, answer questions, and provide information. Let me know how I can assist you today!";

  const runAnimation = (type) => {
    // Reset
    setDemos((prev) => ({ ...prev, [type]: "" }));
    setIsTyping((prev) => ({ ...prev, [type]: true }));

    const callback = (text, completed = false) => {
      setDemos((prev) => ({ ...prev, [type]: text }));
      if (completed) {
        setIsTyping((prev) => ({ ...prev, [type]: false }));
      }
    };

    let cleanup;

    switch (type) {
      case "charByChar":
        cleanup = typeCharByChar(sampleText, 20, callback);
        break;
      case "wordByWord":
        cleanup = typeWordByWord(sampleText, 50, callback);
        break;
      case "variableSpeed":
        cleanup = typeWithVariableSpeed(sampleText, 30, callback);
        break;
      case "chunks":
        cleanup = typeInChunks(sampleText, 5, 50, callback);
        break;
      case "instant":
        cleanup = instantRevealWithCursor(sampleText, 1500, callback);
        break;
      default:
        break;
    }

    return cleanup;
  };

  const AnimationBox = ({ title, type, description }) => (
    <div className="border border-gray-300 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <button
          onClick={() => runAnimation(type)}
          disabled={isTyping[type]}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTyping[type] ? "Typing..." : "Start"}
        </button>
      </div>
      <div className="bg-gray-100 rounded p-3 min-h-[80px] mt-2">
        <p className="text-gray-800">
          {demos[type]}
          {isTyping[type] && (
            <span className="inline-block ml-1 animate-pulse text-blue-500">
              ▋
            </span>
          )}
        </p>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">
        Client-Side Typing Animation Styles
      </h1>
      <p className="text-gray-600 mb-6">
        Click "Start" on any example to see different typing effects (no server
        streaming required!)
      </p>

      <AnimationBox
        title="1. Character by Character"
        type="charByChar"
        description="Traditional typewriter effect - 20ms per character"
      />

      <AnimationBox
        title="2. Word by Word"
        type="wordByWord"
        description="Types whole words at a time - more natural for reading"
      />

      <AnimationBox
        title="3. Variable Speed"
        type="variableSpeed"
        description="Realistic typing with pauses at punctuation"
      />

      <AnimationBox
        title="4. Chunk-based"
        type="chunks"
        description="Types in small chunks - fast for long responses"
      />

      <AnimationBox
        title="5. Instant with Cursor"
        type="instant"
        description="Shows text immediately with blinking cursor effect"
      />

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold mb-2">💡 How to Use in Your App:</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            <strong>Fetch complete response</strong> from your backend (no
            streaming)
          </li>
          <li>
            <strong>Store the full text</strong> in your message state
          </li>
          <li>
            <strong>Apply typing animation</strong> using any of these methods
          </li>
          <li>
            <strong>Benefits:</strong> Simpler backend, no WebSocket needed,
            works offline!
          </li>
        </ol>
      </div>
    </div>
  );
};

export default TypingStylesDemo;
