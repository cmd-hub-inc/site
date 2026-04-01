import React, { useEffect, useState } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { C } from '../constants';

export default function AdminPage({ user, onNavigate }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // You can customize this check based on your user model
    const isUserAdmin = user.isAdmin || user.role === 'admin';
    setIsAdmin(isUserAdmin);
    setLoading(false);
  }, [user]);

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: C.muted }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: 800, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 20,
            background: C.blurpleDim,
            borderRadius: 12,
            border: `1px solid ${C.blurple}`,
          }}
        >
          <AlertCircle size={24} color={C.blurple} />
          <div>
            <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: C.blurple }}>
              Access Denied
            </p>
            <p style={{ margin: 0, fontSize: 14, color: C.muted }}>
              You don't have permission to access the admin dashboard.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Shield size={32} color={C.blurple} />
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: C.lightText }}>
            Admin Dashboard
          </h1>
        </div>
        <p style={{ margin: 0, color: C.muted, fontSize: 15 }}>
          Manage the platform, review content, and monitor system health.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 20,
          marginBottom: 40,
        }}
      >
        {/* Admin Cards */}
        <AdminCard title="Users" description="Manage user accounts" icon="👥" />
        <AdminCard title="Commands" description="Review and moderate commands" icon="⚙️" />
        <AdminCard title="Reports" description="View user reports and issues" icon="📋" />
        <AdminCard title="System Health" description="Monitor system status" icon="🏥" />
      </div>

      <div
        style={{
          padding: 20,
          background: C.darkBlog,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
        }}
      >
        <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: C.lightText }}>
          Recent Activity
        </h2>
        <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>
          Admin features coming soon...
        </p>
      </div>
    </div>
  );
}

function AdminCard({ title, description, icon }) {
  return (
    <div
      style={{
        padding: 20,
        background: C.darkBlog,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.blurple;
        e.currentTarget.style.background = C.blurpleDim;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.background = C.darkBlog;
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600, color: C.lightText }}>
        {title}
      </h3>
      <p style={{ margin: 0, fontSize: 14, color: C.muted }}>{description}</p>
    </div>
  );
}
