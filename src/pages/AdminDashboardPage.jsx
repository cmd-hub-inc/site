import { useEffect, useState } from 'react';
import { C } from '../constants';
import { Users, Package, AlertCircle, CheckCircle, XCircle, Eye, Filter } from 'lucide-react';

export default function AdminDashboardPage({ user, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [section, setSection] = useState('overview'); // overview, commands, users, reports
  const [filter, setFilter] = useState('all'); // for commands: all, pending, approved
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminRole, setAdminRole] = useState(null);

  // Check admin access
  useEffect(() => {
    if (user === null) {
      onNavigate?.('home');
      return;
    }

    const checkAdmin = async () => {
      try {
        console.log('[admin] Checking admin status...');
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
        } else {
          console.warn('[admin] Admin check failed with status:', res.status);
          onNavigate?.('home');
        }
      } catch (err) {
        console.error('[admin] Admin check error:', err);
        onNavigate?.('home');
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
        const res = await fetch(`/api/admin/data?section=${section}&filter=${filter}`, { credentials: 'include' });
        console.log('[admin] Data response:', res.status);
        if (!res.ok) {
          const errData = await res.json();
          console.error('[admin] Error response:', errData);
          setError('Failed to load data: ' + (errData.error || 'Unknown error'));
          return;
        }
        const data = await res.json();
        console.log('[admin] Data loaded:', data);
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('[admin] Fetch error:', err);
        setError('Error loading admin data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [adminRole, section, filter]);

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
      <div style={{ background: C.bg, minHeight: '100vh', padding: '40px 20px', color: C.text }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
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
    <div style={{ background: C.bg, minHeight: '100vh', padding: '40px 20px', color: C.text }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
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
              {['overview', 'commands', 'users', 'reports'].map(sec => (
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
              <UsersList users={stats.users} isViewer={isViewer} onSuspend={handleUserSuspend} />
            )}

            {/* REPORTS SECTION */}
            {section === 'reports' && (
              <ReportsList reports={stats.reports} isViewer={isViewer} onResolve={handleReportResolve} />
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

function UsersList({ users, isViewer, onSuspend }) {
  const [actionLoading, setActionLoading] = useState(null);

  const handleSuspend = async (userId) => {
    if (isViewer) return;
    const confirm = window.confirm('Suspend this user? They can still log in but with a warning.');
    if (!confirm) return;
    setActionLoading(`suspend-${userId}`);
    try {
      await onSuspend(userId);
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
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Username</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Commands</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Status</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Joined</th>
            {!isViewer && <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {users?.map(u => (
            <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '12px 16px', fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {u.avatar && <img src={u.avatar} alt={u.username} style={{ width: 24, height: 24, borderRadius: '50%' }} />}
                  <span>{u.username}</span>
                </div>
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: C.text }}>{u._count?.commands || 0}</td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  background: u.suspended ? 'rgba(237, 66, 69, 0.15)' : 'rgba(87, 242, 135, 0.15)',
                  color: u.suspended ? C.red : C.green,
                }}>
                  {u.suspended ? 'Suspended' : 'Active'}
                </span>
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: C.muted }}>
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              {!isViewer && (
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>
                  {!u.suspended && (
                    <button
                      onClick={() => handleSuspend(u.id)}
                      disabled={actionLoading === `suspend-${u.id}`}
                      style={{
                        padding: '4px 12px',
                        background: C.red,
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: 600
                      }}
                    >
                      Suspend
                    </button>
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
