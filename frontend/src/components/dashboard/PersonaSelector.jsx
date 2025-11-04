import React, { useState, useEffect } from "react";
import {
  User,
  ChevronDown,
  Plus,
  Settings,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "../../utils/auth";

const PersonaSelector = ({
  selectedPersonaId,
  onPersonaChange,
  disabled = false,
}) => {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  // Load personas on mount
  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFetch("/api/personas");

      if (response.success) {
        setPersonas(response.data);
      }
    } catch (err) {
      console.error("Error loading personas:", err);
      setError(err.message || "Failed to load personas");
    } finally {
      setLoading(false);
    }
  };

  // Get currently selected persona
  const selectedPersona = personas.find((p) => p.id === selectedPersonaId);

  // Separate predefined and custom personas
  const predefinedPersonas = personas.filter((p) => p.is_predefined);
  const customPersonas = personas.filter((p) => !p.is_predefined);

  // Handle persona selection
  const handleSelect = (personaId) => {
    onPersonaChange(personaId);
    setIsOpen(false);
  };

  // Clear persona (normal mode)
  const handleClear = () => {
    onPersonaChange(null);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
          disabled
            ? "bg-gray-100 cursor-not-allowed opacity-50"
            : selectedPersonaId
            ? "bg-purple-50 border-purple-300 hover:bg-purple-100"
            : "bg-white border-gray-300 hover:bg-gray-50"
        }`}
        title={disabled ? "Select a project first" : "Select persona"}
      >
        {selectedPersona ? (
          <>
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">
              {selectedPersona.name}
            </span>
          </>
        ) : (
          <>
            <User className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">No Persona</span>
          </>
        )}
        {!disabled && (
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
                Loading personas...
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-600">
                <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm">{error}</p>
              </div>
            ) : (
              <>
                {/* Normal Mode Option */}
                <div className="border-b border-gray-200">
                  <button
                    onClick={handleClear}
                    className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      !selectedPersonaId ? "bg-gray-50" : ""
                    }`}
                  >
                    <User className="w-5 h-5 text-gray-400" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">
                        Normal Mode
                      </div>
                      <div className="text-xs text-gray-500">
                        General conversation
                      </div>
                    </div>
                    {!selectedPersonaId && (
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    )}
                  </button>
                </div>

                {/* Predefined Personas */}
                {predefinedPersonas.length > 0 && (
                  <div className="border-b border-gray-200">
                    <div className="px-4 py-2 bg-gray-50">
                      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Expert Personas
                      </h3>
                    </div>
                    {predefinedPersonas.map((persona) => (
                      <PersonaOption
                        key={persona.id}
                        persona={persona}
                        isSelected={selectedPersonaId === persona.id}
                        onSelect={() => handleSelect(persona.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Custom Personas */}
                {customPersonas.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50">
                      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        My Custom Personas
                      </h3>
                    </div>
                    {customPersonas.map((persona) => (
                      <PersonaOption
                        key={persona.id}
                        persona={persona}
                        isSelected={selectedPersonaId === persona.id}
                        onSelect={() => handleSelect(persona.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Create Custom Persona Button */}
                <div className="border-t border-gray-200 p-2">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      // TODO: Open PersonaManager modal
                      console.log("Open persona manager");
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Create Custom Persona
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Individual persona option component
const PersonaOption = ({ persona, isSelected, onSelect }) => {
  const roleIcons = {
    end_user: "👤",
    business_analyst: "📊",
    product_owner: "🎯",
    developer: "👨‍💻",
    qa_tester: "🧪",
    security_expert: "🔒",
    ux_designer: "🎨",
    system_admin: "⚙️",
  };

  const icon = roleIcons[persona.type] || "👤";

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-start space-x-3 px-4 py-3 hover:bg-purple-50 transition-colors ${
        isSelected ? "bg-purple-50" : ""
      }`}
    >
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div className="flex-1 text-left min-w-0">
        <div className="font-medium text-gray-900 truncate">{persona.name}</div>
        <div className="text-xs text-gray-600 line-clamp-2">{persona.role}</div>
        {persona.priorities && persona.priorities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {persona.priorities.slice(0, 2).map((priority, idx) => (
              <span
                key={idx}
                className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded"
              >
                {priority}
              </span>
            ))}
            {persona.priorities.length > 2 && (
              <span className="text-xs text-gray-500">
                +{persona.priorities.length - 2} more
              </span>
            )}
          </div>
        )}
      </div>
      {isSelected && (
        <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-1"></div>
      )}
    </button>
  );
};

export default PersonaSelector;
