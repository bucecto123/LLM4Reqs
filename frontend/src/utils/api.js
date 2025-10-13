// Minimal API helper for the frontend to call the Laravel backend
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

export async function apiFetch(path, options = {}) {
  const headers = Object.assign({}, options.headers || {});
  // default headers
  headers['Accept'] = headers['Accept'] || 'application/json';
  headers['Content-Type'] = headers['Content-Type'] || 'application/json';

  const token = localStorage.getItem('api_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // If body is a plain object, stringify it (but don't stringify FormData)
  const fetchOptions = Object.assign({}, options);
  if (fetchOptions.body && typeof fetchOptions.body === 'object' && !(fetchOptions.body instanceof FormData)) {
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  // Try to parse JSON body safely even if content-type is missing
  let body = null;
  const contentType = res.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      body = await res.json();
    } else {
      const text = await res.text();
      try { body = JSON.parse(text); } catch (e) { body = text; }
    }
  } catch (e) {
    // parsing failed, fallback to text
    try { body = await res.text(); } catch (err) { body = null; }
  }

  if (!res.ok) {
    const message = (body && (body.message || body.error)) || res.statusText || 'Request failed';
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

export function saveAuth(token, user) {
  // token may be a string or an object { token: '...', access_token: '...' }
  let tokenStr = token;
  if (token && typeof token === 'object') {
    tokenStr = token.token || token.access_token || token; 
  }

  if (tokenStr) localStorage.setItem('api_token', tokenStr);
  if (user) localStorage.setItem('user', JSON.stringify(user));
  // notify the app that auth changed (useful for other tabs/components)
  try { window.dispatchEvent(new Event('authChanged')); } catch (e) { /* noop in non-browser env */ }
}

export function clearAuth() {
  localStorage.removeItem('api_token');
  localStorage.removeItem('user');
  try { window.dispatchEvent(new Event('authChanged')); } catch (e) { /* noop in non-browser env */ }
}

export function getAuthToken() {
  return localStorage.getItem('api_token');
}

export function getUser() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export default {
  apiFetch,
  saveAuth,
  clearAuth,
  getAuthToken,
  getUser,
};
