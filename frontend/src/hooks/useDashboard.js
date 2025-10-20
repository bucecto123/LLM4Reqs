import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/auth';
import { useAuth, useLogout } from './useAuth.jsx';

export const useDashboard = () => {
  // Authentication
  const { user, isAuthenticated } = useAuth();
  const { logout: performLogout } = useLogout();
  
  // State
  const [message, setMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatMode, setChatMode] = useState("project"); // 'normal' or 'project' - default to project for file uploads
  
  // Chat state
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [editingConversationId, setEditingConversationId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDropdownId, setShowDropdownId] = useState(null);
  
  // File upload state
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [conversationDocuments, setConversationDocuments] = useState([]);
  
  // Refs
  const messagesEndRef = useRef(null);

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
      
      if (chatMode === "project" && data && data.length > 0) {
        // Use the first available project
        setCurrentProjectId(data[0].id);
      } else if (chatMode === "project") {
        // Create a default project if none exist
        await createDefaultProject();
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      // Try to create a default project anyway
      if (chatMode === "project") {
        await createDefaultProject();
      }
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
    try {
      let data;
      if (chatMode === "normal") {
        data = await apiFetch('/api/conversations');
      } else if (chatMode === "project" && currentProjectId) {
        data = await apiFetch(`/api/projects/${currentProjectId}/conversations`);
      } else {
        return; // Don't try to load if no project ID in project mode
      }
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
      if (chatMode === "project" && currentProjectId) {
        const data = await apiFetch(`/api/projects/${currentProjectId}/documents`);
        const conversationDocs = data.documents?.filter(doc => doc.conversation_id == conversationId) || [];
        setConversationDocuments(conversationDocs);
      }
    } catch (err) {
      console.error('Failed to load conversation documents:', err);
      setConversationDocuments([]);
    }
  };

  // Effects
  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (chatMode === "normal") {
      loadConversations();
    } else if (chatMode === "project" && currentProjectId) {
      loadConversations();
    }
  }, [chatMode, currentProjectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return {
    // State
    user,
    isAuthenticated,
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
    setIsLoadingMessages,
    error,
    setError,
    currentProjectId,
    setCurrentProjectId,
    projects,
    setProjects,
    isInitializing,
    setIsInitializing,
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
    loadProjects,
    createDefaultProject,
    loadConversations,
    loadMessages,
    loadConversationDocuments,
    scrollToBottom,
    performLogout
  };
};