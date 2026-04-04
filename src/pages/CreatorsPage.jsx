import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Package, Search, SlidersHorizontal, Users } from 'lucide-react';
import { C } from '../constants';
import StarRow from '../components/Stars';

const PAGE_SIZE = 20;
const SORT_OPTIONS = [
  { value: 'commands_desc', label: 'Most commands' },
  { value: 'downloads_desc', label: 'Most downloads' },
  { value: 'rating_desc', label: 'Highest rated' },
  { value: 'alpha_asc', label: 'A to Z' },
  { value: 'alpha_desc', label: 'Z to A' },
];

function formatCount(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

export default function CreatorsPage({ onViewCreator, onNavigate }) {
  const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '' : '');
  const [creators, setCreators] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('commands_desc');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          sort,
        });

        if (query.trim()) params.set('q', query.trim());

        const response = await fetch(`${API_BASE}/api/users?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        if (!cancelled) {
          setCreators(Array.isArray(payload.users) ? payload.users : []);
          setTotal(Number(payload.total) || 0);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setCreators([]);
          setTotal(0);
          setError(fetchError && fetchError.message ? fetchError.message : 'Failed to load creators');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [API_BASE, page, query, sort, retryToken]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);
  const hasCreators = Array.isArray(creators) && creators.length > 0;
  const canPrev = page > 1;
  const canNext = page < totalPages && end < total;

  const openCreator = (id) => {
    if (typeof onViewCreator === 'function') {
      onViewCreator(id);
      return;
    }
    if (typeof onNavigate === 'function') {
      onNavigate('profile', { id });
    }
  };

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
    setPage(1);
  };

  const handleSortChange = (event) => {
    setSort(event.target.value);
    setPage(1);
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '60px 24px', color: C.text }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            marginBottom: 28,
            padding: '28px clamp(18px, 4vw, 28px)',
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(88, 101, 242, 0.12), rgba(88, 101, 242, 0.03))',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.16)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 260, flex: '1 1 360px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <Users size={32} color={C.blurple} strokeWidth={2} />
                <h1 style={{ fontSize: 'clamp(30px, 5vw, 42px)', fontWeight: 800, margin: 0, color: C.text }}>
                  Creators
                </h1>
              </div>
              <p style={{ color: C.muted, margin: 0, fontSize: 15, lineHeight: 1.6, maxWidth: 620 }}>
                Browse authors by activity, popularity, and rating. Search names, compare upload volume, and jump into a profile in one click.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: 12, minWidth: 320 }}>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px 16px' }}>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Creators</div>
                <div style={{ color: C.text, fontSize: 24, fontWeight: 800 }}>{formatCount(total)}</div>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px 16px' }}>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Page</div>
                <div style={{ color: C.text, fontSize: 24, fontWeight: 800 }}>{page}/{totalPages}</div>
              </div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px 16px' }}>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Shown</div>
                <div style={{ color: C.text, fontSize: 24, fontWeight: 800 }}>{formatCount(hasCreators ? creators.length : 0)}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: 12, marginTop: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '0 14px', minHeight: 48 }}>
              <Search size={18} color={C.muted} />
              <input
                value={query}
                onChange={handleQueryChange}
                placeholder="Search creators by name"
                aria-label="Search creators by name"
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: C.text,
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '0 14px', minHeight: 48 }}>
              <SlidersHorizontal size={18} color={C.muted} />
              <select
                value={sort}
                onChange={handleSortChange}
                aria-label="Sort creators"
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: C.text,
                  fontSize: 14,
                  appearance: 'none',
                }}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {[...Array(6)].map((_, index) => (
              <div
                key={`creator-skeleton-${index}`}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 18,
                  padding: 20,
                  animation: 'pulse 2s infinite',
                }}
              >
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div style={{ width: 60, height: 60, borderRadius: 16, background: C.border, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: '70%', height: 16, background: C.border, borderRadius: 6, marginBottom: 8 }} />
                    <div style={{ width: '42%', height: 12, background: C.border, borderRadius: 6 }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  <div style={{ height: 56, background: C.border, borderRadius: 12 }} />
                  <div style={{ height: 56, background: C.border, borderRadius: 12 }} />
                  <div style={{ height: 56, background: C.border, borderRadius: 12 }} />
                </div>
                <div style={{ height: 40, background: C.border, borderRadius: 10 }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 32, textAlign: 'center' }}>
            <Users size={48} color={C.muted} style={{ marginBottom: 12 }} />
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Could not load creators</h2>
            <p style={{ margin: '0 0 18px', color: C.muted }}>{error}</p>
            <button
              type="button"
              onClick={() => setRetryToken((value) => value + 1)}
              style={{
                border: 'none',
                borderRadius: 10,
                padding: '10px 16px',
                background: C.blurple,
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : !hasCreators ? (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 48, textAlign: 'center', color: C.muted }}>
            <Users size={48} style={{ marginBottom: 16, opacity: 0.5, margin: '0 auto 16px' }} />
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>No creators found.</p>
            <p style={{ margin: '8px 0 0', fontSize: 14 }}>
              {query.trim() ? 'Try a different search term or clear the filter.' : 'Creators will appear here once authors start publishing more commands.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 28 }}>
              {creators.map((creator) => (
                <div
                  key={creator.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openCreator(creator.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openCreator(creator.id);
                    }
                  }}
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 18,
                    padding: 20,
                    transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.borderColor = C.blurple;
                    event.currentTarget.style.background = 'rgba(88, 101, 242, 0.08)';
                    event.currentTarget.style.transform = 'translateY(-3px)';
                    event.currentTarget.style.boxShadow = '0 16px 28px rgba(88, 101, 242, 0.18)';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.borderColor = C.border;
                    event.currentTarget.style.background = C.surface;
                    event.currentTarget.style.transform = 'translateY(0)';
                    event.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    {creator.avatar ? (
                      <img
                        src={creator.avatar}
                        alt={creator.username}
                        style={{ width: 64, height: 64, borderRadius: 18, objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 18,
                          background: 'linear-gradient(135deg, rgba(88,101,242,1), rgba(88,101,242,0.72))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 900,
                          fontSize: 26,
                          flexShrink: 0,
                        }}
                      >
                        {(creator.username || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: 17, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {creator.username}
                      </h3>
                      <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Creator profile</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 14, padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 12, marginBottom: 6 }}>
                        <Package size={14} />
                        Commands
                      </div>
                      <div style={{ color: C.text, fontSize: 20, fontWeight: 800 }}>{formatCount(creator.commands)}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 14, padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 12, marginBottom: 6 }}>
                        <Download size={14} />
                        Downloads
                      </div>
                      <div style={{ color: C.text, fontSize: 20, fontWeight: 800 }}>{formatCount(creator.downloads)}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 14, padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 12, marginBottom: 6 }}>
                        <Users size={14} />
                        Rating
                      </div>
                      <StarRow rating={Number(creator.avg_rating || 0)} size={12} count={null} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openCreator(creator.id);
                    }}
                    style={{
                      background: C.blurple,
                      border: 'none',
                      color: '#fff',
                      padding: '12px 16px',
                      borderRadius: 12,
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'transform 180ms ease, opacity 180ms ease',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.opacity = '0.9';
                      event.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.opacity = '1';
                      event.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    View Profile
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, padding: '20px 0', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: canPrev ? 'rgba(88, 101, 242, 0.1)' : 'transparent',
                  color: canPrev ? C.blurple : C.muted,
                  cursor: canPrev ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                  opacity: canPrev ? 1 : 0.5,
                }}
              >
                <ChevronLeft size={16} />
                Prev
              </button>

              <div style={{ color: C.muted, fontSize: 14, fontWeight: 600, minWidth: 220, textAlign: 'center' }}>
                Page {page} of {totalPages}
                <br />
                <span style={{ fontSize: 12, fontWeight: 500 }}>
                  {start} - {end} of {formatCount(total)} creators
                </span>
              </div>

              <button
                type="button"
                disabled={!canNext}
                onClick={() => setPage((current) => current + 1)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: canNext ? 'rgba(88, 101, 242, 0.1)' : 'transparent',
                  color: canNext ? C.blurple : C.muted,
                  cursor: canNext ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                  opacity: canNext ? 1 : 0.5,
                }}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}