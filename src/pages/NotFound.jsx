import React from 'react';
import { C } from '../constants';

export default function NotFound() {
  const btnBase = {
    border: 'none',
    borderRadius: 8,
    padding: '10px 16px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  };

  const linkStyle = { textDecoration: 'none' };

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: C.white, fontSize: 56, margin: 0 }}>404</h1>
        <div style={{ color: C.muted, marginTop: 8 }}>
          Page not found or you're not authorized to view this page.
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
          <a href="/" style={linkStyle}>
            <button
              style={{
                ...btnBase,
                background: 'none',
                color: C.text,
                border: `1px solid ${C.border}`,
              }}
            >
              Home
            </button>
          </a>

          <a href="/browse" style={linkStyle}>
            <button style={{ ...btnBase, background: C.surface2, color: C.text }}>Browse</button>
          </a>

          <a href="/upload" style={linkStyle}>
            <button style={{ ...btnBase, background: C.blurple, color: '#fff' }}>Upload</button>
          </a>

          <a href="/api/auth/discord" style={linkStyle}>
            <button
              style={{
                ...btnBase,
                background: 'transparent',
                color: C.blurple,
                border: `1px solid ${C.blurple}`,
              }}
            >
              Log in
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
