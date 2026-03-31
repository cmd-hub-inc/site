import React, { useEffect, useState } from 'react';
import { C } from '../constants';

export default function CreatorsPage({ onViewCreator, onNavigate }) {
  const API_BASE = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE || '';
  const [creators, setCreators] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/commands`);
        if (!r.ok) return setCreators([]);
        const cmds = await r.json();
        // Aggregate authors
        const map = {};
        (Array.isArray(cmds) ? cmds : []).forEach((c) => {
          const a = c.author || (c.authorId ? { id: c.authorId, username: c.authorId } : null);
          if (!a) return;
          const id = a.id;
          if (!map[id]) map[id] = { id, username: a.username || id, avatar: a.avatar || null, commands: 0 };
          map[id].commands++;
        });
        const arr = Object.values(map).sort((a, b) => b.commands - a.commands);
        if (!cancelled) setCreators(arr);
      } catch (e) {
        if (!cancelled) setCreators([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => (cancelled = true);
  }, []);

  if (loading) return <div style={{ padding: 24, color: C.text }}>Loading creators...</div>;
  if (!creators || creators.length === 0)
    return <div style={{ padding: 24, color: C.muted }}>No creators found yet.</div>;

  return (
    <div style={{ maxWidth: 980, margin: '20px auto', padding: 18 }}>
      <h2 style={{ color: C.white, marginBottom: 6 }}>Creators</h2>
      <div style={{ color: C.muted, marginBottom: 12 }}>Browse authors and view their uploads</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
        {creators.map((u) => (
          <div key={u.id} style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 12, borderRadius: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
            {u.avatar ? (
              <img src={u.avatar} alt={u.username} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 8, background: C.blurple, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>{(u.username || 'U').charAt(0).toUpperCase()}</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: C.text, fontWeight: 700 }}>{u.username}</div>
                <div style={{ color: C.muted, fontSize: 13 }}>{u.commands} uploads</div>
              </div>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => onNavigate('profile', { id: u.id })} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text, padding: '6px 10px', borderRadius: 8 }}>View profile</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
