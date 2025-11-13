import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../utils/auth";
import { useAuth, useLogout } from "./useAuth.jsx";

export const useDashboard = () => {
  // Authentication
  const { user, isAuthenticated } = useAuth();
  const { logout: performLogout } = useLogout();

  // Mobile responsiveness and sidebar state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

  // URL parameters for project selection
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [message, setMessage] = useState("");
  const [chatMode, setChatMode] = useState("normal");
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState(null);

  // Project state
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // UI state
  const [editingConversationId, setEditingConversationId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [showDropdownId, setShowDropdownId] = useState(null);

  // File upload state
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [conversationDocuments, setConversationDocuments] = useState([]);

  // Refs
  const messagesEndRef = useRef(null);
  const prevChatModeRef = useRef(null);
  const prevProjectIdRef = useRef(null);
  const isLoadingConversationsRef = useRef(false);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load projects and set current project
  const loadProjects = async () => {
    try {
      setIsInitializing(true);
      const data = await apiFetch("/api/projects");
      setProjects(Array.isArray(data) ? data : []);

      const projectIdFromUrl = searchParams.get("project");

      if (projectIdFromUrl) {
        const projectId = parseInt(projectIdFromUrl);
        const projectExists = data?.some((p) => p.id === projectId);

        if (projectExists) {
          setChatMode("project");
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
      console.error("Failed to load projects:", err);
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
      const defaultProject = await apiFetch("/api/projects", {
        method: "POST",
        body: {
          name: "Default Project",
          description: "Default project for conversations",
          status: "active",
        },
      });
      setProjects([defaultProject]);
      setCurrentProjectId(defaultProject.id);
    } catch (err) {
      console.error("Failed to create default project:", err);
      let errorMessage =
        "Failed to initialize project. Please refresh the page.";

      if (err.status === 401) {
        errorMessage = "You are not authenticated. Please log in again.";
        await performLogout();
      } else if (err.status === 422) {
        errorMessage = "Failed to create project. Invalid data.";
      }

      setError(errorMessage);
    }
  };

  // Load conversations for current project
  const loadConversations = async (
    mode = chatMode,
    projectId = currentProjectId
  ) => {
    // Prevent concurrent loads
    if (isLoadingConversationsRef.current) {
      return;
    }

    // Don't load if in project mode but no project ID yet
    if (mode === "project" && !projectId) {
      return;
    }

    isLoadingConversationsRef.current = true;

    try {
      let data;
      if (mode === "normal") {
        data = await apiFetch("/api/conversations");
      } else if (mode === "project" && projectId) {
        data = await apiFetch(`/api/projects/${projectId}/conversations`);
      } else {
        isLoadingConversationsRef.current = false;
        return;
      }

      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setError("Failed to load conversations");
      setConversations([]);
    } finally {
      isLoadingConversationsRef.current = false;
    }
  };

  // Load messages for selected conversation
  const loadMessages = async (conversationId) => {
    try {
      setIsLoadingMessages(true);
      const data = await apiFetch(
        `/api/conversations/${conversationId}/messages`
      );

      // Handle wrapped response format { messages: [...] }
      const messagesList = data.messages || data;
      setMessages(Array.isArray(messagesList) ? messagesList : []);
      setError(null);

      // Load documents for this conversation
      await loadConversationDocuments(conversationId);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setError("Failed to load messages");
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Load documents for a conversation
  const loadConversationDocuments = async (conversationId) => {
    try {
      if (chatMode === "project" && currentProjectId) {
        const data = await apiFetch(
          `/api/projects/${currentProjectId}/documents`
        );
        const conversationDocs =
          data.documents?.filter(
            (doc) => doc.conversation_id == conversationId
          ) || [];
        setConversationDocuments(conversationDocs);
      }
    } catch (err) {
      console.error("Failed to load conversation documents:", err);
      setConversationDocuments([]);
    }
  };

  // ============================================
  // EFFECTS
  // ============================================

  // Handle mobile detection and sidebar auto-collapse
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile !== isMobile) {
        setIsSidebarOpen(!mobile);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [isMobile]);

  // Check for project parameter on initial load
  useEffect(() => {
    const projectIdFromUrl = searchParams.get("project");

    if (projectIdFromUrl) {
      setConversations([]);
      setChatMode("project");
      setCurrentProjectId(parseInt(projectIdFromUrl));
      setSearchParams({});
    }
  }, [searchParams]);

  // Initialize projects when switching to project mode
  useEffect(() => {
    if (chatMode === "project") {
      loadProjects();
    } else {
      setIsInitializing(false);
    }
  }, [chatMode]);

  // Load conversations when chat mode or project changes
  useEffect(() => {
    const shouldLoad =
      chatMode === "normal" || (chatMode === "project" && currentProjectId);

    if (!shouldLoad) {
      if (chatMode === "project" && !currentProjectId) {
        setConversations([]);
      }
      return;
    }

    // Create conversation key to track changes
    const conversationKey =
      chatMode === "normal" ? "normal" : `project-${currentProjectId}`;
    const prevKey =
      prevChatModeRef.current === "normal"
        ? "normal"
        : `project-${prevProjectIdRef.current}`;

    // Only load if key actually changed
    if (conversationKey === prevKey) {
      return;
    }

    // Update refs and load
    prevChatModeRef.current = chatMode;
    prevProjectIdRef.current = currentProjectId;
    setConversations([]);
    loadConversations(chatMode, currentProjectId);
  }, [chatMode, currentProjectId]);

  // Track previous conversation ID to only load when it actually changes
  const prevConversationIdRef = useRef(null);

  // Auto-load messages when conversation is selected (only when ID actually changes)
  useEffect(() => {
    if (
      selectedConversation?.id &&
      selectedConversation.id !== prevConversationIdRef.current
    ) {
      prevConversationIdRef.current = selectedConversation.id;
      loadMessages(selectedConversation.id);
    } else if (!selectedConversation?.id) {
      prevConversationIdRef.current = null;
    }
  }, [selectedConversation?.id]);

  // Auto-scroll to bottom when messages update
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
    performLogout,
  };
};
