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
  BookOpen,
  MessagesSquare,
  Target,
  Users,
  Network,
  Eye,
} from "lucide-react";
import { apiFetch } from "../utils/auth.js";
import { useAuth } from "../hooks/useAuth.jsx";
import Sidebar from "../components/dashboard/Sidebar.jsx";
import MessageBubble from "../components/dashboard/MessageBubble.jsx";
import GraphView from "../components/GraphView";
import FileUpload from "../components/FileUpload.jsx";
import KBUploadModal from "../components/KBUploadModal.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import ThinkingIndicator from "../components/ThinkingIndicator.jsx";
import PersonaManager from "../components/dashboard/PersonaManager.jsx";
import MemberList from "../components/MemberList.jsx";
import InviteForm from "../components/InviteForm.jsx";
import { canEdit } from "../services/sharingService";
import echo from "../utils/echo.js";
import ModelSelector from "../components/dashboard/ModelSelector.jsx";

import {
  ProjectDetailSkeleton,
  MessagesSkeleton,
  DocumentsSkeleton,
  RequirementsSkeleton,
} from "../components/LoadingSkeleton.jsx";

// Lazy load heavy components for better LCP
const RequirementsViewer = lazy(
  () => import("../components/RequirementsViewer.jsx"),
);
const ConflictsDisplay = lazy(() =>
  import("../components/ConflictDetection.jsx").then((module) => ({
    default: module.ConflictsDisplay,
  })),
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
    className={`group flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-lg cursor-pointer transition-all duration-100 ${
      selected && !showActions
        ? "bg-violet-50 ring-1 ring-violet-200"
        : "hover:bg-gray-50"
    }`}
    onClick={!showActions ? onClick : undefined}
  >
    {/* Icon badge */}
    <span
      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base ${
        selected && !showActions ? "bg-violet-100" : "bg-gray-100"
      }`}
    >
      {icon}
    </span>

    {/* Text */}
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-semibold leading-tight truncate ${
        selected && !showActions ? "text-violet-900" : "text-slate-800"
      }`}>
        {label}
      </p>
      {description && (
        <p className="text-xs text-slate-400 truncate mt-0.5">{description}</p>
      )}
    </div>

    {/* Right: selected dot or edit/delete actions */}
    <div className="flex items-center gap-1 shrink-0">
      {showActions ? (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
            title="Edit persona"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete persona"
          >
            <Trash2 size={13} />
          </button>
        </>
      ) : (
        selected && (
          <div className="w-1.5 h-1.5 rounded-full bg-violet-600" />
        )
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
  const [activeTab, setActiveTab] = useState("chat"); // 'chat', 'documents', 'sharing'

  // Graph tab state — all messages across all project conversations
  const [allProjectMessages, setAllProjectMessages] = useState([]);
  const [isLoadingGraphMessages, setIsLoadingGraphMessages] = useState(false);

  useEffect(() => {
    if (activeTab !== "graph" || !projectId) return;
    setIsLoadingGraphMessages(true);
    apiFetch(`/api/projects/${projectId}/conversations`)
      .then(async (convList) => {
        if (!Array.isArray(convList) || convList.length === 0) {
          setAllProjectMessages([]);
          return;
        }
        const results = await Promise.all(
          convList.map((conv) =>
            apiFetch(`/api/conversations/${conv.id}/messages`)
              .then((res) => res.messages ?? [])
              .catch(() => [])
          )
        );
        setAllProjectMessages(results.flat());
      })
      .catch((err) => {
        console.error("Failed to load project messages for graph view:", err);
        setAllProjectMessages([]);
      })
      .finally(() => setIsLoadingGraphMessages(false));
  }, [activeTab, projectId]);

  // Edit project state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");

  // Sharing state
  const [collaborators, setCollaborators] = useState([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("viewer"); // Will be set from project data

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

  // Model state
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState(null);
  const isLoadingModelsRef = useRef(false);

  // Load available models
  const loadModels = async () => {
    if (isLoadingModelsRef.current) return;
    isLoadingModelsRef.current = true;
    try {
      const data = await apiFetch("/api/llm/models");
      if (Array.isArray(data)) {
        setModels(data);
        if (data.length > 0 && !selectedModelId) {
          // Default to llama-3.3-70b-versatile if available, otherwise first model
          const preferredModel = data.find(
            (m) => m.model_id === "llama-3.3-70b-versatile",
          );
          setSelectedModelId(
            preferredModel ? preferredModel.model_id : data[0].model_id,
          );
        }
      }
    } catch (err) {
      console.error("Failed to load models:", err);
      setModels([]);
    } finally {
      isLoadingModelsRef.current = false;
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const isAssistantThinking = isSendingMessage || Boolean(streamingMessageId);

  const personaList = Array.isArray(personas) ? personas : [];
  const activePersona = selectedPersonaId
    ? personaList.find((p) => p.id === selectedPersonaId)
    : null;

  // Role-based access control
  const canUserEdit = canEdit(currentUserRole);
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
    setPersonas((prev) => prev.map((p) => (p.id === persona.id ? persona : p)));
    if (selectedPersonaId === persona.id) {
      setSelectedPersonaId(persona.id);
    }
  };

  const handleDeletePersona = async (personaId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this persona? This cannot be undone.",
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

  // Load collaborators when switching to sharing tab
  useEffect(() => {
    if (activeTab === "sharing" && projectId) {
      loadCollaborators();
    }
  }, [activeTab, projectId]);

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

    const messageChunkHandler = (data) => {
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
                : m,
            ),
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
                : m,
            ),
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
                m.id === data.message_id ? { ...m, content: currentBuffer } : m,
              ),
            );
          }
        };

        streamState.animationFrameId = requestAnimationFrame(updateUI);
      }
    };

    channel.listen(".message.chunk", messageChunkHandler);

    return () => {
      console.log(
        `🔌 Disconnecting from conversation.${selectedConversation.id}`,
      );
      if (streamState.animationFrameId) {
        cancelAnimationFrame(streamState.animationFrameId);
      }
      channel.stopListening(".message.chunk", messageChunkHandler);
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

      // Set user role from project data
      if (projectData.role) {
        setCurrentUserRole(projectData.role);
      }
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

  const loadCollaborators = async () => {
    setIsLoadingCollaborators(true);
    try {
      const { getProjectCollaborators } =
        await import("../services/sharingService");
      const response = await getProjectCollaborators(projectId);
      setCollaborators(response.collaborators || []);
      // Role is set from project data in loadProjectData()
    } catch (err) {
      console.error("Failed to load collaborators:", err);
    } finally {
      setIsLoadingCollaborators(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      setIsLoadingMessages(true);
      const data = await apiFetch(
        `/api/conversations/${conversationId}/messages`,
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
        formData.append("conversation_id", conversationId);

        const uploadResponse = await apiFetch("/api/documents", {
          method: "POST",
          body: formData,
          isFormData: true,
        });

        const doc = uploadResponse?.document || uploadResponse;
        if (!doc?.id) {
          throw new Error("Document upload failed: missing document id");
        }

        uploadedDocuments.push(doc);

        await apiFetch(`/api/documents/${doc.id}/process`, {
          method: "POST",
          body: { conversation_id: conversationId },
        });
      }

      let messageForAI = userMessage;
      if (uploadedDocuments.length > 0) {
        const docList = uploadedDocuments
          .map((d) => `- ${d.original_filename || d.filename}`)
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
      if (selectedModelId) {
        body.model_id = selectedModelId;
      }

      const response = await apiFetch(
        `/api/conversations/${conversationId}/messages/stream`,
        {
          method: "POST",
          body,
        },
      );

      // Replace temp user message with the actual saved message from server
      if (response.user_message) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempUserMessage.id ? response.user_message : msg,
          ),
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
            : conv,
        ),
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
        prev.filter((conv) => conv.id !== conversationId),
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
                    <p className="text-sm text-gray-500">
                      {project.description}
                    </p>
                  )}
                </div>
              </div>

              <div
                className="flex items-center gap-3"
                ref={personaDropdownRef}
              >
                {/* Persona trigger pill */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsPersonaDropdownOpen((prev) => !prev)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-150 ${
                      selectedPersonaId
                        ? "bg-violet-50 border-violet-300 text-violet-800 hover:bg-violet-100"
                        : "bg-white border-gray-200 text-slate-600 hover:border-violet-300 hover:text-violet-700"
                    }`}
                  >
                    <Sparkles size={14} className={selectedPersonaId ? "text-violet-600" : "text-slate-400"} />
                    <span className="hidden sm:inline">
                      {selectedPersonaId ? activePersona?.name || "Persona" : "Normal Mode"}
                    </span>
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-150 ${
                        isPersonaDropdownOpen ? "rotate-180" : ""
                      } ${selectedPersonaId ? "text-violet-500" : "text-slate-400"}`}
                    />
                  </button>

                  {/* Dropdown panel */}
                  {isPersonaDropdownOpen && (
                    <div className="absolute z-30 top-full mt-2 w-76 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                      {/* Header */}
                      <div className="px-4 pt-3 pb-2 border-b border-gray-100">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                          Choose persona
                        </p>
                      </div>

                      {isLoadingPersonas ? (
                        <div className="p-6 text-center">
                          <Loader2 size={18} className="animate-spin text-violet-400 mx-auto" />
                          <p className="text-xs text-slate-400 mt-2">Loading…</p>
                        </div>
                      ) : (
                        <>
                          {/* Normal mode option */}
                          <div className="pt-1.5 pb-1">
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
                          </div>

                          {/* Custom personas list */}
                          {personaList.length > 0 && (
                            <div className="border-t border-gray-100 pt-1 pb-1">
                              <p className="text-xs text-slate-400 px-4 py-1.5">Custom personas</p>
                              {personaList.map((persona) => (
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
                                  showActions={showPersonaActions && canUserEdit}
                                  onEdit={() => openPersonaManagerForEdit(persona)}
                                  onDelete={() => handleDeletePersona(persona.id)}
                                />
                              ))}
                            </div>
                          )}

                          {personaList.length === 0 && (
                            <div className="px-4 py-3 text-xs text-slate-400 border-t border-gray-100">
                              No custom personas yet
                            </div>
                          )}

                          {/* Footer actions */}
                          <div className="border-t border-gray-100 px-3 py-2.5 flex items-center justify-between bg-gray-50/60">
                            {canUserEdit ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setShowPersonaActions((prev) => !prev)}
                                  className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                                >
                                  {showPersonaActions ? "Done" : "Manage"}
                                </button>
                                <button
                                  type="button"
                                  onClick={openPersonaManagerForCreate}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                                >
                                  <span className="text-base leading-none">+</span>
                                  Add persona
                                </button>
                              </>
                            ) : (
                              <p className="text-xs text-slate-400 italic w-full text-center">
                                View-only — cannot manage personas
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit */}
            <button
              onClick={() => setShowEditModal(true)}
              disabled={!canUserEdit}
              title={!canUserEdit ? "You don't have permission to edit this project" : "Edit project"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                !canUserEdit
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                  : "bg-white border border-gray-200 text-slate-700 hover:border-slate-400 hover:bg-gray-50"
              }`}
            >
              <Edit2 size={15} />
              <span className="hidden md:inline">Edit</span>
            </button>

            {/* Build KB */}
            <button
              onClick={() => setIsKBUploadOpen(true)}
              disabled={!canUserEdit}
              title={!canUserEdit ? "You don't have permission to build KB" : "Build Knowledge Base"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                !canUserEdit
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                  : "bg-blue-700 text-white hover:bg-blue-800 shadow-sm hover:shadow-md"
              }`}
            >
              <Database size={15} />
              <span className="hidden md:inline">Build KB</span>
            </button>

            {/* Requirements */}
            <button
              onClick={() => setShowRequirements((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 shadow-sm hover:shadow-md transition-all duration-150"
            >
              <FileText size={15} />
              <span className="hidden md:inline">Requirements</span>
            </button>

            {/* Conflicts */}
            <button
              onClick={() => setShowConflicts((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md transition-all duration-150"
            >
              <AlertTriangle size={15} />
              <span className="hidden md:inline">Conflicts</span>
            </button>
          </div>
        </header>

        {/* Read-Only Banner for Viewers */}
        {!canUserEdit && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
            <div className="flex items-center space-x-2 text-amber-800">
              <Eye size={18} />
              <span className="text-sm font-medium">
                View-Only Mode: You can view this project but cannot make
                changes.
                <span className="ml-1 text-amber-600">
                  Role:{" "}
                  {currentUserRole.charAt(0).toUpperCase() +
                    currentUserRole.slice(1)}
                </span>
              </span>
            </div>
          </div>
        )}

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
            <button
              onClick={() => setActiveTab("sharing")}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "sharing"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users size={18} />
                <span>Sharing</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("graph")}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "graph"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Network size={18} />
                <span>Story Graph</span>
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
                  <div className="flex flex-col h-full">

                    {/* ── Header block ── */}
                    <div className="pt-8 pb-6 px-2 border-b border-gray-100">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* eyebrow */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            <span className="text-xs font-medium text-indigo-600 uppercase tracking-widest">
                              Project Chat
                            </span>
                          </div>
                          <h1 className="text-3xl font-extrabold text-slate-900 leading-tight truncate">
                            {project?.name || "Workspace"}
                          </h1>
                          {project?.description && (
                            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed line-clamp-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                        {/* mini stats */}
                        <div className="flex flex-col gap-1.5 text-right shrink-0">
                          <span className="text-xs text-slate-400">
                            <span className="font-semibold text-slate-700">
                              {Array.isArray(documents) ? documents.length : 0}
                            </span>{" "}
                            docs
                          </span>
                          <span className="text-xs text-slate-400">
                            <span className="font-semibold text-slate-700">
                              {conversations.length}
                            </span>{" "}
                            chats
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold capitalize">
                            {currentUserRole || "member"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── Action grid ── */}
                    <div className="flex-1 py-6 px-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                        What would you like to do?
                      </p>
                      <div className="grid grid-cols-2 gap-3 mb-8">
                        {[
                          {
                            icon: <FileText size={18} />,
                            color: "text-violet-600",
                            bg: "bg-violet-50 hover:bg-violet-100",
                            ring: "ring-violet-200",
                            label: "Summarize documents",
                            sub: "Get a quick overview of all project files",
                            msg: "Summarize all documents in this project",
                          },
                          {
                            icon: <AlertTriangle size={18} />,
                            color: "text-amber-600",
                            bg: "bg-amber-50 hover:bg-amber-100",
                            ring: "ring-amber-200",
                            label: "Find conflicts",
                            sub: "Detect contradicting requirements",
                            msg: "Find conflicting requirements",
                          },
                          {
                            icon: <Target size={18} />,
                            color: "text-blue-600",
                            bg: "bg-blue-50 hover:bg-blue-100",
                            ring: "ring-blue-200",
                            label: "List requirements",
                            sub: "Extract structured functional requirements",
                            msg: "List all functional requirements",
                          },
                          {
                            icon: <Network size={18} />,
                            color: "text-emerald-600",
                            bg: "bg-emerald-50 hover:bg-emerald-100",
                            ring: "ring-emerald-200",
                            label: "Show dependencies",
                            sub: "Map relationships between requirements",
                            msg: "Show dependencies between requirements",
                          },
                        ].map((action) => (
                          <button
                            key={action.label}
                            onClick={() => {
                              setMessage(action.msg);
                              if (!selectedConversation) createNewConversation();
                            }}
                            className={`group flex items-start gap-3 p-4 rounded-xl ${action.bg} ring-1 ${action.ring} ring-transparent hover:ring-1 text-left transition-all duration-150 active:scale-[0.98]`}
                          >
                            <span className={`mt-0.5 shrink-0 ${action.color}`}>
                              {action.icon}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 leading-tight">
                                {action.label}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                                {action.sub}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* ── Quick-launch row ── */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-400 mr-1">Quick launch →</span>
                        {[
                          { label: "Upload doc", icon: <Upload size={13} />, action: () => setIsFileUploadOpen(true) },
                          { label: "View docs",  icon: <BookOpen size={13} />, action: () => setActiveTab("documents") },
                          { label: "Story graph", icon: <Network size={13} />, action: () => setActiveTab("graph") },
                        ].map((btn) => (
                          <button
                            key={btn.label}
                            onClick={btn.action}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 transition-all duration-150"
                          >
                            {btn.icon}
                            {btn.label}
                          </button>
                        ))}
                      </div>
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
                          streamingMessageId={streamingMessageId}
                          shouldAnimate={false}
                          user={user}
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
              <div className="border-t border-gray-100 pt-3 px-1">
                {/* Attached Files */}
                {attachedFiles.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {attachedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full text-sm shadow-sm"
                      >
                        <Paperclip size={13} className="text-indigo-500" />
                        <span className="text-indigo-700 truncate max-w-[180px] font-medium">
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeAttachedFile(index)}
                          className="text-indigo-400 hover:text-indigo-700 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Modern integrated input card */}
                <div
                  className={`rounded-2xl border-2 bg-white shadow-md transition-all duration-200 ${
                    !canUserEdit
                      ? "border-gray-200 opacity-80"
                      : "border-gray-200 focus-within:border-indigo-400 focus-within:shadow-lg focus-within:shadow-indigo-50"
                  }`}
                >
                  {/* Textarea */}
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={
                      !canUserEdit
                        ? "View-only mode — you cannot send messages"
                        : "Ask about this project..."
                    }
                    className="w-full px-4 pt-3 pb-1 bg-transparent focus:outline-none resize-none text-gray-800 placeholder-gray-400 text-sm leading-relaxed"
                    rows={3}
                    disabled={
                      !canUserEdit || isSendingMessage || isLoadingMessages
                    }
                  />

                  {/* Bottom toolbar */}
                  <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
                    {/* Left — model + attach */}
                    <div className="flex items-center gap-1">
                      <div
                        className="flex items-center"
                        title="Select AI model"
                      >
                        <ModelSelector
                          models={models}
                          selectedModelId={selectedModelId}
                          onSelect={setSelectedModelId}
                          isLoading={isLoadingModelsRef.current}
                          iconOnly={true}
                          dropUp={true}
                        />
                      </div>

                      <button
                        onClick={() => setIsFileUploadOpen(true)}
                        disabled={!canUserEdit}
                        title={
                          !canUserEdit
                            ? "You don't have permission to upload files"
                            : "Attach files"
                        }
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          !canUserEdit
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
                        }`}
                      >
                        <Paperclip size={15} />
                        <span className="hidden sm:inline">Attach</span>
                      </button>
                    </div>

                    {/* Right — hint + send button */}
                    <div className="flex items-center gap-3">
                      <span className="hidden md:block text-xs text-gray-400 select-none">
                        {message.trim()
                          ? "Enter ↵ to send · Shift+Enter for newline"
                          : ""}
                      </span>
                      <button
                        onClick={handleSendMessage}
                        disabled={
                          !canUserEdit ||
                          (!message.trim() && attachedFiles.length === 0) ||
                          isSendingMessage ||
                          isLoadingMessages
                        }
                        title={
                          !canUserEdit
                            ? "You don't have permission to send messages"
                            : "Send message (Enter)"
                        }
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                          !canUserEdit ||
                          (!message.trim() && attachedFiles.length === 0) ||
                          isSendingMessage ||
                          isLoadingMessages
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-sm hover:shadow-md active:scale-95"
                        }`}
                      >
                        {isSendingMessage ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            <span>Sending…</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare size={15} />
                            <span>Send</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
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
                    {canUserEdit
                      ? 'Use the "Build KB" button in the header to upload documents'
                      : "No documents have been uploaded to this project yet"}
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
                          {canUserEdit && (
                            <button
                              onClick={() => requestDocumentDeletion(doc)}
                              className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Delete document"
                            >
                              <Trash2 size={18} className="text-red-600" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sharing Tab */}
          {activeTab === "sharing" && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-2">
                  Project Sharing
                </h2>
                <p className="text-gray-600">
                  Invite team members to collaborate on this project
                </p>
              </div>

              {/* Invite Form */}
              <InviteForm
                onInvite={async (data) => {
                  setIsInvitingMember(true);
                  const { addCollaborator } =
                    await import("../services/sharingService");
                  try {
                    await addCollaborator(projectId, data);
                    // Reload collaborators (when API ready)
                    alert(`Invited ${data.email} as ${data.role}`);
                  } catch (err) {
                    const errorMessage =
                      err.response?.data?.message ||
                      err.response?.data?.errors?.email?.[0] ||
                      err.message ||
                      "Failed to invite member";
                    alert(errorMessage);
                    console.error(err);
                  } finally {
                    setIsInvitingMember(false);
                  }
                }}
                isLoading={isInvitingMember}
              />

              {/* Member List */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Team Members
                </h3>
                <MemberList
                  collaborators={collaborators}
                  currentUserRole={currentUserRole}
                  onChangeRole={async (userId, newRole) => {
                    const { updateCollaboratorRole } =
                      await import("../services/sharingService");
                    try {
                      await updateCollaboratorRole(projectId, userId, newRole);
                      alert(`Role updated to ${newRole}`);
                    } catch (err) {
                      alert("Failed to update role: " + err.message);
                    }
                  }}
                  onRemove={async (userId, memberName) => {
                    if (
                      !window.confirm(`Remove ${memberName} from this project?`)
                    ) {
                      return;
                    }
                    const { removeCollaborator } =
                      await import("../services/sharingService");
                    try {
                      await removeCollaborator(projectId, userId);
                      alert(`${memberName} removed`);
                    } catch (err) {
                      alert("Failed to remove member: " + err.message);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === "graph" && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden min-h-[600px]">
              <GraphView
                messages={allProjectMessages}
                isLoading={isLoadingGraphMessages}
              />
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
