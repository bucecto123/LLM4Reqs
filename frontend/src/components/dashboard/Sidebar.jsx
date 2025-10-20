import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, 
  TrendingUp, 
  Plane, 
  ShoppingBag, 
  Plus, 
  MessageSquare, 
  Loader2, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Check, 
  X 
} from 'lucide-react';
import { useLogout } from '../../hooks/useAuth.jsx';

const NavItem = ({ icon, label, active, isOpen }) => {
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
};

const ConversationItem = ({ 
  conversation, 
  isSelected, 
  isEditing, 
  editingTitle, 
  showDropdown,
  onSelect, 
  onEdit, 
  onDelete,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
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
    
    {/* Dropdown Menu */}
    {!isEditing && (
      <div className="absolute right-2 top-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleDropdown(conversation.id);
          }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-all duration-200"
          title="More options"
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
  currentProjectId,
  fullName,
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
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef();

  useEffect(() => {
    function handleClickOutside(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setIsAccountOpen(false);
      }
      // Close conversation dropdown when clicking outside
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
  };

  return (
    <>
      <style>{`
        @keyframes swim {
          0%, 100% {
            transform: translateX(0) translateY(0) rotate(0deg);
          }
          25% {
            transform: translateX(2px) translateY(-2px) rotate(-5deg);
          }
          50% {
            transform: translateX(0) translateY(-3px) rotate(0deg);
          }
          75% {
            transform: translateX(-2px) translateY(-2px) rotate(5deg);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        
        .fish-swim {
          animation: swim 3s ease-in-out infinite;
        }
        
        .fish-container:hover .fish-swim {
          animation: swim 1.5s ease-in-out infinite, float 2s ease-in-out infinite;
        }
      `}</style>
      
      <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="fish-container w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-300" style={{ backgroundColor: '#4A7BA7' }}>
              <span className="fish-swim text-2xl">🐟</span>
            </div>
            {isSidebarOpen && (
              <span className="font-semibold text-lg text-gray-800">Fishy</span>
            )}
          </div>
        </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button 
          onClick={onCreateNewConversation}
          disabled={isInitializing || !currentProjectId}
          className={`group relative w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:hover:shadow-none overflow-hidden ${
            !isInitializing && currentProjectId ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''
          }`}
          style={{ backgroundColor: '#DBE2EF', color: '#112D4E' }}
        >
          {/* Animated background gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
          
          {/* Subtle glow effect when ready */}
          {!isInitializing && currentProjectId && (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/10 to-blue-400/0 animate-[pulse_3s_ease-in-out_infinite]"></div>
          )}
          
          {/* Content */}
          <div className="relative flex items-center space-x-2">
            {isInitializing ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Plus size={20} className="transition-transform duration-300 group-hover:rotate-90 group-active:rotate-180" />
            )}
            {isSidebarOpen && (
              <span className="transition-all duration-300 group-hover:tracking-wide group-hover:font-semibold">
                {isInitializing ? 'Loading...' : 'New Chat'}
              </span>
            )}
          </div>
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

      {/* Account */}
      <div className="p-4 border-t border-gray-200 relative">
        <div ref={accountRef} className="w-full">
          <button 
            onClick={() => setIsAccountOpen(!isAccountOpen)} 
            className="w-full flex items-center space-x-3 hover:bg-gray-50 p-3 rounded-lg transition-colors"
          >
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

          {/* Logout dropdown */}
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
    </>
  );
};

export default Sidebar;