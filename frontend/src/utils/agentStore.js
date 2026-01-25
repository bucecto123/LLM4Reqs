/**
 * Agent State Store
 * Manages agent execution history, tool results, and state
 */

class AgentStore {
  constructor() {
    this.tasks = new Map(); // taskId -> task state
    this.history = [];
    this.listeners = [];
  }

  /**
   * Create a new agent task
   * @param {string} taskId
   * @param {Object} taskData
   */
  createTask(taskId, taskData) {
    const task = {
      id: taskId,
      status: 'pending', // pending, running, completed, failed, cancelled
      startTime: Date.now(),
      endTime: null,
      messages: [],
      toolResults: [],
      error: null,
      ...taskData,
    };
    this.tasks.set(taskId, task);
    this.notify();
    return task;
  }

  /**
   * Update task status
   * @param {string} taskId
   * @param {string} status
   */
  updateTaskStatus(taskId, status) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        task.endTime = Date.now();
      }
      this.notify();
    }
  }

  /**
   * Add a message to task
   * @param {string} taskId
   * @param {Object} message
   */
  addMessage(taskId, message) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.messages.push({
        timestamp: Date.now(),
        ...message,
      });
      this.notify();
    }
  }

  /**
   * Add tool result
   * @param {string} taskId
   * @param {string} toolName
   * @param {Object} result
   */
  addToolResult(taskId, toolName, result) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.toolResults.push({
        tool: toolName,
        timestamp: Date.now(),
        result,
      });
      this.notify();
    }
  }

  /**
   * Set task error
   * @param {string} taskId
   * @param {string} error
   */
  setTaskError(taskId, error) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.error = error;
      task.status = 'failed';
      task.endTime = Date.now();
      this.notify();
    }
  }

  /**
   * Get task by ID
   * @param {string} taskId
   */
  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks for a project
   * @param {string} projectId
   */
  getProjectTasks(projectId) {
    return Array.from(this.tasks.values()).filter(
      (task) => task.projectId === projectId
    );
  }

  /**
   * Archive task to history
   * @param {string} taskId
   */
  archiveTask(taskId) {
    const task = this.tasks.get(taskId);
    if (task) {
      this.history.push(task);
      this.tasks.delete(taskId);
      this.notify();
    }
  }

  /**
   * Clear completed tasks
   */
  clearCompleted() {
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'failed') {
        this.archiveTask(taskId);
      }
    }
  }

  /**
   * Subscribe to store changes
   * @param {Function} listener
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  notify() {
    this.listeners.forEach((listener) => {
      listener({
        tasks: Array.from(this.tasks.values()),
        history: this.history,
      });
    });
  }
}

// Global store instance
const agentStore = new AgentStore();

export default agentStore;
