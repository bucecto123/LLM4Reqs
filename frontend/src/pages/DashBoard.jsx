import React, { useState, useRef, useEffect } from 'react';
import { clearAuth } from '../utils/api';
import { Home, TrendingUp, Plane, ShoppingBag, Plus, Search, Grid3x3, Mic, Send, Globe, Paperclip, ChevronRight, Sparkles } from 'lucide-react';

export default function LLMDashboard() {
  const [message, setMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef();

  useEffect(() => {
    function handleClickOutside(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setIsAccountOpen(false);
      }
    }
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

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
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors"
            style={{ backgroundColor: '#DBE2EF', color: '#112D4E' }}
          >
            <Plus size={20} />
            {isSidebarOpen && <span>New Chat</span>}
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-4 space-y-1">
          <NavItem icon={<Home size={20} />} label="Home" active={true} isOpen={isSidebarOpen} />
          <NavItem icon={<TrendingUp size={20} />} label="Finance" isOpen={isSidebarOpen} />
          <NavItem icon={<Plane size={20} />} label="Travel" isOpen={isSidebarOpen} />
          <NavItem icon={<ShoppingBag size={20} />} label="Shopping" isOpen={isSidebarOpen} />
        </nav>

        {/* Library Section */}
        {isSidebarOpen && (
          <div className="flex-1 px-4 mt-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase">Library</span>
              <button className="text-gray-400 hover:text-gray-600">
                <Plus size={16} />
              </button>
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
                  <div className="text-sm font-medium text-gray-800">Account</div>
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
                  onClick={() => { clearAuth(); }}
                  className="w-full text-left px-4 py-2 text-sm text-white font-medium hover:opacity-90"
                  style={{ backgroundColor: 'transparent' }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Fishy.ai</span>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
          <div className="w-full max-w-3xl">
            {/* Title */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <span className="text-5xl font-bold" style={{ color: '#112D4E' }}>Fishy</span>
                <span 
                  className="text-3xl font-bold text-white px-4 py-1 rounded-lg"
                  style={{ backgroundColor: '#4A7BA7' }}
                >
                  pro
                </span>
              </div>
            </div>

            {/* Input Container */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 transition-all duration-200 hover:shadow-xl">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask anything. Type @ for mentions and / for shortcuts."
                className="w-full bg-transparent border-none outline-none resize-none text-gray-800 placeholder-gray-400 text-base"
                rows={3}
              />

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <button 
                    className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:shadow-md flex items-center space-x-2"
                    style={{ backgroundColor: '#DBE2EF', color: '#112D4E' }}
                  >
                    <Search size={16} />
                    <span>Search</span>
                  </button>
                  <button 
                    className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:shadow-md flex items-center space-x-2"
                    style={{ backgroundColor: '#DBE2EF', color: '#112D4E' }}
                  >
                    <Sparkles size={16} />
                    <span>Research</span>
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <ActionButton icon={<Grid3x3 size={18} />} />
                  <ActionButton icon={<Globe size={18} />} />
                  <ActionButton icon={<Paperclip size={18} />} />
                  <ActionButton icon={<Mic size={18} />} />
                  <button 
                    className="p-3 rounded-xl text-white transition-all duration-200 hover:shadow-lg transform hover:scale-105"
                    style={{ backgroundColor: '#4A7BA7' }}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
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

function ActionButton({ icon }) {
  return (
    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-all duration-200">
      {icon}
    </button>
  );
}