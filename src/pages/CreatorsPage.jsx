import React, { useEffect, useState } from 'react';
import { C } from '../constants';
import { Users, Package, Download, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

export default function CreatorsPage({ onViewCreator, onNavigate }) {
  const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '' : '');
  const [creators, setCreators] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
          if (!cancelled) {
            setError(`Failed to load creators: HTTP ${r.status}`);
            setCreators([]);
          }
          return;
        }
        const j = await r.json();
        if (!cancelled) {
          setCreators(j.users || []);
          setTotal(j.total || 0);
          setError(null);
        }
      } catch (e) {
        console.warn('[creators] fetch error', e && e.message ? e.message : e);
        if (!cancelled) {
          setError('Failed to load creators: ' + (e && e.message ? e.message : e));
          setCreators([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => (cancelled = true);
  }, [page]);

  if (loading)
    return (
      <div style={{ background: C.bg, minHeight: '100vh', padding: '60px 24px', color: C.text }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Header Skeleton */}
          <div style={{ marginBottom: 40, animation: 'pulse 2s infinite' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, background: C.border, borderRadius: 6 }} />
              <div style={{ width: 250, height: 32, background: C.border, borderRadius: 4 }} />
            </div>
            <div style={{ width: 400, height: 14, background: C.border, borderRadius: 4 }} />
          </div>

          {/* Creator Cards Skeleton */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20
          }}>
            {[...Array(6)].map((_, i) => (
              <div
                key={`skel-${i}`}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 20,
                  animation: 'pulse 2s infinite'
                }}
              >
                {/* Avatar Skeleton */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      background: C.border,
                      flexShrink: 0
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        width: '70%',
                        height: 16,
                        background: C.border,
                        borderRadius: 4,
                        marginBottom: 8
                      }}
                    />
                    <div
                      style={{
                        width: '40%',
                        height: 12,
                        background: C.border,
                        borderRadius: 4
                      }}
                    />
                  </div>
                </div>

                {/* Stats Skeleton */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ height: 12, background: C.border, borderRadius: 4 }} />
                  <div style={{ height: 12, background: C.border, borderRadius: 4 }} />
                </div>

                {/* Button Skeleton */}
                <div style={{ height: 36, background: C.border, borderRadius: 6 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  if (!creators || creators.length === 0)
    return (
      <div style={{ background: C.bg, minHeight: '100vh', padding: '60px 24px', color: C.text }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Users size={32} color={C.blurple} strokeWidth={2} />
              <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: C.text }}>
                Creators
              </h1>
            </div>
            <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>
              Browse authors and view their uploads
            </p>
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 20,
                background: C.blurpleDim,
                borderRadius: 12,
                border: `1px solid ${C.blurple}`,
                marginBottom: 20,
              }}
            >
              <AlertCircle size={20} color={C.blurple} />
              <p style={{ margin: 0, color: C.blurple }}>{error}</p>
            </div>
          )}

          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: C.muted,
            }}
          >
            <Users size={48} color={C.muted} style={{ marginBottom: 16, opacity: 0.5 }} />
            <p style={{ fontSize: 16, margin: '0 0 8px 0' }}>No creators found yet</p>
            <p style={{ fontSize: 14, margin: 0 }}>
              Check back soon for more creators.
            </p>
          </div>
        </div>
      </div>
    );

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '60px 24px', color: C.text }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Users size={32} color={C.blurple} strokeWidth={2} />
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: C.text }}>
              Creators
            </h1>
          </div>
          <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>
            Browse {total} amazing creators and discover their commands
          </p>
        </div>

        {/* Creator Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 20,
          marginBottom: 32
        }}>
          {creators.map((u) => (
            <div
              key={u.id}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 20,
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = C.blurple;
                e.currentTarget.style.background = `rgba(88, 101, 242, 0.08)`;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px rgba(88, 101, 242, 0.15)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.background = C.surface;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Avatar & Info */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                {u.avatar ? (
                  <img
                    src={u.avatar}
                    alt={u.username}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      objectFit: 'cover',
                      flexShrink: 0
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 8,
                      background: C.blurple,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 24,
                      flexShrink: 0
                    }}
                  >
                    {(u.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: '0 0 4px 0',
                    fontSize: 16,
                    fontWeight: 700,
                    color: C.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {u.username}
                  </h3>
                  <p style={{
                    margin: 0,
                    color: C.muted,
                    fontSize: 13,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    Creator
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 16,
                padding: '12px 0',
                borderTop: `1px solid ${C.border}`,
                borderBottom: `1px solid ${C.border}`
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.blurple, marginBottom: 2 }}>
                    {u.commands || 0}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Commands
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.blurple, marginBottom: 2 }}>
                    {u.downloads || 0}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Downloads
                  </div>
                </div>
              </div>

              {/* Button */}
              <button
                onClick={() => onNavigate('profile', { id: u.id })}
                style={{
                  background: C.blurple,
                  border: 'none',
                  color: '#fff',
                  padding: '12px 16px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                View Profile
              </button>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
          padding: '20px 0'
        }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: page <= 1 ? 'transparent' : 'rgba(88, 101, 242, 0.1)',
              color: page <= 1 ? C.muted : C.blurple,
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontWeight: 600,
              transition: 'all 0.2s ease',
              opacity: page <= 1 ? 0.5 : 1
            }}
            onMouseEnter={e => {
              if (page > 1) {
                e.currentTarget.style.borderColor = C.blurple;
                e.currentTarget.style.background = 'rgba(88, 101, 242, 0.2)';
              }
            }}
            onMouseLeave={e => {
              if (page > 1) {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.background = 'rgba(88, 101, 242, 0.1)';
              }
            }}
          >
            <ChevronLeft size={16} />
            Prev
          </button>

          <div style={{
            color: C.muted,
            fontSize: 14,
            fontWeight: 500,
            minWidth: 200,
            textAlign: 'center'
          }}>
            Page {page} of {Math.ceil(total / 20) || 1}
            <br />
            <span style={{ fontSize: 12 }}>
              {Math.min((page - 1) * 20 + 1, total)} - {Math.min(page * 20, total)} of {total}
            </span>
          </div>

          <button
            disabled={page * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: page * 20 >= total ? 'transparent' : 'rgba(88, 101, 242, 0.1)',
              color: page * 20 >= total ? C.muted : C.blurple,
              cursor: page * 20 >= total ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontWeight: 600,
              transition: 'all 0.2s ease',
              opacity: page * 20 >= total ? 0.5 : 1
            }}
            onMouseEnter={e => {
              if (page * 20 < total) {
                e.currentTarget.style.borderColor = C.blurple;
                e.currentTarget.style.background = 'rgba(88, 101, 242, 0.2)';
              }
            }}
            onMouseLeave={e => {
              if (page * 20 < total) {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.background = 'rgba(88, 101, 242, 0.1)';
              }
            }}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
