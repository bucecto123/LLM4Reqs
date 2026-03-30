import { apiFetch } from "../utils/auth";

/**
 * Service to handle Story Graph operations
 */
export const graphService = {
  /**
   * Get the story graph for a project
   * Triggers generation if not cached
   * @param {string|number} projectId
   * @returns {Promise<Object>} The story map data structure
   */
  getStoryGraph: async (projectId) => {
    // The endpoint returns { cached: boolean, graph: object }
    // We only need the graph object for the renderer
    const response = await apiFetch(`/api/projects/${projectId}/story-graph`);
    return response.graph || response; // Handle different potential response structures
  },

  /**
   * Clear the cached story graph to force regeneration
   * @param {string|number} projectId
   */
  clearCache: async (projectId) => {
    return await apiFetch(`/api/projects/${projectId}/story-graph/cache`, {
      method: "DELETE",
    });
  },
};
