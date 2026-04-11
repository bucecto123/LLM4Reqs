import { describe, it, expect, beforeEach, vi } from 'vitest';
import cache from '../../src/utils/cache';

describe('cache utility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets and gets data correctly', () => {
    cache.set('testKey', { hello: 'world' });
    const result = cache.get('testKey');
    expect(result.data).toEqual({ hello: 'world' });
    expect(result.expired).toBe(false);
  });

  it('returns null for missing key', () => {
    expect(cache.get('missing')).toBeNull();
  });

  it('returns expired true when time has passed', () => {
    cache.set('expireKey', 'test', 100); // 100ms TTL
    vi.advanceTimersByTime(200);
    const result = cache.get('expireKey');
    
    expect(result).not.toBeNull();
    expect(result.expired).toBe(true);
  });

  it('getFresh returns null if expired', () => {
    cache.set('expireKey', 'test', 100);
    vi.advanceTimersByTime(200);
    expect(cache.getFresh('expireKey')).toBeNull();
  });
});
