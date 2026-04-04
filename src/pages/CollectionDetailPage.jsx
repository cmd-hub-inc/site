import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, AlertCircle, Edit2, Trash2, BookOpen } from 'lucide-react';
import { fetchCollection, deleteCollection } from '../api';
import CollectionCommandManager from '../components/CollectionCommandManager';
import CollectionManager from '../components/CollectionManager';
import { C } from '../constants';
import { getCollectionMetaTags } from '../lib/metaTags';

export default function CollectionDetailPage({ collectionId, user, onNavigate }) {
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const isOwner = user?.id === collection?.createdBy;

  const loadCollection = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCollection(collectionId);
      setCollection(data);
    } catch (err) {
      setError(err.message || 'Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollection();
  }, [collectionId]);

  const handleUpdate = async (updated) => {
    setCollection(updated);
    setShowEditModal(false);
  };

  const handleCommandAdded = (command) => {
    if (!command || !command.id) return;
    setCollection((prev) => {
      if (!prev) return prev;
      const existing = (prev.commands || []).some((c) => c && c.id === command.id);
      if (existing) return prev;
      const nextCommands = [command, ...(prev.commands || [])];
      return {
        ...prev,
        commands: nextCommands,
        commandCount: nextCommands.length,
      };
    });
  };

  const handleCommandRemoved = (commandId) => {
    if (!commandId) return;
    setCollection((prev) => {
      if (!prev) return prev;
      const nextCommands = (prev.commands || []).filter((c) => c && c.id !== commandId);
      return {
        ...prev,
        commands: nextCommands,
        commandCount: nextCommands.length,
      };
    });
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteCollection(collectionId);
      onNavigate && onNavigate('collections');
    } catch (err) {
      setError(err.message || 'Failed to delete collection');
    }
  };

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '56px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div className="skeleton" style={{ width: 170, height: 18, borderRadius: 8, marginBottom: 14 }} />

          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 18,
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div className="skeleton" style={{ width: 26, height: 26, borderRadius: 6, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '48%', height: 34, borderRadius: 8, marginBottom: 10 }} />
                <div className="skeleton" style={{ width: '80%', height: 14, borderRadius: 6, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '62%', height: 13, borderRadius: 6 }} />
              </div>
            </div>
          </div>

          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div className="skeleton" style={{ width: 220, height: 24, borderRadius: 6, marginBottom: 14 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 12 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={`collection-detail-command-skeleton-${i}`}
                  style={{
                    background: C.surface2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: 16,
                    minHeight: 150,
                  }}
                >
                  <div className="skeleton" style={{ width: '72%', height: 18, borderRadius: 6, marginBottom: 10 }} />
                  <div className="skeleton" style={{ width: '94%', height: 12, borderRadius: 6, marginBottom: 7 }} />
                  <div className="skeleton" style={{ width: '70%', height: 12, borderRadius: 6, marginBottom: 12 }} />
                  <div className="skeleton" style={{ width: '40%', height: 12, borderRadius: 6 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !collection) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '56px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <button
            onClick={() => onNavigate && onNavigate('collections')}
            style={{
              border: 'none',
              padding: 0,
              background: 'transparent',
              color: C.blurple,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={18} />
            Back to Collections
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(237,66,69,0.35)',
              background: 'rgba(237,66,69,0.14)',
              color: C.red,
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return null;
  }

  const metaTags = getCollectionMetaTags(collection);

  return (
    <>
      <Helmet>
        <title>{collection.name} - CmdHub Collection</title>
        {metaTags.map((tag, idx) => {
          const { property, ...rest } = tag;
          return property ? <meta key={idx} property={property} {...rest} /> : <meta key={idx} {...rest} />;
        })}
      </Helmet>

      <div style={{ background: C.bg, minHeight: '100vh', color: C.text, padding: '56px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <button
          onClick={() => onNavigate && onNavigate('collections')}
          style={{
            border: 'none',
            background: 'transparent',
            color: C.blurple,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            marginBottom: 12,
            fontWeight: 600,
            padding: 0,
          }}
        >
          <ArrowLeft size={18} />
          Back to Collections
        </button>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid rgba(237,66,69,0.35)',
              background: 'rgba(237,66,69,0.14)',
              color: C.red,
              marginBottom: 12,
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 18,
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
              <BookOpen size={26} color={C.blurple} style={{ marginTop: 2 }} />
              <div>
                <h1 style={{ margin: '0 0 8px', color: C.text, fontSize: 34, fontWeight: 800 }}>{collection.name}</h1>
                {collection.description && (
                  <p style={{ margin: '0 0 8px', color: C.muted, fontSize: 16 }}>{collection.description}</p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, color: C.muted, fontSize: 13 }}>
                  <span>{collection.commandCount || 0} commands</span>
                  <span>•</span>
                  <span>by {collection.creator?.username || 'Unknown'}</span>
                  <span>•</span>
                  <span>Created {new Date(collection.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {isOwner && (
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => setShowEditModal(true)}
                  style={{
                    border: `1px solid ${C.border}`,
                    background: C.blurpleDim,
                    color: C.blurple,
                    borderRadius: 8,
                    padding: 8,
                    cursor: 'pointer',
                  }}
                  title="Edit collection"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    border: '1px solid rgba(237,66,69,0.35)',
                    background: 'rgba(237,66,69,0.14)',
                    color: C.red,
                    borderRadius: 8,
                    padding: 8,
                    cursor: 'pointer',
                  }}
                  title="Delete collection"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 18,
          }}
        >
          <h2 style={{ margin: '0 0 14px', color: C.text, fontSize: 20 }}>Commands in Collection</h2>
          <CollectionCommandManager
            collection={collection}
            onUpdate={loadCollection}
            onCommandAdded={handleCommandAdded}
            onCommandRemoved={handleCommandRemoved}
            isOwner={isOwner}
          />
        </div>
        </div>

        {showEditModal && (
          <CollectionManager
            collection={collection}
            onClose={() => setShowEditModal(false)}
            onSuccess={handleUpdate}
          />
        )}
      </div>
    </>
  );
}
