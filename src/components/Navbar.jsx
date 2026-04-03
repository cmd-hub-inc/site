import React, { useState } from 'react';
import { Grid, Upload, LogOut, Users, BarChart3, Code2, Menu, X, Shield, Newspaper, BookOpen, Sun, Moon } from 'lucide-react';
import { C } from '../constants';

export default function Navbar({ theme, page, user, pageParams, newsHasUnread, onNavigate, onToggleTheme, onLogin, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navBtn = (id, label, icon) => {
    const active = page === id;
    const showUnreadDot = id === 'news' && newsHasUnread;
    return (
      <button
        key={id}
        className="nav-btn"
        onClick={() => {
          onNavigate(id);
          setMobileOpen(false);
        }}
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
        {showUnreadDot && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#ed4245',
              marginRight: 6,
              flex: '0 0 auto',
            }}
          />
        )}
        {icon} {label}
      </button>
    );
  };

  return (
    <nav
      className="site-nav"
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 8 }}>
        <button
          onClick={() => onNavigate('home')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
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
      </div>
      <div className="nav-center" style={{ display: 'flex', gap: 2, flex: 1 }}>
        {navBtn('browse', 'Browse', <Grid size={15} />)}
        {navBtn('collections', 'Collections', <BookOpen size={15} />)}
        {navBtn('creators', 'Creators', <Users size={15} />)}
        {navBtn('news', 'News', <Newspaper size={15} />)}
        {navBtn('upload', 'Upload', <Upload size={15} />)}
      </div>

      <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        <button
          className="hamburger"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((s) => !s)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'none',
            padding: 6,
            borderRadius: 6,
            color: C.text,
          }}
        >
          {mobileOpen ? <X size={18} color={C.text} /> : <Menu size={18} color={C.text} />}
        </button>

        <button
          className="nav-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            background: 'none',
            border: `1px solid ${C.border}`,
            cursor: 'pointer',
            borderRadius: 8,
            padding: '6px 10px',
            color: C.text,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

      
        {user === undefined ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }} />
            <div className="skeleton" style={{ width: 80, height: 12, borderRadius: 6 }} />
          </div>
        ) : user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => onNavigate('dashboard')}
            title="Creator Dashboard"
            className="nav-btn"
            style={{
              background: page === 'dashboard' ? C.blurpleDim : 'none',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 8,
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: page === 'dashboard' ? C.blurple : C.muted,
              fontSize: 14,
              fontWeight: page === 'dashboard' ? 600 : 400,
            }}
          >
            <BarChart3 size={15} />
            Dashboard
          </button>
          {user.isAdmin && (
            <>
              <button
                onClick={() => onNavigate('admin')}
                title="Admin Dashboard"
                className="nav-btn"
                style={{
                  background: page === 'admin' ? C.blurpleDim : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 8,
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: page === 'admin' ? C.blurple : C.muted,
                  fontSize: 14,
                  fontWeight: page === 'admin' ? 600 : 400,
                }}
              >
                <Shield size={15} />
                Admin
              </button>
            </>
          )}
          <button
            onClick={() => onNavigate('profile', { id: user && user.id ? user.id : undefined })}
            className="nav-btn"
            style={{
              background: page === 'profile' && user && String(pageParams?.id) === String(user.id) ? C.blurpleDim : 'none',
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
                color: page === 'profile' && user && String(pageParams?.id) === String(user.id) ? C.blurple : C.text,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {user.username}
            </span>
          </button>
          <button
            className="nav-btn"
            onClick={onLogout}
            title="Log out"
            style={{
              background: 'none',
              border: 'none',
              color: C.red,
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <LogOut size={16} color={C.red} />
            <span style={{ marginLeft: 8, color: C.red, fontSize: 14, fontWeight: 500 }}>Log out</span>
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
      </div>

      {mobileOpen && (
        <div
          className="mobile-menu"
          role="menu"
          aria-label="Main menu"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 60,
            background: C.surface,
            borderTop: `1px solid ${C.border}`,
            padding: 12,
            zIndex: 110,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {navBtn('browse', 'Browse', <Grid size={15} />)}
            {navBtn('collections', 'Collections', <BookOpen size={15} />)}
            {navBtn('creators', 'Creators', <Users size={15} />)}
            {navBtn('news', 'News', <Newspaper size={15} />)}
            {navBtn('upload', 'Upload', <Upload size={15} />)}
          </div>

          <div style={{ height: 1, background: C.border, margin: '12px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="nav-btn"
              onClick={() => {
                onToggleTheme();
                setMobileOpen(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: C.text,
                textAlign: 'left',
                padding: '8px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
            {user ? (
              <>
                <button
                  className="nav-btn"
                  onClick={() => {
                    onNavigate('dashboard');
                    setMobileOpen(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: C.text,
                    textAlign: 'left',
                    padding: '8px 6px',
                    cursor: 'pointer',
                  }}
                >
                        <BarChart3 size={15} />
                        <span style={{ marginLeft: 8 }}>Dashboard</span>
                </button>
                {user.isAdmin && (
                  <button
                    className="nav-btn"
                    onClick={() => {
                      onNavigate('admin', { hash: 'news' });
                      setMobileOpen(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: C.text,
                      textAlign: 'left',
                      padding: '8px 6px',
                      cursor: 'pointer',
                    }}
                  >
                    <Newspaper size={15} />
                    <span style={{ marginLeft: 8 }}>Post News</span>
                  </button>
                )}
                <button
                  className="nav-btn"
                  onClick={() => {
                    onNavigate('profile', { id: user && user.id ? user.id : undefined });
                    setMobileOpen(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: C.text,
                    textAlign: 'left',
                    padding: '8px 6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.blurple, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                  <span style={{ color: C.text }}>View profile</span>
                </button>
                <button
                  className="nav-btn"
                  onClick={() => {
                    onLogout();
                    setMobileOpen(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: C.red,
                    textAlign: 'left',
                    padding: '8px 6px',
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={15} color={C.red} />
                  <span style={{ marginLeft: 8, color: C.red }}>Log out</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  onLogin();
                  setMobileOpen(false);
                }}
                style={{
                  background: C.blurple,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Login with Discord
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
