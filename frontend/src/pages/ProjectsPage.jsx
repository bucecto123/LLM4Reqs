import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FolderOpen, Menu } from 'lucide-react';
import { apiFetch } from '../utils/auth.js';
import { useAuth } from '../hooks/useAuth.jsx';
import Sidebar from '../components/dashboard/Sidebar.jsx';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('activity'); // 'activity' or 'name'
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Sidebar states (minimal since we're not showing conversations on projects page)
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch('/api/projects');
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const data = await apiFetch('/api/projects', {
        method: 'POST',
        body: {
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null
        }
      });
      
      setProjects([data, ...projects]);
      setShowNewProjectModal(false);
      setNewProjectName('');
      setNewProjectDescription('');
      setError(null);
    } catch (err) {
      console.error('Failed to create project:', err);
      setError('Failed to create project. Please try again.');
    }
  };

  const openProject = (projectId) => {
    // Navigate to dashboard with selected project
    navigate(`/dashboard?project=${projectId}`);
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === 'activity') {
      return new Date(b.updated_at) - new Date(a.updated_at);
    } else {
      return a.name.localeCompare(b.name);
    }
  });

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        conversations={conversations}
        selectedConversation={selectedConversation}
        editingConversationId={null}
        editingTitle=""
        showDropdownId={null}
        isInitializing={false}
        currentProjectId={null}
        fullName={user?.name}
        onCreateNewConversation={() => navigate('/dashboard')}
        onSelectConversation={() => {}}
        onStartEditingConversation={() => {}}
        onCancelEditing={() => {}}
        onSaveConversationTitle={() => {}}
        onDeleteConversation={() => {}}
        onEditTitleChange={() => {}}
        onToggleDropdown={() => {}}
        onEditKeyPress={() => {}}
        loadMessages={() => {}}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu size={20} style={{ color: '#112D4E' }} />
            </button>
            <h1 className="text-2xl font-bold" style={{ color: '#112D4E' }}>Projects</h1>
          </div>
          
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:scale-105"
            style={{ backgroundColor: '#4A7BA7', color: '#FFFFFF' }}
          >
            <Plus size={18} />
            <span>New project</span>
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Search and Filter Bar */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex-1 max-w-2xl relative">
              <Search 
                size={20} 
                className="absolute left-4 top-1/2 transform -translate-y-1/2" 
                style={{ color: '#6B7280' }}
              />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E5E7EB',
                  color: '#112D4E'
                }}
              />
            </div>
            
            <div className="ml-4 flex items-center space-x-2">
              <span className="text-sm" style={{ color: '#6B7280' }}>Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                style={{ 
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E5E7EB',
                  color: '#112D4E'
                }}
              >
                <option value="activity">Activity</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
              {error}
            </div>
          )}

          {/* Projects Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#4A7BA7' }}></div>
                <p style={{ color: '#6B7280' }}>Loading projects...</p>
              </div>
            </div>
          ) : sortedProjects.length === 0 ? (
            <div className="text-center py-20">
              <FolderOpen size={64} className="mx-auto mb-4" style={{ color: '#D1D5DB' }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#112D4E' }}>
                {searchQuery ? 'No projects found' : 'Looking to start a project?'}
              </h3>
              <p className="mb-6" style={{ color: '#6B7280' }}>
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Upload materials, set custom instructions, and organize conversations in one space.'
                }
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
                  style={{ backgroundColor: '#DBE2EF', color: '#112D4E' }}
                >
                  <Plus size={20} />
                  <span>New project</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => openProject(project.id)}
                  className="group p-6 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
                  style={{ 
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E5E7EB'
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: '#DBE2EF' }}>
                      <FolderOpen size={24} style={{ color: '#4A7BA7' }} />
                    </div>
                    <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                      {new Date(project.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2 truncate" style={{ color: '#112D4E' }}>
                    {project.name}
                  </h3>
                  
                  {project.description && (
                    <p className="text-sm mb-3 line-clamp-2" style={{ color: '#6B7280' }}>
                      {project.description}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs" style={{ color: '#9CA3AF' }}>
                    <span>{project.documents_count || 0} documents</span>
                    <span>•</span>
                    <span>{project.requirements_count || 0} requirements</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="rounded-lg shadow-xl max-w-md w-full p-6" style={{ backgroundColor: '#FFFFFF' }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#112D4E' }}>Create New Project</h2>
            
            <form onSubmit={createProject}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#112D4E' }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Awesome Project"
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E5E7EB',
                    color: '#112D4E'
                  }}
                  autoFocus
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#112D4E' }}>
                  Description (Optional)
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="What's this project about?"
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 resize-none"
                  style={{ 
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E5E7EB',
                    color: '#112D4E'
                  }}
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewProjectModal(false);
                    setNewProjectName('');
                    setNewProjectDescription('');
                  }}
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ 
                    backgroundColor: '#F3F4F6',
                    color: '#6B7280'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: '#4A7BA7',
                    color: '#FFFFFF'
                  }}
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
