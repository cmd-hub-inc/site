import React, { useState, useEffect } from 'react';
import { Bookmark, Trash2, Plus, Loader } from 'lucide-react';
import { C } from '../constants';

export default function SavedSearches({ onSelectSearch, userToken }) {
  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', query: '' });
  const [submitting, setSubmitting] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '' : '');

  // Fetch saved searches
  useEffect(() => {
    if (!userToken) return;
    
    const fetchSavedSearches = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/api/saved-searches`, {
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (res.ok) {
          const data = await res.json();
          setSavedSearches(Array.isArray(data) ? data : []);
        } else if (res.status === 401) {
          setError('Session expired');
        } else {
          setError('Failed to load saved searches');
        }
      } catch (err) {
        setError('Failed to load saved searches');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedSearches();
  }, [userToken, API_BASE]);

  const handleCreateSearch = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.query.trim()) {
      setError('Search name and query are required');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/api/saved-searches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          query: formData.query.trim(),
        }),
      });

      if (res.ok) {
        const newSearch = await res.json();
        setSavedSearches([newSearch, ...savedSearches]);
        setFormData({ name: '', query: '' });
        setShowForm(false);
        setError(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create saved search');
      }
    } catch (err) {
      setError('Failed to create saved search');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSearch = async (id) => {
    if (!confirm('Delete this saved search?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/saved-searches/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (res.ok) {
        setSavedSearches(savedSearches.filter((s) => s.id !== id));
        setError(null);
      } else {
        setError('Failed to delete saved search');
      }
    } catch (err) {
      setError('Failed to delete saved search');
      console.error(err);
    }
  };

  if (!userToken) {
    return (
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: 16,
        textAlign: 'center',
        color: C.muted,
      }}>
        <p>Sign in to save your searches</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
      }}>
        <Bookmark size={20} color={C.blurple} strokeWidth={2} />
        <h3 style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 600,
          color: C.white,
        }}>
          Saved Searches
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            marginLeft: 'auto',
            background: C.blurple,
            color: C.white,
            border: 'none',
            borderRadius: 6,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => e.target.style.opacity = '0.8'}
          onMouseLeave={(e) => e.target.style.opacity = '1'}
        >
          <Plus size={14} strokeWidth={2} />
          New
        </button>
      </div>

      {error && (
        <div style={{
          background: `rgba(255, 71, 87, 0.1)`,
          border: `1px solid ${C.red}`,
          borderRadius: 6,
          padding: 12,
          marginBottom: 12,
          color: C.red,
          fontSize: 12,
        }}>
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreateSearch} style={{
          background: `rgba(88, 101, 242, 0.05)`,
          border: `1px solid rgba(88, 101, 242, 0.2)`,
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: C.muted,
              marginBottom: 6,
            }}>
              Search Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Favorite Middleware"
              style={{
                width: '100%',
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: '8px 12px',
                color: C.text,
                fontSize: 13,
                boxSizing: 'border-box',
              }}
              disabled={submitting}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: C.muted,
              marginBottom: 6,
            }}>
              Search Query
            </label>
            <input
              type="text"
              value={formData.query}
              onChange={(e) => setFormData({ ...formData, query: e.target.value })}
              placeholder="e.g., middleware express"
              style={{
                width: '100%',
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: '8px 12px',
                color: C.text,
                fontSize: 13,
                boxSizing: 'border-box',
              }}
              disabled={submitting}
            />
          </div>

          <div style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{
                background: 'transparent',
                border: `1px solid ${C.border}`,
                color: C.text,
                borderRadius: 6,
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.name.trim() || !formData.query.trim()}
              style={{
                background: C.blurple,
                color: C.white,
                border: 'none',
                borderRadius: 6,
                padding: '8px 16px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontWeight: 600,
                opacity: submitting ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {submitting ? <Loader size={12} className="spin" /> : null}
              Save
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: C.muted, padding: '24px 16px' }}>
          <Loader size={20} style={{ margin: '0 auto 8px', animation: 'spin 0.8s linear infinite' }} />
          <p>Loading saved searches...</p>
        </div>
      ) : savedSearches.length === 0 ? (
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: 16,
          textAlign: 'center',
          color: C.muted,
        }}>
          <p style={{ margin: 0, fontSize: 13 }}>No saved searches yet</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12,
        }}>
          {savedSearches.map((search) => (
            <div
              key={search.id}
              onClick={() => onSelectSearch && onSelectSearch(search.query)}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.blurple;
                e.currentTarget.style.background = `rgba(88, 101, 242, 0.05)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.background = C.surface;
              }}
            >
              <p style={{
                margin: '0 0 8px 0',
                fontSize: 13,
                fontWeight: 600,
                color: C.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {search.name}
              </p>
              <p style={{
                margin: 0,
                fontSize: 12,
                color: C.muted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                "{search.query}"
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSearch(search.id);
                }}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: C.muted,
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = C.red}
                onMouseLeave={(e) => e.currentTarget.style.color = C.muted}
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}
