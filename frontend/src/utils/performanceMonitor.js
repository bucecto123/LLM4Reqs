// Performance monitoring singleton for the LLM4Reqs app

const MAX_HISTORY = 50;

const _perfMonitor = {
  _history: [],
  _pending: new Map(), // key: method+path, value: Promise

  /**
   * Grade a duration in ms
   */
  _grade(durationMs) {
    if (durationMs < 500) return "\u{1F680}";
    if (durationMs < 1000) return "\u26A1";
    return "\uD83D\uDC0C";
  },

  /**
   * Time an async operation and log the result
   */
  async timed(label, fn) {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = Math.round(performance.now() - start);
      this._log({ label, durationMs: duration, success: true });
      return result;
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      this._log({ label, durationMs: duration, success: false, error: err.message });
      throw err;
    }
  },

  /**
   * Record an entry
   */
  _log(entry) {
    const graded = { ...entry, grade: this._grade(entry.durationMs), timestamp: Date.now() };
    this._history.unshift(graded);
    if (this._history.length > MAX_HISTORY) this._history.pop();
    console.log(
      `%c[PERF]%c ${graded.grade} ${graded.label} %c${graded.durationMs}ms`,
      "color: #6366f1; font-weight: bold",
      "color: #10b981; font-weight: bold",
      "color: #94a3b8",
      graded.success ? "" : ` %c\u26A0 ${graded.error}`
    );
    window.dispatchEvent(new CustomEvent("perf:entry", { detail: graded }));
  },

  /**
   * Wrap an apiFetch call for deduplication
   */
  dedupe(key, fn) {
    if (this._pending.has(key)) return this._pending.get(key);
    const promise = fn().finally(() => this._pending.delete(key));
    this._pending.set(key, promise);
    return promise;
  },

  getHistory() {
    return [...this._history];
  },

  clearHistory() {
    this._history = [];
  },
};

export const perfMonitor = Object.freeze(_perfMonitor);
export default perfMonitor;
