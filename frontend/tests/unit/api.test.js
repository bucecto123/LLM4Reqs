import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiFetch } from '../../src/utils/api';

describe('api utility', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it('adds authorization header if token exists', async () => {
    localStorage.setItem('api_token', 'test-token');
    
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true })
    });
    
    await apiFetch('/test');
    
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({
        'Authorization': 'Bearer test-token'
      })
    }));
  });

  it('automatically stringifies JSON objects for the body', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({})
    });
    
    await apiFetch('/post', { method: 'POST', body: { a: 1 } });
    
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      body: '{"a":1}'
    }));
  });
});
