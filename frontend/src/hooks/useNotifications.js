import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "../utils/api.js";
import { cache } from "../utils/cache.js";
import perfMonitor from '../utils/performanceMonitor.js';

const POLL_INTERVAL = 30000; // 30 seconds

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const pollTimerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      // Try cache first for instant UI (30-second TTL)
      const cached = cache.getFresh("notifications_list", "notifications");
      if (cached && Array.isArray(cached)) {
        const unread = cached.filter((n) => !n.read_at).length;
        setNotifications(cached);
        setUnreadCount(unread);
      }

      // Always refresh in background
      const data = await perfMonitor.timed("GET /api/notifications", () =>
        apiFetch("/api/notifications?per_page=10")
      );
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count ?? 0);
      cache.set("notifications_list", data.notifications || [], 30 * 1000, "notifications");
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, []);

  const markAsRead = useCallback(async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "PUT" });
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiFetch("/api/notifications/read-all", { method: "PUT" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  // Poll for new notifications
  useEffect(() => {
    load();
    pollTimerRef.current = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(pollTimerRef.current);
  }, [load]);

  return { notifications, unreadCount, isLoading, showDropdown, setShowDropdown, dropdownRef, markAsRead, markAllAsRead };
}
