import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../utils/auth";
import { useAuth, useLogout } from "./useAuth.jsx";
import { cache } from "../utils/cache.js";

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
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
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

  // Model state
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState(null);
  const isLoadingModelsRef = useRef(false);

  // Refs
  const messagesEndRef = useRef(null);
  const prevChatModeRef = useRef(null);
  const prevProjectIdRef = useRef(null);
  const isLoadingConversationsRef = useRef(false);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Background refresh for projects — defined FIRST so it can be called by loadProjects
  const _refreshProjects = async () => {
    try {
      const data = await apiFetch("/api/projects");
      setProjects(Array.isArray(data) ? data : []);
      cache.set("projects_list", data, 5 * 60 * 1000, "projects");
    } catch (_) {}
  };

  // Load projects and set current project — checks cache first for instant UI
  const loadProjects = async () => {
    // Try cache first for instant UI
    const cached = cache.getFresh("projects_list", "projects");
    if (cached) {
      setProjects(Array.isArray(cached) ? cached : []);
      // Still refresh in background
      _refreshProjects();
      // Set project from URL only on initial cache hit
      const projectIdFromUrl = searchParams.get("project");
      if (projectIdFromUrl) {
        const projectId = parseInt(projectIdFromUrl);
        const projectExists = cached?.some((p) => p.id === projectId);
        if (projectExists) {
          setChatMode("project");
          setCurrentProjectId(projectId);
          setSearchParams({});
        } else {
          console.warn(`Project ${projectId} not found`);
        }
      } else if (chatMode === "project") {
        if (cached && cached.length > 0) {
          setCurrentProjectId(cached[0].id);
        }
      }
      setIsInitializing(false);
      return;
    }

    // Normal fetch path
    try {
      setIsInitializing(true);
      const data = await apiFetch("/api/projects");
      setProjects(Array.isArray(data) ? data : []);
      cache.set("projects_list", data, 5 * 60 * 1000, "projects");

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
      // Bust the projects cache so next load picks up the new project
      cache.invalidate("projects_list", "projects");
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

  // Background refresh helper for conversations
  const _refreshConversations = async (mode, projectId, cacheKey) => {
    if (isLoadingConversationsRef.current) return;
    isLoadingConversationsRef.current = true;
    try {
      let data;
      if (mode === "normal") {
        data = await apiFetch("/api/conversations");
      } else if (mode === "project" && projectId) {
        data = await apiFetch(`/api/projects/${projectId}/conversations`);
      } else {
        isLoadingConversationsRef.current = false;
        setIsLoadingConversations(false);
        return;
      }
      setConversations(Array.isArray(data) ? data : []);
      cache.set(cacheKey, data, 2 * 60 * 1000, "conversations");
    } catch (err) {
      // silently handle
    } finally {
      isLoadingConversationsRef.current = false;
      setIsLoadingConversations(false);
    }
  };

  // Load conversations for current project — checks cache first for instant UI
  const loadConversations = async (
    mode = chatMode,
    projectId = currentProjectId,
  ) => {
    // Don't load if in project mode but no project ID yet
    if (mode === "project" && !projectId) {
      return;
    }

    // Try cache for instant UI
    const cacheKey = mode === "normal" ? "conversations_normal" : `conversations_project_${projectId}`;
    const cached = cache.getFresh(cacheKey, "conversations");
    if (cached) {
      setConversations(Array.isArray(cached) ? cached : []);
      // Refresh in background (only if not already loading)
      if (!isLoadingConversationsRef.current) {
        _refreshConversations(mode, projectId, cacheKey);
      }
      return;
    }

    await _refreshConversations(mode, projectId, cacheKey);
  };

  // Background refresh helper for models
  const _refreshModels = async () => {
    if (isLoadingModelsRef.current) return;
    isLoadingModelsRef.current = true;
    try {
      const data = await apiFetch("/api/llm/models");
      if (Array.isArray(data)) {
        setModels(data);
        cache.set("models_list", data, 60 * 60 * 1000, "models");
        if (data.length > 0 && !selectedModelId) {
          const preferredModel = data.find(
            (m) => m.model_id === "llama-3.3-70b-versatile",
          );
          setSelectedModelId(
            preferredModel ? preferredModel.model_id : data[0].model_id,
          );
        }
      }
    } catch (_) {}
    finally {
      isLoadingModelsRef.current = false;
    }
  };

  // Load available models — checks cache first (models change rarely)
  const loadModels = async () => {
    const cached = cache.getFresh("models_list", "models");
    if (cached) {
      setModels(Array.isArray(cached) ? cached : []);
      if (Array.isArray(cached) && cached.length > 0 && !selectedModelId) {
        const preferredModel = cached.find(
          (m) => m.model_id === "llama-3.3-70b-versatile",
        );
        setSelectedModelId(
          preferredModel ? preferredModel.model_id : cached[0].model_id,
        );
      }
      // Refresh in background
      _refreshModels();
      return;
    }
    await _refreshModels();
  };

  // Load messages for selected conversation
  const loadMessages = async (conversationId) => {
    try {
      setIsLoadingMessages(true);
      const data = await apiFetch(
        `/api/conversations/${conversationId}/messages`,
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

  // Load earlier messages for infinite scroll / "Load more" functionality
  const loadEarlierMessages = async (conversationId) => {
    if (messages.length === 0) return;
    try {
      setIsLoadingMessages(true);
      const oldestMessage = messages[0];
      const beforeId = oldestMessage?.id;
      const url = beforeId
        ? `/api/conversations/${conversationId}/messages?before=${beforeId}`
        : `/api/conversations/${conversationId}/messages`;
      const data = await apiFetch(url);

      const messagesList = data.messages || data;
      if (Array.isArray(messagesList) && messagesList.length > 0) {
        // Prepend earlier messages
        setMessages((prev) => [...messagesList, ...prev]);
      }
    } catch (err) {
      console.error("Failed to load earlier messages:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Load documents for a conversation
  const loadConversationDocuments = async (conversationId) => {
    try {
      if (chatMode === "project" && currentProjectId) {
        const data = await apiFetch(
          `/api/projects/${currentProjectId}/documents`,
        );
        const conversationDocs =
          data.documents?.filter(
            (doc) => doc.conversation_id == conversationId,
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

  // Load models on mount
  useEffect(() => {
    loadModels();
  }, []);

  // Load initial data (projects and conversations) in parallel when chatMode is determined
  useEffect(() => {
    if (chatMode === "project") {
      loadProjects();
    } else {
      // For normal mode, just load conversations directly
      setIsInitializing(false);
      loadConversations("normal", null);
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
  const skipNextLoadRef = useRef(false);

  // Auto-load messages when conversation is selected (only when ID actually changes)
  useEffect(() => {
    if (
      selectedConversation?.id &&
      selectedConversation.id !== prevConversationIdRef.current
    ) {
      const prevId = prevConversationIdRef.current;
      prevConversationIdRef.current = selectedConversation.id;

      // Skip loading if flag is set (e.g., just created new conversation with first message streaming)
      if (skipNextLoadRef.current) {
        skipNextLoadRef.current = false;
        return;
      }

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
    isLoadingConversations,
    setIsLoadingConversations,
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
    isMobile,

    // Models
    models,
    setModels,
    selectedModelId,
    setSelectedModelId,

    // Refs
    skipNextLoadRef,

    // Functions
    loadProjects,
    createDefaultProject,
    loadConversations,
    loadMessages,
    loadEarlierMessages,
    loadConversationDocuments,
    scrollToBottom,
    performLogout,
  };
};
