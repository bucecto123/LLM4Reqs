import React, { useState, useRef, useEffect } from "react";
import { apiFetch } from "../utils/auth.js";
import { useDashboard } from "../hooks/useDashboard.js";
import Sidebar from "../components/dashboard/Sidebar.jsx";
import ChatArea from "../components/dashboard/ChatArea.jsx";
import FileUpload from "../components/FileUpload.jsx";
import { DashboardSkeleton } from "../components/LoadingSkeleton.jsx";
import echo from "../utils/echo.js";

export default function LLMDashboard() {
  const {
    user,
    message,
    setMessage,
    isSidebarOpen,
    setIsSidebarOpen,
    chatMode,
    setChatMode,
    conversations,
    setConversations,
    selectedConversation,
    setSelectedConversation,
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    isLoadingMessages,
    error,
    setError,
    currentProjectId,
    setCurrentProjectId,
    projects,
    isInitializing,
    isLoadingConversations,
    editingConversationId,
    setEditingConversationId,
    editingTitle,
    setEditingTitle,
    showDropdownId,
    setShowDropdownId,
    isFileUploadOpen,
    setIsFileUploadOpen,
    attachedFiles,
    setAttachedFiles,
    conversationDocuments,
    setConversationDocuments,
    messagesEndRef,
    isMobile,
    skipNextLoadRef,
    loadConversations,
    loadConversationDocuments,
    performLogout,
    models,
    selectedModelId,
    setSelectedModelId,
  } = useDashboard();

  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [latestAIMessageId, setLatestAIMessageId] = useState(null);
  const [isNewChatMode, setIsNewChatMode] = useState(false);
  const [needsConversationReload, setNeedsConversationReload] = useState(false);

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);

    // Reload conversations when opening sidebar if a new conversation was created
    if (newState && needsConversationReload) {
      loadConversations();
      setNeedsConversationReload(false);
    }
  };

  const handleScroll = (e) => {
    const container = e.target;
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      50;
    setIsUserScrolling(!isAtBottom);
  };

  // Auto-scroll when messages update (only if user hasn't manually scrolled up)
  useEffect(() => {
    if (messagesEndRef.current && !isUserScrolling) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages, isUserScrolling]);

  // WebSocket listener for streaming messages
  useEffect(() => {
    if (!selectedConversation?.id) return;

    console.log(`🔌 Subscribing to conversation.${selectedConversation.id}`);
    const channel = echo.channel(`conversation.${selectedConversation.id}`);
    const streamState = {
      tempMessageId: null,
      startTime: null,
      chunkCount: 0,
      totalChars: 0,
      lastChunkTime: null,
    };

    const messageChunkHandler = (data) => {
      const { metadata, message_id, is_complete, chunk } = data;

      // Handle error messages
      if (message_id === 'error' || metadata?.error) {
        const errorMessage = metadata?.error || 'An unknown error occurred';
        console.error("❌ Stream error:", errorMessage);

        setIsLoading(false);
        setStreamingMessageId(null);

        // Check if it's a model/API error that might benefit from fallback
        const isModelError = errorMessage.includes("model") ||
                           errorMessage.includes("Model") ||
                           errorMessage.includes("not found") ||
                           errorMessage.includes("does not exist") ||
                           errorMessage.includes("404") ||
                           errorMessage.includes("invalid") ||
                           errorMessage.includes("failed") ||
                           errorMessage.includes("Failed");

        if (isModelError && models.length > 1) {
          // Auto-switch to a fallback model (prefer llama)
          const currentIndex = models.findIndex(m => m.model_id === selectedModelId);
          const fallbackModel = models.find((m, idx) =>
            idx !== currentIndex && m.model_id.includes('llama')
          ) || models.find((m, idx) =>
            idx !== currentIndex && m.provider === 'groq'
          ) || models[0];

          if (fallbackModel && fallbackModel.model_id !== selectedModelId) {
            console.log(`🔄 Auto-switching to fallback model: ${fallbackModel.name}`);
            setSelectedModelId(fallbackModel.model_id);
            setError(`${errorMessage}. Switched to ${fallbackModel.name}.`);
          } else {
            setError(errorMessage);
          }
        } else {
          setError(errorMessage);
        }
        return;
      }

      // PHP's ConversationService sends is_complete=true on the FIRST event with
      // status="streaming" — so we also initialise on the first chunk when
      // tempMessageId hasn't been set yet and this is not a completion event.
      if (
        metadata?.status === "started" ||
        (streamState.tempMessageId === null && !is_complete)
      ) {
        streamState.tempMessageId = message_id;
        streamState.startTime = performance.now();
        streamState.chunkCount = 0;
        streamState.totalChars = 0;
        streamState.lastChunkTime = performance.now();

        console.log("🚀 [STREAMING STARTED]", {
          messageId: message_id,
          timestamp: new Date().toISOString(),
        });

        const streamingMsg = {
          id: message_id,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
          isStreaming: true,
        };

        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === message_id);
          return exists ? prev : [...prev, streamingMsg];
        });

        setStreamingMessageId(message_id);
        setIsLoading(false);
      } else if (is_complete) {
        const endTime = performance.now();
        const totalTime = endTime - streamState.startTime;
        const avgCharsPerSecond = (streamState.totalChars / totalTime) * 1000;

        console.log("✅ [STREAMING COMPLETE]", {
          totalTime: `${totalTime.toFixed(2)}ms (${(totalTime / 1000).toFixed(
            2,
          )}s)`,
          totalChunks: streamState.chunkCount,
          totalChars: streamState.totalChars,
          avgCharsPerSecond: avgCharsPerSecond.toFixed(2),
          avgChunkSize: (
            streamState.totalChars / streamState.chunkCount
          ).toFixed(2),
          performance:
            avgCharsPerSecond > 100
              ? "🚀 Fast"
              : avgCharsPerSecond > 50
                ? "⚡ Good"
                : "🐌 Slow",
        });

        // Replace with saved message or mark as complete
        if (metadata?.message) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamState.tempMessageId
                ? { ...metadata.message, isStreaming: false }
                : msg,
            ),
          );
        } else {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamState.tempMessageId
                ? { ...msg, isStreaming: false }
                : msg,
            ),
          );
        }

        // Show notification if fallback was used
        if (metadata?.fallback_used) {
          setTimeout(() => {
            setError(`Note: Primary model failed, automatically switched to fallback model.`);
            // Auto-clear after 5 seconds
            setTimeout(() => setError(null), 5000);
          }, 500);
        }

        setStreamingMessageId(null);

        // Update conversation timestamp to move it to the top of the list
        setConversations((prev) =>
          prev
            .map((conv) =>
              conv.id === selectedConversation.id
                ? { ...conv, updated_at: new Date().toISOString() }
                : conv,
            )
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)),
        );
      } else {
        // Track chunk performance
        const now = performance.now();
        const timeSinceLastChunk = streamState.lastChunkTime
          ? now - streamState.lastChunkTime
          : 0;

        streamState.chunkCount++;
        streamState.totalChars += chunk.length;
        streamState.lastChunkTime = now;

        console.log(`📦 [CHUNK #${streamState.chunkCount}]`, {
          chunkSize: chunk.length,
          chunk: chunk.substring(0, 50) + (chunk.length > 50 ? "..." : ""),
          timeSinceLastChunk: `${timeSinceLastChunk.toFixed(2)}ms`,
          totalCharsReceived: streamState.totalChars,
          elapsedTime: `${(now - streamState.startTime).toFixed(2)}ms`,
        });

        // Update UI immediately without batching for maximum speed
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamState.tempMessageId
              ? {
                  ...msg,
                  content: msg.content + chunk,
                  isStreaming: true,
                }
              : msg,
          ),
        );
      }
    };

    channel.listen(".message.chunk", messageChunkHandler);

    return () => {
      console.log(
        `🔌 Unsubscribing from conversation.${selectedConversation.id}`,
      );
      channel.stopListening(".message.chunk", messageChunkHandler);
      echo.leaveChannel(`conversation.${selectedConversation.id}`);
    };
  }, [selectedConversation?.id]);

  const switchToNormalMode = () => {
    setChatMode("normal");
    setCurrentProjectId(null);
    setSelectedConversation(null);
    setMessages([]);
    setAttachedFiles([]);
    setConversationDocuments([]);
    setIsNewChatMode(false);
    loadConversations();
  };

  const switchToProjectMode = () => {
    setChatMode("project");
    setSelectedConversation(null);
    setMessages([]);
    setAttachedFiles([]);
    setConversationDocuments([]);
    setIsNewChatMode(false);
  };

  const createNewConversation = () => {
    setIsNewChatMode(true);
    setSelectedConversation(null);
    setMessages([]);
    setAttachedFiles([]);
    setConversationDocuments([]);
    setError(null);
  };

  const handleSendMessage = async () => {
    if (
      (!message.trim() && attachedFiles.length === 0) ||
      isLoading ||
      isLoadingMessages
    ) {
      return;
    }

    if (isNewChatMode || !selectedConversation) {
      if (chatMode === "project" && !currentProjectId) {
        setError(
          "No project available. Please wait for project initialization.",
        );
        return;
      }

      try {
        setError(null);
        setIsLoading(true);

        const conversationTitle = message.trim()
          ? message.slice(0, 50)
          : attachedFiles.length > 0
            ? `Files: ${attachedFiles[0].name}${
                attachedFiles.length > 1
                  ? ` +${attachedFiles.length - 1} more`
                  : ""
              }`
            : "New Chat";

        const requestBody = {
          title: conversationTitle,
          context: null,
          status: "active",
          ...(chatMode === "project" &&
            currentProjectId && { project_id: currentProjectId }),
        };

        const newConversation = await apiFetch("/api/conversations", {
          method: "POST",
          body: requestBody,
        });

        // Immediately add the new conversation to the list
        setConversations((prev) => [newConversation, ...prev]);

        // Set messages to empty first
        setMessages([]);
        setIsNewChatMode(false);

        // Clear the reload flag since we've already updated the list
        setNeedsConversationReload(false);

        // Send message FIRST, then set as selected to avoid race condition
        const messageToSend = message.trim() || "Here are the uploaded files:";
        await sendMessageToConversation(newConversation.id, messageToSend);

        // Skip auto-loading messages since we just sent the first message which is streaming
        skipNextLoadRef.current = true;

        // Now set as selected after message is sent
        setSelectedConversation(newConversation);
      } catch (err) {
        console.error("Failed to create conversation:", err);
        setError("Failed to create new conversation");
        setIsLoading(false);
      }
    } else {
      await sendMessage();
    }
  };

  const sendMessageToConversation = async (conversationId, messageContent) => {
    const userMessage = messageContent.trim();
    const filesToUpload = [...attachedFiles];
    setMessage("");
    setAttachedFiles([]);

    const displayMessageContent =
      userMessage +
      (filesToUpload.length > 0
        ? (userMessage ? "\n\n" : "") +
          `📎 ${userMessage ? "Attached" : "Uploaded"} files: ${filesToUpload
            .map((f) => f.name)
            .join(", ")}`
        : "");

    setError(null);
    setIsLoading(true);

    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: displayMessageContent,
      created_at: new Date().toISOString(),
      conversation_id: conversationId,
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      // Upload files
      const uploadedDocuments = [];
      for (const file of filesToUpload) {
        try {
          const formData = new FormData();
          formData.append("file", file);

          if (chatMode === "project" && currentProjectId) {
            formData.append("project_id", currentProjectId.toString());
          }
          formData.append("conversation_id", conversationId.toString());

          const uploadData = await apiFetch("/api/documents", {
            method: "POST",
            body: formData,
          });

          if (uploadData.success && uploadData.document) {
            uploadedDocuments.push(uploadData.document);
          }
        } catch (uploadErr) {
          console.error("Error uploading file:", uploadErr);
        }
      }

      // Prepare message with document contents
      let messageForAI = userMessage;
      if (uploadedDocuments.length > 0) {
        const fileNames = uploadedDocuments
          .map((doc) => doc.original_filename)
          .join(", ");
        messageForAI += `\n\n📎 Attached files: ${fileNames}`;

        const documentContents = uploadedDocuments
          .filter((doc) => doc.content?.trim())
          .map((doc) => `File: ${doc.original_filename}\n${doc.content}`)
          .join("\n\n---\n\n");

        if (documentContents) {
          messageForAI += `\n\nUploaded document contents:\n\n${documentContents}`;
        }
      }

      // Get provider for the selected model
      const selectedModel = models.find(m => m.model_id === selectedModelId);
      const modelProvider = selectedModel?.provider || 'groq';

      // Send message with streaming support
      const body = {
        content: messageForAI,
        role: "user",
        ...(selectedModelId && { model_id: selectedModelId }),
        ...(modelProvider && { provider: modelProvider }),
        ...(chatMode === "project" &&
          currentProjectId && { project_id: currentProjectId }),
      };

      const response = await apiFetch(
        `/api/conversations/${conversationId}/messages/stream`,
        {
          method: "POST",
          body,
        },
      );

      // This endpoint returns JSON (not SSE) — streaming happens over WebSocket.
      // The response contains { user_message, success, streaming } on success,
      // or { error, ... } on failure (which apiFetch already throws as an exception).
      if (response?.user_message) {
        // Replace temp user message with the server-persisted one
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempUserMessage.id ? response.user_message : msg,
          ),
        );
      }

      // Stop loading; AI response streams in via WebSocket
      setIsLoading(false);

      // Load conversation documents if any were uploaded
      if (uploadedDocuments.length > 0) {
        try {
          await loadConversationDocuments(conversationId);
        } catch (docErr) {
          console.error("Failed to load documents:", docErr);
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);

      const errorMessage =
        err.status === 401
          ? "You are not authenticated. Please log in again."
          : "Failed to send message. Please try again.";

      if (err.status === 401) await performLogout();

      setError(errorMessage);
      setIsLoading(false);

      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await loadMessages(conversationId);
        setError(null);
      } catch (reloadErr) {
        console.error("Failed to reload:", reloadErr);
      }
    }
  };

  const sendMessage = async () => {
    if (
      (!message.trim() && attachedFiles.length === 0) ||
      !selectedConversation ||
      isLoading ||
      isLoadingMessages
    ) {
      return;
    }
    const messageToSend = message.trim() || "Here are the uploaded files:";
    await sendMessageToConversation(selectedConversation.id, messageToSend);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading && !isLoadingMessages) {
      e.preventDefault();
      if (message.trim() || attachedFiles.length > 0) handleSendMessage();
    }
  };

  const startEditingConversation = (conversation) => {
    setEditingConversationId(conversation.id);
    setEditingTitle(conversation.title || "New Chat");
    setShowDropdownId(null);
  };

  const cancelEditing = () => {
    setEditingConversationId(null);
    setEditingTitle("");
  };

  const saveConversationTitle = async (conversationId) => {
    if (!editingTitle.trim()) {
      cancelEditing();
      return;
    }

    try {
      await apiFetch(`/api/conversations/${conversationId}`, {
        method: "PUT",
        body: { title: editingTitle.trim() },
      });

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, title: editingTitle.trim() }
            : conv,
        ),
      );

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation((prev) => ({
          ...prev,
          title: editingTitle.trim(),
        }));
      }

      setEditingConversationId(null);
      setEditingTitle("");
    } catch (err) {
      console.error("Failed to update title:", err);
      setError("Failed to update conversation title");
    }
  };

  const deleteConversation = async (conversationId) => {
    if (!confirm("Are you sure?")) return;

    try {
      await apiFetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });
      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationId),
      );

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
        setConversationDocuments([]);
        setIsNewChatMode(false);
      }
      setShowDropdownId(null);
    } catch (err) {
      console.error("Failed to delete:", err);
      setError("Failed to delete conversation");
    }
  };

  const handleEditKeyPress = (e, conversationId) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveConversationTitle(conversationId);
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const handleFileUpload = (files) => {
    setAttachedFiles((prev) => [...prev, ...files]);
    setIsFileUploadOpen(false);
  };

  const removeAttachedFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectConversation = (conv) => {
    // Reload conversations if needed before selecting
    if (needsConversationReload) {
      loadConversations();
      setNeedsConversationReload(false);
    }

    setSelectedConversation(conv);
    setIsNewChatMode(false);
    setLatestAIMessageId(null);
  };

  // Show skeleton while initializing or loading conversations for the first time
  if (isInitializing || isLoadingConversations) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex h-screen bg-gray-50 relative">
      <Sidebar
        isMobile={isMobile}
        onToggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        conversations={conversations}
        selectedConversation={selectedConversation}
        editingConversationId={editingConversationId}
        editingTitle={editingTitle}
        showDropdownId={showDropdownId}
        isInitializing={isInitializing}
        projects={projects}
        currentProjectId={currentProjectId}
        fullName={user?.name}
        chatMode={chatMode}
        onSwitchToNormalMode={switchToNormalMode}
        onSwitchToProjectMode={switchToProjectMode}
        onSelectProject={setCurrentProjectId}
        onCreateNewConversation={createNewConversation}
        onSelectConversation={handleSelectConversation}
        onStartEditingConversation={startEditingConversation}
        onCancelEditing={cancelEditing}
        onSaveConversationTitle={saveConversationTitle}
        onDeleteConversation={deleteConversation}
        onEditTitleChange={setEditingTitle}
        onToggleDropdown={setShowDropdownId}
        onEditKeyPress={handleEditKeyPress}
      />

      <ChatArea
        selectedConversation={selectedConversation}
        messages={messages}
        isLoading={isLoading}
        isLoadingMessages={isLoadingMessages}
        conversationDocuments={conversationDocuments}
        error={error}
        setError={setError}
        message={message}
        setMessage={setMessage}
        attachedFiles={attachedFiles}
        setAttachedFiles={setAttachedFiles}
        handleSendMessage={handleSendMessage}
        sendMessage={sendMessage}
        handleKeyPress={handleKeyPress}
        openFileUpload={() => setIsFileUploadOpen(true)}
        removeAttachedFile={removeAttachedFile}
        isInitializing={isInitializing}
        currentProjectId={currentProjectId}
        chatMode={chatMode}
        onSwitchToNormalMode={switchToNormalMode}
        isNewChatMode={isNewChatMode}
        streamingMessageId={streamingMessageId}
        latestAIMessageId={latestAIMessageId}
        messagesEndRef={messagesEndRef}
        isMobile={isMobile}
        onToggleSidebar={toggleSidebar}
        onScroll={handleScroll}
        models={models}
        selectedModelId={selectedModelId}
        onSelectModel={setSelectedModelId}
        user={user}
      />

      {isFileUploadOpen && (
        <FileUpload
          onFilesSelected={handleFileUpload}
          onClose={() => setIsFileUploadOpen(false)}
          maxFiles={5}
          maxSizePerFile={10}
        />
      )}
    </div>
  );
}
