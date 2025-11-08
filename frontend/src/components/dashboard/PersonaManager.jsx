import React, { useState } from "react";
import { X, User, Sparkles, AlertCircle, Check } from "lucide-react";
import { apiFetch } from "../../utils/auth";

const PersonaManager = ({ onClose, onPersonaCreated }) => {
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    description: "",
    technical_level: "medium",
    priorities: [""],
    concerns: [""],
    focus_areas: [""],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (field, index, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const addArrayItem = (field) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Filter out empty strings from arrays
      const cleanedData = {
        ...formData,
        priorities: formData.priorities.filter((p) => p.trim()),
        concerns: formData.concerns.filter((c) => c.trim()),
        focus_areas: formData.focus_areas.filter((f) => f.trim()),
      };

      const response = await apiFetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          onPersonaCreated(response.data);
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error("Error creating persona:", err);
      setError(err.message || "Failed to create persona");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Create Custom Persona
              </h2>
              <p className="text-sm text-gray-600">
                Define a specialized perspective for requirement analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">
                Persona created successfully!
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-red-900 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Basic Information</span>
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Persona Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., Healthcare Administrator"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <input
                type="text"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                placeholder="e.g., Hospital System Manager"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={3}
                placeholder="Describe this persona's background, responsibilities, and perspective..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Technical Level
              </label>
              <select
                name="technical_level"
                value={formData.technical_level}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="low">Low (Non-technical)</option>
                <option value="medium">
                  Medium (Some technical knowledge)
                </option>
                <option value="high">High (Technical expert)</option>
              </select>
            </div>
          </div>

          {/* Priorities */}
          <ArrayField
            label="Priorities"
            description="What does this persona prioritize?"
            items={formData.priorities}
            onChange={(index, value) =>
              handleArrayChange("priorities", index, value)
            }
            onAdd={() => addArrayItem("priorities")}
            onRemove={(index) => removeArrayItem("priorities", index)}
            placeholder="e.g., Patient safety and data privacy"
          />

          {/* Concerns */}
          <ArrayField
            label="Concerns"
            description="What are this persona's main concerns?"
            items={formData.concerns}
            onChange={(index, value) =>
              handleArrayChange("concerns", index, value)
            }
            onAdd={() => addArrayItem("concerns")}
            onRemove={(index) => removeArrayItem("concerns", index)}
            placeholder="e.g., HIPAA compliance violations"
          />

          {/* Focus Areas */}
          <ArrayField
            label="Focus Areas"
            description="What areas does this persona focus on?"
            items={formData.focus_areas}
            onChange={(index, value) =>
              handleArrayChange("focus_areas", index, value)
            }
            onAdd={() => addArrayItem("focus_areas")}
            onRemove={(index) => removeArrayItem("focus_areas", index)}
            placeholder="e.g., Regulatory Compliance"
          />
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || success}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Create Persona</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Array Field Component
const ArrayField = ({
  label,
  description,
  items,
  onChange,
  onAdd,
  onRemove,
  placeholder,
}) => {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <input
              type="text"
              value={item}
              onChange={(e) => onChange(index, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
      >
        + Add {label.slice(0, -1)}
      </button>
    </div>
  );
};

export default PersonaManager;
