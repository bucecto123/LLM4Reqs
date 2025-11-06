import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  ChevronRight
} from 'lucide-react';
import { useLogout } from '../../hooks/useAuth.jsx';

const NavItem = ({ icon, label, active, isOpen, onClick }) => {
  const baseClasses = `w-full flex items-center ${isOpen ? 'space-x-3 px-4' : 'justify-center px-2'} py-3 rounded-lg font-medium transition-all duration-200`;
  const activeStyle = active 
    ? { backgroundColor: '#112D4E', color: '#DBE2EF' }
    : {};

  return (
    <button 
      onClick={onClick}
      className={`${baseClasses} ${!active ? 'text-gray-600 hover:bg-gray-100' : ''}`}
      style={activeStyle}
    >
      <div>{icon}</div>
      {isOpen && <span>{label}</span>}
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
  onKeyPress
}) => (
  <div
    className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
      isSelected
        ? 'bg-blue-50 border-l-4 border-blue-500'
        : 'hover:bg-gray-50'
    }`}
  >
    <div 
      onClick={() => {
        if (!isEditing) {
          onSelect(conversation);
        }
      }}
      className="flex-1"
    >
      {isEditing ? (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={(e) => onKeyPress(e, conversation.id)}
            className="flex-1 text-sm font-medium bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={() => onSaveEdit(conversation.id)}
            className="p-1 text-green-600 hover:text-green-700"
          >
            <Check size={14} />
          </button>
          <button
            onClick={onCancelEdit}
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
    
    {!isEditing && (
      <div className="absolute right-2 top-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleDropdown(conversation.id);
          }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all duration-200"
        >
          <MoreVertical size={14} />
        </button>
        
        {showDropdown && (
          <div className="conversation-dropdown absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit(conversation);
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
                onDelete(conversation.id);
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
);

const Sidebar = ({
  isSidebarOpen,
  conversations,
  selectedConversation,
  editingConversationId,
  editingTitle,
  showDropdownId,
  isInitializing,
  fullName,
  hasEmptyConversation,
  isMobile,
  onToggleSidebar,
  onCreateNewConversation,
  onSelectConversation,
  onStartEditingConversation,
  onCancelEditing,
  onSaveConversationTitle,
  onDeleteConversation,
  onEditTitleChange,
  onToggleDropdown,
  onEditKeyPress,
  loadMessages
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
      if (!e.target.closest('.conversation-dropdown')) {
        onToggleDropdown(null);
      }
    }
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [onToggleDropdown]);

  const handleSelectConversation = (conversation) => {
    onSelectConversation(conversation);
    loadMessages(conversation.id);
    if (isMobile) {
      onToggleSidebar();
    }
  };

  return (
    <>
      <style>{`
        @keyframes swim {
          0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
          25% { transform: translateX(3px) translateY(-2px) rotate(-8deg); }
          50% { transform: translateX(0) translateY(-4px) rotate(0deg); }
          75% { transform: translateX(-3px) translateY(-2px) rotate(8deg); }
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
          transform: scale(1.1);
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
        <div 
          className="sidebar-overlay"
          onClick={onToggleSidebar}
        />
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
        className={`bg-white flex flex-col transition-all duration-300 relative border-r rounded-r-2xl ${
          isMobile 
            ? `fixed inset-y-0 left-0 z-50 shadow-2xl ${
                isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full'
              }` 
            : `${isSidebarOpen ? 'w-64' : 'w-24'}`
        }`}
        style={{
          borderRightColor: '#D1D5DB',
          borderRightWidth: '2px'
        }}
      >
        {/* Content - Only render when open on mobile OR always on desktop */}
        {(isSidebarOpen || !isMobile) && (
          <>
            {/* Header with Toggle Button */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="fish-container w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-transform" style={{ backgroundColor: '#4A7BA7' }}>
                  <span className="fish-swim text-2xl">🐟</span>
                </div>
                {(isSidebarOpen || isMobile) && (
                  <span className="font-semibold text-lg text-gray-800">Fishy</span>
                )}
              </div>
              
              {/* Toggle Button */}
              <button
                onClick={onToggleSidebar}
                className="sidebar-toggle-btn"
                title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                {isSidebarOpen ? (
                  <ChevronLeft size={20} className="text-gray-600" />
                ) : (
                  <ChevronRight size={20} className="text-gray-600" />
                )}
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-4">
              <button 
                onClick={() => {
                  if (location.pathname === '/projects') {
                    navigate('/dashboard');
                  } else {
                    onCreateNewConversation();
                  }
                  if (isMobile) onToggleSidebar();
                }}
                disabled={isInitializing || hasEmptyConversation}
                className={`group w-full flex items-center ${(isSidebarOpen || isMobile) ? 'justify-start space-x-2' : 'justify-center'} px-4 py-3 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-105 ${
                  !isInitializing && !hasEmptyConversation && location.pathname === '/dashboard' ? 'animate-pulse' : ''
                }`}
                style={{ backgroundColor: '#DBE2EF', color: '#112D4E' }}
                title={hasEmptyConversation ? "Send a message first" : "Create new chat"}
              >
                <div className={`flex items-center ${(isSidebarOpen || isMobile) ? 'space-x-2' : ''}`}>
                  {isInitializing ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Plus size={20} className="transition-transform group-hover:rotate-90" />
                  )}
                  {(isSidebarOpen || isMobile) && (
                    <span>{isInitializing ? 'Loading...' : 'New Chat'}</span>
                  )}
                </div>
              </button>
            </div>

            {/* Navigation */}
            <nav className="px-4 space-y-1">
              <NavItem 
                icon={<MessageSquare size={20} />} 
                label="Conversations" 
                active={location.pathname === '/dashboard'} 
                isOpen={isSidebarOpen || isMobile}
                onClick={() => {
                  navigate('/dashboard');
                  if (isMobile) onToggleSidebar();
                }}
              />
              <NavItem 
                icon={<FolderKanban size={20} />} 
                label="Projects" 
                active={location.pathname === '/projects'}
                isOpen={isSidebarOpen || isMobile}
                onClick={() => {
                  navigate('/projects');
                  if (isMobile) onToggleSidebar();
                }}
              />
            </nav>

            {/* Conversations List */}
            {(isSidebarOpen || isMobile) && location.pathname === '/dashboard' && (
              <div className="flex-1 px-4 mt-6 overflow-y-auto pb-24">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Recent Chats</span>
                </div>
                <div className="space-y-2">
                  {conversations.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare size={32} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No conversations</p>
                      <p className="text-xs text-gray-400">Click "New Chat"</p>
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isSelected={selectedConversation?.id === conversation.id}
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
                    ))
                  )}
                </div>
              </div>
            )}

            {(!isSidebarOpen && !isMobile && location.pathname !== '/dashboard') && (
              <div className="flex-1"></div>
            )}

            {/* Account - Fixed at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
              <div ref={accountRef} className="w-full">
                <button 
                  onClick={() => setIsAccountOpen(!isAccountOpen)} 
                  className={`w-full flex items-center ${(isSidebarOpen || isMobile) ? 'space-x-3' : 'justify-center'} hover:bg-gray-50 p-3 rounded-lg transition-colors`}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#4A7BA7' }}>
                    <span className="text-white text-sm font-semibold">
                      {fullName ? fullName.charAt(0).toUpperCase() : 'A'}
                    </span>
                  </div>
                  {(isSidebarOpen || isMobile) && (
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-800">{fullName || 'Account'}</div>
                      <div className="text-xs font-semibold" style={{ color: '#4A7BA7' }}>Pro</div>
                    </div>
                  )}
                </button>

                {isAccountOpen && (
                  <div
                    className={`absolute bottom-20 rounded-lg shadow-lg z-50 w-40 overflow-hidden ${
                      (isSidebarOpen || isMobile) ? 'left-4' : 'left-1/2 -translate-x-1/2'
                    }`}
                    style={{ backgroundColor: '#112D4E' }}
                  >
                    <button
                      onClick={performLogout}
                      disabled={logoutLoading}
                      className="w-full text-left px-4 py-3 text-sm text-white font-medium hover:bg-opacity-90 disabled:opacity-50 transition-all"
                    >
                      {logoutLoading ? 'Logging out...' : 'Log out'}
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