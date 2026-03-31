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
      // Preflight /api/ready to avoid long skeletons when backend isn't ready
      try {
        let ready = false;
        for (let i = 0; i < 6 && !cancelled; i++) {
          try {
            const rr = await fetch(`${API_BASE}/api/ready`);
            if (rr.ok) {
              ready = true;
              break;
            }
          } catch (e) {}
          await new Promise((r) => setTimeout(r, 200));
        }
        if (!ready) {
          if (!cancelled) setLoading(false);
          return;
        }
      } catch (e) {}

      try {
        const r = await fetch(`${API_BASE}/api/users?page=${page}&limit=20`);
        if (!r.ok) {
          console.warn('[creators] fetch /api/users returned', r.status);
          if (!cancelled) setCreators([]);
          return;
        }
        const j = await r.json();
        if (!cancelled) {
          setCreators(j.users || []);
          setTotal(j.total || 0);
        }
      } catch (e) {
        console.warn('[creators] fetch error', e && e.message ? e.message : e);
        if (!cancelled) setCreators([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => (cancelled = true);
  }, [page]);

  if (loading)
    return (
      <div style={{ maxWidth: 980, margin: '40px auto', padding: 18 }}>
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 28,
            textAlign: 'center',
          }}
        >
          <h2 style={{ color: C.white, margin: '0 0 8px' }}>Creators</h2>
          <div style={{ color: C.muted, marginBottom: 18 }}>Browse authors and view their uploads</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
            {[...Array(6)].map((_, i) => (
              <div
                key={`skel-${i}`}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  minHeight: 64,
                }}
              >
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 8 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '40%', height: 14, borderRadius: 6, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: '30%', height: 12, borderRadius: 6 }} />
                </div>
                <div style={{ width: 100 }}>
                  <div className="skeleton" style={{ width: '100%', height: 34, borderRadius: 8 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  if (!creators || creators.length === 0)
    return (
      <div style={{ maxWidth: 980, margin: '40px auto', padding: 18 }}>
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 28,
            textAlign: 'center',
          }}
        >
          <h2 style={{ color: C.white, margin: '0 0 8px' }}>Creators</h2>
          <div style={{ color: C.muted, marginBottom: 18 }}>Browse authors and view their uploads</div>
          <div style={{ color: C.muted }}>No creators found yet.</div>
        </div>
      </div>
    );

  return (
    <div style={{ maxWidth: 980, margin: '40px auto', padding: 18 }}>
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h2 style={{ color: C.white, margin: '0 0 6px' }}>Creators</h2>
        <div style={{ color: C.muted, marginBottom: 12 }}>Browse authors and view their uploads</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
          {creators.map((u) => (
            <div
              key={u.id}
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 10,
                padding: 12,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                minHeight: 64,
              }}
            >
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
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => onNavigate('profile', { id: u.id })} style={{ background: C.blurple, border: 'none', color: '#fff', padding: '8px 12px', borderRadius: 8, fontWeight: 700 }}>View profile</button>
                  <div style={{ color: C.muted, fontSize: 12 }}>{u.downloads ? `${u.downloads} downloads` : ''}</div>
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
    </div>
  );
}
