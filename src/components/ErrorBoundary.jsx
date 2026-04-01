import React from 'react';
import { C } from '../constants';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // you could send this to an external logging service
    console.error('[ErrorBoundary] caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 44, maxWidth: 900, margin: '40px auto', color: C.white }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ color: C.muted }}>
            An unexpected error occurred while rendering this page. Try reloading or return to the
            home page.
          </p>
          <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: C.blurple,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
              }}
            >
              Reload
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              style={{
                background: 'transparent',
                color: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '8px 12px',
              }}
            >
              Home
            </button>
            <button
              onClick={() => (window.location.href = '/error.html')}
              style={{
                background: 'transparent',
                color: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '8px 12px',
              }}
            >
              Open error page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
