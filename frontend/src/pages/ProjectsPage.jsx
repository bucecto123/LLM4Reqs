import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, FolderOpen, Menu, Activity, SortAsc, ChevronDown, Trash2, Edit2 } from "lucide-react";
import { apiFetch } from "../utils/auth.js";
import { useAuth } from "../hooks/useAuth.jsx";
import Sidebar from "../components/dashboard/Sidebar.jsx";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("activity"); // 'activity' or 'name'
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [error, setError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Edit project state
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");

  // Mobile and sidebar state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

  // Sidebar states (minimal since we're not showing conversations on projects page)
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);

  // Handle mobile detection
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
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch("/api/projects");
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load projects:", err);
      setError("Failed to load projects. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const data = await apiFetch("/api/projects", {
        method: "POST",
        body: {
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || null,
        },
      });

      setProjects([data, ...projects]);
      setShowNewProjectModal(false);
      setNewProjectName("");
      setNewProjectDescription("");
      setError(null);
    } catch (err) {
      console.error("Failed to create project:", err);
      setError("Failed to create project. Please try again.");
    }
  };

  const openProject = (projectId) => {
    // Navigate to dashboard with selected project
    navigate(`/dashboard?project=${projectId}`);
  };

  const deleteProject = async (projectId, e) => {
    e.stopPropagation(); // Prevent opening the project when clicking delete
    
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }

    try {
      await apiFetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setError(null);
    } catch (err) {
      console.error("Failed to delete project:", err);
      setError("Failed to delete project. Please try again.");
    }
  };

  const openEditModal = (project, e) => {
    e.stopPropagation(); // Prevent opening the project when clicking edit
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectDescription(project.description || "");
    setShowEditProjectModal(true);
  };

  const updateProject = async (e) => {
    e.preventDefault();
    if (!editProjectName.trim() || !editingProject) return;

    try {
      const data = await apiFetch(`/api/projects/${editingProject.id}`, {
        method: "PUT",
        body: {
          name: editProjectName.trim(),
          description: editProjectDescription.trim() || null,
        },
      });

      setProjects((prev) =>
        prev.map((p) => (p.id === editingProject.id ? data : p))
      );
      setShowEditProjectModal(false);
      setEditingProject(null);
      setEditProjectName("");
      setEditProjectDescription("");
      setError(null);
    } catch (err) {
      console.error("Failed to update project:", err);
      setError("Failed to update project. Please try again.");
    }
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description &&
        project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === "activity") {
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
        isMobile={isMobile}
        conversations={conversations}
        selectedConversation={selectedConversation}
        editingConversationId={null}
        editingTitle=""
        showDropdownId={null}
        isInitializing={false}
        fullName={user?.name}
        hasEmptyConversation={false}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onCreateNewConversation={() => navigate("/dashboard")}
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
        <header
          className={`border-b-2 border-indigo-100 bg-white py-4 flex items-center justify-between shadow-sm ${
            isMobile && !isSidebarOpen ? "pl-14 pr-6" : "px-6"
          }`}
        >
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-slate-800">
              Projects
            </h1>
          </div>

          <button
            onClick={() => setShowNewProjectModal(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 bg-blue-600 text-white"
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
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-indigo-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all shadow-sm"
              />
            </div>

            <div className="ml-4 flex items-center space-x-3 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2.5 rounded-xl border-2 border-indigo-200 shadow-sm">
              <span className="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Sort by:
              </span>
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 pl-3 pr-8 py-2 rounded-lg border-2 border-purple-200 bg-white text-indigo-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all shadow-sm hover:border-purple-300 hover:shadow-md"
                >
                  {sortBy === "activity" ? (
                    <Activity size={16} className="text-indigo-600" />
                  ) : (
                    <SortAsc size={16} className="text-indigo-600" />
                  )}
                  <span>{sortBy === "activity" ? "Activity" : "Name"}</span>
                  <ChevronDown size={16} className="absolute right-2 text-indigo-600" />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute top-full mt-2 w-full bg-white rounded-lg border-2 border-purple-200 shadow-xl overflow-hidden z-50">
                    <button
                      onClick={() => {
                        setSortBy("activity");
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                        sortBy === "activity" ? "bg-indigo-50 text-indigo-900" : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <Activity size={16} className={sortBy === "activity" ? "text-indigo-600" : "text-gray-500"} />
                      <span className="font-medium">Activity</span>
                    </button>
                    <button
                      onClick={() => {
                        setSortBy("name");
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                        sortBy === "name" ? "bg-indigo-50 text-indigo-900" : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <SortAsc size={16} className={sortBy === "name" ? "text-indigo-600" : "text-gray-500"} />
                      <span className="font-medium">Name</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 text-red-800">
              {error}
            </div>
          )}

          {/* Projects Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading projects...</p>
              </div>
            </div>
          ) : sortedProjects.length === 0 ? (
            <div className="text-center py-20">
              <FolderOpen
                size={64}
                className="mx-auto mb-4 text-gray-300"
              />
              <h3 className="text-xl font-semibold mb-2 text-slate-800">
                {searchQuery
                  ? "No projects found"
                  : "Looking to start a project?"}
              </h3>
              <p className="mb-6 text-gray-500">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Upload materials, set custom instructions, and organize conversations in one space."}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-lg bg-indigo-100 text-slate-800"
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
                  className="group p-6 rounded-xl border-2 border-purple-200 bg-white cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 hover:border-indigo-300 relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors bg-indigo-100">
                      <FolderOpen size={24} className="text-blue-600" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">
                        {new Date(project.updated_at).toLocaleDateString()}
                      </div>
                      <button
                        onClick={(e) => openEditModal(project, e)}
                        className="p-2 rounded-lg hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit project"
                      >
                        <Edit2 size={18} className="text-blue-600" />
                      </button>
                      <button
                        onClick={(e) => deleteProject(project.id, e)}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete project"
                      >
                        <Trash2 size={18} className="text-red-600" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-lg mb-2 truncate text-slate-800">
                    {project.name}
                  </h3>

                  {project.description && (
                    <p className="text-sm mb-3 line-clamp-2 text-gray-500">
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-4 text-xs text-gray-400">
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
          <div className="rounded-xl shadow-2xl max-w-md w-full p-6 border-2 border-indigo-200 bg-white">
            <h2 className="text-2xl font-bold mb-4 text-slate-800">
              Create New Project
            </h2>

            <form onSubmit={createProject}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2 text-slate-800">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Awesome Project"
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
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="What's this project about?"
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border-2 border-indigo-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewProjectModal(false);
                    setNewProjectName("");
                    setNewProjectDescription("");
                  }}
                  className="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-100 text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProjectModal && editingProject && (
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
                  placeholder="My Awesome Project"
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
                  placeholder="What's this project about?"
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border-2 border-indigo-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProjectModal(false);
                    setEditingProject(null);
                    setEditProjectName("");
                    setEditProjectDescription("");
                  }}
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
    </div>
  );
}
