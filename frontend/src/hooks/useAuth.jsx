/**
 * React Hooks for JWT Authentication
 */
import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { 
  authManager, 
  isAuthenticated, 
  getUser, 
  getTokenExpiry,
  login as authLogin,
  register as authRegister,
  logout as authLogout,
  forceRefresh
} from '../utils/auth';

// Auth Context
const AuthContext = createContext(null);

// Auth Provider Component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser());
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(isAuthenticated());

  const updateAuthState = useCallback(() => {
    const authenticated = isAuthenticated();
    const currentUser = getUser();
    
    setIsAuth(authenticated);
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Initial auth state check
    updateAuthState();
    
    // Listen for auth changes
    const handleAuthChange = () => {
      updateAuthState();
    };

    window.addEventListener('authChanged', handleAuthChange);
    
    return () => {
      window.removeEventListener('authChanged', handleAuthChange);
    };
  }, [updateAuthState]);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const result = await authLogin(email, password);
      updateAuthState();
      return result;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    try {
      const result = await authRegister(userData);
      updateAuthState();
      return result;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authLogout();
      updateAuthState();
    } catch (error) {
      // Still clear local auth even if server logout fails
      updateAuthState();
      console.error('Logout error:', error);
    }
  };

  const refresh = async () => {
    try {
      await forceRefresh();
      updateAuthState();
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      updateAuthState();
      return false;
    }
  };

  const value = {
    user,
    isAuthenticated: isAuth,
    isLoading,
    login,
    register,
    logout,
    refresh,
    updateAuthState,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for authentication state
export function useAuthState() {
  const [user, setUser] = useState(getUser());
  const [isAuth, setIsAuth] = useState(isAuthenticated());
  const [tokenExpiry, setTokenExpiry] = useState(getTokenExpiry());

  useEffect(() => {
    const updateState = () => {
      setUser(getUser());
      setIsAuth(isAuthenticated());
      setTokenExpiry(getTokenExpiry());
    };

    // Initial state
    updateState();

    // Listen for changes
    window.addEventListener('authChanged', updateState);
    
    // Update token expiry every minute
    const interval = setInterval(() => {
      setTokenExpiry(getTokenExpiry());
    }, 60000);

    return () => {
      window.removeEventListener('authChanged', updateState);
      clearInterval(interval);
    };
  }, []);

  return {
    user,
    isAuthenticated: isAuth,
    tokenExpiry,
    isExpired: tokenExpiry?.isExpired || false,
    willExpireSoon: tokenExpiry?.willExpireSoon || false,
    timeUntilExpiry: tokenExpiry?.timeUntilExpiry || 0,
  };
}

// Hook for login functionality
export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authLogin(email, password);
      setIsLoading(false);
      return result;
    } catch (err) {
      setError(err.message || 'Login failed');
      setIsLoading(false);
      throw err;
    }
  };

  return {
    login,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

// Hook for registration functionality
export function useRegister() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authRegister(userData);
      setIsLoading(false);
      return result;
    } catch (err) {
      setError(err.message || 'Registration failed');
      setIsLoading(false);
      throw err;
    }
  };

  return {
    register,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

// Hook for logout functionality
export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);

  const logout = async () => {
    setIsLoading(true);
    
    try {
      await authLogout();
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error('Logout error:', error);
    }
  };

  return {
    logout,
    isLoading,
  };
}

// Hook for token refresh
export function useTokenRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const refresh = async () => {
    setIsRefreshing(true);
    
    try {
      await forceRefresh();
      setLastRefresh(new Date());
      setIsRefreshing(false);
      return true;
    } catch (error) {
      setIsRefreshing(false);
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  return {
    refresh,
    isRefreshing,
    lastRefresh,
  };
}

// Higher-order component for protecting routes
export function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, isLoading } = useAuthState();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

export default {
  AuthProvider,
  useAuth,
  useAuthState,
  useLogin,
  useRegister,
  useLogout,
  useTokenRefresh,
  withAuth,
};