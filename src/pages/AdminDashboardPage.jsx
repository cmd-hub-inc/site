import { useEffect, useState } from 'react';
import { C } from '../constants';
import { Users, Package, AlertCircle, CheckCircle, XCircle, Eye, Filter, Newspaper, Trash2 } from 'lucide-react';

const ADMIN_SECTIONS = ['overview', 'commands', 'users', 'reports', 'news'];

function getSectionFromHash() {
  try {
    const raw = (window.location.hash || '').replace(/^#/, '').trim().toLowerCase();
    return ADMIN_SECTIONS.includes(raw) ? raw : 'overview';
  } catch {
    return 'overview';
  }
}

export default function AdminDashboardPage({ user, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [section, setSection] = useState(() => getSectionFromHash()); // overview, commands, users, reports, news
  const [filter, setFilter] = useState('all'); // for commands: all, pending, approved
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminRole, setAdminRole] = useState(null);

  // Keep section in sync with URL hash for reload/shareability.
  useEffect(() => {
    const onHashChange = () => {
      const next = getSectionFromHash();
      setSection((current) => (current === next ? current : next));
    };

    onHashChange();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    try {
      const nextHash = `#${section}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}${nextHash}`);
      }
    } catch {
      // ignore history updates
    }
  }, [section]);

  // Check admin access
  useEffect(() => {
    if (user === null) {
      onNavigate?.('home');
      return;
    }

    const checkAdmin = async () => {
      const attempts = 10;
      try {
        console.log('[admin] Checking admin status...');
        for (let i = 0; i < attempts; i++) {
          const res = await fetch('/api/admin/info', { credentials: 'include' });
          console.log('[admin] Admin info response:', res.status);
          if (res.ok) {
            const data = await res.json();
            console.log('[admin] Admin data:', data);
            setAdminRole(data.role);
            if (!data.isAdmin) {
              console.log('[admin] User is not admin, redirecting home');
              onNavigate?.('home');
            }
            return;
          }

          // During startup backend can be temporarily unavailable.
          if (res.status === 503) {
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }

          console.warn('[admin] Admin check failed with status:', res.status);
          onNavigate?.('home');
          return;
        }

        console.warn('[admin] Admin check timed out waiting for readiness');
      } catch (err) {
        console.error('[admin] Admin check error:', err);
        // Keep page mounted; user can retry once backend is ready.
      }
    };

    checkAdmin();
  }, [user, onNavigate]);

  // Fetch admin data
  useEffect(() => {
    if (!adminRole) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('[admin] Fetching data for section:', section);
        
        if (section === 'news') {
          const res = await fetch('/api/admin/news', { credentials: 'include' });
          console.log('[admin] News response:', res.status, res.statusText);
          if (!res.ok) {
            try {
              const errData = await res.json();
              console.error('[admin] Error response:', errData);
              setError('Failed to load news: ' + (errData.error || 'Unknown error'));
            } catch {
              console.error('[admin] Error response (non-JSON), status:', res.status);
              setError('Failed to load news: HTTP ' + res.status);
            }
            return;
          }
          try {
            const data = await res.json();
            console.log('[admin] News loaded:', data);
            setStats(data);
            setError(null);
          } catch (jsonErr) {
            console.error('[admin] Failed to parse news response:', jsonErr);
            setError('Invalid response format from server');
          }
        } else {
          const res = await fetch(`/api/admin/data?section=${section}&filter=${filter}`, { credentials: 'include' });
          console.log('[admin] Data response:', res.status);
          if (!res.ok) {
            try {
              const errData = await res.json();
              console.error('[admin] Error response:', errData);
              setError('Failed to load data: ' + (errData.error || 'Unknown error'));
            } catch {
              console.error('[admin] Error response (non-JSON), status:', res.status);
              setError('Failed to load data: HTTP ' + res.status);
            }
            return;
          }
          try {
            const data = await res.json();
            console.log('[admin] Data loaded:', data);
            setStats(data);
            setError(null);
          } catch (jsonErr) {
            console.error('[admin] Failed to parse data response:', jsonErr);
            setError('Invalid response format from server');
          }
        }
      } catch (err) {
        console.error('[admin] Fetch error:', err);
        setError('Error loading admin data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [adminRole, section, filter]);

  const loadSectionData = async (overrideSection = section, overrideFilter = filter) => {
    if (!adminRole) return;

    try {
      setLoading(true);
      if (overrideSection === 'news') {
        const res = await fetch('/api/admin/news', { credentials: 'include' });
        if (!res.ok) {
          setError('Failed to load news');
          return;
        }
        const data = await res.json();
        setStats((prevStats) => ({ ...(prevStats || {}), news: data.news }));
        setError(null);
      } else {
        const res = await fetch(`/api/admin/data?section=${overrideSection}&filter=${overrideFilter}`, { credentials: 'include' });
        if (!res.ok) {
          setError('Failed to load data');
          return;
        }
        const data = await res.json();
        setStats(data);
        setError(null);
      }
    } catch (err) {
      console.error('[admin] Refresh error:', err);
      setError('Error loading admin data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const isViewer = adminRole === 'VIEWER';

  // Handle command approval without page reload
  const handleCommandApprove = async (cmdId) => {
    try {
      const res = await fetch(`/api/admin/commands/${cmdId}/approve`, { method: 'POST' });
      if (res.ok) {
        // Update local state instead of reloading
        setStats(prevStats => ({
          ...prevStats,
          commands: prevStats.commands.map(cmd =>
            cmd.id === cmdId ? { ...cmd, approved: true } : cmd
          )
        }));
      } else {
        console.error('Approve failed:', res.status);
        alert('Failed to approve command');
      }
    } catch (err) {
      console.error('Approve error:', err);
      alert('Error approving command');
    }
  };

  // Handle command rejection without page reload
  const handleCommandReject = async (cmdId, reason) => {
    try {
      const res = await fetch(`/api/admin/commands/${cmdId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        // Remove command from list instead of reloading
        setStats(prevStats => ({
          ...prevStats,
          commands: prevStats.commands.filter(cmd => cmd.id !== cmdId)
        }));
      } else {
        console.error('Reject failed:', res.status);
        alert('Failed to reject command');
      }
    } catch (err) {
      console.error('Reject error:', err);
      alert('Error rejecting command');
    }
  };

  // Handle user suspension without page reload
  const handleUserSuspend = async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, { method: 'POST' });
      if (res.ok) {
        // Update user suspension status in local state
        setStats(prevStats => ({
          ...prevStats,
          users: prevStats.users.map(user =>
            user.id === userId ? { ...user, suspended: true } : user
          )
        }));
      } else {
        console.error('Suspend failed:', res.status);
        alert('Failed to suspend user');
      }
    } catch (err) {
      console.error('Suspend error:', err);
      alert('Error suspending user');
    }
  };

  // Handle report resolution without page reload
  const handleReportResolve = async (reportId, resolutionNote) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNote })
      });
      if (res.ok) {
        // Update report status in local state
        setStats(prevStats => ({
          ...prevStats,
          reports: prevStats.reports.map(report =>
            report.id === reportId ? { ...report, resolved: true } : report
          )
        }));
      } else {
        console.error('Resolve failed:', res.status);
        alert('Failed to resolve report');
      }
    } catch (err) {
      console.error('Resolve error:', err);
      alert('Error resolving report');
    }
  };

  // Show skeleton while checking admin status
  if (!adminRole) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', padding: '60px 24px', color: C.text }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Title Skeleton */}
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
                width: '200px'
              }}
            />
          </div>

          {/* Navigation Skeleton */}
          <div style={{
            display: 'flex',
            gap: 12,
            marginBottom: 32,
            borderBottom: `1px solid ${C.border}`,
            paddingBottom: 16,
            animation: 'pulse 2s infinite'
          }}>
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                style={{
                  height: 32,
                  background: C.border,
                  borderRadius: 4,
                  width: '80px'
                }}
              />
            ))}
          </div>

          {/* Content Skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 40 }}>
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                style={{
                  padding: 20,
                  background: C.darkBlog,
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  animation: 'pulse 2s infinite'
                }}
              >
                <div
                  style={{
                    height: 16,
                    background: C.border,
                    borderRadius: 4,
                    marginBottom: 12,
                    width: '60%'
                  }}
                />
                <div
                  style={{
                    height: 32,
                    background: C.border,
                    borderRadius: 4,
                    marginBottom: 12
                  }}
                />
                <div
                  style={{
                    height: 12,
                    background: C.border,
                    borderRadius: 4,
                    width: '40%'
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '60px 24px', color: C.text }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {!loading && (
          <>
            {/* Header */}
            <div style={{ marginBottom: 40 }}>
              <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px 0' }}>Admin Dashboard</h1>
              <p style={{ color: C.muted, margin: 0 }}>
                Role: <span style={{ color: C.blurple, fontWeight: 600 }}>{adminRole}</span>
              </p>
            </div>

            {/* Navigation */}
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 32,
              borderBottom: `1px solid ${C.border}`,
              paddingBottom: 16,
              flexWrap: 'wrap'
            }}>
              {ADMIN_SECTIONS.map(sec => (
                <button
                  key={sec}
                  onClick={() => setSection(sec)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    background: section === sec ? `rgba(88, 101, 242, 0.15)` : 'transparent',
                    color: section === sec ? C.blurple : C.text,
                    borderBottom: section === sec ? `2px solid ${C.blurple}` : 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: section === sec ? 600 : 400,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {sec.charAt(0).toUpperCase() + sec.slice(1)}
                </button>
              ))}
            </div>

            {/* Filter Bar */}
            {(section === 'commands') && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
                <Filter size={16} style={{ color: C.muted }} />
                {['all', 'pending', 'approved'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: '6px 12px',
                      border: `1px solid ${filter === f ? C.blurple : C.border}`,
                      background: filter === f ? 'rgba(88, 101, 242, 0.1)' : 'transparent',
                      color: filter === f ? C.blurple : C.text,
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 500
                    }}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {loading && (
          <div>
            {/* Title & Navigation Skeleton */}
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
                  width: '200px'
                }}
              />
            </div>

            {/* Tabs Skeleton */}
            <div style={{
              display: 'flex',
              gap: 12,
              marginBottom: 32,
              borderBottom: `1px solid ${C.border}`,
              paddingBottom: 16,
              animation: 'pulse 2s infinite'
            }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  style={{
                    height: 32,
                    background: C.border,
                    borderRadius: 4,
                    width: '80px'
                  }}
                />
              ))}
            </div>

            {/* Content Skeleton */}
            {section === 'overview' && (
              <>
                {/* Stat Cards Skeleton */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 40 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      style={{
                        padding: 20,
                        background: C.darkBlog,
                        borderRadius: 12,
                        border: `1px solid ${C.border}`,
                        animation: 'pulse 2s infinite'
                      }}
                    >
                      <div
                        style={{
                          height: 16,
                          background: C.border,
                          borderRadius: 4,
                          marginBottom: 12,
                          width: '60%'
                        }}
                      />
                      <div
                        style={{
                          height: 32,
                          background: C.border,
                          borderRadius: 4,
                          marginBottom: 12
                        }}
                      />
                      <div
                        style={{
                          height: 12,
                          background: C.border,
                          borderRadius: 4,
                          width: '40%'
                        }}
                      />
                    </div>
                  ))}
                </div>
                
                {/* Recent Activity Skeleton */}
                <div style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 24,
                  animation: 'pulse 2s infinite'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Recent Activity</h3>
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      style={{
                        padding: 12,
                        marginBottom: 12,
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: 8
                      }}
                    >
                      <div
                        style={{
                          height: 14,
                          background: C.border,
                          borderRadius: 4,
                          marginBottom: 8,
                          width: '50%'
                        }}
                      />
                      <div
                        style={{
                          height: 12,
                          background: C.border,
                          borderRadius: 4,
                          marginBottom: 6,
                          width: '70%'
                        }}
                      />
                      <div
                        style={{
                          height: 10,
                          background: C.border,
                          borderRadius: 4,
                          width: '30%'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {(section === 'commands' || section === 'users') && (
              <div style={{ background: C.darkBlog, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    style={{
                      padding: 16,
                      borderBottom: i < 5 ? `1px solid ${C.border}` : 'none',
                      animation: 'pulse 2s infinite',
                      display: 'flex',
                      gap: 16
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          height: 14,
                          background: C.border,
                          borderRadius: 4,
                          marginBottom: 8,
                          width: '70%'
                        }}
                      />
                      <div
                        style={{
                          height: 12,
                          background: C.border,
                          borderRadius: 4,
                          width: '40%'
                        }}
                      />
                    </div>
                    <div
                      style={{
                        width: 100,
                        height: 14,
                        background: C.border,
                        borderRadius: 4
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {section === 'reports' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3, 4].map(i => (
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
                    <div
                      style={{
                        height: 16,
                        background: C.border,
                        borderRadius: 4,
                        marginBottom: 12,
                        width: '40%'
                      }}
                    />
                    <div
                      style={{
                        height: 14,
                        background: C.border,
                        borderRadius: 4,
                        marginBottom: 8,
                        width: '60%'
                      }}
                    />
                    <div
                      style={{
                        height: 12,
                        background: C.border,
                        borderRadius: 4,
                        marginBottom: 12,
                        width: '80%'
                      }}
                    />
                    <div
                      style={{
                        height: 32,
                        background: C.border,
                        borderRadius: 4,
                        width: '100px'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {error && <div style={{ color: '#FF6B6B', textAlign: 'center', padding: '40px' }}>{error}</div>}

        {!loading && !error && stats && (
          <>
            {/* OVERVIEW SECTION */}
            {section === 'overview' && (
              <div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16,
                  marginBottom: 32
                }}>
                  <StatCard icon={<Users size={24} />} label="Total Users" value={stats.totalUsers} />
                  <StatCard icon={<Package size={24} />} label="Total Commands" value={stats.totalCommands} />
                  <StatCard icon={<AlertCircle size={24} />} label="Pending Approval" value={stats.pendingCommands} color={C.yellow} />
                  <StatCard icon={<AlertCircle size={24} />} label="Pending Reports" value={stats.pendingReports} color={C.red} />
                </div>

                {/* Recent Activity */}
                <div style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 24,
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Recent Activity</h3>
                  {stats.recentActivity?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {stats.recentActivity.map((activity, idx) => (
                        <div key={idx} style={{
                          padding: 12,
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: 8,
                          fontSize: 13,
                          color: C.muted
                        }}>
                          <div style={{ color: C.text, fontWeight: 500, marginBottom: 4 }}>
                            {activity.action}
                          </div>
                          <div>{activity.target}</div>
                          <div style={{ fontSize: 11, marginTop: 4 }}>
                            {new Date(activity.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: C.muted, textAlign: 'center', padding: '20px' }}>No recent activity</div>
                  )}
                </div>
              </div>
            )}

            {/* COMMANDS SECTION */}
            {section === 'commands' && (
              <CommandsList commands={stats.commands} onNavigate={onNavigate} isViewer={isViewer} onApprove={handleCommandApprove} onReject={handleCommandReject} />
            )}

            {/* USERS SECTION */}
            {section === 'users' && (
              <UsersList users={stats.users} isViewer={isViewer} onUsersUpdate={() => loadSectionData('users', filter)} />
            )}

            {/* REPORTS SECTION */}
            {section === 'reports' && (
              <ReportsList reports={stats.reports} isViewer={isViewer} onResolve={handleReportResolve} />
            )}

            {/* NEWS SECTION */}
            {section === 'news' && (
              <NewsList news={stats.news} isViewer={isViewer} onNewsUpdate={() => {
                // Refresh news after create/update/delete
                loadSectionData('news', filter);
              }} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color = C.blurple }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      alignItems: 'center',
      textAlign: 'center'
    }}>
      <div style={{ color }}>{icon}</div>
      <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color }}>{value}</p>
    </div>
  );
}

function CommandsList({ commands, onNavigate, isViewer, onApprove, onReject }) {
  const [actionLoading, setActionLoading] = useState(null);

  const handleApprove = async (cmdId) => {
    if (isViewer) return;
    setActionLoading(`approve-${cmdId}`);
    try {
      await onApprove(cmdId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (cmdId) => {
    if (isViewer) return;
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    setActionLoading(`reject-${cmdId}`);
    try {
      await onReject(cmdId, reason);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        background: C.surface,
        borderRadius: 12,
        overflow: 'hidden',
        border: `1px solid ${C.border}`
      }}>
        <thead>
          <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: `1px solid ${C.border}` }}>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Name</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Creator</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Status</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Created</th>
            {!isViewer && <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {commands?.map(cmd => (
            <tr key={cmd.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '12px 16px', fontSize: 13 }}>
                <button
                  onClick={() => onNavigate?.('detail', { id: cmd.id })}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: C.blurple,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: 'none'
                  }}
                >
                  {cmd.name}
                </button>
              </td>
              <td style={{ padding: '12px 16px', fontSize: 13, color: C.muted }}>{cmd.author?.username}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  background: cmd.approved ? 'rgba(87, 242, 135, 0.15)' : 'rgba(254, 231, 92, 0.15)',
                  color: cmd.approved ? C.green : C.yellow,
                }}>
                  {cmd.approved ? 'Approved' : 'Pending'}
                </span>
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: C.muted }}>
                {new Date(cmd.createdAt).toLocaleDateString()}
              </td>
              {!isViewer && (
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>
                  {!cmd.approved && (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button
                        onClick={() => handleApprove(cmd.id)}
                        disabled={actionLoading === `approve-${cmd.id}`}
                        style={{
                          padding: '4px 8px',
                          background: C.green,
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 11,
                          fontWeight: 600
                        }}
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleReject(cmd.id)}
                        disabled={actionLoading === `reject-${cmd.id}`}
                        style={{
                          padding: '4px 8px',
                          background: C.red,
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 11,
                          fontWeight: 600
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsersList({ users, isViewer, onUsersUpdate }) {
  const [actionLoading, setActionLoading] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkRole, setBulkRole] = useState('MODERATOR');
  const [bulkNote, setBulkNote] = useState('');
  const [notesDrafts, setNotesDrafts] = useState({});

  const filteredUsers = (users || []).filter((u) => {
    const matchesQuery = [u.username, u.id].some((value) => String(value || '').toLowerCase().includes(query.toLowerCase()));
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
          ? !u.suspended
          : statusFilter === 'suspended'
            ? Boolean(u.suspended)
            : statusFilter === 'admins'
              ? Boolean(u.isAdmin)
              : true;
    const matchesRole = roleFilter === 'all' ? true : String(u.adminRole || 'none') === roleFilter;
    return matchesQuery && matchesStatus && matchesRole;
  });

  const selectedCount = selectedIds.length;

  const refresh = async () => {
    await onUsersUpdate?.();
  };

  const toggleSelected = (userId) => {
    setSelectedIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  };

  const selectAllVisible = () => {
    const ids = filteredUsers.map((u) => u.id);
    setSelectedIds(ids);
  };

  const clearSelection = () => setSelectedIds([]);

  const handleSuspend = async (userId) => {
    if (isViewer) return;
    const confirm = window.confirm('Suspend this user?');
    if (!confirm) return;
    setActionLoading(`suspend-${userId}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to suspend');
      await refresh();
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnsuspend = async (userId) => {
    if (isViewer) return;
    setActionLoading(`unsuspend-${userId}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}/unsuspend`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to unsuspend');
      await refresh();
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId, role) => {
    if (isViewer) return;
    setActionLoading(`role-${userId}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role === 'none' ? null : role }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      await refresh();
    } finally {
      setActionLoading(null);
    }
  };

  const handleWarn = async (userId, note) => {
    if (isViewer) return;
    setActionLoading(`warn-${userId}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}/warn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error('Failed to warn');
      await refresh();
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveNotes = async (userId, notes) => {
    if (isViewer) return;
    setActionLoading(`notes-${userId}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error('Failed to save notes');
      await refresh();
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulk = async (action, explicitIds = null) => {
    const userIds = explicitIds || selectedIds;
    if (isViewer || userIds.length === 0) return;
    setActionLoading(`bulk-${action}`);
    try {
      const res = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds,
          action,
          role: bulkRole === 'none' ? null : bulkRole,
          note: bulkNote,
        }),
      });
      if (!res.ok) throw new Error('Failed bulk action');
      setBulkNote('');
      await refresh();
      clearSelection();
    } finally {
      setActionLoading(null);
    }
  };

  const exportUsers = () => {
    window.location.href = '/api/admin/users/export';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by name or ID"
          style={{
            flex: '1 1 260px',
            padding: '10px 12px',
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.text,
          }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="admins">Admins</option>
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }}>
          <option value="all">All roles</option>
          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          <option value="MODERATOR">MODERATOR</option>
          <option value="VIEWER">VIEWER</option>
          <option value="none">No role</option>
        </select>
        <button onClick={exportUsers} style={{ padding: '10px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, cursor: 'pointer' }}>
          Export CSV
        </button>
      </div>

      {!isViewer && selectedCount > 0 && (
        <div style={{ padding: 14, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <strong>{selectedCount} selected</strong>
          <select value={bulkRole} onChange={(e) => setBulkRole(e.target.value)} style={{ padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }}>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="MODERATOR">MODERATOR</option>
            <option value="VIEWER">VIEWER</option>
            <option value="none">Clear role</option>
          </select>
          <input value={bulkNote} onChange={(e) => setBulkNote(e.target.value)} placeholder="Bulk warning/note" style={{ flex: '1 1 220px', padding: '8px 10px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
          <button onClick={() => handleBulk('suspend')} style={{ padding: '8px 12px', background: C.red, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Suspend</button>
          <button onClick={() => handleBulk('unsuspend')} style={{ padding: '8px 12px', background: C.green, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Unsuspend</button>
          <button onClick={() => handleBulk('logout')} style={{ padding: '8px 12px', background: '#f59e0b', color: '#111827', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Force Logout</button>
          <button onClick={() => handleBulk('role')} style={{ padding: '8px 12px', background: C.blurple, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Apply Role</button>
          <button onClick={() => handleBulk('warn')} style={{ padding: '8px 12px', background: 'transparent', color: C.blurple, border: `1px solid ${C.blurple}`, borderRadius: 8, cursor: 'pointer' }}>Warn</button>
          <button onClick={clearSelection} style={{ padding: '8px 12px', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: C.surface, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <thead>
            <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: `1px solid ${C.border}` }}>
              {!isViewer && (
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
                  <input type="checkbox" checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length} onChange={() => (selectedIds.length === filteredUsers.length ? clearSelection() : selectAllVisible())} />
                </th>
              )}
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>User</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Commands</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Role</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Warnings</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Joined</th>
              {!isViewer && <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                {!isViewer && (
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleSelected(u.id)} />
                  </td>
                )}
                <td style={{ padding: '12px 16px', fontSize: 13 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {u.avatar && <img src={u.avatar} alt={u.username} style={{ width: 24, height: 24, borderRadius: '50%' }} />}
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.username}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{u.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: C.text }}>{u._count?.commands || 0}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>
                  <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: u.suspended ? 'rgba(237, 66, 69, 0.15)' : 'rgba(87, 242, 135, 0.15)', color: u.suspended ? C.red : C.green }}>
                    {u.suspended ? 'Suspended' : 'Active'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>
                  <select value={u.adminRole || 'none'} onChange={(e) => handleRoleChange(u.id, e.target.value)} disabled={isViewer || actionLoading === `role-${u.id}`} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: '6px 8px' }}>
                    <option value="none">None</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    <option value="MODERATOR">MODERATOR</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                    <span style={{ color: C.text, fontWeight: 600 }}>{u.warningCount || 0}</span>
                    <button onClick={() => handleWarn(u.id, window.prompt('Warning note:', '') || '')} disabled={isViewer || actionLoading === `warn-${u.id}`} style={{ padding: '4px 8px', background: 'transparent', color: C.blurple, border: `1px solid ${C.blurple}`, borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Warn</button>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: C.muted }}>
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                {!isViewer && (
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                      {u.suspended ? (
                        <button onClick={() => handleUnsuspend(u.id)} disabled={actionLoading === `unsuspend-${u.id}`} style={{ padding: '4px 10px', background: C.green, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Unsuspend</button>
                      ) : (
                        <button onClick={() => handleSuspend(u.id)} disabled={actionLoading === `suspend-${u.id}`} style={{ padding: '4px 10px', background: C.red, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Suspend</button>
                      )}
                      <button onClick={() => handleBulk('logout', [u.id])} disabled={actionLoading === `bulk-logout`} style={{ padding: '4px 10px', background: '#f59e0b', color: '#111827', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Force Logout</button>
                      <button onClick={() => handleSaveNotes(u.id, notesDrafts[u.id] ?? u.adminNotes ?? '')} disabled={actionLoading === `notes-${u.id}`} style={{ padding: '4px 10px', background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Save Notes</button>
                    </div>
                    <textarea
                      value={notesDrafts[u.id] ?? u.adminNotes ?? ''}
                      onChange={(e) => setNotesDrafts((current) => ({ ...current, [u.id]: e.target.value }))}
                      placeholder="Admin notes"
                      style={{ marginTop: 8, width: 220, minHeight: 70, background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: 8, fontSize: 12 }}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportsList({ reports, isViewer, onResolve }) {
  const [actionLoading, setActionLoading] = useState(null);

  const handleResolve = async (reportId) => {
    if (isViewer) return;
    const note = prompt('Resolution note:');
    if (!note) return;
    setActionLoading(`resolve-${reportId}`);
    try {
      await onResolve(reportId, note);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {reports?.length > 0 ? reports.map(report => (
        <div key={report.id} style={{
          background: C.surface,
          border: `1px solid ${report.resolved ? C.border : C.red}`,
          borderRadius: 12,
          padding: 16
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 600 }}>
                {report.reportType.toUpperCase()}
              </h4>
              <p style={{ margin: '0 0 8px 0', fontSize: 13, color: C.muted }}>
                Reported by <strong>{report.reporter?.username}</strong>
              </p>
              <p style={{ margin: 0, fontSize: 13 }}>{report.reason}</p>
            </div>
            <span style={{
              display: 'inline-block',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              background: report.resolved ? 'rgba(87, 242, 135, 0.15)' : 'rgba(254, 231, 92, 0.15)',
              color: report.resolved ? C.green : C.yellow,
            }}>
              {report.resolved ? 'Resolved' : 'Pending'}
            </span>
          </div>
          {!report.resolved && !isViewer && (
            <button
              onClick={() => handleResolve(report.id)}
              disabled={actionLoading === `resolve-${report.id}`}
              style={{
                padding: '6px 12px',
                background: C.green,
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600
              }}
            >
              Mark Resolved
            </button>
          )}
          {report.resolved && (
            <p style={{ margin: '8px 0 0 0', fontSize: 12, color: C.muted }}>
              Resolved: {report.resolutionNote}
            </p>
          )}
        </div>
      )) : (
        <div style={{ textAlign: 'center', color: C.muted, padding: '40px' }}>No reports</div>
      )}
    </div>
  );
}

function NewsList({ news, isViewer, onNewsUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    hideAuthor: false,
    publishNow: false,
    category: 'General',
    priority: 'normal',
    referenceUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const parseNewsMeta = (rawTitle) => {
    let title = String(rawTitle || '');
    let category = 'General';
    let important = false;

    const catMatch = title.match(/^\[([^\]]+)\]\s*/);
    if (catMatch) {
      category = catMatch[1];
      title = title.replace(/^\[[^\]]+\]\s*/, '');
    }

    if (/^IMPORTANT:\s*/i.test(title)) {
      important = true;
      title = title.replace(/^IMPORTANT:\s*/i, '');
    }

    return { title, category, important };
  };

  const parseNewsContent = (rawContent) => {
    const content = String(rawContent || '');
    const linkMatch = content.match(/(?:^|\n)More info:\s*(https?:\/\/\S+)\s*$/i);
    if (!linkMatch) {
      return { content: content.trim(), referenceUrl: '' };
    }

    const referenceUrl = linkMatch[1];
    const withoutLink = content.replace(/(?:^|\n)More info:\s*https?:\/\/\S+\s*$/i, '').trim();
    return { content: withoutLink, referenceUrl };
  };

  const composeNewsPayload = (data) => {
    const normalizedTitle = String(data.title || '').trim();
    const normalizedContent = String(data.content || '').trim();

    let composedTitle = normalizedTitle;
    if (data.category && data.category !== 'General') {
      composedTitle = `[${data.category}] ${composedTitle}`;
    }
    if (data.priority === 'important') {
      composedTitle = `IMPORTANT: ${composedTitle}`;
    }

    const link = String(data.referenceUrl || '').trim();
    const composedContent = link ? `${normalizedContent}\n\nMore info: ${link}` : normalizedContent;

    return { title: composedTitle, content: composedContent };
  };

  const handleCreateNews = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      setError('Title and content are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = composeNewsPayload(formData);

      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: payload.title,
          content: payload.content,
          hideAuthor: formData.hideAuthor,
          published: formData.publishNow,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || 'Failed to create news');
        return;
      }

      setFormData({
        title: '',
        content: '',
        hideAuthor: false,
        publishNow: false,
        category: 'General',
        priority: 'normal',
        referenceUrl: '',
      });
      setShowForm(false);
      onNewsUpdate();
    } catch (err) {
      console.error('Error creating news:', err);
      setError('Error creating news');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNews = async (newsId) => {
    if (!window.confirm('Delete this news item?')) return;

    try {
      const res = await fetch(`/api/admin/news/${newsId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Failed to delete news');
        return;
      }

      onNewsUpdate();
    } catch (err) {
      console.error('Error deleting news:', err);
      alert('Error deleting news');
    }
  };

  const handlePublishNews = async (newsId, published) => {
    try {
      const res = await fetch(`/api/admin/news/${newsId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ published: !published }),
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Failed to update news');
        return;
      }

      onNewsUpdate();
    } catch (err) {
      console.error('Error updating news:', err);
      alert('Error updating news');
    }
  };

  const handleToggleAuthorHidden = async (newsId, hideAuthor) => {
    try {
      const res = await fetch(`/api/admin/news/${newsId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hideAuthor: !hideAuthor }),
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Failed to update author visibility');
        return;
      }

      onNewsUpdate();
    } catch (err) {
      console.error('Error updating author visibility:', err);
      alert('Error updating author visibility');
    }
  };

  const handleStartEdit = (item) => {
    const parsedTitle = parseNewsMeta(item.title);
    const parsedContent = parseNewsContent(item.content);
    setEditingId(item.id);
    setEditForm({
      title: parsedTitle.title,
      content: parsedContent.content,
      category: parsedTitle.category,
      priority: parsedTitle.important ? 'important' : 'normal',
      referenceUrl: parsedContent.referenceUrl,
      hideAuthor: Boolean(item.hideAuthor),
      published: Boolean(item.published),
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async (newsId) => {
    if (!editForm || !editForm.title || !editForm.content) {
      alert('Title and content are required');
      return;
    }

    try {
      const payload = composeNewsPayload(editForm);
      const res = await fetch(`/api/admin/news/${newsId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: payload.title,
          content: payload.content,
          hideAuthor: editForm.hideAuthor,
          published: editForm.published,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Failed to save changes');
        return;
      }

      setEditingId(null);
      setEditForm(null);
      onNewsUpdate();
    } catch (err) {
      console.error('Error saving news edit:', err);
      alert('Error saving changes');
    }
  };

  return (
    <div>
      {/* Create News Form */}
      {!isViewer && (
        <div style={{ marginBottom: 32 }}>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '10px 16px',
              background: C.blurple,
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              marginBottom: showForm ? 16 : 0,
            }}
          >
            {showForm ? 'Cancel' : '+ New Update'}
          </button>

          {showForm && (
            <form
              onSubmit={handleCreateNews}
              style={{
                padding: 20,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {error && (
                <div style={{ color: C.red, fontSize: 13 }}>
                  {error}
                </div>
              )}
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 13 }}>
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="News title"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    color: C.text,
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 13 }}>
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="News content"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    color: C.text,
                    fontSize: 13,
                    boxSizing: 'border-box',
                    minHeight: 120,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 13 }}>
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      color: C.text,
                      fontSize: 13,
                    }}
                  >
                    <option value="General">General</option>
                    <option value="Announcement">Announcement</option>
                    <option value="Feature">Feature</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 13 }}>
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      color: C.text,
                      fontSize: 13,
                    }}
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 13 }}>
                  Reference URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.referenceUrl}
                  onChange={(e) => setFormData({ ...formData, referenceUrl: e.target.value })}
                  placeholder="https://example.com/more-info"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    color: C.text,
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: C.text,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.hideAuthor}
                  onChange={(e) => setFormData({ ...formData, hideAuthor: e.target.checked })}
                />
                Post anonymously as <strong style={{ color: C.lightText }}>Site Admin</strong>
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: C.text,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.publishNow}
                  onChange={(e) => setFormData({ ...formData, publishNow: e.target.checked })}
                />
                Publish immediately
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '10px 16px',
                    background: C.green,
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Creating...' : 'Create Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: '10px 16px',
                    background: 'transparent',
                    color: C.text,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: 13,
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* News List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {news?.length > 0 ? (
          news.map((item) => (
            <div
              key={item.id}
              style={{
                padding: 20,
                background: C.surface,
                border: `1px solid ${item.published ? C.green : C.border}`,
                borderRadius: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600, color: C.lightText }}>
                    {parseNewsMeta(item.title).title}
                  </h3>
                  <p style={{ margin: '0 0 12px 0', fontSize: 13, color: C.muted }}>
                    by {item.hideAuthor ? 'Site Admin (hidden)' : item.author} • {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '3px 7px',
                        borderRadius: 999,
                        background: 'rgba(88,101,242,0.14)',
                        color: C.blurple,
                        fontWeight: 600,
                      }}
                    >
                      {parseNewsMeta(item.title).category}
                    </span>
                    {parseNewsMeta(item.title).important && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '3px 7px',
                          borderRadius: 999,
                          background: 'rgba(237,66,69,0.14)',
                          color: C.red,
                          fontWeight: 700,
                        }}
                      >
                        Important
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: C.text,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: 100,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.content}
                  </p>
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    background: item.published ? 'rgba(87, 242, 135, 0.15)' : 'rgba(254, 231, 92, 0.15)',
                    color: item.published ? C.green : C.yellow,
                    minWidth: 70,
                    textAlign: 'center',
                  }}
                >
                  {item.published ? 'Published' : 'Draft'}
                </span>
              </div>

              {editingId === item.id && editForm && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 14,
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    background: C.bg,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    placeholder="Title"
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      color: C.text,
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                  <textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    placeholder="Content"
                    style={{
                      width: '100%',
                      minHeight: 100,
                      padding: '9px 10px',
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      color: C.text,
                      fontSize: 13,
                      boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        color: C.text,
                        fontSize: 13,
                      }}
                    >
                      <option value="General">General</option>
                      <option value="Announcement">Announcement</option>
                      <option value="Feature">Feature</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Security">Security</option>
                    </select>
                    <select
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        color: C.text,
                        fontSize: 13,
                      }}
                    >
                      <option value="normal">Normal</option>
                      <option value="important">Important</option>
                    </select>
                  </div>
                  <input
                    type="url"
                    value={editForm.referenceUrl}
                    onChange={(e) => setEditForm({ ...editForm, referenceUrl: e.target.value })}
                    placeholder="Reference URL (optional)"
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      color: C.text,
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: C.text }}>
                    <input
                      type="checkbox"
                      checked={editForm.hideAuthor}
                      onChange={(e) => setEditForm({ ...editForm, hideAuthor: e.target.checked })}
                    />
                    Hide author (show as Site Admin)
                  </label>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: C.text }}>
                    <input
                      type="checkbox"
                      checked={editForm.published}
                      onChange={(e) => setEditForm({ ...editForm, published: e.target.checked })}
                    />
                    Published
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleSaveEdit(item.id)}
                      style={{
                        padding: '6px 12px',
                        background: C.green,
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        color: C.text,
                        border: `1px solid ${C.border}`,
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!isViewer && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => handleStartEdit(item)}
                    style={{
                      padding: '6px 12px',
                      background: 'transparent',
                      color: C.blurple,
                      border: `1px solid ${C.blurple}`,
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handlePublishNews(item.id, item.published)}
                    style={{
                      padding: '6px 12px',
                      background: item.published ? C.red : C.green,
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {item.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => handleDeleteNews(item.id)}
                    style={{
                      padding: '6px 12px',
                      background: C.red,
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                  <button
                    onClick={() => handleToggleAuthorHidden(item.id, item.hideAuthor)}
                    style={{
                      padding: '6px 12px',
                      background: item.hideAuthor ? C.blurple : 'transparent',
                      color: item.hideAuthor ? 'white' : C.blurple,
                      border: `1px solid ${C.blurple}`,
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {item.hideAuthor ? 'Show Author' : 'Hide Author'}
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', color: C.muted, padding: '40px' }}>
            No news yet. {!isViewer && 'Create your first update!'}
          </div>
        )}
      </div>
    </div>
  );
}
