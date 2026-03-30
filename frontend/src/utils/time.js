/**
 * Shared time formatting utilities.
 */

/**
 * Format a date string as a human-readable relative time label.
 * E.g. "just now", "5m ago", "3h ago", "2d ago", "Mar 15" (>7 days)
 * @param {string|Date} dateStr
 * @param {Date|string} [refDate] — reference date (defaults to now)
 * @returns {string}
 */
export function timeAgo(dateStr, refDate = new Date()) {
  if (!dateStr) return "";
  const diff = refDate.getTime() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
