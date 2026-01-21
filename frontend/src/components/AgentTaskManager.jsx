/**
 * AgentTaskManager Component
 * Manages and displays queue of agent tasks
 */

import React, { useState, useEffect } from 'react';
import { Trash2, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import useAgent from '../hooks/useAgent.js';
import { getStatusLabel, getStatusColor, AGENT_STATUS } from '../utils/agentTypes.js';
import AgentStreamingOutput from './AgentStreamingOutput.jsx';

export function AgentTaskManager({ projectId }) {
  const { tasks, getProjectTasks, clearCompleted } = useAgent();
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [sortBy, setSortBy] = useState('recent'); // recent, status, duration

  const projectTasks = getProjectTasks(projectId);

  const sortedTasks = [...projectTasks].sort((a, b) => {
    switch (sortBy) {
      case 'status':
        return a.status.localeCompare(b.status);
      case 'duration':
        const durationA = (a.endTime || Date.now()) - a.startTime;
        const durationB = (b.endTime || Date.now()) - b.startTime;
        return durationB - durationA;
      case 'recent':
      default:
        return b.startTime - a.startTime;
    }
  });

  if (projectTasks.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Clock size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No tasks executed yet</p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case AGENT_STATUS.COMPLETED:
        return <CheckCircle size={16} className="text-green-600" />;
      case AGENT_STATUS.FAILED:
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getDuration = (task) => {
    const duration = (task.endTime || Date.now()) - task.startTime;
    if (duration < 1000) return '<1s';
    if (duration < 60000) return `${Math.round(duration / 1000)}s`;
    return `${Math.round(duration / 60000)}m`;
  };

  return (
    <div className="space-y-2">
      {/* Controls */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center space-x-2">
          <label className="text-xs font-medium text-gray-600">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs p-1 border rounded"
          >
            <option value="recent">Recent</option>
            <option value="status">Status</option>
            <option value="duration">Duration</option>
          </select>
        </div>

        <button
          onClick={clearCompleted}
          className="text-xs px-2 py-1 text-gray-600 hover:text-gray-900 border rounded hover:bg-gray-100 transition-colors"
        >
          Clear Completed
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-2 max-h-screen overflow-y-auto">
        {sortedTasks.map((task) => (
          <div
            key={task.id}
            className="border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
          >
            {/* Task Header */}
            <button
              onClick={() =>
                setExpandedTaskId(expandedTaskId === task.id ? null : task.id)
              }
              className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1">
                {getStatusIcon(task.status)}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {task.taskDescription}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(task.startTime).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 ml-2">
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {getDuration(task)}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium bg-${getStatusColor(
                    task.status
                  )}-100 text-${getStatusColor(task.status)}-800`}
                >
                  {getStatusLabel(task.status)}
                </span>
                <Eye
                  size={16}
                  className="text-gray-400"
                  style={{
                    transform:
                      expandedTaskId === task.id
                        ? 'rotate(0deg)'
                        : 'rotate(-90deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </div>
            </button>

            {/* Task Details */}
            {expandedTaskId === task.id && (
              <div className="border-t p-3 bg-gray-50 space-y-3">
                {/* Messages */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">
                    Messages ({task.messages?.length || 0})
                  </h4>
                  <AgentStreamingOutput task={task} />
                </div>

                {/* Tool Results */}
                {task.toolResults && task.toolResults.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">
                      Tool Results ({task.toolResults.length})
                    </h4>
                    <div className="space-y-2">
                      {task.toolResults.map((result, idx) => (
                        <details key={idx} className="text-xs">
                          <summary className="cursor-pointer font-medium text-gray-700 hover:underline">
                            {result.tool} - {new Date(result.timestamp).toLocaleTimeString()}
                          </summary>
                          <pre className="mt-1 p-2 bg-white border rounded text-gray-700 text-xs overflow-auto">
                            {typeof result.result === 'string'
                              ? result.result
                              : JSON.stringify(result.result, null, 2)}
                          </pre>
                        </details>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error if present */}
                {task.error && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    <span className="font-medium">Error:</span> {task.error}
                  </div>
                )}

                {/* Model Info */}
                <div className="text-xs text-gray-600 p-2 bg-white rounded border">
                  <span className="font-medium">Model:</span> {task.model}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AgentTaskManager;
