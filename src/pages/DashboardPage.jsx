import { useEffect, useState } from 'react';
import { C } from '../constants';
import { TrendingUp, Calendar, BarChart3, Table2, LogIn, Eye, Download, Heart, Link2, Star, Users, Clock } from 'lucide-react';
import { saveReturnTo } from '../lib/authHelpers';

const DASHBOARD_PERIODS = ['7days', '30days', '90days'];
const DASHBOARD_VIEWS = ['cards', 'table'];

function getDashboardStateFromHash() {
  try {
    const rawHash = (window.location.hash || '').replace(/^#/, '');
    const params = new URLSearchParams(rawHash);
    const period = params.get('period');
    const view = params.get('view');

    return {
      period: DASHBOARD_PERIODS.includes(period) ? period : '30days',
      viewMode: DASHBOARD_VIEWS.includes(view) ? view : 'cards',
    };
  } catch {
    return { period: '30days', viewMode: 'cards' };
  }
}

export default function DashboardPage({ user, onNavigate }) {
  const initial = getDashboardStateFromHash();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(initial.period);
  const [viewMode, setViewMode] = useState(initial.viewMode); // 'cards' or 'table'

  // Redirect to home if not authenticated
  useEffect(() => {
    if (user === null) {
      saveReturnTo('/dashboard');
      onNavigate?.('home');
    }
  }, [user, onNavigate]);

  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/analytics/creator?period=${period}`);
        if (!res.ok) {
          const text = await res.text();
          console.error('Analytics error response:', res.status, text);
          setError(`Failed to load analytics: ${res.status}`);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setAnalytics(data);
        setError(null);
      } catch (err) {
        setError('Failed to load analytics: ' + err.message);
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, period]);

  useEffect(() => {
    const onHashChange = () => {
      const next = getDashboardStateFromHash();
      setPeriod((current) => (current === next.period ? current : next.period));
      setViewMode((current) => (current === next.viewMode ? current : next.viewMode));
    };

    onHashChange();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    try {
      const nextHash = `#period=${period}&view=${viewMode}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}${nextHash}`);
      }
    } catch {
      // ignore history updates
    }
  }, [period, viewMode]);

  if (!user) return null;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '60px 24px', color: C.text }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        {!loading && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <TrendingUp size={32} color={C.blurple} strokeWidth={2} />
              <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: C.text }}>
                Creator Dashboard
              </h1>
            </div>
            <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>
              Track your command performance and analytics
            </p>
          </div>
        )}

        {/* Header Skeleton */}
        {loading && (
          <div style={{ marginBottom: 40, animation: 'pulse 2s infinite' }}>
            <div
              style={{
                height: 32,
                background: C.border,
                borderRadius: 4,
                marginBottom: 8,
                width: '300px'
              }}
            />
            <div
              style={{
                height: 14,
                background: C.border,
                borderRadius: 4,
                width: '400px'
              }}
            />
          </div>
        )}

        {/* Controls */}
        {!loading && (
          <div style={{
            display: 'flex',
            gap: 16,
            marginBottom: 32,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {/* Time Period Filter */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Calendar size={18} style={{ color: C.muted }} />
              {['7days', '30days', 'alltime'].map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: '8px 12px',
                    border: `1px solid ${period === p ? C.blurple : C.border}`,
                    background: period === p ? 'rgba(88, 101, 242, 0.15)' : 'transparent',
                    color: period === p ? C.blurple : C.text,
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    if (period !== p) {
                      e.target.style.borderColor = C.blurple;
                    }
                  }}
                  onMouseLeave={e => {
                    if (period !== p) {
                      e.target.style.borderColor = C.border;
                    }
                  }}
                >
                  {p === '7days' ? 'Last 7 days' : p === '30days' ? 'Last 30 days' : 'All time'}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <button
                onClick={() => setViewMode('cards')}
                title="Card view"
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${viewMode === 'cards' ? C.blurple : C.border}`,
                  background: viewMode === 'cards' ? 'rgba(88, 101, 242, 0.15)' : 'transparent',
                  color: viewMode === 'cards' ? C.blurple : C.text,
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  if (viewMode !== 'cards') {
                    e.currentTarget.style.borderColor = C.blurple;
                  }
                }}
                onMouseLeave={e => {
                  if (viewMode !== 'cards') {
                    e.currentTarget.style.borderColor = C.border;
                  }
                }}
              >
                <BarChart3 size={16} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Table view"
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${viewMode === 'table' ? C.blurple : C.border}`,
                  background: viewMode === 'table' ? 'rgba(88, 101, 242, 0.15)' : 'transparent',
                  color: viewMode === 'table' ? C.blurple : C.text,
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => {
                  if (viewMode !== 'table') {
                    e.currentTarget.style.borderColor = C.blurple;
                  }
                }}
                onMouseLeave={e => {
                  if (viewMode !== 'table') {
                    e.currentTarget.style.borderColor = C.border;
                  }
                }}
              >
                <Table2 size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Loading State with Skeletons */}
        {loading && (
          <div>
            {/* Controls Skeleton */}
            <div style={{
              display: 'flex',
              gap: 16,
              marginBottom: 32,
              flexWrap: 'wrap',
              alignItems: 'center',
              animation: 'pulse 2s infinite'
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    style={{
                      width: 100,
                      height: 32,
                      background: C.border,
                      borderRadius: 6
                    }}
                  />
                ))}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {[1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      width: 40,
                      height: 32,
                      background: C.border,
                      borderRadius: 6
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Card View Skeleton */}
            {viewMode === 'cards' && (
              <>
                {/* Stat Cards Skeleton */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                  marginBottom: 32
                }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div
                      key={i}
                      style={{
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        borderRadius: 12,
                        padding: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        animation: 'pulse 2s infinite'
                      }}
                    >
                      <div
                        style={{
                          fontSize: 24,
                          marginBottom: 8,
                          width: 24,
                          height: 24,
                          background: C.border,
                          borderRadius: 4
                        }}
                      />
                      <div
                        style={{
                          color: C.muted,
                          fontSize: 12,
                          fontWeight: 500,
                          margin: '0 0 4px 0',
                          width: '80%',
                          height: 12,
                          background: C.border,
                          borderRadius: 4
                        }}
                      />
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          margin: 0,
                          width: '60%',
                          height: 20,
                          background: C.border,
                          borderRadius: 4
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Peak Day Skeleton */}
                <div style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 32,
                  animation: 'pulse 2s infinite'
                }}>
                  <div
                    style={{
                      color: C.muted,
                      fontSize: 13,
                      margin: '0 0 8px 0',
                      width: '150px',
                      height: 12,
                      background: C.border,
                      borderRadius: 4
                    }}
                  />
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      margin: 0,
                      width: '100px',
                      height: 20,
                      background: C.border,
                      borderRadius: 4
                    }}
                  />
                </div>

                {/* Top Performers Skeleton */}
                <div style={{ marginBottom: 32 }}>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      marginBottom: 16,
                      width: '150px',
                      height: 20,
                      background: C.border,
                      borderRadius: 4,
                      animation: 'pulse 2s infinite'
                    }}
                  />
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 16
                  }}>
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        style={{
                          background: C.surface,
                          border: `1px solid ${C.border}`,
                          borderRadius: 12,
                          padding: 16,
                          animation: 'pulse 2s infinite'
                        }}
                      >
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                          <div
                            style={{
                              background: C.border,
                              width: 24,
                              height: 24,
                              borderRadius: '50%'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                margin: '0 0 4px 0',
                                height: 14,
                                background: C.border,
                                borderRadius: 4,
                                marginBottom: 4,
                                width: '70%'
                              }}
                            />
                            <div
                              style={{
                                margin: 0,
                                fontSize: 12,
                                height: 12,
                                background: C.border,
                                borderRadius: 4,
                                width: '90%'
                              }}
                            />
                          </div>
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 8,
                          fontSize: 12
                        }}>
                          {[1, 2, 3, 4].map(j => (
                            <div
                              key={j}
                              style={{
                                height: 12,
                                background: C.border,
                                borderRadius: 4
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Table View Skeleton */}
            {viewMode === 'table' && (
              <div style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(0, 0, 0, 0.2)' }}>
                      {['Command', 'Views', 'Downloads', 'Favorites', 'Shares', 'Ratings', 'Avg Rating', 'Engagement'].map(header => (
                        <th
                          key={header}
                          style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: 13,
                            fontWeight: 600,
                            color: C.text
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map(i => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          animation: 'pulse 2s infinite'
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>
                          <div>
                            <div
                              style={{
                                margin: '0 0 4px 0',
                                fontWeight: 500,
                                width: '150px',
                                height: 14,
                                background: C.border,
                                borderRadius: 4
                              }}
                            />
                            <div
                              style={{
                                margin: 0,
                                fontSize: 12,
                                width: '200px',
                                height: 12,
                                background: C.border,
                                borderRadius: 4
                              }}
                            />
                          </div>
                        </td>
                        {[1, 2, 3, 4, 5, 6, 7].map(j => (
                          <td
                            key={j}
                            style={{
                              padding: '12px 16px',
                              fontSize: 13,
                              textAlign: 'center'
                            }}
                          >
                            <div
                              style={{
                                width: '50px',
                                height: 12,
                                background: C.border,
                                borderRadius: 4,
                                margin: '0 auto'
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
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

        {/* Analytics Content */}
        {!loading && !error && analytics && (
          <>
            {/* Summary Stats - Card View */}
            {viewMode === 'cards' && (
              <>
                {/* Main Stats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: 16,
                  marginBottom: 32
                }}>
                  <StatCard label="Total Views" value={analytics.stats.totalViews} icon={Eye} accentColor="#3B82F6" />
                  <StatCard label="Total Downloads" value={analytics.stats.totalDownloads} icon={Download} accentColor="#10B981" />
                  <StatCard label="Total Favorites" value={analytics.stats.totalFavorites} icon={Heart} accentColor="#EF4444" />
                  <StatCard label="Total Shares" value={analytics.stats.totalShares} icon={Link2} accentColor="#8B5CF6" />
                  <StatCard label="Total Ratings" value={analytics.stats.totalRatings} icon={Star} accentColor="#F59E0B" />
                  <StatCard label="Unique Users" value={analytics.stats.uniqueUsers} icon={Users} accentColor="#EC4899" />
                  <StatCard label="Avg. Rating" value={analytics.stats.averageRating.toFixed(2)} icon={Star} accentColor="#F59E0B" />
                  <StatCard label="Peak Hour" value={analytics.stats.peakHour || 'N/A'} icon={Clock} accentColor="#06B6D4" />
                </div>

                {/* Peak Day of Week */}
                {analytics.stats.peakDayOfWeek && (
                  <div style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: 24,
                    marginBottom: 32,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16
                  }}>
                    <div style={{
                      background: 'rgba(88, 101, 242, 0.1)',
                      borderRadius: 12,
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Calendar size={24} style={{ color: C.blurple }} />
                    </div>
                    <div>
                      <p style={{ color: C.muted, fontSize: 12, margin: '0 0 4px 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Peak Day of Week</p>
                      <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: C.text }}>
                        {analytics.stats.peakDayOfWeek}
                      </p>
                    </div>
                  </div>
                )}

                {/* Top Performers */}
                {analytics.topPerformers.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: C.text }}>
                      <TrendingUp size={20} style={{ color: C.blurple }} />
                      Top Performers
                    </h2>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: 16
                    }}>
                      {analytics.topPerformers.map((cmd, idx) => (
                        <div
                          key={cmd.id}
                          style={{
                            background: C.surface,
                            border: `1px solid ${C.border}`,
                            borderRadius: 12,
                            padding: 20,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                          onClick={() => onNavigate?.('detail', { id: cmd.id })}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = C.blurple;
                            e.currentTarget.style.background = 'rgba(88, 101, 242, 0.08)';
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
                          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                            <div style={{
                              background: C.blurple,
                              color: 'white',
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 13,
                              fontWeight: 700,
                              flexShrink: 0
                            }}>
                              #{idx + 1}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h3 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {cmd.name}
                              </h3>
                              <p style={{ margin: 0, fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {cmd.description}
                              </p>
                            </div>
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 10,
                            fontSize: 12,
                            color: C.muted
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Eye size={14} />
                              <span>{cmd.views}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Download size={14} />
                              <span>{cmd.downloads}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Heart size={14} />
                              <span>{cmd.favorites}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Link2 size={14} />
                              <span>{cmd.shares}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <div style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(88, 101, 242, 0.05)' }}>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Command</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Views</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Downloads</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Favorites</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shares</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ratings</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Rating</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.commands.map((cmd, idx) => (
                      <tr
                        key={cmd.id}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => onNavigate?.('detail', { id: cmd.id })}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = `rgba(88, 101, 242, 0.04)`;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <td style={{ padding: '14px 16px', fontSize: 13, color: C.text }}>
                          <div>
                            <p style={{ margin: '0 0 4px 0', fontWeight: 500, color: C.text }}>{cmd.name}</p>
                            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
                              {cmd.description.substring(0, 50)}...
                            </p>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, textAlign: 'center', color: C.text, fontWeight: 500 }}>{cmd.views}</td>
                        <td style={{ padding: '14px 16px', fontSize: 13, textAlign: 'center', color: C.text, fontWeight: 500 }}>{cmd.downloads}</td>
                        <td style={{ padding: '14px 16px', fontSize: 13, textAlign: 'center', color: C.text, fontWeight: 500 }}>{cmd.favorites}</td>
                        <td style={{ padding: '14px 16px', fontSize: 13, textAlign: 'center', color: C.text, fontWeight: 500 }}>{cmd.shares}</td>
                        <td style={{ padding: '14px 16px', fontSize: 13, textAlign: 'center', color: C.text, fontWeight: 500 }}>{cmd.ratings}</td>
                        <td style={{ padding: '14px 16px', fontSize: 13, textAlign: 'center', color: C.blurple, fontWeight: 700 }}>⭐ {cmd.averageRating}</td>
                        <td style={{ padding: '14px 16px', fontSize: 13, textAlign: 'center', color: C.text, fontWeight: 500 }}>{cmd.engagement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {error && !loading && (
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

            {/* Empty State */}
            {!error && analytics.commands.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: C.muted,
                }}
              >
                <BarChart3 size={48} color={C.muted} style={{ marginBottom: 16, opacity: 0.5 }} />
                <p style={{ fontSize: 16, margin: '0 0 8px 0' }}>No commands yet</p>
                <p style={{ fontSize: 14, margin: 0 }}>
                  Create one to start tracking analytics.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: IconComponent, accentColor = C.blurple }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      transition: 'all 0.3s ease'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = accentColor;
      e.currentTarget.style.background = `color-mix(in srgb, ${accentColor} 5%, ${C.surface})`;
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
      <div style={{
        background: `${accentColor}20`,
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'fit-content'
      }}>
        <IconComponent size={24} style={{ color: accentColor }} />
      </div>
      <div>
        <p style={{ color: C.muted, fontSize: 11, fontWeight: 600, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </p>
        <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: C.text }}>
          {typeof value === 'string' ? value : value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
