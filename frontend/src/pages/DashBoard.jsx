import React, { useState, useRef, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { apiFetch } from '../utils/auth.js';
import { useDashboard } from '../hooks/useDashboard.js';
import Sidebar from '../components/dashboard/Sidebar.jsx';
import ChatArea from '../components/dashboard/ChatArea.jsx';
import FileUpload from '../components/FileUpload.jsx';
import KBUploadModal from '../components/KBUploadModal.jsx';
import RequirementsViewer from '../components/RequirementsViewer.jsx';

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
    performLogout
  } = useDashboard();
  

  const toggleSidebar = () => {
  setIsSidebarOpen(!isSidebarOpen);
  };
  // Streaming state - simpler approach
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const streamingTimeoutRef = useRef(null);

  const fullName = user?.name;
  const currentProject = projects.find(p => p.id === currentProjectId);
  const [isNewChatMode, setIsNewChatMode] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [kbRefreshKey, setKBRefreshKey] = useState(0);
  const [isKBUploadOpen, setIsKBUploadOpen] = useState(false);
  const [kbUploadStatus, setKBUploadStatus] = useState(null);

  // Auto-scroll effect - scroll when messages change or streaming
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMessageId]);

  useEffect(() => {
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, []);
  
  const switchToNormalMode = () => {
    setChatMode('normal');
    setCurrentProjectId(null);
    setSelectedConversation(null);
    setMessages([]);
    setAttachedFiles([]);
    setConversationDocuments([]);
    setIsNewChatMode(false);
    loadConversations();
  };

  const createNewConversation = async () => {
    setIsNewChatMode(true);
    setSelectedConversation(null);
    setMessages([]);
    setAttachedFiles([]);
    setConversationDocuments([]);
    setError(null);
  };

  // Simulate Claude-like streaming: reveal text character by character
  const simulateStreaming = (messageId, fullText, realMessage) => {
    console.log('🎬 Starting Claude-style streaming for:', messageId);
    
    // Clear any existing timeout
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
    }

    setStreamingMessageId(messageId);
    
    let currentIndex = 0;
    const totalLength = fullText.length;
    
    // Faster, smoother streaming - like Claude
    const streamNextChunk = () => {
      if (currentIndex < totalLength) {
        // Stream 3-5 characters at a time for smooth, fast feel
        const chunkSize = Math.floor(Math.random() * 3) + 3; // 3-5 chars
        currentIndex = Math.min(currentIndex + chunkSize, totalLength);
        
        const streamedText = fullText.slice(0, currentIndex);
        
        // Update the message content in real-time
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, content: streamedText, isStreaming: true }
              : msg
          )
        );
        
        // Continue streaming with varying speed for natural feel
        const delay = Math.floor(Math.random() * 20) + 10; // 10-30ms
        streamingTimeoutRef.current = setTimeout(streamNextChunk, delay);
      } else {
        // Streaming complete
        console.log('✅ Streaming complete');
        setStreamingMessageId(null);
        
        // Replace with final real message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...realMessage, isStreaming: false }
              : msg
          )
        );
      }
    };
    
    // Start streaming
    streamNextChunk();
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && attachedFiles.length === 0) || isLoading || isLoadingMessages) return;

    if (isNewChatMode || !selectedConversation) {
      if (chatMode === "project" && !currentProjectId) {
        setError("No project available. Please wait for project initialization.");
        return;
      }

      try {
        setError(null);
        setIsLoading(true);

        const conversationTitle = message.trim()
          ? message.slice(0, 50)
          : attachedFiles.length > 0
          ? `Files: ${attachedFiles[0].name}${attachedFiles.length > 1 ? ` +${attachedFiles.length - 1} more` : ""}`
          : "New Chat";

        const requestBody = {
          title: conversationTitle,
          context: null,
          status: "active",
        };

        if (chatMode === "project" && currentProjectId) {
          requestBody.project_id = currentProjectId;
        }

        const newConversation = await apiFetch("/api/conversations", {
          method: "POST",
          body: requestBody,
        });

        setConversations([newConversation, ...conversations]);
        setSelectedConversation(newConversation);
        setMessages([]);
        setIsNewChatMode(false);

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

    let displayMessageContent = userMessage;
    if (filesToUpload.length > 0) {
      const fileNames = filesToUpload.map((file) => file.name).join(", ");
      displayMessageContent += displayMessageContent
        ? `\n\n📎 Attached files: ${fileNames}`
        : `📎 Uploaded files: ${fileNames}`;
    }

    // Add user message
    const newUserMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: displayMessageContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setError(null);
    setIsLoading(true);

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
          console.error(`Error uploading file:`, uploadErr);
        }
      }

      // Create message for AI
      let messageForAI = userMessage;
      if (uploadedDocuments.length > 0) {
        const fileNames = uploadedDocuments.map((doc) => doc.original_filename).join(", ");
        messageForAI += `\n\n📎 Attached files: ${fileNames}`;
        
        const documentContents = uploadedDocuments
          .filter((doc) => doc.content?.trim())
          .map((doc) => `File: ${doc.original_filename}\n${doc.content}`)
          .join("\n\n---\n\n");

        if (documentContents) {
          messageForAI += `\n\nUploaded document contents:\n\n${documentContents}`;
        }
      }

      // Send message
      const body = {
        content: messageForAI,
        role: "user",
      };
      if (chatMode === "project" && currentProjectId) {
        body.project_id = currentProjectId;
      }
      
      console.log("📤 Sending message...");
      await apiFetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body,
      });

      // Create empty assistant message immediately
      const streamingMessageId = `streaming-${Date.now()}`;
      const streamingMessage = {
        id: streamingMessageId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, streamingMessage]);
      setIsLoading(false);

      // Wait a moment then fetch and stream
      await new Promise(resolve => setTimeout(resolve, 800));

      console.log("📥 Fetching response...");
      const messagesData = await apiFetch(`/api/conversations/${conversationId}/messages`);
      
      if (messagesData?.messages && Array.isArray(messagesData.messages)) {
        const assistantMessages = messagesData.messages.filter(m => m.role === 'assistant');
        const latestAiMessage = assistantMessages[assistantMessages.length - 1];

        if (latestAiMessage?.content) {
          console.log("🤖 Starting Claude-style streaming...");
          simulateStreaming(streamingMessageId, latestAiMessage.content, latestAiMessage);
        } else {
          console.warn("⚠️ No AI response");
          setIsLoading(false);
          await loadMessages(conversationId);
        }
      } else {
        console.warn("⚠️ Invalid response");
        setIsLoading(false);
        await loadMessages(conversationId);
      }

      try {
        await loadConversationDocuments(conversationId);
      } catch (docErr) {
        console.error("Failed to load documents:", docErr);
      }

    } catch (err) {
      console.error("❌ Failed to send message:", err);
      
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      setStreamingMessageId(null);
      
      let errorMessage = "Failed to send message. Please try again.";
      if (err.status === 401) {
        errorMessage = "You are not authenticated. Please log in again.";
        await performLogout();
      }

      setError(errorMessage);
      setMessages((prev) => prev.filter((msg) => msg.id !== newUserMessage.id));
      setIsLoading(false);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await loadMessages(conversationId);
        setError(null);
      } catch (reloadErr) {
        console.error("Failed to reload:", reloadErr);
      }
    }
  };

  const sendMessage = async () => {
    if ((!message.trim() && attachedFiles.length === 0) || !selectedConversation || isLoading || isLoadingMessages) return;
    const messageToSend = message.trim() || "Here are the uploaded files:";
    await sendMessageToConversation(selectedConversation.id, messageToSend);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isLoadingMessages) {
      e.preventDefault();
      if (message.trim() || attachedFiles.length > 0) {
        handleSendMessage();
      }
    }
  };

  const startEditingConversation = (conversation) => {
    setEditingConversationId(conversation.id);
    setEditingTitle(conversation.title || 'New Chat');
    setShowDropdownId(null);
  };

  const cancelEditing = () => {
    setEditingConversationId(null);
    setEditingTitle('');
  };

  const saveConversationTitle = async (conversationId) => {
    if (!editingTitle.trim()) {
      cancelEditing();
      return;
    }

    try {
      await apiFetch(`/api/conversations/${conversationId}`, {
        method: 'PUT',
        body: { title: editingTitle.trim() }
      });

      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId ? { ...conv, title: editingTitle.trim() } : conv
        )
      );

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(prev => ({ ...prev, title: editingTitle.trim() }));
      }

      setEditingConversationId(null);
      setEditingTitle('');
    } catch (err) {
      console.error('Failed to update title:', err);
      setError('Failed to update conversation title');
    }
  };

  const deleteConversation = async (conversationId) => {
    if (!confirm('Are you sure?')) return;

    try {
      await apiFetch(`/api/conversations/${conversationId}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
        setConversationDocuments([]);
        setIsNewChatMode(false);
      }
      setShowDropdownId(null);
    } catch (err) {
      console.error('Failed to delete:', err);
      setError('Failed to delete conversation');
    }
  };

  const handleEditKeyPress = (e, conversationId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveConversationTitle(conversationId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleFileUpload = (files) => {
    setAttachedFiles(prev => [...prev, ...files]);
    setIsFileUploadOpen(false);
  };

  const removeAttachedFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openFileUpload = () => setIsFileUploadOpen(true);
  const closeFileUpload = () => setIsFileUploadOpen(false);

  const openKBUpload = () => {
    setIsKBUploadOpen(true);
    setKBUploadStatus(null);
  };

  const closeKBUpload = () => {
    setIsKBUploadOpen(false);
    setKBUploadStatus(null);
  };

  const handleKBUpload = async (files, onProgress) => {
    if (!currentProjectId) throw new Error('No project selected');

    let uploadedCount = 0;
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', currentProjectId.toString());
        
        const uploadData = await apiFetch('/api/documents', {
          method: 'POST',
          body: formData,
        });

        if (uploadData.success) {
          uploadedCount++;
          onProgress(uploadedCount);
        }
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
        throw new Error(`Failed to upload ${file.name}`);
      }
    }

    try {
      setKBUploadStatus('Building Knowledge Base...');
      await apiFetch(`/api/projects/${currentProjectId}/kb/build`, { method: 'POST' });
      setKBUploadStatus('Build started!');
      setTimeout(() => setKBUploadStatus(null), 3000);
    } catch (err) {
      setError('KB build failed');
      throw new Error('Failed to build KB');
    }
  };

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
        currentProjectId={currentProjectId}
        fullName={fullName}
        onCreateNewConversation={createNewConversation}
        onSelectConversation={(conv) => {
        setSelectedConversation(conv);
        setIsNewChatMode(false);
        }}
        onStartEditingConversation={startEditingConversation}
        onCancelEditing={cancelEditing}
        onSaveConversationTitle={saveConversationTitle}
        onDeleteConversation={deleteConversation}
        onEditTitleChange={setEditingTitle}
        onToggleDropdown={setShowDropdownId}
        onEditKeyPress={handleEditKeyPress}
        loadMessages={(convId) => {
          loadMessages(convId);
          setIsNewChatMode(false);
        }}
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
        openFileUpload={openFileUpload}
        removeAttachedFile={removeAttachedFile}
        isInitializing={isInitializing}
        currentProjectId={currentProjectId}
        chatMode={chatMode}
        currentProject={currentProject}
        onSwitchToNormalMode={switchToNormalMode}
        onOpenKBUpload={openKBUpload}
        onToggleRequirements={() => setShowRequirements(v => !v)}
        isNewChatMode={isNewChatMode}
        streamingMessageId={streamingMessageId}
        messagesEndRef={messagesEndRef}
        isMobile={isMobile}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
      />

      {isFileUploadOpen && (
        <FileUpload
          onFilesSelected={handleFileUpload}
          onClose={closeFileUpload}
          maxFiles={5}
          maxSizePerFile={10}
        />
      )}
      
      {isKBUploadOpen && currentProject && (
        <KBUploadModal
          onClose={closeKBUpload}
          onUpload={handleKBUpload}
          projectId={currentProjectId}
          projectName={currentProject.name}
        />
      )}
      
      {showRequirements && currentProjectId && (
        <RequirementsViewer
          projectId={currentProjectId}
          onClose={() => setShowRequirements(false)}
          refreshKey={kbRefreshKey}
        />
      )}
    </div>
  );
}