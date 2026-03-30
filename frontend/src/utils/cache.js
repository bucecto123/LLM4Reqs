/**
 * Simple TTL-based localStorage cache with namespace support.
 */
const CACHE_VERSION = 'v1'; // bump to invalidate all caches

function makeKey(key, namespace) {
  return `${CACHE_VERSION}:${namespace || 'default'}:${key}`;
}

export const cache = {
  /**
   * Set a value in cache with TTL in milliseconds.
   * @param {string} key
   * @param {any} data
   * @param {number} ttlMs — time-to-live in milliseconds (default 5 minutes)
   * @param {string} [namespace]
   */
  set(key, data, ttlMs = 5 * 60 * 1000, namespace = 'default') {
    try {
      const entry = { data, expiresAt: Date.now() + ttlMs };
      localStorage.setItem(makeKey(key, namespace), JSON.stringify(entry));
    } catch (e) {
      // Storage full — silently ignore
    }
  },

  /**
   * Get a value from cache.
   * @param {string} key
   * @param {string} [namespace]
   * @returns {{ data: any, expired: boolean } | null}
   */
  get(key, namespace = 'default') {
    try {
      const raw = localStorage.getItem(makeKey(key, namespace));
      if (!raw) return null;
      const entry = JSON.parse(raw);
      const expired = Date.now() > entry.expiresAt;
      return { data: entry.data, expired };
    } catch (e) {
      return null;
    }
  },

  /**
   * Get data if not expired; returns null if expired or missing.
   * Prefer this for "load from cache, fall back to API" pattern.
   */
  getFresh(key, namespace = 'default') {
    const result = this.get(key, namespace);
    if (!result || result.expired) return null;
    return result.data;
  },

  /**
   * Invalidate all keys in a namespace.
   */
  invalidateNamespace(namespace) {
    try {
      const prefix = `${CACHE_VERSION}:${namespace}:`;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith(prefix)) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
  },

  /**
   * Invalidate a specific key.
   */
  invalidate(key, namespace = 'default') {
    try {
      localStorage.removeItem(makeKey(key, namespace));
    } catch (e) {}
  },
};

export default cache;
