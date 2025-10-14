/**
 * Enhanced JWT Authentication System with Access & Refresh Tokens
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

// Storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';
const TOKEN_EXPIRY_KEY = 'token_expiry';

// Token refresh threshold (refresh when token expires in 5 minutes)
const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

class AuthManager {
  constructor() {
    this.isRefreshing = false;
    this.failedQueue = [];
    this.setupInterceptors();
  }

  /**
   * Setup automatic token refresh
   */
  setupInterceptors() {
    // Check token expiry every minute
    this.intervalId = setInterval(() => {
      this.checkTokenExpiry();
    }, 60 * 1000);
  }

  /**
   * Check if token needs refresh
   */
  async checkTokenExpiry() {
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryTime) return;

    const timeUntilExpiry = parseInt(expiryTime) - Date.now();
    
    if (timeUntilExpiry <= REFRESH_THRESHOLD && timeUntilExpiry > 0) {
      await this.refreshToken();
    } else if (timeUntilExpiry <= 0) {
      // Token has expired
      this.logout();
    }
  }

  /**
   * Enhanced API fetch with automatic token refresh
   */
  async apiFetch(path, options = {}) {
    // First, check if we need to refresh the token
    await this.checkTokenExpiry();

    const headers = Object.assign({}, options.headers || {});
    headers['Accept'] = headers['Accept'] || 'application/json';
    
    // Don't set Content-Type for FormData - let browser set it with boundary
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const accessToken = this.getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const fetchOptions = Object.assign({}, options);
    if (fetchOptions.body && typeof fetchOptions.body === 'object' && !(fetchOptions.body instanceof FormData)) {
      fetchOptions.body = JSON.stringify(fetchOptions.body);
    }

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...fetchOptions,
        headers,
      });

      // Handle 401 Unauthorized - attempt token refresh
      if (response.status === 401 && accessToken && !path.includes('/auth/')) {
        try {
          await this.refreshToken();
          // Retry the original request with new token
          const newAccessToken = this.getAccessToken();
          if (newAccessToken) {
            headers['Authorization'] = `Bearer ${newAccessToken}`;
            const retryResponse = await fetch(`${API_BASE}${path}`, {
              ...fetchOptions,
              headers,
            });
            return this.handleResponse(retryResponse);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          this.logout();
          throw new Error('Authentication failed. Please log in again.');
        }
      }

      return this.handleResponse(response);
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  }

  /**
   * Handle API response
   */
  async handleResponse(response) {
    let body = null;
    const contentType = response.headers.get('content-type') || '';
    
    try {
      if (contentType.includes('application/json')) {
        body = await response.json();
      } else {
        const text = await response.text();
        try { 
          body = JSON.parse(text); 
        } catch (e) { 
          body = text; 
        }
      }
    } catch (e) {
      try { 
        body = await response.text(); 
      } catch (err) { 
        body = null; 
      }
    }

    if (!response.ok) {
      const message = (body && (body.message || body.error)) || response.statusText || 'Request failed';
      const err = new Error(message);
      err.status = response.status;
      err.body = body;
      throw err;
    }

    return body;
  }

  /**
   * Login with credentials
   */
  async login(email, password) {
    try {
      const url = `${API_BASE}/api/login`;
      console.log('🔐 Attempting login to:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('🔐 Login response status:', response.status);
      const data = await this.handleResponse(response);
      
      if (data.access_token && data.refresh_token) {
        // New JWT format
        this.saveTokens(data.access_token, data.refresh_token, data.expires_in);
        this.saveUser(data.user);
        this.notifyAuthChange();
        return data;
      } else if (data.token && data.user) {
        // Backward compatibility with old format
        this.saveTokens(data.token, data.token, 3600); // Use token as both access and refresh for now
        this.saveUser(data.user);
        this.notifyAuthChange();
        return data;
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(userData) {
    try {
      const response = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await this.handleResponse(response);
      
      if (data.access_token && data.refresh_token) {
        // New JWT format
        this.saveTokens(data.access_token, data.refresh_token, data.expires_in);
        this.saveUser(data.user);
        this.notifyAuthChange();
        return data;
      } else if (data.token && data.user) {
        // Legacy format - convert to JWT format for consistency
        console.warn('⚠️ Using legacy token format. Consider updating backend to return JWT tokens.');
        this.saveTokens(data.token, data.token, 3600);
        this.saveUser(data.user);
        this.notifyAuthChange();
        return data;
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken() {
    if (this.isRefreshing) {
      // If already refreshing, wait for it to complete
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      throw new Error('No refresh token available');
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });

      const data = await this.handleResponse(response);
      
      if (data.access_token) {
        this.saveTokens(
          data.access_token, 
          data.refresh_token || refreshToken, 
          data.expires_in
        );
        
        // Process queued requests
        this.failedQueue.forEach(({ resolve }) => resolve());
        this.failedQueue = [];
        
        return data.access_token;
      } else {
        throw new Error('Invalid refresh response');
      }
    } catch (error) {
      // Process failed requests
      this.failedQueue.forEach(({ reject }) => reject(error));
      this.failedQueue = [];
      
      this.logout();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    const accessToken = this.getAccessToken();
    
    if (accessToken) {
      try {
        await fetch(`${API_BASE}/api/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
        // Continue with local logout even if server logout fails
      }
    }

    this.clearAuth();
  }

  /**
   * Save tokens to localStorage
   */
  saveTokens(accessToken, refreshToken, expiresIn = 3600) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    
    // Calculate expiry time (default 1 hour if not provided)
    const expiryTime = Date.now() + (expiresIn * 1000);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  }

  /**
   * Save user data
   */
  saveUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  /**
   * Get access token
   */
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Get refresh token
   */
  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Get user data
   */
  getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const accessToken = this.getAccessToken();
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
    
    if (!accessToken || !expiryTime) return false;
    
    // Check if token is not expired (with some buffer)
    return parseInt(expiryTime) > Date.now();
  }

  /**
   * Clear all authentication data
   */
  clearAuth() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    
    // Clear the interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.notifyAuthChange();
  }

  /**
   * Notify other parts of the app about auth changes
   */
  notifyAuthChange() {
    try { 
      window.dispatchEvent(new Event('authChanged')); 
    } catch (e) { 
      // noop in non-browser env 
    }
  }

  /**
   * Get token expiry information
   */
  getTokenExpiry() {
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryTime) return null;
    
    const expiry = parseInt(expiryTime);
    const now = Date.now();
    const timeUntilExpiry = expiry - now;
    
    return {
      expiryTime: expiry,
      timeUntilExpiry,
      isExpired: timeUntilExpiry <= 0,
      willExpireSoon: timeUntilExpiry <= REFRESH_THRESHOLD,
    };
  }

  /**
   * Manually trigger token refresh
   */
  async forceRefresh() {
    return await this.refreshToken();
  }
}

// Create singleton instance
const authManager = new AuthManager();

// Export the methods for backward compatibility
export const apiFetch = (path, options) => authManager.apiFetch(path, options);
export const login = (email, password) => authManager.login(email, password);
export const register = (userData) => authManager.register(userData);
export const logout = () => authManager.logout();
export const refreshToken = () => authManager.refreshToken();
export const getUser = () => authManager.getUser();
export const getAccessToken = () => authManager.getAccessToken();
export const getRefreshToken = () => authManager.getRefreshToken();
export const isAuthenticated = () => authManager.isAuthenticated();
export const clearAuth = () => authManager.clearAuth();
export const getTokenExpiry = () => authManager.getTokenExpiry();
export const forceRefresh = () => authManager.forceRefresh();

// For backward compatibility with existing code
export const saveAuth = (token, user) => {
  if (typeof token === 'object' && token.access_token) {
    authManager.saveTokens(token.access_token, token.refresh_token, token.expires_in);
  } else {
    // Fallback for old token format
    localStorage.setItem('api_token', token);
  }
  authManager.saveUser(user);
  authManager.notifyAuthChange();
};

export const getAuthToken = () => authManager.getAccessToken() || localStorage.getItem('api_token');

// Export the auth manager instance for advanced usage
export { authManager };

export default {
  apiFetch,
  login,
  register,
  logout,
  refreshToken,
  getUser,
  getAccessToken,
  getRefreshToken,
  isAuthenticated,
  clearAuth,
  getTokenExpiry,
  forceRefresh,
  saveAuth,
  getAuthToken,
  authManager,
};