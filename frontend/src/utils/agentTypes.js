/**
 * Agent Types and Constants
 * Shared type definitions and constants for agent operations
 */

export const AGENT_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

export const MESSAGE_ROLE = {
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL: 'tool',
  SYSTEM: 'system',
};

export const MESSAGE_TYPE = {
  TEXT: 'text',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  THINKING: 'thinking',
  STATUS: 'status',
};

/**
 * @typedef {Object} AgentMessage
 * @property {string} id - Unique message ID
 * @property {string} role - MESSAGE_ROLE enum
 * @property {string} type - MESSAGE_TYPE enum
 * @property {string} content - Message content
 * @property {number} timestamp - Unix timestamp
 * @property {string} [toolName] - Name of tool if type is tool_call/tool_result
 * @property {Object} [toolInput] - Tool parameters if tool_call
 * @property {Object} [toolOutput] - Tool result if tool_result
 */

/**
 * @typedef {Object} AgentTask
 * @property {string} id - Unique task ID
 * @property {string} status - AGENT_STATUS enum
 * @property {string} taskDescription - Original task
 * @property {string} projectId - Associated project
 * @property {number} startTime - Unix timestamp
 * @property {number} [endTime] - Unix timestamp when completed
 * @property {Array<AgentMessage>} messages - Conversation history
 * @property {Array<Object>} toolResults - Executed tool results
 * @property {string} [error] - Error message if failed
 * @property {string} model - LLM model used
 */

/**
 * @typedef {Object} AgentTool
 * @property {string} name - Tool identifier
 * @property {string} description - What the tool does
 * @property {Object} schema - JSON schema for tool parameters
 * @property {Array<string>} categories - Tool categories (e.g., 'analysis', 'extraction')
 */

/**
 * Agent tool categories
 */
export const TOOL_CATEGORIES = {
  ANALYSIS: 'analysis',
  EXTRACTION: 'extraction',
  VALIDATION: 'validation',
  GENERATION: 'generation',
  CONFLICT_DETECTION: 'conflict_detection',
  TRANSFORMATION: 'transformation',
  EXPORT: 'export',
};

/**
 * Common tools that agents may use
 */
export const COMMON_TOOLS = {
  EXTRACT_REQUIREMENTS: 'extract_requirements',
  VALIDATE_REQUIREMENTS: 'validate_requirements',
  GENERATE_REQUIREMENTS: 'generate_requirements',
  DETECT_CONFLICTS: 'detect_conflicts',
  ANALYZE_DOCUMENT: 'analyze_document',
  EXPORT_REQUIREMENTS: 'export_requirements',
  BUILD_KNOWLEDGE_BASE: 'build_knowledge_base',
  QUERY_KNOWLEDGE_BASE: 'query_knowledge_base',
};

/**
 * Create a new agent message
 * @param {string} role - MESSAGE_ROLE
 * @param {string} content - Message content
 * @param {Object} options - Additional properties
 * @returns {AgentMessage}
 */
export function createMessage(role, content, options = {}) {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role,
    type: options.type || MESSAGE_TYPE.TEXT,
    content,
    timestamp: Date.now(),
    ...options,
  };
}

/**
 * Create a tool call message
 * @param {string} toolName - Name of the tool
 * @param {Object} toolInput - Tool parameters
 * @returns {AgentMessage}
 */
export function createToolCallMessage(toolName, toolInput) {
  return createMessage('assistant', `Calling tool: ${toolName}`, {
    type: MESSAGE_TYPE.TOOL_CALL,
    toolName,
    toolInput,
  });
}

/**
 * Create a tool result message
 * @param {string} toolName - Name of the tool
 * @param {Object} toolOutput - Tool result
 * @returns {AgentMessage}
 */
export function createToolResultMessage(toolName, toolOutput) {
  return createMessage('tool', `Result from ${toolName}`, {
    type: MESSAGE_TYPE.TOOL_RESULT,
    toolName,
    toolOutput,
  });
}

/**
 * Create a thinking message
 * @param {string} content - Thinking content
 * @returns {AgentMessage}
 */
export function createThinkingMessage(content) {
  return createMessage('assistant', content, {
    type: MESSAGE_TYPE.THINKING,
  });
}

/**
 * Get status display label
 * @param {string} status - AGENT_STATUS
 * @returns {string}
 */
export function getStatusLabel(status) {
  const labels = {
    [AGENT_STATUS.PENDING]: 'Pending',
    [AGENT_STATUS.RUNNING]: 'Running',
    [AGENT_STATUS.COMPLETED]: 'Completed',
    [AGENT_STATUS.FAILED]: 'Failed',
    [AGENT_STATUS.CANCELLED]: 'Cancelled',
  };
  return labels[status] || status;
}

/**
 * Get status color for UI
 * @param {string} status - AGENT_STATUS
 * @returns {string}
 */
export function getStatusColor(status) {
  const colors = {
    [AGENT_STATUS.PENDING]: 'yellow',
    [AGENT_STATUS.RUNNING]: 'blue',
    [AGENT_STATUS.COMPLETED]: 'green',
    [AGENT_STATUS.FAILED]: 'red',
    [AGENT_STATUS.CANCELLED]: 'gray',
  };
  return colors[status] || 'gray';
}
