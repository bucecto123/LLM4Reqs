/**
 * AgentExecutor Component
 * Main interface for executing agent tasks
 */

import React, { useState, useCallback } from 'react';
import { Play, Square, History } from 'lucide-react';
import useAgent from '../hooks/useAgent.js';
import { AGENT_STATUS, getStatusLabel, getStatusColor } from '../utils/agentTypes.js';
import AgentStreamingOutput from './AgentStreamingOutput.jsx';

export function AgentExecutor({ projectId, onTaskComplete }) {
  const {
    runTask,
    currentTask,
    availableTools,
    loading,
    error,
    getTask,
    clearError,
  } = useAgent();

  const [taskInput, setTaskInput] = useState('');
  const [selectedTools, setSelectedTools] = useState([]);
  const [model, setModel] = useState('groq/mixtral-8x7b-32768');

  const currentTaskData = currentTask ? getTask(currentTask) : null;

  const handleExecute = useCallback(async () => {
    if (!taskInput.trim()) return;

    try {
      await runTask({
        task: taskInput,
        projectId,
        model,
        tools: selectedTools,
      });

      setTaskInput('');
      if (onTaskComplete) onTaskComplete();
    } catch (err) {
      console.error('Execution failed:', err);
    }
  }, [taskInput, projectId, model, selectedTools, runTask, onTaskComplete]);

  const toggleTool = (toolName) => {
    setSelectedTools((prev) =>
      prev.includes(toolName)
        ? prev.filter((t) => t !== toolName)
        : [...prev, toolName]
    );
  };

  const handleStop = () => {
    // Implement cancel task logic when available
    console.log('Stop task:', currentTask);
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      {/* Task Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Task Description
        </label>
        <textarea
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          disabled={loading}
          placeholder="Describe what you want the agent to do..."
          className="w-full h-24 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-200"
        />
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Model
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={loading}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="groq/mixtral-8x7b-32768">Mixtral 8x7B</option>
          <option value="groq/llama2-70b-4096">Llama 2 70B</option>
          <option value="groq/gemma-7b-it">Gemma 7B</option>
        </select>
      </div>

      {/* Tool Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Available Tools
        </label>
        <div className="grid grid-cols-2 gap-2">
          {availableTools.map((tool) => (
            <label
              key={tool.name}
              className="flex items-center space-x-2 p-2 bg-white border rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selectedTools.includes(tool.name)}
                onChange={() => toggleTool(tool.name)}
                disabled={loading}
                className="w-4 h-4"
              />
              <span className="text-sm">{tool.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800 font-medium"
          >
            ✕
          </button>
        </div>
      )}

      {/* Execute Button */}
      <div className="flex space-x-2">
        <button
          onClick={handleExecute}
          disabled={loading || !taskInput.trim()}
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          <Play size={18} />
          <span>{loading ? 'Running...' : 'Execute Task'}</span>
        </button>

        {loading && (
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <Square size={18} />
            <span>Stop</span>
          </button>
        )}
      </div>

      {/* Current Task Status and Output */}
      {currentTaskData && (
        <div className="mt-6 pt-4 border-t space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Task Status</h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium bg-${getStatusColor(
                currentTaskData.status
              )}-100 text-${getStatusColor(currentTaskData.status)}-800`}
            >
              {getStatusLabel(currentTaskData.status)}
            </span>
          </div>

          <AgentStreamingOutput task={currentTaskData} />
        </div>
      )}
    </div>
  );
}

export default AgentExecutor;
