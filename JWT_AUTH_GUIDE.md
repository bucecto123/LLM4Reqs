# JWT Authentication Implementation Guide

## Overview

This implementation provides a complete JWT authentication system with access and refresh tokens for your React + Laravel application.

## Features

- ✅ **JWT Access & Refresh Tokens**: Secure token-based authentication
- ✅ **Automatic Token Refresh**: Tokens are refreshed before expiration
- ✅ **React Hooks**: Easy-to-use authentication hooks
- ✅ **Context Provider**: Global authentication state management
- ✅ **Error Handling**: Proper error handling and fallbacks
- ✅ **Laravel Sanctum Integration**: Backend powered by Laravel Sanctum
- ✅ **Persistent Sessions**: Tokens stored securely in localStorage
- ✅ **Multi-tab Support**: Authentication state synced across browser tabs

## Quick Start

### 1. Backend Setup

The backend is already configured with enhanced JWT support. Make sure your Laravel application is running.

### 2. Frontend Usage

#### Basic Usage with Hooks

```jsx
import { useAuth } from "./hooks/useAuth";

function MyComponent() {
  const { user, isAuthenticated, login, logout, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

#### Login Form Example

```jsx
import { useLogin } from "./hooks/useAuth";

function LoginForm() {
  const { login, isLoading, error } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      // User will be automatically redirected after successful login
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

#### Protected Routes

```jsx
import { withAuth } from "./hooks/useAuth";

const ProtectedComponent = withAuth(function Dashboard() {
  return <div>This is only visible to authenticated users</div>;
});

// Or use the hook directly
function AnotherProtectedComponent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in to view this content</div>;
  }

  return <div>Protected content</div>;
}
```

#### API Calls

```jsx
import { apiFetch } from "./utils/auth";

async function fetchUserData() {
  try {
    // Tokens are automatically included and refreshed if needed
    const data = await apiFetch("/api/user/profile");
    return data;
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    throw error;
  }
}

// The apiFetch function automatically:
// - Includes the access token in headers
// - Refreshes the token if it's about to expire
// - Retries the request with the new token if it gets a 401
// - Logs out the user if token refresh fails
```

#### Token Management

```jsx
import { useTokenRefresh, useAuthState } from "./hooks/useAuth";

function TokenStatusComponent() {
  const { tokenExpiry, willExpireSoon, timeUntilExpiry } = useAuthState();
  const { refresh, isRefreshing } = useTokenRefresh();

  return (
    <div>
      <p>Token expires in: {Math.floor(timeUntilExpiry / 60000)} minutes</p>
      {willExpireSoon && (
        <button onClick={refresh} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing..." : "Refresh Token"}
        </button>
      )}
    </div>
  );
}
```

## API Endpoints

### Authentication Endpoints

- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/register` - Register new user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout current session
- `POST /api/auth/logout-all` - Logout all sessions
- `GET /api/auth/me` - Get current user info

### Backward Compatibility

The following endpoints are maintained for backward compatibility:

- `POST /api/login`
- `POST /api/register`
- `POST /api/logout`

## Configuration

### Token Expiration

Access tokens expire in 1 hour by default. Refresh tokens expire in 7 days.
You can modify these values in the backend AuthController:

```php
// Create access token (expires in 1 hour)
$accessToken = $user->createToken(
    'access-token',
    ['access'],
    now()->addHour()  // Change this for different expiry
);

// Create refresh token (expires in 7 days)
$refreshToken = $user->createToken(
    'refresh-token',
    ['refresh'],
    now()->addDays(7)  // Change this for different expiry
);
```

### Auto-Refresh Threshold

Tokens are automatically refreshed when they expire within 5 minutes. You can change this in `utils/auth.js`:

```javascript
// Token refresh threshold (refresh when token expires in 5 minutes)
const REFRESH_THRESHOLD = 5 * 60 * 1000; // Change this value
```

## Security Features

### Automatic Token Refresh

- Tokens are refreshed automatically before they expire
- Failed refresh attempts trigger automatic logout
- Concurrent refresh requests are queued to prevent race conditions

### Secure Storage

- Tokens are stored in localStorage
- Automatic cleanup on logout
- Cross-tab synchronization via storage events

### Error Handling

- Automatic retry with refreshed tokens on 401 errors
- Graceful fallback to login screen on authentication failures
- Comprehensive error logging for debugging

## Troubleshooting

### Common Issues

1. **"Invalid refresh token" errors**

   - Check that the backend is properly configured with Sanctum
   - Ensure refresh tokens have the correct abilities (`['refresh']`)

2. **Tokens not persisting across page reloads**

   - Verify localStorage is available in your browser
   - Check for any browser extensions blocking localStorage

3. **Authentication state not syncing across tabs**
   - The system uses the `authChanged` event for cross-tab sync
   - Make sure no other code is interfering with localStorage

### Debug Mode

To enable debug logging, open browser console and run:

```javascript
localStorage.setItem("auth_debug", "true");
```

## Migration from Old System

If you're migrating from the old authentication system:

1. The old `api.js` utility is still supported for backward compatibility
2. Replace `import { apiFetch } from '../utils/api'` with `import { apiFetch } from '../utils/auth'`
3. Replace manual auth state management with the new hooks
4. Update logout calls from `clearAuth()` to `useLogout()` hook

## Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **Secure Headers**: Ensure proper CORS and security headers
3. **Token Rotation**: Consider implementing token rotation for enhanced security
4. **Rate Limiting**: Implement rate limiting on authentication endpoints
5. **Input Validation**: Always validate and sanitize user inputs

## Performance

- Token refresh is throttled to prevent excessive API calls
- Authentication state is cached and only updated when necessary
- Failed requests are queued during token refresh to prevent data loss

This implementation provides a robust, secure, and user-friendly authentication system that handles all the complexities of JWT token management automatically.
