import { useEffect, useState } from 'react';
import { C } from '../constants';
import { TrendingUp, Calendar, BarChart3, Table2, LogIn } from 'lucide-react';
import { saveReturnTo } from '../lib/authHelpers';

export default function DashboardPage({ user, onNavigate }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('30days');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

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

  if (!user) return null;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '40px 20px', color: C.text }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px 0', color: C.text }}>
            Creator Dashboard
          </h1>
          <p style={{ color: C.muted, margin: 0 }}>
            Track your command performance and analytics
          </p>
        </div>

        {/* Controls */}
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

        {/* Loading/Error State */}
        {loading && <div style={{ textAlign: 'center', color: C.muted, padding: '40px' }}>Loading analytics...</div>}
        {error && <div style={{ textAlign: 'center', color: '#FF6B6B', padding: '40px' }}>{error}</div>}

        {/* Analytics Content */}
        {!loading && !error && analytics && (
          <>
            {/* Summary Stats - Card View */}
            {viewMode === 'cards' && (
              <>
                {/* Main Stats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                  marginBottom: 32
                }}>
                  <StatCard label="Total Views" value={analytics.stats.totalViews} icon="👁" />
                  <StatCard label="Total Downloads" value={analytics.stats.totalDownloads} icon="⬇" />
                  <StatCard label="Total Favorites" value={analytics.stats.totalFavorites} icon="❤" />
                  <StatCard label="Total Shares" value={analytics.stats.totalShares} icon="🔗" />
                  <StatCard label="Total Ratings" value={analytics.stats.totalRatings} icon="⭐" />
                  <StatCard label="Unique Users" value={analytics.stats.uniqueUsers} icon="👥" />
                  <StatCard label="Avg. Rating" value={analytics.stats.averageRating.toFixed(2)} icon="⭐" />
                  <StatCard label="Peak Hour" value={analytics.stats.peakHour || 'N/A'} icon="🕐" />
                </div>

                {/* Peak Day of Week */}
                {analytics.stats.peakDayOfWeek && (
                  <div style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 32
                  }}>
                    <p style={{ color: C.muted, fontSize: 13, margin: '0 0 8px 0' }}>Peak Day of Week</p>
                    <p style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.blurple }}>
                      {analytics.stats.peakDayOfWeek}
                    </p>
                  </div>
                )}

                {/* Top Performers */}
                {analytics.topPerformers.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
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
                            padding: 16,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => onNavigate?.('detail', { id: cmd.id })}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = C.blurple;
                            e.currentTarget.style.background = 'rgba(88, 101, 242, 0.05)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = C.border;
                            e.currentTarget.style.background = C.surface;
                          }}
                        >
                          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                            <div style={{
                              background: C.blurple,
                              color: 'white',
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700
                            }}>
                              {idx + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                              <h3 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 600, color: C.text }}>
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
                            gap: 8,
                            fontSize: 12,
                            color: C.muted
                          }}>
                            <div>👁 {cmd.views} views</div>
                            <div>⬇ {cmd.downloads} downloads</div>
                            <div>❤ {cmd.favorites} favorites</div>
                            <div>🔗 {cmd.shares} shares</div>
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
                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(0, 0, 0, 0.2)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: C.text }}>Command</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: C.text }}>Views</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: C.text }}>Downloads</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: C.text }}>Favorites</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: C.text }}>Shares</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: C.text }}>Ratings</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: C.text }}>Avg Rating</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: C.text }}>Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.commands.map((cmd, idx) => (
                      <tr
                        key={cmd.id}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          cursor: 'pointer',
                          transition: 'background 0.2s ease'
                        }}
                        onClick={() => onNavigate?.('detail', { id: cmd.id })}
                        onMouseEnter={e => e.currentTarget.style.background = `rgba(88, 101, 242, 0.05)`}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 16px', fontSize: 13, color: C.text }}>
                          <div>
                            <p style={{ margin: '0 0 4px 0', fontWeight: 500 }}>{cmd.name}</p>
                            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
                              {cmd.description.substring(0, 50)}...
                            </p>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'center', color: C.text }}>{cmd.views}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'center', color: C.text }}>{cmd.downloads}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'center', color: C.text }}>{cmd.favorites}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'center', color: C.text }}>{cmd.shares}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'center', color: C.text }}>{cmd.ratings}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'center', color: C.blurple, fontWeight: 600 }}>{cmd.averageRating}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'center', color: C.text }}>{cmd.engagement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty State */}
            {analytics.commands.length === 0 && (
              <div style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 40,
                textAlign: 'center',
                color: C.muted
              }}>
                <p style={{ margin: 0 }}>No commands yet. Create one to start tracking analytics!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      transition: 'all 0.2s ease'
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <p style={{ color: C.muted, fontSize: 12, fontWeight: 500, margin: '0 0 4px 0' }}>
        {label}
      </p>
      <p style={{ fontSize: 20, fontWeight: 700, margin: 0, color: C.blurple }}>
        {typeof value === 'string' ? value : value.toLocaleString()}
      </p>
    </div>
  );
}
