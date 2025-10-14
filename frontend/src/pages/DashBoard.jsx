import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../utils/auth';
import { useAuth, useLogout } from '../hooks/useAuth.jsx';
import { Home, TrendingUp, Plane, ShoppingBag, Plus, Search, Grid3x3, Mic, Send, Globe, Paperclip, ChevronRight, Sparkles, MessageSquare, Loader2, MoreVertical, Edit2, Trash2, Check, X } from 'lucide-react';
import FileUpload from '../components/FileUpload.jsx';

export default function LLMDashboard() {
  const [message, setMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef();
  
  // Use the new authentication hooks
  const { user, isAuthenticated } = useAuth();
  const { logout: performLogout, isLoading: logoutLoading } = useLogout();
  
  const fullName = user?.name;
  
  // Chat state
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null); // Will be set from API
  const [projects, setProjects] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [editingConversationId, setEditingConversationId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDropdownId, setShowDropdownId] = useState(null);
  const messagesEndRef = useRef(null);
  
  // File upload state
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [conversationDocuments, setConversationDocuments] = useState([]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load projects and set current project
  const loadProjects = async () => {
    try {
      setIsInitializing(true);
      const data = await apiFetch('/api/projects');
      setProjects(Array.isArray(data) ? data : []);
      
      if (data && data.length > 0) {
        // Use the first available project
        setCurrentProjectId(data[0].id);
      } else {
        // Create a default project if none exist
        await createDefaultProject();
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      // Try to create a default project anyway
      await createDefaultProject();
    } finally {
      setIsInitializing(false);
    }
  };

  // Create a default project
  const createDefaultProject = async () => {
    try {
      const defaultProject = await apiFetch('/api/projects', {
        method: 'POST',
        body: {
          name: 'Default Project',
          description: 'Default project for conversations',
          status: 'active'
        }
      });
      setProjects([defaultProject]);
      setCurrentProjectId(defaultProject.id);
    } catch (err) {
      console.error('Failed to create default project:', err);
      let errorMessage = 'Failed to initialize project. Please refresh the page.';
      
      if (err.status === 401) {
        errorMessage = 'You are not authenticated. Please log in again.';
        await performLogout();
      } else if (err.status === 422) {
        errorMessage = 'Failed to create project. Invalid data.';
      }
      
      setError(errorMessage);
    }
  };

  // Load conversations for current project
  const loadConversations = async () => {
    if (!currentProjectId) return; // Don't try to load if no project ID
    
    try {
      const data = await apiFetch(`/api/projects/${currentProjectId}/conversations`);
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError('Failed to load conversations');
      setConversations([]);
    }
  };

  // Load messages for selected conversation
  const loadMessages = async (conversationId) => {
    try {
      setIsLoadingMessages(true);
      const data = await apiFetch(`/api/conversations/${conversationId}/messages`);
      setMessages(Array.isArray(data) ? data : []);
      setError(null);
      
      // Also load documents for this conversation
      await loadConversationDocuments(conversationId);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to load messages');
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Load documents for a conversation
  const loadConversationDocuments = async (conversationId) => {
    try {
      // Get all documents for the current project and filter by conversation_id
      if (!currentProjectId) return;
      
      const data = await apiFetch(`/api/projects/${currentProjectId}/documents`);
      const conversationDocs = data.documents?.filter(doc => doc.conversation_id == conversationId) || [];
      setConversationDocuments(conversationDocs);
    } catch (err) {
      console.error('Failed to load conversation documents:', err);
      setConversationDocuments([]);
    }
  };

  // Create new conversation
  const createNewConversation = async () => {
    if (!currentProjectId) {
      setError('No project available. Please wait for project initialization.');
      return;
    }
    
    try {
      setError(null);
      const data = await apiFetch('/api/conversations', {
        method: 'POST',
        body: {
          project_id: currentProjectId,
          title: 'New Chat',
          context: null,
          status: 'active'
        }
      });
      setConversations([data, ...conversations]);
      setSelectedConversation(data);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      let errorMessage = 'Failed to create new conversation';
      
      if (err.status === 401) {
        errorMessage = 'You are not authenticated. Please log in again.';
        await performLogout();
      } else if (err.status === 422) {
        errorMessage = 'Invalid conversation data. Please try again.';
      }
      
      setError(errorMessage);
    }
  };

  // Handle sending message (creates new conversation if needed)
  const handleSendMessage = async () => {
    if ((!message.trim() && attachedFiles.length === 0) || isLoading || isLoadingMessages) return;

    if (!selectedConversation) {
      if (!currentProjectId) {
        setError('No project available. Please wait for project initialization.');
        return;
      }
      
      // Create new conversation first, then send message
      try {
        setError(null);
        setIsLoading(true);
        
        const conversationTitle = message.trim() 
          ? message.slice(0, 50) // Use first 50 chars of message as title
          : attachedFiles.length > 0 
            ? `Files: ${attachedFiles[0].name}${attachedFiles.length > 1 ? ` +${attachedFiles.length - 1} more` : ''}`
            : 'New Chat';
        
        const newConversation = await apiFetch('/api/conversations', {
          method: 'POST',
          body: {
            project_id: currentProjectId,
            title: conversationTitle,
            context: null,
            status: 'active'
          }
        });
        
        setConversations([newConversation, ...conversations]);
        setSelectedConversation(newConversation);
        setMessages([]);
        
        // Now send the message to the new conversation
        const messageToSend = message.trim() || "Here are the uploaded files:";
        await sendMessageToConversation(newConversation.id, messageToSend);
        
      } catch (err) {
        console.error('Failed to create conversation:', err);
        let errorMessage = 'Failed to create new conversation';
        
        if (err.status === 401) {
          errorMessage = 'You are not authenticated. Please log in again.';
          await performLogout();
        } else if (err.status === 422) {
          errorMessage = 'Invalid conversation data. Please try again.';
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
    setMessage('');
    setAttachedFiles([]); // Clear attached files
    setIsLoading(true);  // Set loading at the start
    
    // Create message content with file info for display (no file contents)
    let displayMessageContent = userMessage;
    if (filesToUpload.length > 0) {
      const fileNames = filesToUpload.map(file => file.name).join(', ');
      displayMessageContent += displayMessageContent ? `\n\n📎 Attached files: ${fileNames}` : `📎 Uploaded files: ${fileNames}`;
    }
    
    // Add user message to UI immediately (only shows message + file names)
    const newUserMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: displayMessageContent,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setError(null);

    try {
      // First, upload any attached files
      const uploadedDocuments = [];
      for (const file of filesToUpload) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('project_id', currentProjectId.toString());
          formData.append('conversation_id', conversationId.toString());
          
          const uploadData = await apiFetch('/api/documents', {
            method: 'POST',
            body: formData
          });
          
          if (uploadData.success && uploadData.document) {
            uploadedDocuments.push(uploadData.document);
            
            // Process the document to extract requirements (optional)
            try {
              await apiFetch(`/api/documents/${uploadData.document.id}/process`, {
                method: 'POST'
              });
              console.log(`Document ${uploadData.document.original_filename} processed successfully`);
            } catch (processErr) {
              console.warn(`Failed to process document ${uploadData.document.original_filename}:`, processErr);
              // Continue anyway - the document is uploaded and can still be used in chat
            }
          } else {
            console.warn(`Failed to upload file ${file.name}: Invalid response format`);
          }
        } catch (uploadErr) {
          console.warn(`Error uploading file ${file.name}:`, uploadErr);
        }
      }
      
      // Create enhanced message content for the AI (includes full document content)
      // This is sent to the backend but NOT displayed in the chat
      let messageForAI = userMessage;
      if (uploadedDocuments.length > 0) {
        const documentContents = uploadedDocuments
          .filter(doc => doc.content && doc.content.trim())
          .map(doc => {
            // Don't truncate for AI - it needs the full content
            return `File: ${doc.original_filename}\n${doc.content}`;
          })
          .join('\n\n---\n\n');
          
        if (documentContents) {
          messageForAI += `\n\nUploaded document contents:\n\n${documentContents}`;
        }
      }
      
      // Send message with document context to the conversation (backend only)
      await apiFetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: {
          content: messageForAI,
          role: 'user'
        }
      });
      
      // Reload messages to get the full conversation including AI response
      await loadMessages(conversationId);
      
      // Reload conversation documents to reflect newly uploaded files
      await loadConversationDocuments(conversationId);
    } catch (err) {
      console.error('Failed to send message:', err);
      let errorMessage = 'Failed to send message. Please try again.';
      
      if (err.status === 401) {
        errorMessage = 'You are not authenticated. Please log in again.';
        await performLogout();
      } else if (err.status === 404) {
        errorMessage = 'Conversation not found. Please select a different conversation.';
      } else if (err.status === 422) {
        errorMessage = 'Invalid message format. Please check your input.';
      } else if (err.message && err.message.includes('Request too large')) {
        errorMessage = 'Your message is too long. Try shortening it or uploading smaller files.';
      } else if (err.message && err.message.includes('rate_limit_exceeded')) {
        errorMessage = 'Message too large for AI processing. Please try with smaller files or shorter messages.';
      }
      
      setError(errorMessage);
      // Remove the temporary user message on error
      setMessages(prev => prev.filter(msg => msg.id !== newUserMessage.id));
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

  useEffect(() => {
    function handleClickOutside(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setIsAccountOpen(false);
      }
      // Close conversation dropdown when clicking outside
      if (!e.target.closest('.conversation-dropdown')) {
        setShowDropdownId(null);
      }
    }
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // User state is now managed by the useAuth hook - no manual useEffect needed

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load conversations when project changes
  useEffect(() => {
    if (currentProjectId) {
      loadConversations();
    }
  }, [currentProjectId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4A7BA7' }}>
              <span className="text-2xl">🐟</span>
            </div>
            {isSidebarOpen && (
              <span className="font-semibold text-lg text-gray-800">Fishy</span>
            )}
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button 
            onClick={createNewConversation}
            disabled={isInitializing || !currentProjectId}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#DBE2EF', color: '#112D4E' }}
          >
            {isInitializing ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            {isSidebarOpen && <span>{isInitializing ? 'Loading...' : 'New Chat'}</span>}
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-4 space-y-1">
          <NavItem icon={<MessageSquare size={20} />} label="Conversations" active={true} isOpen={isSidebarOpen} />
          <NavItem icon={<TrendingUp size={20} />} label="Analytics" isOpen={isSidebarOpen} />
          <NavItem icon={<Plane size={20} />} label="Projects" isOpen={isSidebarOpen} />
          <NavItem icon={<ShoppingBag size={20} />} label="Documents" isOpen={isSidebarOpen} />
        </nav>

        {/* Conversations List */}
        {isSidebarOpen && (
          <div className="flex-1 px-4 mt-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase">Recent Chats</span>
            </div>
            <div className="space-y-2">
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">No conversations yet</p>
                  <p className="text-xs text-gray-400">Click "New Chat" to start</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedConversation?.id === conversation.id
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div 
                      onClick={() => {
                        if (editingConversationId !== conversation.id) {
                          setSelectedConversation(conversation);
                          loadMessages(conversation.id);
                        }
                      }}
                      className="flex-1"
                    >
                      {editingConversationId === conversation.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => handleEditKeyPress(e, conversation.id)}
                            className="flex-1 text-sm font-medium bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={() => saveConversationTitle(conversation.id)}
                            className="p-1 text-green-600 hover:text-green-700"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 text-gray-600 hover:text-gray-700"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium text-sm text-gray-800 truncate">
                            {conversation.title || 'New Chat'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(conversation.updated_at).toLocaleDateString()}
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Dropdown Menu */}
                    {editingConversationId !== conversation.id && (
                      <div className="absolute right-2 top-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdownId(showDropdownId === conversation.id ? null : conversation.id);
                          }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all duration-200"
                          title="More options"
                        >
                          <MoreVertical size={14} />
                        </button>
                        
                        {showDropdownId === conversation.id && (
                          <div className="conversation-dropdown absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingConversation(conversation);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 rounded-t-md"
                            >
                              <Edit2 size={12} />
                              <span>Rename</span>
                            </button>
                            <hr className="border-gray-100" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conversation.id);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2 rounded-b-md"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Account */}
        <div className="p-4 border-t border-gray-200 relative">
          <div ref={accountRef} className="w-full">
            <button onClick={() => setIsAccountOpen(!isAccountOpen)} className="w-full flex items-center space-x-3 hover:bg-gray-50 p-3 rounded-lg transition-colors">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#4A7BA7' }}>
                <span className="text-white text-sm font-semibold">A</span>
              </div>
              {isSidebarOpen && (
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-gray-800">{fullName || 'Account'}</div>
                  <div className="text-xs font-semibold" style={{ color: '#4A7BA7' }}>Pro</div>
                </div>
              )}
            </button>

            {/* small dropdown with only Logout */}
            {isAccountOpen && (
              <div
                className="absolute bottom-20 left-4 rounded shadow-lg z-50 w-40"
                style={{ backgroundColor: '#112D4E', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <button
                  onClick={performLogout}
                  disabled={logoutLoading}
                  className="w-full text-left px-4 py-2 text-sm text-white font-medium hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: 'transparent' }}
                >
                  {logoutLoading ? 'Logging out...' : 'Log out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedConversation ? selectedConversation.title || 'New Chat' : 'Fishy.ai'}
              </span>
              {/* Documents indicator */}
              {conversationDocuments.length > 0 && selectedConversation && (
                <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                  <Paperclip className="w-3 h-3" />
                  <span>{conversationDocuments.length} document{conversationDocuments.length !== 1 ? 's' : ''} loaded</span>
                </div>
              )}
            </div>
            {error && (
              <div className="text-red-600 text-sm bg-red-50 px-3 py-1 rounded-lg flex items-center space-x-2">
                <span>{error}</span>
                <button 
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Chat Content */}
        <div className="flex-1 flex flex-col">
          {!selectedConversation ? (
            /* Welcome Screen with Input */
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-3xl text-center">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <span className="text-5xl font-bold" style={{ color: '#112D4E' }}>Fishy</span>
                    <span 
                      className="text-3xl font-bold text-white px-4 py-1 rounded-lg"
                      style={{ backgroundColor: '#4A7BA7' }}
                    >
                      pro
                    </span>
                  </div>
                  <p className="text-gray-600 mb-8">Ask anything. Type a message to start a new conversation.</p>
                  
                  {/* Compact Input Area - Moved up and made smaller */}
                  <div className="max-w-2xl mx-auto">
                    {/* Attached Files Display */}
                    {attachedFiles.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Attached Files ({attachedFiles.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {attachedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2 bg-white px-3 py-2 rounded-md border text-sm"
                            >
                              <Paperclip className="w-3 h-3 text-gray-500" />
                              <span className="truncate max-w-32">{file.name}</span>
                              <button
                                onClick={() => removeAttachedFile(index)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                      <div className="flex items-center space-x-3">
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={handleKeyPress}
                          placeholder={isInitializing ? "Initializing..." : "How can I help you today?"}
                          className="flex-1 bg-transparent border-none outline-none resize-none text-gray-800 placeholder-gray-400 text-sm"
                          rows={1}
                          disabled={isLoading || isInitializing}
                          style={{ minHeight: '24px', maxHeight: '120px' }}
                          onInput={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                          }}
                        />
                        <button 
                          onClick={handleSendMessage}
                          disabled={(!message.trim() && attachedFiles.length === 0) || isLoading || isLoadingMessages || isInitializing || !currentProjectId}
                          className="p-2 rounded-lg text-white transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          style={{ backgroundColor: '#4A7BA7' }}
                        >
                          {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                        </button>
                      </div>
                    </div>
                    
                    {/* Action buttons below input */}
                    <div className="flex items-center justify-center space-x-2 mt-3">
                      <button 
                        className="px-3 py-1.5 rounded-md font-medium text-xs transition-all hover:shadow-sm flex items-center space-x-1.5"
                        style={{ backgroundColor: '#DBE2EF', color: '#112D4E' }}
                      >
                        <Search size={12} />
                        <span>Search</span>
                      </button>
                      <button 
                        className="px-3 py-1.5 rounded-md font-medium text-xs transition-all hover:shadow-sm flex items-center space-x-1.5"
                        style={{ backgroundColor: '#DBE2EF', color: '#112D4E' }}
                      >
                        <Sparkles size={12} />
                        <span>Research</span>
                      </button>
                      <ActionButton icon={<Grid3x3 size={14} />} />
                      <ActionButton icon={<Globe size={14} />} />
                      <ActionButton icon={<Paperclip size={14} />} onClick={openFileUpload} />
                      <ActionButton icon={<Mic size={14} />} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Chat Messages and Input */
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <div className="min-h-full">
                  {messages.length === 0 && !isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 min-h-[400px]">
                      <MessageSquare size={48} className="mb-4 opacity-50" />
                      <p className="text-lg font-medium">No messages yet</p>
                      <p className="text-sm">Start the conversation by typing a message below</p>
                    </div>
                  ) : (
                    <div className="space-y-4 pb-4">
                      {messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 rounded-lg p-4 max-w-xs border rounded-bl-none">
                            <div className="flex items-center space-x-2">
                              <Loader2 className="animate-spin h-4 w-4 text-gray-500" />
                              <span className="text-gray-500 text-sm">AI is thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {isLoadingMessages && (
                        <div className="flex justify-center py-4">
                          <div className="flex items-center space-x-2 text-gray-500">
                            <Loader2 className="animate-spin h-4 w-4" />
                            <span className="text-sm">Loading messages...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area */}
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="max-w-4xl mx-auto">
                  {/* Attached Files Display */}
                  {attachedFiles.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Attached Files ({attachedFiles.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {attachedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 bg-white px-3 py-2 rounded-md border text-sm"
                          >
                            <Paperclip className="w-3 h-3 text-gray-500" />
                            <span className="truncate max-w-32">{file.name}</span>
                            <button
                              onClick={() => removeAttachedFile(index)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                    <div className="flex items-center space-x-3">
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type your message here..."
                        className="flex-1 bg-transparent border-none outline-none resize-none text-gray-800 placeholder-gray-400 text-sm"
                        rows={1}
                        disabled={isLoading || isInitializing}
                        style={{ minHeight: '24px', maxHeight: '120px' }}
                        onInput={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                        }}
                      />
                      <button 
                        onClick={sendMessage}
                        disabled={(!message.trim() && attachedFiles.length === 0) || isLoading || isLoadingMessages || isInitializing || !currentProjectId}
                        className="p-2 rounded-lg text-white transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        style={{ backgroundColor: '#4A7BA7' }}
                      >
                        {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  {/* Action buttons below input */}
                  <div className="flex items-center justify-center space-x-2 mt-3">
                    <ActionButton icon={<Grid3x3 size={14} />} />
                    <ActionButton icon={<Globe size={14} />} />
                    <ActionButton icon={<Paperclip size={14} />} onClick={openFileUpload} />
                    <ActionButton icon={<Mic size={14} />} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* File Upload Modal */}
      {isFileUploadOpen && (
        <FileUpload
          onFilesSelected={handleFileUpload}
          onClose={closeFileUpload}
          maxFiles={5}
          maxSizePerFile={10}
        />
      )}
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  
  // Format the timestamp
  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '';
    }
  };
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl px-4 py-3 rounded-lg shadow-sm ${
        isUser 
          ? 'bg-blue-500 text-white rounded-br-none' 
          : 'bg-gray-100 text-gray-800 rounded-bl-none border'
      }`}>
        {/* Message content */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
          {message.content}
        </div>
        
        {/* Timestamp */}
        <div className={`text-xs mt-2 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
          {formatTime(message.created_at)}
          {message.model_used && !isUser && (
            <span className="ml-2 opacity-75">via {message.model_used}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, isOpen }) {
  const baseClasses = "w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200";
  const activeStyle = active 
    ? { backgroundColor: '#112D4E', color: '#DBE2EF' }
    : {};

  return (
    <button 
      className={`${baseClasses} ${!active ? 'text-gray-600 hover:bg-gray-100' : ''}`}
      style={activeStyle}
    >
      <div>{icon}</div>
      {isOpen && <span>{label}</span>}
    </button>
  );
}

function ActionButton({ icon, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 transition-all duration-200"
    >
      {icon}
    </button>
  );
}