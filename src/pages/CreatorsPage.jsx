import React, { useEffect, useState } from 'react';
import { C } from '../constants';

export default function CreatorsPage({ onViewCreator, onNavigate }) {
  const API_BASE = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE || '';
  const [creators, setCreators] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/users?page=${page}&limit=20`);
        if (!r.ok) return setCreators([]);
        const j = await r.json();
        if (!cancelled) {
          setCreators(j.users || []);
          setTotal(j.total || 0);
        }
      } catch (e) {
        if (!cancelled) setCreators([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => (cancelled = true);
  }, [page]);

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
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button onClick={() => onNavigate('profile', { id: u.id })} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text, padding: '6px 10px', borderRadius: 8 }}>View profile</button>
                <div style={{ color: C.muted, fontSize: 12, alignSelf: 'center' }}>{u.downloads ? `${u.downloads} downloads` : ''}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8 }}>
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.text }}>Prev</button>
        <div style={{ color: C.muted, alignSelf: 'center' }}>{Math.min((page - 1) * 20 + 1, total)} - {Math.min(page * 20, total)} of {total}</div>
        <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.text }}>Next</button>
      </div>
    </div>
  );
}
