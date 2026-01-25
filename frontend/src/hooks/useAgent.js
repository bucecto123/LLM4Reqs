/**
 * useAgent Hook
 * Manages agent task lifecycle and state
 */

import { useState, useCallback, useEffect } from 'react';
import agentStore from '../utils/agentStore.js';
import {
  executeAgentTask,
  getAvailableTools,
  executeTool,
} from '../utils/agentApi.js';
import { createMessage, MESSAGE_TYPE } from '../utils/agentTypes.js';

export function useAgent() {
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [availableTools, setAvailableTools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = agentStore.subscribe(({ tasks: allTasks }) => {
      setTasks(allTasks);
    });

    return unsubscribe;
  }, []);

  // Load available tools on mount
  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = useCallback(async () => {
    try {
      const tools = await getAvailableTools();
      setAvailableTools(tools);
    } catch (err) {
      console.error('Error loading tools:', err);
      setError('Failed to load available tools');
    }
  }, []);

  /**
   * Execute an agent task
   * @param {Object} params
   * @param {string} params.task - Task description
   * @param {string} params.projectId - Project ID
   * @param {string} params.model - Model to use
   * @param {Array} params.tools - Tools the agent can use
   */
  const runTask = useCallback(
    async ({
      task,
      projectId,
      model = 'groq/mixtral-8x7b-32768',
      tools = [],
    }) => {
      const taskId = `task_${Date.now()}`;
      setLoading(true);
      setError(null);

      try {
        // Create task in store
        agentStore.createTask(taskId, {
          taskDescription: task,
          projectId,
          model,
          tools,
          status: 'running',
        });

        setCurrentTask(taskId);

        // Add user message
        agentStore.addMessage(
          taskId,
          createMessage('user', task)
        );

        // Update status
        agentStore.updateTaskStatus(taskId, 'running');

        // Execute task with streaming
        await executeAgentTask({
          task,
          projectId,
          model,
          tools,
          onStream: (data) => {
            if (data.type === 'message') {
              agentStore.addMessage(
                taskId,
                createMessage('assistant', data.content, {
                  type: data.messageType || MESSAGE_TYPE.TEXT,
                })
              );
            } else if (data.type === 'tool_call') {
              agentStore.addMessage(
                taskId,
                createMessage('assistant', `Calling ${data.tool}`, {
                  type: MESSAGE_TYPE.TOOL_CALL,
                  toolName: data.tool,
                  toolInput: data.input,
                })
              );
            } else if (data.type === 'tool_result') {
              agentStore.addMessage(
                taskId,
                createMessage('tool', 'Tool result', {
                  type: MESSAGE_TYPE.TOOL_RESULT,
                  toolName: data.tool,
                  toolOutput: data.result,
                })
              );
              agentStore.addToolResult(taskId, data.tool, data.result);
            } else if (data.type === 'status') {
              agentStore.updateTaskStatus(taskId, data.status);
            }
          },
        });

        agentStore.updateTaskStatus(taskId, 'completed');
      } catch (err) {
        console.error('Task execution error:', err);
        agentStore.setTaskError(taskId, err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Execute a specific tool
   * @param {string} toolName - Tool to execute
   * @param {Object} params - Tool parameters
   */
  const runTool = useCallback(
    async (toolName, params) => {
      try {
        const result = await executeTool(toolName, params);
        if (currentTask) {
          agentStore.addToolResult(currentTask, toolName, result);
        }
        return result;
      } catch (err) {
        console.error(`Tool execution error (${toolName}):`, err);
        setError(err.message);
        throw err;
      }
    },
    [currentTask]
  );

  /**
   * Get a specific task
   * @param {string} taskId
   */
  const getTask = useCallback((taskId) => {
    return agentStore.getTask(taskId);
  }, []);

  /**
   * Get tasks for a project
   * @param {string} projectId
   */
  const getProjectTasks = useCallback((projectId) => {
    return agentStore.getProjectTasks(projectId);
  }, []);

  /**
   * Clear completed tasks
   */
  const clearCompleted = useCallback(() => {
    agentStore.clearCompleted();
  }, []);

  /**
   * Clear all errors
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    tasks,
    currentTask,
    availableTools,
    loading,
    error,

    // Methods
    runTask,
    runTool,
    getTask,
    getProjectTasks,
    clearPleted,
    clearError,
    loadTools,
  };
}

export default useAgent;
