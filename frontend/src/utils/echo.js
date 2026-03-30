/**
 * Lazy Echo singleton.
 *
 * laravel-echo + pusher-js (~150KB) are NOT imported until the first
 * WebSocket channel is accessed.  Once initialised, `window.__echo`
 * holds the real Echo instance and this module becomes a transparent
 * passthrough — callers using `echo.channel(...)` etc. need no changes.
 */

let _echo = null;

async function getEcho() {
  if (_echo) return _echo;

  const [{ default: Echo }, { default: Pusher }] = await Promise.all([
    import('laravel-echo'),
    import('pusher-js'),
  ]);

  window.Pusher = Pusher;
  _echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'llm4reqs-reverb-key',
    wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
    wsPort: import.meta.env.VITE_REVERB_PORT || 8081,
    wssPort: import.meta.env.VITE_REVERB_PORT || 8081,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
  });

  window.__echo = _echo;
  return _echo;
}

// Trigger initialisation as soon as this module is imported.
// The Promise is deliberately NOT awaited — Echo initializes in background.
getEcho().catch(console.error);

// Transparent proxy: forward every property access to the real Echo instance
// once it is ready.  While loading, return a no-op stub so the app doesn't crash.
const STUB = {
  channel: () => STUB,
  leaveChannel: () => {},
  listen: () => STUB,
  listenForWhisper: () => STUB,
  here: () => STUB,
  joining: () => STUB,
  leaving: () => STUB,
  notification: () => STUB,
  connect: () => {},
  disconnect: () => {},
};

const echo = new Proxy(STUB, {
  get(_target, prop) {
    if (prop === 'then') return undefined; // allow `await echo` to work
    if (_echo) return _echo[prop];
    // During init, queue the call
    return (...args) => getEcho().then((e) => e[prop](...args));
  },
});

export default echo;
