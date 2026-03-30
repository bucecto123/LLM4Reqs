import React, { useState, useEffect, useCallback } from 'react';

/**
 * DevTools performance overlay.
 * - Hidden by default; toggled via Ctrl+Shift+P
 * - Shows a live list of recent API calls with timing grades (🚀/⚡/🐌)
 * - Also shows the current localStorage cache status
 */
const MAX_ENTRIES = 15;

export const PerfOverlay = () => {
  const [visible, setVisible] = useState(false);
  const [entries, setEntries] = useState([]);
  const [activeTab, setActiveTab] = useState('api'); // 'api' | 'cache'

  // Toggle with Ctrl+Shift+P
  const handleKeyDown = useCallback((e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      setVisible((v) => !v);
    }
    if (e.key === 'Escape' && visible) {
      setVisible(false);
    }
  }, [visible]);

  // Listen to perf:entry events from performanceMonitor.js
  useEffect(() => {
    const handler = (e) => {
      setEntries((prev) => [e.detail, ...prev].slice(0, MAX_ENTRIES));
    };
    window.addEventListener('perf:entry', handler);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('perf:entry', handler);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!visible) return null;

  const gradeColor = (grade) => {
    if (grade === '🚀') return 'text-emerald-400';
    if (grade === '⚡') return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}.${d.getMilliseconds().toString().padStart(3,'0')}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 99999,
        width: 480,
        maxHeight: '60vh',
        overflowY: 'auto',
        background: 'rgba(15,15,20,0.96)',
        border: '1px solid rgba(99,102,241,0.4)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: 11,
        color: '#e2e8f0',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(99,102,241,0.3)',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['api', 'cache'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '2px 10px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: activeTab === tab ? 'rgba(99,102,241,0.7)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'rgba(148,163,184,0.7)',
              }}
            >
              {tab === 'api' ? '📡 API' : '💾 Cache'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'rgba(148,163,184,0.5)', fontSize: 10 }}>
            Ctrl+Shift+P to toggle · Esc to close
          </span>
          <button
            onClick={() => setEntries([])}
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid rgba(99,102,241,0.4)',
              background: 'transparent',
              color: 'rgba(148,163,184,0.7)',
              cursor: 'pointer',
              fontSize: 10,
            }}
          >
            Clear
          </button>
          <button
            onClick={() => setVisible(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(148,163,184,0.6)',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      {activeTab === 'api' ? (
        entries.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'rgba(148,163,184,0.5)' }}>
            No API calls recorded yet. Start using the app.
          </div>
        ) : (
          <div>
            {entries.map((entry, i) => (
              <div
                key={`${entry.timestamp}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderBottom: '1px solid rgba(99,102,241,0.1)',
                  opacity: i === 0 ? 1 : Math.max(0.4, 1 - i * 0.07),
                }}
              >
                <span style={{ color: 'rgba(148,163,184,0.4)', fontSize: 10, width: 60 }}>
                  {formatTime(entry.timestamp)}
                </span>
                <span className={gradeColor(entry.grade)} style={{ fontSize: 12 }}>
                  {entry.grade}
                </span>
                <span style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: entry.success ? '#94a3b8' : '#f87171',
                }}>
                  {entry.label}
                </span>
                <span style={{ color: entry.success ? '#10b981' : '#f87171', fontSize: 10 }}>
                  {entry.durationMs}ms
                </span>
                {!entry.success && (
                  <span style={{ color: '#f87171', fontSize: 9, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <CacheInspector />
      )}
    </div>
  );
};

// Simple localStorage cache inspector
const CacheInspector = () => {
  const [items, setItems] = useState([]);

  const scan = () => {
    const found = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith('v1:')) {
        try {
          const raw = localStorage.getItem(k);
          const entry = JSON.parse(raw);
          const remaining = Math.max(0, entry.expiresAt - Date.now());
          found.push({ key: k, remaining, expired: remaining <= 0, data: entry.data });
        } catch (_) {}
      }
    }
    setItems(found);
  };

  useEffect(() => { scan(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 12px' }}>
        <button onClick={scan} style={{
          padding: '2px 8px', borderRadius: 4,
          border: '1px solid rgba(99,102,241,0.4)',
          background: 'transparent', color: 'rgba(148,163,184,0.7)',
          cursor: 'pointer', fontSize: 10,
        }}>Refresh</button>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', color: 'rgba(148,163,184,0.5)' }}>
          No cache entries found.
        </div>
      ) : (
        items.map((item) => (
          <div key={item.key} style={{
            padding: '4px 12px',
            borderBottom: '1px solid rgba(99,102,241,0.1)',
            display: 'flex',
            gap: 8,
            fontSize: 10,
          }}>
            <span style={{ color: item.expired ? '#f87171' : '#10b981', width: 52 }}>
              {item.expired ? 'expired' : `${Math.round(item.remaining/1000)}s`}
            </span>
            <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.key}
            </span>
          </div>
        ))
      )}
    </div>
  );
};

export default PerfOverlay;
