import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../utils/auth';
import { useAuth, useLogout } from './useAuth.jsx';

export const useDashboard = () => {
   // Authentication
  const { user, isAuthenticated } = useAuth();
  const { logout: performLogout } = useLogout();
  
  // Mobile responsiveness and sidebar state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  
  // Handle mobile detection and sidebar state
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Only auto-adjust sidebar when switching between mobile and desktop
      if (mobile !== (window.innerWidth < 768)) {
        setIsSidebarOpen(!mobile);
      }
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // URL parameters for project selection
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [message, setMessage] = useState('');
  const [chatMode, setChatMode] = useState("normal");
  
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
      
      const projectIdFromUrl = searchParams.get('project');
      
      if (projectIdFromUrl) {
        const projectId = parseInt(projectIdFromUrl);
        const projectExists = data?.some(p => p.id === projectId);
        
        if (projectExists) {
          setChatMode('project');
          setCurrentProjectId(projectId);
          setSearchParams({});
        } else {
          console.warn(`Project ${projectId} not found`);
        }
      } else if (chatMode === "project") {
        if (data && data.length > 0) {
          setCurrentProjectId(data[0].id);
        } else {
          await createDefaultProject();
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
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
        return;
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
      
      // FIX: Handle the wrapped response format { messages: [...] }
      const messagesList = data.messages || data;
      setMessages(Array.isArray(messagesList) ? messagesList : []);
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
  }, [chatMode]);

  useEffect(() => {
    if (chatMode === "normal") {
      loadConversations();
    } else if (chatMode === "project" && currentProjectId) {
      loadConversations();
    }
  }, [chatMode, currentProjectId]);

  // FIX: Auto-load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation?.id) {
      console.log('Loading messages for conversation:', selectedConversation.id);
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

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
    isMobile, // ADD THIS LINE
    
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