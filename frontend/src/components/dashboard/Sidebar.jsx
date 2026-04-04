import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FolderKanban,
  Plus,
  MessageSquare,
  Loader2,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLogout } from "../../hooks/useAuth.jsx";
import { AnimateIn } from "../AnimateIn.jsx";

const NavItem = ({ icon, label, active, isOpen, onClick }) => {
  const activeStyle = active
    ? { backgroundColor: "#112D4E", color: "#DBE2EF" }
    : {};

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center ${
        isOpen ? "space-x-3 px-4" : "justify-center px-2"
      } py-3 rounded-xl font-medium transition-all duration-300 group relative overflow-hidden ${
        !active
          ? "text-gray-600 hover:bg-gray-100 hover:scale-[1.02]"
          : "shadow-lg"
      }`}
      style={activeStyle}
    >
      {active && (
        <div className="absolute inset-0 bg-white/10 -skew-x-12 nav-item-shimmer pointer-events-none" />
      )}
      <div
        className={`relative z-10 ${active ? "" : "group-hover:scale-110 transition-transform"}`}
      >
        {icon}
      </div>
      {isOpen && (
        <span
          className="font-semibold relative z-10"
          style={{ color: active ? "#7DD3FC" : undefined }}
        >
          {label}
        </span>
      )}
    </button>
  );
};

const ConversationItem = ({
  conversation,
  isSelected,
  isEditing,
  editingTitle,
  showDropdown,
  onSelect,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onTitleChange,
  onToggleDropdown,
  onKeyPress,
}) => (
  <div
    className={`group flex items-center rounded-xl cursor-pointer transition-all duration-300 ${
      isSelected
        ? "bg-blue-50 border-l-4 border-blue-500 shadow-sm scale-[1.02]"
        : "hover:bg-gray-50 hover:shadow-sm hover:scale-[1.01]"
    } ${showDropdown ? "pb-10" : ""}`}
  >
    {/* Clickable conversation info area */}
    <div
      onClick={() => {
        if (!isEditing) {
          onSelect(conversation);
        }
      }}
      className="flex-1 min-w-0 p-3 pr-2"
    >
      {isEditing ? (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={(e) => onKeyPress(e, conversation.id)}
            className="flex-1 text-sm font-medium bg-white border-2 border-blue-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveEdit(conversation.id);
            }}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex-shrink-0"
          >
            <Check size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancelEdit();
            }}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <div className="font-semibold text-sm text-gray-800 truncate pr-1">
            {conversation.title || "New Chat"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 font-medium">
            {new Date(conversation.updated_at).toLocaleDateString()}
          </div>
        </>
      )}
    </div>

    {/* Three-dot menu button — always in flow, shown on hover */}
    {!isEditing && (
      <div className="relative flex-shrink-0 pr-3 py-3 self-start">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleDropdown(conversation.id);
          }}
          className="p-1.5 rounded-lg opacity-40 hover:opacity-100 hover:bg-gray-200/80 transition-all duration-200"
          title="More options"
        >
          <MoreVertical size={16} className="text-gray-600" />
        </button>

        {showDropdown && (
          <div className="conversation-dropdown absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[140px] overflow-hidden">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit(conversation);
              }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 flex items-center space-x-2.5 transition-colors font-medium text-gray-700"
            >
              <Edit2 size={14} className="text-blue-600 flex-shrink-0" />
              <span>Rename</span>
            </button>
            <div className="h-px bg-gray-100 mx-2" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conversation.id);
              }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2.5 transition-colors font-medium"
            >
              <Trash2 size={14} className="flex-shrink-0" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    )}
  </div>
);

const Sidebar = ({
  isSidebarOpen,
  conversations,
  selectedConversation,
  editingConversationId,
  editingTitle,
  showDropdownId,
  isInitializing,
  projects,
  currentProjectId,
  fullName,
  hasEmptyConversation,
  isMobile,
  onToggleSidebar,
  chatMode,
  onSwitchToNormalMode,
  onSwitchToProjectMode,
  onSelectProject,
  onCreateNewConversation,
  onSelectConversation,
  onStartEditingConversation,
  onCancelEditing,
  onSaveConversationTitle,
  onDeleteConversation,
  onEditTitleChange,
  onToggleDropdown,
  onEditKeyPress,
}) => {
  const { logout: performLogout, isLoading: logoutLoading } = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef();

  useEffect(() => {
    function handleClickOutside(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setIsAccountOpen(false);
      }
      if (!e.target.closest(".conversation-dropdown")) {
        onToggleDropdown(null);
      }
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [onToggleDropdown]);

  const handleSelectConversation = useCallback(
    (conversation) => {
      onSelectConversation(conversation);
      if (isMobile) {
        onToggleSidebar();
      }
    },
    [onSelectConversation, isMobile, onToggleSidebar],
  );

  return (
    <>
      <style>{`
        @keyframes swim {
          0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
          25% { transform: translateX(3px) translateY(-2px) rotate(-8deg); }
          50% { transform: translateX(0) translateY(-4px) rotate(0deg); }
          75% { transform: translateX(-3px) translateY(-2px) rotate(8deg); }
        }
        
        @keyframes navItemShimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        
        .nav-item-shimmer {
          animation: navItemShimmer 2.5s infinite;
        }
        
        .fish-swim {
          animation: swim 2.5s ease-in-out infinite;
          display: inline-block;
          transform-origin: center;
        }
        
        .fish-container:hover .fish-swim {
          animation: swim 1s ease-in-out infinite;
        }
        
        .fish-container:hover {
          transform: scale(1.1) rotate(3deg);
        }

        /* Mobile overlay */
        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 40;
          animation: fadeIn 0.2s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Toggle button inside sidebar - minimal style */
        .sidebar-toggle-btn {
          background: transparent;
          border: none;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 6px;
        }
        
        .sidebar-toggle-btn:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .sidebar-toggle-btn:active {
          transform: scale(0.95);
        }
        
        /* Mobile floating menu button - shown when sidebar is closed */
        .mobile-menu-button {
          position: fixed;
          top: 18px;
          left: 12px;
          z-index: 40;
          background: transparent;
          border: none;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 6px;
        }
        
        .mobile-menu-button:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        
        .mobile-menu-button:active {
          transform: scale(0.95);
        }
      `}</style>

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div className="sidebar-overlay" onClick={onToggleSidebar} />
      )}

      {/* Mobile Menu Button - Only show when sidebar is closed on mobile */}
      {isMobile && !isSidebarOpen && (
        <button
          onClick={onToggleSidebar}
          className="mobile-menu-button"
          title="Open menu"
        >
          <ChevronRight size={24} className="text-gray-700" />
        </button>
      )}

      {/* Sidebar Container */}
      <div
        className={`bg-white flex flex-col transition-all duration-300 relative border-r rounded-r-3xl shadow-xl ${
          isMobile
            ? `fixed inset-y-0 left-0 z-50 shadow-2xl ${
                isSidebarOpen ? "w-80 translate-x-0" : "w-0 -translate-x-full"
              }`
            : `${isSidebarOpen ? "w-64" : "w-24"}`
        }`}
        style={{
          borderRightColor: "#E5E7EB",
          borderRightWidth: "1px",
        }}
      >
        {/* Content - Only render when open on mobile OR always on desktop */}
        {(isSidebarOpen || !isMobile) && (
          <>
            {/* Header with Toggle Button */}
            <div className="px-4 py-5 flex items-center justify-between mb-0">
              <div className="flex items-center space-x-3">
                <div
                  className="fish-container w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl relative overflow-hidden"
                  style={{ backgroundColor: "#4A7BA7" }}
                >
                  <span className="fish-swim text-2xl relative z-10">🐟</span>
                </div>
                {(isSidebarOpen || isMobile) && (
                  <span className="font-bold text-lg text-gray-800">Fishy</span>
                )}
              </div>

              {/* Toggle Button */}
              <button
                onClick={onToggleSidebar}
                className="sidebar-toggle-btn hover:bg-gray-100 rounded-lg"
                title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                {isSidebarOpen ? (
                  <ChevronLeft size={20} className="text-gray-600" />
                ) : (
                  <ChevronRight size={20} className="text-gray-600" />
                )}
              </button>
            </div>

            {/* Decorative divider line after header */}
            <div className="px-4">
              <div className="relative">
                <div className="h-[2px] bg-gradient-to-r from-transparent via-gray-300 to-transparent rounded-full"></div>
                <div className="absolute inset-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/20 to-transparent blur-sm"></div>
              </div>
            </div>

            {/* New Chat Button */}
            <div className="p-4">
              <button
                onClick={() => {
                  if (location.pathname === "/projects") {
                    navigate("/dashboard");
                  } else {
                    onCreateNewConversation();
                  }
                  if (isMobile) onToggleSidebar();
                }}
                disabled={isInitializing || hasEmptyConversation}
                className={`group relative w-full flex items-center overflow-hidden ${
                  isSidebarOpen || isMobile
                    ? "justify-start space-x-2"
                    : "justify-center"
                } px-4 py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:scale-[1.02] active:scale-95 ${
                  !isInitializing &&
                  !hasEmptyConversation &&
                  location.pathname === "/dashboard" &&
                  chatMode === "normal"
                    ? "animate-pulse"
                    : ""
                } shadow-md`}
                style={{ backgroundColor: "#DBE2EF", color: "#112D4E" }}
                title={
                  hasEmptyConversation
                    ? "Send a message first"
                    : "Create new chat"
                }
              >
                <div className="absolute inset-0 bg-white/20 -skew-x-12 group-hover:animate-shimmer" />
                <div
                  className={`flex items-center relative z-10 ${
                    isSidebarOpen || isMobile ? "space-x-2" : ""
                  }`}
                >
                  {isInitializing ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Plus
                      size={20}
                      className="transition-transform duration-300 group-hover:rotate-90"
                    />
                  )}
                  {(isSidebarOpen || isMobile) && (
                    <span>{isInitializing ? "Loading..." : "New Chat"}</span>
                  )}
                </div>
              </button>
            </div>

            {/* Navigation */}
            <nav className="px-4 space-y-1">
              <NavItem
                icon={<MessageSquare size={20} />}
                label="Conversations"
                active={
                  chatMode === "normal" && location.pathname === "/dashboard"
                }
                isOpen={isSidebarOpen || isMobile}
                onClick={() => {
                  onSwitchToNormalMode();
                  navigate("/dashboard");
                  if (isMobile) onToggleSidebar();
                }}
              />
              <NavItem
                icon={<FolderKanban size={20} />}
                label="Projects"
                active={
                  location.pathname === "/projects" ||
                  location.pathname.startsWith("/projects/")
                }
                isOpen={isSidebarOpen || isMobile}
                onClick={() => {
                  navigate("/projects");
                  if (isMobile) onToggleSidebar();
                }}
              />
            </nav>

            {/* Decorative divider line after navigation */}
            {(isSidebarOpen || isMobile) && (
              <div className="mx-4 mt-4 relative">
                <div className="h-[1.5px] bg-gradient-to-r from-transparent via-gray-300 to-transparent rounded-full"></div>
                <div className="absolute inset-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400/15 to-transparent blur-sm"></div>
              </div>
            )}

            {/* Conversations List */}
            {(isSidebarOpen || isMobile) && (
              <div className="flex-1 px-4 mt-6 overflow-y-auto pb-24 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {chatMode === "project" ? "Project Chats" : "Recent Chats"}
                  </span>
                </div>
                <div className="space-y-2">
                  {conversations.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-200 flex items-center justify-center">
                        <MessageSquare size={32} className="text-gray-400" />
                      </div>
                      <p className="text-sm font-semibold text-gray-600 mb-1">
                        No conversations
                      </p>
                      <p className="text-xs text-gray-400">
                        Click "New Chat" to start
                      </p>
                    </div>
                  ) : (
                    conversations.map((conversation, index) => (
                      <AnimateIn
                        key={conversation.id}
                        direction="left"
                        delayMs={40 + index * 20}
                      >
                        <ConversationItem
                          conversation={conversation}
                          isSelected={
                            selectedConversation?.id === conversation.id
                          }
                          isEditing={editingConversationId === conversation.id}
                          editingTitle={editingTitle}
                          showDropdown={showDropdownId === conversation.id}
                          onSelect={handleSelectConversation}
                          onStartEdit={onStartEditingConversation}
                          onCancelEdit={onCancelEditing}
                          onSaveEdit={onSaveConversationTitle}
                          onDelete={onDeleteConversation}
                          onTitleChange={onEditTitleChange}
                          onToggleDropdown={onToggleDropdown}
                          onKeyPress={onEditKeyPress}
                        />
                      </AnimateIn>
                    ))
                  )}
                </div>
              </div>
            )}

            {!isSidebarOpen &&
              !isMobile &&
              location.pathname === "/dashboard" && (
                <div className="flex-1"></div>
              )}

            {/* Decorative divider line before account */}
            <div className="absolute bottom-20 left-0 right-0 px-4">
              <div className="relative">
                <div className="h-[2px] bg-gradient-to-r from-transparent via-gray-300 to-transparent rounded-full"></div>
                <div className="absolute inset-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/20 to-transparent blur-sm"></div>
              </div>
            </div>

            {/* Account - Fixed at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white backdrop-blur-sm">
              <div ref={accountRef} className="w-full">
                <button
                  onClick={() => setIsAccountOpen(!isAccountOpen)}
                  className={`w-full flex items-center ${
                    isSidebarOpen || isMobile ? "space-x-3" : "justify-center"
                  } hover:bg-gray-100 p-3 rounded-xl transition-all duration-300 group hover:shadow-md`}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow relative overflow-hidden"
                    style={{ backgroundColor: "#4A7BA7" }}
                  >
                    <span className="text-white text-sm font-bold relative z-10">
                      {fullName ? fullName.charAt(0).toUpperCase() : "A"}
                    </span>
                  </div>
                  {(isSidebarOpen || isMobile) && (
                    <div className="flex-1 text-left">
                      <div className="text-sm font-semibold text-gray-800">
                        {fullName || "Account"}
                      </div>
                      <div
                        className="text-xs font-bold"
                        style={{ color: "#4A7BA7" }}
                      >
                        Pro
                      </div>
                    </div>
                  )}
                </button>

                {isAccountOpen && (
                  <div
                    className={`absolute bottom-20 rounded-xl shadow-2xl z-50 w-44 overflow-hidden backdrop-blur-xl border border-gray-200 ${
                      isSidebarOpen || isMobile
                        ? "left-4"
                        : "left-1/2 -translate-x-1/2"
                    }`}
                    style={{ backgroundColor: "#112D4E" }}
                  >
                    <button
                      onClick={performLogout}
                      disabled={logoutLoading}
                      className="w-full text-left px-4 py-3 text-sm text-white font-semibold hover:bg-white/10 disabled:opacity-50 transition-all backdrop-blur-sm"
                    >
                      {logoutLoading ? "Logging out..." : "Log out"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Sidebar;
