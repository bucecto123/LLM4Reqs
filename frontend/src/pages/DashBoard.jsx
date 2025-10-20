import React from 'react';
import { apiFetch } from '../utils/auth';
import { useDashboard } from '../hooks/useDashboard';
import Sidebar from '../components/dashboard/Sidebar';
import ChatArea from '../components/dashboard/ChatArea';
import FileUpload from '../components/FileUpload.jsx';

export default function LLMDashboard() {
  const {
    // State
    user,
    message,
    setMessage,
    isSidebarOpen,
    setIsSidebarOpen,
    chatMode,
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
    
    // Functions
    loadMessages,
    loadConversationDocuments,
    performLogout
  } = useDashboard();
  
  const fullName = user?.name;

  // Create new conversation
  const createNewConversation = async () => {
    // For project mode, ensure we have a project
    if (chatMode === "project" && !currentProjectId) {
      setError(
        "No project available. Please wait for project initialization or switch to normal chat mode."
      );
      return;
    }

    try {
      setError(null);
      const requestBody = {
        title: "New Chat",
        context: null,
        status: "active",
      };

      // Only include project_id if in project mode
      if (chatMode === "project") {
        requestBody.project_id = currentProjectId;
      }

      const data = await apiFetch("/api/conversations", {
        method: "POST",
        body: requestBody,
      });
      setConversations([data, ...conversations]);
      setSelectedConversation(data);
      setMessages([]);
      setAttachedFiles([]);
      setConversationDocuments([]);
    } catch (err) {
      console.error("Failed to create conversation:", err);
      let errorMessage = "Failed to create new conversation";

      if (err.status === 401) {
        errorMessage = "You are not authenticated. Please log in again.";
        await performLogout();
      } else if (err.status === 422) {
        errorMessage = "Invalid conversation data. Please try again.";
      }

      setError(errorMessage);
    }
  };

  // Handle sending message (creates new conversation if needed)
  const handleSendMessage = async () => {
    if ((!message.trim() && attachedFiles.length === 0) || isLoading || isLoadingMessages) return;

    if (!selectedConversation) {
      // For project mode, ensure we have a project
      if (chatMode === "project" && !currentProjectId) {
        setError(
          "No project available. Please wait for project initialization or switch to normal chat mode."
        );
        return;
      }

      // Create new conversation first, then send message
      try {
        setError(null);
        setIsLoading(true);

        const conversationTitle = message.trim()
          ? message.slice(0, 50) // Use first 50 chars of message as title
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
        };

        // Only include project_id if in project mode
        if (chatMode === "project") {
          requestBody.project_id = currentProjectId;
        }

        const newConversation = await apiFetch("/api/conversations", {
          method: "POST",
          body: requestBody,
        });

        setConversations([newConversation, ...conversations]);
        setSelectedConversation(newConversation);
        setMessages([]);

        // Now send the message to the new conversation
        const messageToSend = message.trim() || "Here are the uploaded files:";
        await sendMessageToConversation(newConversation.id, messageToSend);
      } catch (err) {
        console.error("Failed to create conversation:", err);
        let errorMessage = "Failed to create new conversation";

        if (err.status === 401) {
          errorMessage = "You are not authenticated. Please log in again.";
          await performLogout();
        } else if (err.status === 422) {
          errorMessage = "Invalid conversation data. Please try again.";
        }

        setError(errorMessage);
        setIsLoading(false);
      }
    } else {
      // Send message to existing conversation
      await sendMessage();
    }
  };

  // Helper function to send message to a specific conversation
  const sendMessageToConversation = async (conversationId, messageContent) => {
    const userMessage = messageContent.trim();
    const filesToUpload = [...attachedFiles]; // Copy attached files
    setMessage("");
    setAttachedFiles([]); // Clear attached files
    setIsLoading(true); // Set loading at the start

    // Create message content with file info for display (no file contents)
    let displayMessageContent = userMessage;
    if (filesToUpload.length > 0) {
      const fileNames = filesToUpload.map((file) => file.name).join(", ");
      displayMessageContent += displayMessageContent
        ? `\n\n📎 Attached files: ${fileNames}`
        : `📎 Uploaded files: ${fileNames}`;
    }

    // Add user message to UI immediately (only shows message + file names)
    const newUserMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: displayMessageContent,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setError(null);

    try {
      // First, upload any attached files
      const uploadedDocuments = [];
      for (const file of filesToUpload) {
        try {
          const formData = new FormData();
          formData.append("file", file);
          
          // For project mode, ensure we have a project_id
          if (chatMode === "project") {
            if (!currentProjectId) {
              throw new Error("No project available for file upload. Please wait for project initialization.");
            }
            formData.append("project_id", currentProjectId.toString());
          }
          formData.append("conversation_id", conversationId.toString());

          const uploadData = await apiFetch("/api/documents", {
            method: "POST",
            body: formData,
          });

          if (uploadData.success && uploadData.document) {
            uploadedDocuments.push(uploadData.document);

            // Process the document to extract requirements (optional)
            try {
              await apiFetch(
                `/api/documents/${uploadData.document.id}/process`,
                {
                  method: "POST",
                }
              );
              console.log(
                `Document ${uploadData.document.original_filename} processed successfully`
              );
            } catch (processErr) {
              console.warn(
                `Failed to process document ${uploadData.document.original_filename}:`,
                processErr
              );
              // Continue anyway - the document is uploaded and can still be used in chat
            }
          } else {
            console.warn(
              `Failed to upload file ${file.name}: Invalid response format`
            );
          }
        } catch (uploadErr) {
          console.error(`Error uploading file ${file.name}:`, uploadErr);
          
          // Show user-friendly error messages
          let errorMsg = `Failed to upload ${file.name}`;
          if (uploadErr.status === 422) {
            errorMsg += ": Validation failed. Please ensure you have a project selected.";
          } else if (uploadErr.status === 413) {
            errorMsg += ": File too large. Maximum size is 10MB.";
          } else if (uploadErr.message) {
            errorMsg += `: ${uploadErr.message}`;
          }
          
          setError(errorMsg);
        }
      }

      // Create enhanced message content for the AI (includes full document content)
      // This is sent to the backend but NOT displayed in the chat
      let messageForAI = userMessage;
      if (uploadedDocuments.length > 0) {
        const documentContents = uploadedDocuments
          .filter((doc) => doc.content && doc.content.trim())
          .map((doc) => {
            // Don't truncate for AI - it needs the full content
            return `File: ${doc.original_filename}\n${doc.content}`;
          })
          .join("\n\n---\n\n");

        if (documentContents) {
          messageForAI += `\n\nUploaded document contents:\n\n${documentContents}`;
        }
      }

      // Send message with document context to the conversation (backend only)
      await apiFetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: {
          content: messageForAI,
          role: "user",
        },
      });

      // Reload messages to get the full conversation including AI response
      await loadMessages(conversationId);

      // Reload conversation documents to reflect newly uploaded files
      await loadConversationDocuments(conversationId);
    } catch (err) {
      console.error("Failed to send message:", err);
      let errorMessage = "Failed to send message. Please try again.";

      if (err.status === 401) {
        errorMessage = "You are not authenticated. Please log in again.";
        await performLogout();
      } else if (err.status === 404) {
        errorMessage = "Conversation not found. Please select a different conversation.";
      } else if (err.status === 422) {
        errorMessage = "Invalid message format. Please check your input.";
      } else if (err.message && err.message.includes("Request too large")) {
        errorMessage = "Your message is too long. Try shortening it or uploading smaller files.";
      } else if (err.message && err.message.includes("rate_limit_exceeded")) {
        errorMessage = "Message too large for AI processing. Please try with smaller files or shorter messages.";
      }

      setError(errorMessage);
      // Remove the temporary user message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== newUserMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if ((!message.trim() && attachedFiles.length === 0) || !selectedConversation || isLoading || isLoadingMessages) return;
    const messageToSend = message.trim() || "Here are the uploaded files:";
    await sendMessageToConversation(selectedConversation.id, messageToSend);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isLoadingMessages) {
      e.preventDefault();
      if (message.trim() || attachedFiles.length > 0) {
        handleSendMessage();
      }
    }
  };

  // Start editing conversation title
  const startEditingConversation = (conversation) => {
    setEditingConversationId(conversation.id);
    setEditingTitle(conversation.title || 'New Chat');
    setShowDropdownId(null);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingConversationId(null);
    setEditingTitle('');
  };

  // Save conversation title
  const saveConversationTitle = async (conversationId) => {
    if (!editingTitle.trim()) {
      cancelEditing();
      return;
    }

    try {
      await apiFetch(`/api/conversations/${conversationId}`, {
        method: 'PUT',
        body: {
          title: editingTitle.trim()
        }
      });

      // Update the conversation in the list
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, title: editingTitle.trim() }
            : conv
        )
      );

      // Update selected conversation if it's the one being edited
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(prev => ({ ...prev, title: editingTitle.trim() }));
      }

      setEditingConversationId(null);
      setEditingTitle('');
    } catch (err) {
      console.error('Failed to update conversation title:', err);
      let errorMessage = 'Failed to update conversation title';
      
      if (err.status === 401) {
        errorMessage = 'You are not authenticated. Please log in again.';
        await performLogout();
      } else if (err.status === 403) {
        errorMessage = 'You do not have permission to edit this conversation.';
      } else if (err.status === 404) {
        errorMessage = 'Conversation not found.';
      } else if (err.status === 422) {
        errorMessage = 'Invalid title. Please check your input.';
      }
      
      setError(errorMessage);
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId) => {
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      await apiFetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      });

      // Remove from conversations list
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));

      // If this was the selected conversation, clear it
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
        setConversationDocuments([]);
      }

      setShowDropdownId(null);
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      let errorMessage = 'Failed to delete conversation';
      
      if (err.status === 401) {
        errorMessage = 'You are not authenticated. Please log in again.';
        await performLogout();
      } else if (err.status === 403) {
        errorMessage = 'You do not have permission to delete this conversation.';
      } else if (err.status === 404) {
        errorMessage = 'Conversation not found.';
      }
      
      setError(errorMessage);
    }
  };

  // Handle Enter key for editing title
  const handleEditKeyPress = (e, conversationId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveConversationTitle(conversationId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // File upload handlers
  const handleFileUpload = (files) => {
    setAttachedFiles(prev => [...prev, ...files]);
    setIsFileUploadOpen(false);
  };

  const removeAttachedFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openFileUpload = () => {
    setIsFileUploadOpen(true);
  };

  const closeFileUpload = () => {
    setIsFileUploadOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
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
        onSelectConversation={setSelectedConversation}
        onStartEditingConversation={startEditingConversation}
        onCancelEditing={cancelEditing}
        onSaveConversationTitle={saveConversationTitle}
        onDeleteConversation={deleteConversation}
        onEditTitleChange={setEditingTitle}
        onToggleDropdown={setShowDropdownId}
        onEditKeyPress={handleEditKeyPress}
        loadMessages={loadMessages}
      />

      {/* Main Chat Area */}
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
      />

      {/* File Upload Modal */}
      {isFileUploadOpen && (
        <FileUpload
          onFilesSelected={handleFileUpload}
          onClose={closeFileUpload}
          maxFiles={5}
          maxSizePerFile={10}
        />
      )}
      
      {/* Hidden div for scrolling */}
      <div ref={messagesEndRef} />
    </div>
  );
}