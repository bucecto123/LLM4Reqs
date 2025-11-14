import React, { useState } from "react";
import useTypingAnimation from "../hooks/useTypingAnimation";

/**
 * Example component demonstrating client-side typing animation
 * This shows how to create a typing effect WITHOUT server-side streaming
 */
const TypingAnimationExample = () => {
  const [responseText, setResponseText] = useState("");
  const [showAnimation, setShowAnimation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Custom typing hook - only animates the latest response
  const { displayedText, isTyping } = useTypingAnimation(
    responseText,
    20, // 20ms per character
    showAnimation
  );

  // Simulate API call (replace with your actual API call)
  const fetchAIResponse = async () => {
    setIsLoading(true);
    setShowAnimation(false);
    setResponseText("");

    try {
      // Example: Replace this with your actual API call
      const response = await fetch("YOUR_API_ENDPOINT", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Your prompt here" }),
      });

      const data = await response.json();

      // Once we have the COMPLETE response, set it and trigger animation
      setResponseText(data.response); // The full text
      setShowAnimation(true); // Trigger typing animation
    } catch (error) {
      console.error("Error:", error);
      setResponseText("Error fetching response");
      setShowAnimation(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">
        Client-Side Typing Animation Demo
      </h2>

      <button
        onClick={fetchAIResponse}
        disabled={isLoading || isTyping}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 mb-4"
      >
        {isLoading ? "Loading..." : isTyping ? "Typing..." : "Get AI Response"}
      </button>

      <div className="bg-gray-100 rounded-lg p-4 min-h-[200px]">
        <div className="text-gray-800">
          {displayedText}
          {isTyping && (
            <span className="inline-block ml-1 animate-pulse">▋</span>
          )}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          <strong>How it works:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Fetch the COMPLETE response from your API (no streaming)</li>
          <li>Store the full text in state</li>
          <li>The typing animation hook displays it character by character</li>
          <li>User sees a smooth typing effect - all client-side!</li>
        </ol>
      </div>
    </div>
  );
};

export default TypingAnimationExample;

/**
 * USAGE IN YOUR EXISTING CODE:
 *
 * In your DashBoard or message handling:
 *
 * 1. Remove streaming-related code
 * 2. Fetch complete response:
 *
 *    const response = await api.post('/chat', { message });
 *    const aiMessage = response.data.message; // Full text
 *
 * 3. Add message with full content to state:
 *
 *    setMessages(prev => [...prev, {
 *      id: Date.now(),
 *      role: 'assistant',
 *      content: aiMessage,
 *      shouldAnimate: true // Trigger typing animation
 *    }]);
 *
 * 4. Your MessageBubble component already handles the animation!
 *    It will type out the message automatically when shouldAnimate is true.
 */
