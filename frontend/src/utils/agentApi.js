/**
 * Agent API Service
 * Handles communication with LLM backend for agentic operations
 */

import { apiFetch } from './api.js';
import perfMonitor from './performanceMonitor.js';

const LLM_API_BASE = import.meta.env.VITE_LLM_API_BASE || 'http://localhost:8000';

/**
 * Execute an agent task with streaming support
 * @param {Object} params - Task parameters
 * @param {string} params.task - The task description
 * @param {string} params.projectId - Associated project ID
 * @param {string} params.model - Model to use
 * @param {Array} params.tools - Available tools for the agent
 * @param {Function} params.onStream - Callback for streaming chunks
 * @returns {Promise<Object>} Final agent response
 */
export async function executeAgentTask({
  task,
  projectId,
  model = 'groq/mixtral-8x7b-32768',
  tools = [],
  onStream = null,
}) {
  try {
    const response = await perfMonitor.timed("POST /api/agent/execute", async () =>
      fetch(`${LLM_API_BASE}/api/agent/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        task,
        project_id: projectId,
        model,
        tools,
      }),
    })
    );

    if (!response.ok) {
      throw new Error(`Agent execution failed: ${response.statusText}`);
    }

    // Handle streaming response
    if (onStream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const result = { status: 'pending', messages: [] };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'status') result.status = data.status;
              if (data.type === 'message') result.messages.push(data.content);
              onStream(data);
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      return result;
    }

    return await response.json();
  } catch (error) {
    console.error('Agent execution error:', error);
    throw error;
  }
}

/**
 * Get available tools for agents
 * @returns {Promise<Array>} List of available tools
 */
export async function getAvailableTools() {
  try {
    const response = await perfMonitor.timed("GET /api/agent/tools", () =>
      fetch(`${LLM_API_BASE}/api/agent/tools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );

    if (!response.ok) {
      throw new Error('Failed to fetch tools');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching tools:', error);
    return [];
  }
}

/**
 * Execute a specific tool
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} params - Tool parameters
 * @returns {Promise<Object>} Tool execution result
 */
export async function executeTool(toolName, params) {
  try {
    const response = await perfMonitor.timed(`POST /api/agent/tools/${toolName}/execute`, () =>
      fetch(`${LLM_API_BASE}/api/agent/tools/${toolName}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })
    );

    if (!response.ok) {
      throw new Error(`Tool execution failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    throw error;
  }
}

/**
 * Get agent execution history
 * @param {string} projectId - Project ID to get history for
 * @returns {Promise<Array>} List of past executions
 */
export async function getAgentHistory(projectId) {
  try {
    const response = await perfMonitor.timed(`GET /api/agent/history`, () =>
      fetch(
        `${LLM_API_BASE}/api/agent/history?project_id=${projectId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    );

    if (!response.ok) {
      throw new Error('Failed to fetch history');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching history:', error);
    return [];
  }
}

/**
 * Cancel an ongoing agent task
 * @param {string} taskId - ID of the task to cancel
 * @returns {Promise<void>}
 */
export async function cancelAgentTask(taskId) {
  try {
    await perfMonitor.timed(`POST /api/agent/tasks/${taskId}/cancel`, () =>
      fetch(`${LLM_API_BASE}/api/agent/tasks/${taskId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );
  } catch (error) {
    console.error('Error canceling task:', error);
    throw error;
  }
}

export default {
  executeAgentTask,
  getAvailableTools,
  executeTool,
  getAgentHistory,
  cancelAgentTask,
};
