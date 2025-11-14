/**
 * READY-TO-USE: Drop-in example for your DashBoard
 *
 * This shows exactly how to modify your existing code to use
 * client-side typing animation (which you already have!)
 */

// ============================================================================
// EXAMPLE 1: Modify your existing message sending function
// ============================================================================

// BEFORE (if you had streaming):
const sendMessageWithStreaming = async (text) => {
  // Complex streaming setup...
  const eventSource = new EventSource(`/api/chat/stream?message=${text}`);
  eventSource.onmessage = (event) => {
    // Handle chunks...
  };
  // More complex error handling...
};

// AFTER (simple client-side typing):
const sendMessageWithClientSideTyping = async (text) => {
  try {
    // 1. Add user message
    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // 2. Show loading
    setIsLoading(true);

    // 3. Get COMPLETE response from backend
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversation_id: selectedConversation.id,
        content: text,
        project_id: currentProjectId,
      }),
    });

    const data = await response.json();

    // 4. Add AI message with typing animation
    const aiMsg = {
      id: data.id,
      role: "assistant",
      content: data.content, // Full text
      timestamp: data.created_at,
      shouldAnimate: true, // ← Magic happens here!
    };

    setMessages((prev) => [...prev, aiMsg]);
    setLatestAIMessageId(aiMsg.id); // For MessageBubble to know which to animate
  } catch (error) {
    console.error("Error:", error);
    setError("Failed to send message");
  } finally {
    setIsLoading(false);
  }
};

// ============================================================================
// EXAMPLE 2: Complete working component
// ============================================================================

import React, { useState } from "react";

const SimpleChatWithTyping = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [latestAIMessageId, setLatestAIMessageId] = useState(null);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Call your API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();

      // Add AI message with typing
      const aiMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.response,
        shouldAnimate: true, // Enable typing animation
      };

      setMessages((prev) => [...prev, aiMsg]);
      setLatestAIMessageId(aiMsg.id);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Messages */}
      <div className="messages">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            shouldAnimate={msg.id === latestAIMessageId}
          />
        ))}
      </div>

      {/* Input */}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
        disabled={isLoading}
      />
      <button onClick={sendMessage} disabled={isLoading}>
        Send
      </button>
    </div>
  );
};

// ============================================================================
// EXAMPLE 3: With user preference toggle
// ============================================================================

const ChatWithTogglableTyping = () => {
  const [typingEnabled, setTypingEnabled] = useState(true);
  const [messages, setMessages] = useState([]);

  const sendMessage = async (text) => {
    // ... (same as above)

    const aiMsg = {
      id: data.id,
      role: "assistant",
      content: data.response,
      shouldAnimate: typingEnabled, // User can toggle this!
    };

    setMessages((prev) => [...prev, aiMsg]);
  };

  return (
    <div>
      {/* Settings Toggle */}
      <label>
        <input
          type="checkbox"
          checked={typingEnabled}
          onChange={(e) => setTypingEnabled(e.target.checked)}
        />
        Enable typing animation
      </label>

      {/* Rest of chat... */}
    </div>
  );
};

// ============================================================================
// EXAMPLE 4: Backend Controller (Laravel)
// ============================================================================

/**
 * app/Http/Controllers/MessageController.php
 *
 * Super simple - just return complete response
 */

/*
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\LLMService;
use App\Models\Message;

class MessageController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'conversation_id' => 'required|exists:conversations,id',
            'content' => 'required|string',
            'project_id' => 'nullable|exists:projects,id'
        ]);

        // Generate COMPLETE AI response (no streaming)
        $llmService = app(LLMService::class);
        $aiResponse = $llmService->generateResponse(
            $validated['content'],
            $validated['conversation_id'],
            $validated['project_id']
        );

        // Save to database
        $message = Message::create([
            'conversation_id' => $validated['conversation_id'],
            'content' => $aiResponse,
            'role' => 'assistant'
        ]);

        // Return simple JSON (no streaming, no chunks)
        return response()->json([
            'id' => $message->id,
            'content' => $message->content,
            'role' => 'assistant',
            'created_at' => $message->created_at
        ]);
    }
}
*/

// ============================================================================
// EXAMPLE 5: MessageBubble usage (you already have this!)
// ============================================================================

/**
 * Your MessageBubble.jsx already handles everything!
 * Just pass these props:
 */

const ExampleUsage = () => {
  const message = {
    id: 123,
    role: "assistant",
    content: "This is the complete AI response text...",
  };

  return (
    <MessageBubble
      message={message}
      shouldAnimate={true} // ← This triggers typing!
      streamingMessageId={null} // Not streaming
    />
  );
};

// ============================================================================
// EXAMPLE 6: API utility function
// ============================================================================

/**
 * Add to your api.js file
 */

export const sendChatMessage = async (conversationId, content, projectId) => {
  try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        content: content,
        project_id: projectId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to send message");
    }

    const data = await response.json();

    // Return in a format ready for your state
    return {
      id: data.id,
      role: "assistant",
      content: data.content,
      timestamp: data.created_at,
      shouldAnimate: true, // Always animate AI responses
    };
  } catch (error) {
    console.error("Send message error:", error);
    throw error;
  }
};

// Usage:
// const aiMessage = await sendChatMessage(convId, text, projectId);
// setMessages(prev => [...prev, aiMessage]);

// ============================================================================
// SUMMARY: What you need to do
// ============================================================================

/**
 * 1. Backend: Return complete responses (not streaming)
 *    ✅ Simple JSON response
 *    ✅ No WebSocket/SSE needed
 *
 * 2. Frontend: Add messages with shouldAnimate: true
 *    ✅ Your MessageBubble handles the rest
 *    ✅ No changes to MessageBubble needed
 *
 * 3. That's it! You're done! 🎉
 *
 * Your MessageBubble already has:
 * - Character-by-character typing
 * - Animated cursor (🐟)
 * - Markdown support
 * - Perfect timing
 *
 * Just use it!
 */
