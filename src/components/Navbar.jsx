import React from 'react';
import { Home, Grid, Upload, LogOut, Users } from 'lucide-react';
import { Code2 } from 'lucide-react';
import { C } from '../constants';

export default function Navbar({ page, user, onNavigate, onLogin, onLogout }) {
  const navBtn = (id, label, icon) => {
    const active = page === id;
    return (
      <button
        key={id}
        onClick={() => onNavigate(id)}
        style={{
          background: active ? C.blurpleDim : 'none',
          border: 'none',
          color: active ? C.blurple : C.muted,
          borderRadius: 8,
          padding: '6px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 14,
          fontWeight: active ? 600 : 400,
        }}
      >
        {icon} {label}
      </button>
    );
  };

  return (
    <nav
      style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: 60,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(12px)',
      }}
    >
      <button
        onClick={() => onNavigate('home')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginRight: 28,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            background: C.blurple,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Code2 size={16} color="#fff" />
        </div>
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 17,
            color: C.white,
          }}
        >
          CmdHub
        </span>
      </button>

      <div style={{ display: 'flex', gap: 2, flex: 1 }}>
        {navBtn('home', 'Home', <Home size={15} />)}
        {navBtn('browse', 'Browse', <Grid size={15} />)}
        {navBtn('creators', 'Creators', <Users size={15} />)}
        {navBtn('upload', 'Upload', <Upload size={15} />)}
      </div>

      {user === undefined ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }} />
          <div className="skeleton" style={{ width: 80, height: 12, borderRadius: 6 }} />
        </div>
      ) : user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => onNavigate('profile', { id: user && user.id ? user.id : undefined })}
            style={{
              background: page === 'profile' ? C.blurpleDim : 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 8,
              padding: '5px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: C.blurple,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#fff',
                }}
              >
                {user.username[0].toUpperCase()}
              </div>
            )}
            <span
              style={{
                color: page === 'profile' ? C.blurple : C.text,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {user.username}
            </span>
          </button>
          <button
            onClick={onLogout}
            title="Log out"
            style={{
              background: 'none',
              border: 'none',
              color: C.faint,
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={onLogin}
          style={{
            background: C.blurple,
            color: '#fff',
            textDecoration: 'none',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          Login with Discord
        </button>
      )}
    </nav>
  );
}
