import { describe, it, expect } from 'vitest';
import { timeAgo } from '../../src/utils/time';

describe('timeAgo utility', () => {
  it('should return "just now" for dates within the last minute', () => {
    const now = new Date();
    const target = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
    expect(timeAgo(target, now)).toBe('just now');
  });

  it('should return minutes ago for dates within the last hour', () => {
    const now = new Date();
    const target = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
    expect(timeAgo(target, now)).toBe('5m ago');
  });

  it('should return hours ago for dates within the last day', () => {
    const now = new Date();
    const target = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
    expect(timeAgo(target, now)).toBe('3h ago');
  });

  it('should return days ago for dates within the last week', () => {
    const now = new Date();
    const target = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    expect(timeAgo(target, now)).toBe('2d ago');
  });

  it('should return formatted date string for dates older than a week', () => {
    const now = new Date('2026-04-10T12:00:00Z');
    const target = new Date('2026-03-15T12:00:00Z'); // Almost a month ago
    // Depending on locale, it should be something like "Mar 15"
    // Since toLocaleDateString depends on environment, we can check basic string inclusion
    const result = timeAgo(target, now);
    expect(result).toMatch(/Mar 15|15 Mar/);
  });

  it('should handle empty or null values', () => {
    expect(timeAgo(null)).toBe('');
    expect(timeAgo('')).toBe('');
  });
});
