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
    loadMessages,
    loadConversations,
    loadConversationDocuments,
    performLogout,
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

    const channel = echo.channel(`conversation.${selectedConversation.id}`);
    const streamState = {
      tempMessageId: null,
      buffer: "",
      animationFrameId: null,
      lastUpdateTime: 0,
    };

    channel.listen(".message.chunk", (data) => {
      const { metadata, message_id, is_complete, chunk } = data;

      if (metadata?.status === "started") {
        streamState.tempMessageId = message_id;

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
        if (streamState.animationFrameId) {
          cancelAnimationFrame(streamState.animationFrameId);
        }

        // Flush remaining buffer
        if (streamState.buffer) {
          const finalContent = streamState.buffer;
          streamState.buffer = "";

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamState.tempMessageId
                ? {
                    ...msg,
                    content: msg.content + finalContent,
                    isStreaming: true,
                  }
                : msg
            )
          );
        }

        // Replace with saved message or mark as complete
        if (metadata?.message) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamState.tempMessageId
                ? { ...metadata.message, isStreaming: false }
                : msg
            )
          );
        } else {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamState.tempMessageId
                ? { ...msg, isStreaming: false }
                : msg
            )
          );
        }

        setStreamingMessageId(null);

        // Update conversation timestamp to move it to the top of the list
        setConversations((prev) =>
          prev
            .map((conv) =>
              conv.id === selectedConversation.id
                ? { ...conv, updated_at: new Date().toISOString() }
                : conv
            )
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        );
      } else {
        // Add chunk to buffer
        streamState.buffer += chunk;

        // Cancel previous animation frame
        if (streamState.animationFrameId) {
          cancelAnimationFrame(streamState.animationFrameId);
        }

        const updateUI = (timestamp) => {
          // Update immediately for smooth typewriter effect (no throttling)
          const bufferedContent = streamState.buffer;
          streamState.buffer = "";
          streamState.lastUpdateTime = timestamp;

          if (bufferedContent) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === streamState.tempMessageId
                  ? {
                      ...msg,
                      content: msg.content + bufferedContent,
                      isStreaming: true,
                    }
                  : msg
              )
            );
          }
        };

        streamState.animationFrameId = requestAnimationFrame(updateUI);
      }
    });

    return () => {
      if (streamState.animationFrameId) {
        cancelAnimationFrame(streamState.animationFrameId);
      }
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
          "No project available. Please wait for project initialization."
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

        // Set the conversation as selected
        setSelectedConversation(newConversation);
        setMessages([]);
        setIsNewChatMode(false);

        // Clear the reload flag since we've already updated the list
        setNeedsConversationReload(false);

        const messageToSend = message.trim() || "Here are the uploaded files:";
        await sendMessageToConversation(newConversation.id, messageToSend);
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

      // Send message with streaming support
      const body = {
        content: messageForAI,
        role: "user",
        ...(chatMode === "project" &&
          currentProjectId && { project_id: currentProjectId }),
      };

      const response = await apiFetch(
        `/api/conversations/${conversationId}/messages/stream`,
        {
          method: "POST",
          body,
        }
      );

      // Replace temp user message with the actual saved message from server
      if (response.user_message) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempUserMessage.id ? response.user_message : msg
          )
        );
      }

      setIsLoading(false);

      // WebSocket will stream the AI response in real-time
      // No need to fetch all messages again

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
            : conv
        )
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
        prev.filter((conv) => conv.id !== conversationId)
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

  // Show skeleton while initializing
  if (isInitializing) {
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
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
        onScroll={handleScroll}
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
