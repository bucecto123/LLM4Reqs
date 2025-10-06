// Minimal API helper for the frontend to call the Laravel backend
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

export async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  headers['Content-Type'] = headers['Content-Type'] || 'application/json';

  const token = localStorage.getItem('api_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = (body && body.message) || (body && body.error) || JSON.stringify(body) || res.statusText;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

export function saveAuth(token, user) {
  localStorage.setItem('api_token', token);
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

export default {
  apiFetch,
  saveAuth,
  clearAuth,
  getAuthToken,
};
