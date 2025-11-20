import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Upload,
  Trash2,
  Download,
  AlertCircle,
  AlertTriangle,
  FolderOpen,
  FolderKanban,
  MessageSquare,
  Edit2,
  Paperclip,
  Loader2,
  X,
  Database,
  Sparkles,
  ChevronDown,
  Pencil,
} from "lucide-react";
import { apiFetch } from "../utils/auth.js";
import { useAuth } from "../hooks/useAuth.jsx";
import Sidebar from "../components/dashboard/Sidebar.jsx";
import MessageBubble from "../components/dashboard/MessageBubble.jsx";
import FileUpload from "../components/FileUpload.jsx";
import KBUploadModal from "../components/KBUploadModal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import ThinkingIndicator from "../components/ThinkingIndicator.jsx";
import PersonaManager from "../components/dashboard/PersonaManager.jsx";
import echo from "../utils/echo.js";
import {
  ProjectDetailSkeleton,
  MessagesSkeleton,
  DocumentsSkeleton,
  RequirementsSkeleton,
} from "../components/LoadingSkeleton.jsx";

// Lazy load heavy components for better LCP
const RequirementsViewer = lazy(() =>
  import("../components/RequirementsViewer.jsx")
);
const ConflictsDisplay = lazy(() =>
  import("../components/ConflictDetection.jsx").then((module) => ({
    default: module.ConflictsDisplay,
  }))
);

const PERSONA_ROLE_ICONS = {
  end_user: "👤",
  business_analyst: "📊",
  product_owner: "🎯",
  developer: "👨‍💻",
  qa_tester: "🧪",
  security_expert: "🔒",
  ux_designer: "🎨",
  system_admin: "⚙️",
};

const getPersonaIcon = (persona) => {
  if (!persona) return "👤";
  if (persona.type && PERSONA_ROLE_ICONS[persona.type]) {
    return PERSONA_ROLE_ICONS[persona.type];
  }
  return "👤";
};

const PersonaDropdownItem = ({
  label,
  description,
  icon,
  selected,
  onClick,
  showActions = false,
  onEdit,
  onDelete,
}) => (
  <div
    className={`flex items-center px-4 py-2 transition-colors ${
      selected && !showActions ? "bg-purple-50" : "hover:bg-gray-50"
    }`}
  >
    <button
      type="button"
      onClick={onClick}
      className="flex-1 text-left flex items-start gap-3"
    >
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900 truncate">
          {label}
        </div>
        {description && (
          <div className="text-xs text-gray-500 line-clamp-2">
            {description}
          </div>
        )}
      </div>
    </button>
    <div className="ml-2 flex items-center gap-1">
      {showActions ? (
        <>
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-md"
            title="Edit persona"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"
            title="Delete persona"
          >
            <Trash2 size={14} />
          </button>
        </>
      ) : (
        selected && <div className="w-2 h-2 bg-purple-600 rounded-full" />
      )}
    </div>
  </div>
);

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("chat"); // 'chat' or 'documents'

  // Edit project state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");

  // Mobile and sidebar state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

  // Chat state
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [conversationDocuments, setConversationDocuments] = useState([]);
  const [isNewChatMode, setIsNewChatMode] = useState(false);
  const [needsConversationReload, setNeedsConversationReload] = useState(false);

  // Streaming state
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const [latestAIMessageId, setLatestAIMessageId] = useState(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // Sidebar conversation editing
  const [editingConversationId, setEditingConversationId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [showDropdownId, setShowDropdownId] = useState(null);

  // File upload modals
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [isKBUploadOpen, setIsKBUploadOpen] = useState(false);

  // Requirements and Conflicts
  const [showRequirements, setShowRequirements] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [kbRefreshKey, setKBRefreshKey] = useState(0);

  // Persona
  const [selectedPersonaId, setSelectedPersonaId] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(false);
  const [isPersonaManagerOpen, setIsPersonaManagerOpen] = useState(false);
  const [isPersonaDropdownOpen, setIsPersonaDropdownOpen] = useState(false);
  const [showPersonaActions, setShowPersonaActions] = useState(false);
  const [personaToEdit, setPersonaToEdit] = useState(null);

  const isAssistantThinking = isSendingMessage || Boolean(streamingMessageId);
  const personaList = Array.isArray(personas) ? personas : [];
  const activePersona = selectedPersonaId
    ? personaList.find((p) => p.id === selectedPersonaId)
    : null;
  const personaDropdownRef = useRef(null);

  const handlePersonaCreated = (persona) => {
    if (!persona) return;
    setPersonas((prev) => [...prev, persona]);
    if (persona.id) {
      setSelectedPersonaId(persona.id);
    }
  };

  const handlePersonaUpdated = (persona) => {
    if (!persona) return;
    setPersonas((prev) =>
      prev.map((p) => (p.id === persona.id ? persona : p))
    );
    if (selectedPersonaId === persona.id) {
      setSelectedPersonaId(persona.id);
    }
  };

  const handleDeletePersona = async (personaId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this persona? This cannot be undone."
      )
    ) {
      return;
    }
    try {
      await apiFetch(`/api/personas/${personaId}`, { method: "DELETE" });
      setPersonas((prev) => prev.filter((p) => p.id !== personaId));
      if (personaId === selectedPersonaId) {
        setSelectedPersonaId(null);
      }
    } catch (err) {
      console.error("Failed to delete persona:", err);
      setError("Failed to delete persona. Please try again.");
    }
  };

  const openPersonaManagerForCreate = () => {
    setPersonaToEdit(null);
    setShowPersonaActions(false);
    setIsPersonaManagerOpen(true);
    setIsPersonaDropdownOpen(false);
  };

  const openPersonaManagerForEdit = (persona) => {
    setPersonaToEdit(persona);
    setShowPersonaActions(false);
    setIsPersonaManagerOpen(true);
    setIsPersonaDropdownOpen(false);
  };
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        personaDropdownRef.current &&
        !personaDropdownRef.current.contains(event.target)
      ) {
        setIsPersonaDropdownOpen(false);
        setShowPersonaActions(false);
      }
    };

    if (isPersonaDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPersonaDropdownOpen]);
  
  useEffect(() => {
    if (!isPersonaDropdownOpen) {
      setShowPersonaActions(false);
    }
  }, [isPersonaDropdownOpen]);

  // Refs
  const messagesEndRef = useRef(null);

  // Load personas once when component mounts
  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      setIsLoadingPersonas(true);
      const response = await apiFetch("/api/personas");

      if (response.success) {
        if (Array.isArray(response.all)) {
          setPersonas(response.all);
        } else if (response.data) {
          const allPersonas = [
            ...(Array.isArray(response.data.predefined)
              ? response.data.predefined
              : []),
            ...(Array.isArray(response.data.custom)
              ? response.data.custom
              : []),
          ];
          setPersonas(allPersonas);
        } else {
          setPersonas([]);
        }
      } else {
        setPersonas([]);
      }
    } catch (err) {
      console.error("Error loading personas:", err);
      setPersonas([]);
    } finally {
      setIsLoadingPersonas(false);
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile !== window.innerWidth < 768) {
        setIsSidebarOpen(!mobile);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    loadProjectData();
    loadProjectConversations();
  }, [projectId]);

  // Auto-scroll effect
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

    console.log(`🔌 Connecting to conversation.${selectedConversation.id}`);
    const channel = echo.channel(`conversation.${selectedConversation.id}`);

    const streamState = {
      tempMessageId: null,
      buffer: "",
      animationFrameId: null,
      lastUpdateTime: 0,
    };

    channel.listen(".message.chunk", (data) => {
      console.log("📨 Message chunk received:", data);

      if (data.metadata?.status === "started") {
        console.log("🎬 Streaming started");
        streamState.tempMessageId = data.message_id;
        setStreamingMessageId(data.message_id);
        setIsSendingMessage(false);

        const streamingMsg = {
          id: data.message_id,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
          isStreaming: true,
        };
        setMessages((prev) => {
          const exists = prev.find((m) => m.id === data.message_id);
          if (exists) return prev;
          return [...prev, streamingMsg];
        });
      } else if (data.is_complete) {
        console.log("✅ Streaming complete");

        if (streamState.animationFrameId) {
          cancelAnimationFrame(streamState.animationFrameId);
        }

        // Flush remaining buffer
        if (streamState.buffer) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.message_id
                ? { ...m, content: streamState.buffer, isStreaming: false }
                : m
            )
          );
          streamState.buffer = "";
        } else {
          // Use the final content from metadata or data
          const finalContent =
            data.metadata?.message?.content || data.content || data.chunk || "";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.message_id
                ? { ...m, content: finalContent, isStreaming: false }
                : m
            )
          );
        }

        setStreamingMessageId(null);
        setLatestAIMessageId(data.message_id);

        // No need to reload documents on every message completion
        // Documents are already loaded and only change when explicitly uploaded
      } else {
        // Add chunk to buffer - use 'chunk' property not 'content'
        const chunkText = data.chunk || data.content || "";
        if (chunkText) {
          streamState.buffer += chunkText;
        }

        // Cancel previous animation frame
        if (streamState.animationFrameId) {
          cancelAnimationFrame(streamState.animationFrameId);
        }

        const updateUI = (timestamp) => {
          // Update immediately for smooth typewriter effect (no throttling)
          const currentBuffer = streamState.buffer;
          streamState.lastUpdateTime = timestamp;

          if (currentBuffer) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === data.message_id ? { ...m, content: currentBuffer } : m
              )
            );
          }
        };

        streamState.animationFrameId = requestAnimationFrame(updateUI);
      }
    });

    return () => {
      console.log(
        `🔌 Disconnecting from conversation.${selectedConversation.id}`
      );
      if (streamState.animationFrameId) {
        cancelAnimationFrame(streamState.animationFrameId);
      }
      echo.leaveChannel(`conversation.${selectedConversation.id}`);
    };
  }, [selectedConversation?.id]);

  const loadProjectData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load project details and documents in parallel for faster LCP
      const [projectData, docsResponse] = await Promise.all([
        apiFetch(`/api/projects/${projectId}`),
        apiFetch(`/api/projects/${projectId}/documents`),
      ]);

      setProject(projectData);
      setEditProjectName(projectData.name);
      setEditProjectDescription(projectData.description || "");
      setDocuments(docsResponse.documents || docsResponse || []);
    } catch (err) {
      console.error("Failed to load project data:", err);
      setError("Failed to load project. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectConversations = async () => {
    try {
      const data = await apiFetch(`/api/projects/${projectId}/conversations`);
      setConversations(data || []);
    } catch (err) {
      console.error("Failed to load project conversations:", err);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      setIsLoadingMessages(true);
      const data = await apiFetch(
        `/api/conversations/${conversationId}/messages`
      );
      const messagesList = data.messages || data;
      const msgs = Array.isArray(messagesList) ? messagesList : [];
      setMessages(msgs);

      // Load conversation documents once when selecting a conversation
      loadConversationDocuments(conversationId);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setError("Failed to load messages");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const loadConversationDocuments = (conversationId) => {
    try {
      // Use already-loaded documents instead of fetching again
      // Filter documents for this specific conversation if conversation_id is set
      const conversationDocs = Array.isArray(documents)
        ? documents.filter((doc) => doc.conversation_id == conversationId)
        : [];

      setConversationDocuments(conversationDocs);
    } catch (err) {
      console.error("Failed to load conversation documents:", err);
      setConversationDocuments([]);
    }
  };

  const createNewConversation = () => {
    setIsNewChatMode(true);
    setSelectedConversation(null);
    setMessages([]);
    setAttachedFiles([]);
    setConversationDocuments([]);
    setError(null);
    setActiveTab("chat");
  };

  const selectConversation = async (conv) => {
    // Reload conversations if needed before selecting
    if (needsConversationReload) {
      await loadProjectConversations();
      setNeedsConversationReload(false);
    }

    setSelectedConversation(conv);
    setIsNewChatMode(false);
    setLatestAIMessageId(null);
    setActiveTab("chat");
    await loadMessages(conv.id);
  };

  const handleSendMessage = async () => {
    if (
      (!message.trim() && attachedFiles.length === 0) ||
      isSendingMessage ||
      isLoadingMessages
    ) {
      return;
    }

    if (isNewChatMode || !selectedConversation) {
      try {
        setError(null);
        setIsSendingMessage(true);

        const conversationTitle = message.trim()
          ? message.slice(0, 50)
          : attachedFiles.length > 0
          ? `Files: ${attachedFiles[0].name}${
              attachedFiles.length > 1
                ? ` +${attachedFiles.length - 1} more`
                : ""
            }`
          : "New Chat";

        const newConversation = await apiFetch("/api/conversations", {
          method: "POST",
          body: {
            title: conversationTitle,
            context: null,
            status: "active",
            project_id: parseInt(projectId),
          },
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
        setError("Failed to create conversation");
        setIsSendingMessage(false);
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

    setError(null);
    setIsSendingMessage(true);

    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: displayMessageContent,
      created_at: new Date().toISOString(),
      conversation_id: conversationId,
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const uploadedDocuments = [];
      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("project_id", projectId);

        const doc = await apiFetch("/api/documents", {
          method: "POST",
          body: formData,
          isFormData: true,
        });

        uploadedDocuments.push(doc);

        await apiFetch(`/api/documents/${doc.id}/process`, {
          method: "POST",
          body: { conversation_id: conversationId },
        });
      }

      let messageForAI = userMessage;
      if (uploadedDocuments.length > 0) {
        const docList = uploadedDocuments
          .map((d) => `- ${d.filename}`)
          .join("\n");
        messageForAI += messageForAI
          ? `\n\nUploaded documents:\n${docList}`
          : `Uploaded documents:\n${docList}`;
      }

      const body = {
        content: messageForAI,
        role: "user",
        project_id: parseInt(projectId),
      };
      if (selectedPersonaId) {
        body.persona_id = selectedPersonaId;
      }

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

      setIsSendingMessage(false);

      // WebSocket will stream the AI response in real-time
      // No need to fetch messages or reload documents - they're already in state
    } catch (err) {
      console.error("❌ Failed to send message:", err);
      setError("Failed to send message. Please try again.");
      setIsSendingMessage(false);

      try {
        await loadMessages(conversationId);
      } catch (reloadErr) {
        console.error("Failed to reload messages:", reloadErr);
      }
    }
  };

  const sendMessage = async () => {
    if (
      (!message.trim() && attachedFiles.length === 0) ||
      !selectedConversation ||
      isSendingMessage ||
      isLoadingMessages
    ) {
      return;
    }
    const messageToSend = message.trim() || "Here are the uploaded files:";
    await sendMessageToConversation(selectedConversation.id, messageToSend);
  };

  const handleKeyPress = (e) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !isSendingMessage &&
      !isLoadingMessages
    ) {
      e.preventDefault();
      if (message.trim() || attachedFiles.length > 0) {
        handleSendMessage();
      }
    }
  };

  const handleScroll = (e) => {
    const container = e.target;
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      50;
    setIsUserScrolling(!isAtBottom);
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
        setSelectedConversation({
          ...selectedConversation,
          title: editingTitle.trim(),
        });
      }

      setEditingConversationId(null);
      setEditingTitle("");
    } catch (err) {
      console.error("Failed to update title:", err);
      setError("Failed to update conversation title");
    }
  };

  const deleteConversation = async (conversationId) => {
    if (!confirm("Are you sure you want to delete this conversation?")) return;

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
        setIsNewChatMode(true);
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

  const handleKBUpload = async (files, onProgress) => {
    if (!projectId) throw new Error("No project selected");

    let uploadedCount = 0;
    const uploadedDocuments = [];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("project_id", projectId);

        const response = await apiFetch("/api/documents", {
          method: "POST",
          body: formData,
          isFormData: true,
        });

        // Add uploaded document to state immediately
        if (response.document) {
          uploadedDocuments.push(response.document);
        }

        uploadedCount++;
        onProgress?.(`Uploaded ${uploadedCount}/${files.length} files`);
      } catch (err) {
        console.error("Upload failed:", err);
        throw new Error(`Failed to upload ${file.name}`);
      }
    }

    // Update documents list with newly uploaded documents
    if (uploadedDocuments.length > 0) {
      setDocuments((prev) => {
        const currentDocs = Array.isArray(prev) ? prev : [];
        return [...uploadedDocuments, ...currentDocs];
      });
    }

    try {
      onProgress?.("Building Knowledge Base...");
      await apiFetch(`/api/projects/${projectId}/kb/build`, {
        method: "POST",
      });
      onProgress?.("Build started!");
      setTimeout(() => onProgress?.(null), 3000);
    } catch (err) {
      setError("KB build failed");
      throw new Error("Failed to build KB");
    }
  };

  const updateProject = async (e) => {
    e.preventDefault();
    if (!editProjectName.trim()) return;

    try {
      const data = await apiFetch(`/api/projects/${projectId}`, {
        method: "PUT",
        body: {
          name: editProjectName.trim(),
          description: editProjectDescription.trim() || null,
        },
      });

      setProject(data);
      setShowEditModal(false);
      setError(null);
    } catch (err) {
      console.error("Failed to update project:", err);
      setError("Failed to update project. Please try again.");
    }
  };

  const requestDocumentDeletion = (doc) => {
    setDocumentToDelete(doc);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDocumentToDelete(null);
    setIsDeletingDocument(false);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    setIsDeletingDocument(true);

    try {
      await apiFetch(`/api/documents/${documentToDelete.id}`, {
        method: "DELETE",
      });

      setDocuments((prev) => {
        const currentDocs = Array.isArray(prev) ? prev : [];
        return currentDocs.filter((doc) => doc.id !== documentToDelete.id);
      });
      setError(null);
      closeDeleteModal();
    } catch (err) {
      console.error("Failed to delete document:", err);
      setError("Failed to delete document. Please try again.");
      setIsDeletingDocument(false);
    }
  };

  const openInDashboard = () => {
    navigate(`/dashboard?project=${projectId}`);
  };

  // Show skeleton immediately for fast LCP - DON'T wait for data
  if (isLoading && !project) {
    return <ProjectDetailSkeleton />;
  }

  if (error && !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle size={64} className="mx-auto mb-4 text-red-500" />
          <h3 className="text-xl font-semibold mb-2 text-slate-800">{error}</h3>
          <button
            onClick={() => navigate("/projects")}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        isMobile={isMobile}
        conversations={conversations}
        selectedConversation={selectedConversation}
        editingConversationId={editingConversationId}
        editingTitle={editingTitle}
        showDropdownId={showDropdownId}
        isInitializing={false}
        projects={[project]}
        currentProjectId={parseInt(projectId)}
        fullName={user?.name}
        hasEmptyConversation={false}
        chatMode="project"
        onToggleSidebar={() => {
          const newState = !isSidebarOpen;
          setIsSidebarOpen(newState);

          // Reload conversations when opening sidebar if a new conversation was created
          if (newState && needsConversationReload) {
            loadProjectConversations();
            setNeedsConversationReload(false);
          }
        }}
        onSwitchToNormalMode={() => navigate("/dashboard")}
        onSwitchToProjectMode={() => {}}
        onSelectProject={() => {}}
        onCreateNewConversation={createNewConversation}
        onSelectConversation={selectConversation}
        onStartEditingConversation={startEditingConversation}
        onCancelEditing={cancelEditing}
        onSaveConversationTitle={saveConversationTitle}
        onDeleteConversation={deleteConversation}
        onEditTitleChange={setEditingTitle}
        onToggleDropdown={setShowDropdownId}
        onEditKeyPress={handleEditKeyPress}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className={`border-b-2 border-indigo-100 bg-white py-4 flex items-center justify-between shadow-sm ${
            isMobile && !isSidebarOpen ? "pl-14 pr-6" : "px-6"
          }`}
        >
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/projects")}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Back to Projects"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div className="flex items-center flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <FolderOpen size={20} className="text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">
                    {project?.name}
                  </h1>
                  {project?.description && (
                    <p className="text-sm text-gray-500">{project.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2" ref={personaDropdownRef}>
                    <div className="flex items-center space-x-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <Sparkles size={14} className="text-purple-500" />
                      <span>Personas</span>
                    </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPersonaDropdownOpen((prev) => !prev)}
                    className="flex items-center justify-between min-w-[220px] px-4 py-2 rounded-lg border border-gray-200 bg-white text-left shadow-sm hover:border-purple-400 focus:outline-none"
                  >
                    <div className="flex items-center space-x-2">
                      <span>
                        {selectedPersonaId ? getPersonaIcon(activePersona) : "✨"}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {selectedPersonaId
                            ? activePersona?.name || "Persona"
                            : "Normal Mode"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {selectedPersonaId
                            ? "Persona active"
                            : "General conversation"}
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-gray-500 transition-transform ${
                        isPersonaDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isPersonaDropdownOpen && (
                    <div className="absolute z-30 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                      {isLoadingPersonas ? (
                        <div className="p-4 text-center text-xs text-gray-500">
                          Loading personas...
                        </div>
                      ) : (
                        <>
                            <PersonaDropdownItem
                              label="Normal Mode"
                              description="General conversation"
                              icon="✨"
                              selected={!selectedPersonaId}
                              onClick={() => {
                                setSelectedPersonaId(null);
                                setIsPersonaDropdownOpen(false);
                              }}
                              showActions={false}
                            />
                          <div className="border-t border-gray-100">
                            {personaList.length === 0 ? (
                              <div className="p-4 text-xs text-gray-400">
                                No personas yet
                              </div>
                            ) : (
                              personaList.map((persona) => (
                                <PersonaDropdownItem
                                  key={persona.id}
                                  label={persona.name}
                                  description={persona.role}
                                  icon={getPersonaIcon(persona)}
                                  selected={selectedPersonaId === persona.id}
                                  onClick={() => {
                                    setSelectedPersonaId(persona.id);
                                    setIsPersonaDropdownOpen(false);
                                  }}
                                    showActions={showPersonaActions}
                                    onEdit={() => openPersonaManagerForEdit(persona)}
                                    onDelete={() => handleDeletePersona(persona.id)}
                                />
                              ))
                            )}
                          </div>
                          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
                            <button
                              type="button"
                                onClick={() =>
                                  setShowPersonaActions((prev) => !prev)
                                }
                                className={`text-xs font-medium ${
                                  showPersonaActions
                                    ? "text-purple-800"
                                    : "text-purple-600"
                                } hover:text-purple-800`}
                            >
                                {showPersonaActions ? "Done" : "Manage personas"}
                            </button>
                            <button
                              type="button"
                                onClick={openPersonaManagerForCreate}
                                className="text-xs font-medium text-purple-600 hover:text-purple-800"
                            >
                              + Add persona
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-lg bg-gray-100 text-slate-800"
            >
              <Edit2 size={18} />
              <span className="hidden md:inline">Edit</span>
            </button>
            <button
              onClick={() => setIsKBUploadOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-lg bg-indigo-600 text-white"
            >
              <Database size={18} />
              <span className="hidden md:inline">Build KB</span>
            </button>
            <button
              onClick={() => setShowRequirements((v) => !v)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-lg bg-blue-600 text-white"
            >
              <FileText size={18} />
              <span className="hidden md:inline">Requirements</span>
            </button>
            <button
              onClick={() => setShowConflicts((v) => !v)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-lg bg-red-600 text-white"
            >
              <AlertTriangle size={18} />
              <span className="hidden md:inline">Conflicts</span>
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("chat")}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "chat"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center space-x-2">
                <MessageSquare size={18} />
                <span>Chat</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("documents")}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "documents"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText size={18} />
                <span>
                  Documents ({Array.isArray(documents) ? documents.length : 0})
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-6 p-4 rounded-lg bg-red-50 text-red-800">
            {error}
          </div>
        )}

        {/* Main Content Area */}
        <main
          className="flex-1 overflow-y-auto px-6 py-6"
          onScroll={activeTab === "chat" ? handleScroll : undefined}
        >
          {activeTab === "chat" && (
            <div className="flex flex-col h-full">
              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto mb-4">
                {(!selectedConversation && !isNewChatMode) ||
                (messages.length === 0 &&
                  !isSendingMessage &&
                  !isLoadingMessages) ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
                    {/* Icon with gradient background */}
                    <div className="mb-6 relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                      <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-full">
                        <MessageSquare
                          size={48}
                          className="text-blue-600"
                          strokeWidth={1.5}
                        />
                      </div>
                    </div>

                    {/* Welcome Text */}
                    <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Welcome to {project?.name}
                    </h2>
                    <p className="text-lg text-gray-600 mb-8 max-w-2xl leading-relaxed">
                      Start a conversation about this project. Your AI assistant
                      has access to all project documents and knowledge base.
                    </p>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full mb-8">
                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="bg-blue-100 w-10 h-10 rounded-lg flex items-center justify-center mb-3 mx-auto">
                          <FileText size={20} className="text-blue-600" />
                        </div>
                        <h4 className="font-semibold text-gray-800 mb-1">
                          Document Access
                        </h4>
                        <p className="text-sm text-gray-600">
                          Query and analyze all uploaded project documents
                        </p>
                      </div>

                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="bg-purple-100 w-10 h-10 rounded-lg flex items-center justify-center mb-3 mx-auto">
                          <MessageSquare
                            size={20}
                            className="text-purple-600"
                          />
                        </div>
                        <h4 className="font-semibold text-gray-800 mb-1">
                          Context Aware
                        </h4>
                        <p className="text-sm text-gray-600">
                          Maintains conversation context throughout the chat
                        </p>
                      </div>

                      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center mb-3 mx-auto">
                          <FolderKanban size={20} className="text-green-600" />
                        </div>
                        <h4 className="font-semibold text-gray-800 mb-1">
                          Project Focused
                        </h4>
                        <p className="text-sm text-gray-600">
                          All responses are tailored to your project needs
                        </p>
                      </div>
                    </div>

                    {/* Quick Start Hint */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl">
                      <p className="text-sm text-blue-800">
                        💡 <span className="font-semibold">Quick Start:</span>{" "}
                        Try asking questions like "Summarize the project
                        documents" or "What are the main requirements?"
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Conversation Documents */}
                    {conversationDocuments.length > 0 && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-2 text-sm text-blue-800">
                          <FileText size={16} />
                          <span className="font-medium">
                            {conversationDocuments.length} document(s) in this
                            conversation
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Messages */}
                    {isLoadingMessages && messages.length === 0 ? (
                      <MessagesSkeleton />
                    ) : (
                      messages.map((msg, index) => (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          isLatest={msg.id === latestAIMessageId}
                        />
                      ))
                    )}

                    {isAssistantThinking && <ThinkingIndicator />}

                    {isLoadingMessages && messages.length > 0 && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input Area */}
              <div className="border-t pt-4">
                {/* Attached Files */}
                {attachedFiles.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {attachedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm"
                      >
                        <Paperclip size={14} className="text-blue-600" />
                        <span className="text-blue-800 truncate max-w-[200px]">
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeAttachedFile(index)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input Box */}
                <div className="flex items-end space-x-2">
                  <button
                    onClick={() => setIsFileUploadOpen(true)}
                    className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
                    title="Attach files"
                  >
                    <Paperclip size={20} className="text-gray-600" />
                  </button>

                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask about this project..."
                    className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-400 focus:outline-none resize-none"
                    rows={3}
                    disabled={isSendingMessage || isLoadingMessages}
                  />

                  <button
                    onClick={handleSendMessage}
                    disabled={
                      (!message.trim() && attachedFiles.length === 0) ||
                      isSendingMessage ||
                      isLoadingMessages
                    }
                    className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {isSendingMessage ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <MessageSquare size={20} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800">
                  Project Documents
                </h2>
              </div>

              {!Array.isArray(documents) || documents.length === 0 ? (
                <div className="text-center py-20">
                  <FileText size={64} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold mb-2 text-slate-800">
                    No documents yet
                  </h3>
                  <p className="mb-6 text-gray-500">
                    Use the "Build KB" button in the header to upload documents
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-xl border-2 border-purple-200 bg-white hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <FileText size={20} className="text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-800 truncate">
                              {doc.original_filename || doc.filename}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Uploaded{" "}
                              {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                            {doc.file_size && (
                              <p className="text-xs text-gray-400 mt-1">
                                {(doc.file_size / 1024).toFixed(2)} KB
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => requestDocumentDeletion(doc)}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete document"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-xl shadow-2xl max-w-md w-full p-6 border-2 border-indigo-200 bg-white">
            <h2 className="text-2xl font-bold mb-4 text-slate-800">
              Edit Project
            </h2>

            <form onSubmit={updateProject}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2 text-slate-800">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border-2 border-indigo-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  autoFocus
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2 text-slate-800">
                  Description (Optional)
                </label>
                <textarea
                  value={editProjectDescription}
                  onChange={(e) => setEditProjectDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border-2 border-indigo-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-100 text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editProjectName.trim()}
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {isFileUploadOpen && (
        <FileUpload
          onFilesSelected={handleFileUpload}
          onClose={() => setIsFileUploadOpen(false)}
          maxFiles={5}
          maxSizePerFile={10}
        />
      )}

      {/* KB Upload Modal */}
      {isKBUploadOpen && project && (
        <KBUploadModal
          onClose={() => setIsKBUploadOpen(false)}
          onUpload={handleKBUpload}
          projectId={projectId}
          projectName={project.name}
        />
      )}

      {/* Requirements Viewer */}
      {showRequirements && (
        <Suspense fallback={<RequirementsSkeleton />}>
          <RequirementsViewer
            projectId={projectId}
            onClose={() => setShowRequirements(false)}
            refreshKey={kbRefreshKey}
          />
        </Suspense>
      )}

      {/* Conflicts Display */}
      {showConflicts && (
        <div
          className="fixed right-0 top-0 h-full w-1/2 bg-gradient-to-br from-slate-50 to-orange-50 shadow-2xl z-40 flex flex-col border-l border-slate-200"
          style={{ minWidth: 400 }}
        >
          <Suspense
            fallback={
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-600" />
              </div>
            }
          >
            <ConflictsDisplay
              projectId={projectId}
              onClose={() => setShowConflicts(false)}
            />
          </Suspense>
        </div>
      )}

      {isPersonaManagerOpen && (
        <PersonaManager
          onClose={() => {
            setIsPersonaManagerOpen(false);
            setPersonaToEdit(null);
          }}
          persona={personaToEdit}
          onPersonaCreated={(persona) => {
            handlePersonaCreated(persona);
            setIsPersonaManagerOpen(false);
            setPersonaToEdit(null);
          }}
          onPersonaUpdated={(persona) => {
            handlePersonaUpdated(persona);
            setIsPersonaManagerOpen(false);
            setPersonaToEdit(null);
          }}
        />
      )}

      <ConfirmDialog
        open={isDeleteModalOpen && Boolean(documentToDelete)}
        title="Delete document"
        description={
          documentToDelete
            ? `Are you sure you want to delete "${
                documentToDelete.original_filename || documentToDelete.filename
              }"? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteDocument}
        onCancel={closeDeleteModal}
        loading={isDeletingDocument}
      />
    </div>
  );
}
