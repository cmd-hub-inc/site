import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, AlertCircle } from 'lucide-react';
import { fetchCollections, deleteCollection } from '../api';
import CollectionCard from '../components/CollectionCard';
import CollectionManager from '../components/CollectionManager';
import { C } from '../constants';

export default function CollectionsPage({ user, onNavigate }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterUserId, setFilterUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const loadCollections = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchCollections(filterUserId || null, 20, page);
      setCollections(result.data || []);
      setTotalPages(result.pagination?.pages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, [page, filterUserId]);

  const handleDelete = async (collectionId) => {
    if (!window.confirm('Are you sure you want to delete this collection?')) {
      return;
    }

    try {
      await deleteCollection(collectionId);
      setCollections(collections.filter((c) => c.id !== collectionId));
    } catch (err) {
      setError(err.message || 'Failed to delete collection');
    }
  };

  const handleCreateSuccess = (newCollection) => {
    setCollections([newCollection, ...collections]);
    setShowCreateModal(false);
    setEditingCollection(null);
  };

  const userCollections = user
    ? collections.filter((c) => c.createdBy === user.id)
    : [];

  const visibleCollections = [...collections]
    .filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const name = String(c.name || '').toLowerCase();
      const description = String(c.description || '').toLowerCase();
      const creator = String(c.creator?.username || '').toLowerCase();
      return name.includes(q) || description.includes(q) || creator.includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'name-asc') return String(a.name || '').localeCompare(String(b.name || ''));
      if (sortBy === 'name-desc') return String(b.name || '').localeCompare(String(a.name || ''));
      if (sortBy === 'commands-desc') return Number(b.commandCount || 0) - Number(a.commandCount || 0);
      if (sortBy === 'commands-asc') return Number(a.commandCount || 0) - Number(b.commandCount || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const tabButtonStyle = (active) => ({
    padding: '8px 12px',
    borderRadius: 8,
    border: `1px solid ${active ? C.blurple : C.border}`,
    background: active ? C.blurpleDim : C.surface2,
    color: active ? C.blurple : C.text,
    fontWeight: 600,
    cursor: 'pointer',
  });

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '56px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <BookOpen size={30} color={C.blurple} />
              <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1, fontWeight: 800, color: C.text }}>Collections</h1>
            </div>
            {user && (
              <button
                onClick={() => {
                  setEditingCollection(null);
                  setShowCreateModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 14px',
                  background: C.blurple,
                  color: C.white,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Plus size={18} />
                Create Collection
              </button>
            )}
          </div>
          <p style={{ margin: 0, color: C.muted, fontSize: 16 }}>
            Browse and manage curated collections of commands organized by topic or use case.
          </p>
        </div>

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

        {user && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setFilterUserId('');
                setPage(1);
              }}
              style={tabButtonStyle(!filterUserId)}
            >
              All Collections
            </button>
            <button
              onClick={() => {
                setFilterUserId(user.id);
                setPage(1);
              }}
              style={tabButtonStyle(filterUserId === user.id)}
            >
              My Collections ({userCollections.length})
            </button>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collections by name, description, or creator..."
            style={{
              flex: 1,
              minWidth: 260,
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.surface2,
              color: C.text,
              fontSize: 14,
            }}
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.surface2,
              color: C.text,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="commands-desc">Most Commands</option>
            <option value="commands-asc">Fewest Commands</option>
          </select>

          <button
            onClick={() => {
              setSearchQuery('');
              setSortBy('newest');
            }}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.surface2,
              color: C.text,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`collection-skeleton-${i}`}
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 16,
                  minHeight: 140,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <div className="skeleton" style={{ width: 18, height: 18, borderRadius: 4, marginTop: 3 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ width: '68%', height: 18, borderRadius: 6, marginBottom: 8 }} />
                    <div className="skeleton" style={{ width: '92%', height: 12, borderRadius: 6 }} />
                  </div>
                </div>
                <div className="skeleton" style={{ width: '60%', height: 12, borderRadius: 6, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '42%', height: 11, borderRadius: 6 }} />
              </div>
            ))}
          </div>
        ) : collections.length > 0 ? (
          <>
            {visibleCollections.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 12, marginBottom: 16 }}>
                {visibleCollections.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    onClick={() => onNavigate && onNavigate('collection-detail', { id: collection.id })}
                    showActions={user?.id === collection.createdBy}
                    onEdit={(coll) => {
                      setEditingCollection(coll);
                      setShowCreateModal(true);
                    }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  border: `1px dashed ${C.border}`,
                  borderRadius: 12,
                  padding: '28px 12px',
                  color: C.muted,
                  marginBottom: 16,
                }}
              >
                No collections match your current search/filter.
              </div>
            )}

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    background: C.surface2,
                    color: C.text,
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    opacity: page === 1 ? 0.6 : 1,
                  }}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={tabButtonStyle(p === page)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    background: C.surface2,
                    color: C.text,
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    opacity: page === totalPages ? 0.6 : 1,
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: C.muted,
            }}
          >
            <BookOpen size={48} color={C.muted} style={{ marginBottom: 16, opacity: 0.5 }} />
            <p style={{ fontSize: 16, margin: '0 0 8px 0' }}>
              {filterUserId ? "You haven't created any collections yet." : 'No collections found.'}
            </p>
            {user && filterUserId === user.id && (
              <>
                <p style={{ fontSize: 14, margin: '0 0 16px 0' }}>
                  Start organizing your commands into collections.
                </p>
                <button
                  onClick={() => {
                    setEditingCollection(null);
                    setShowCreateModal(true);
                  }}
                  style={{
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 12px',
                    background: C.blurple,
                    color: C.white,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Plus size={16} />
                  Create Your First Collection
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CollectionManager
          collection={editingCollection}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCollection(null);
          }}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}

