import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { createCollection, updateCollection } from '../api';
import { C } from '../constants';

export default function CollectionManager({ collection = null, onClose, onSuccess }) {
  const [name, setName] = useState(collection?.name || '');
  const [description, setDescription] = useState(collection?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setDescription(collection.description || '');
    }
  }, [collection]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trimmedName = name.trim();
      const trimmedDesc = description.trim();

      if (!trimmedName) {
        setError('Collection name is required');
        setLoading(false);
        return;
      }

      let result;
      if (collection) {
        result = await updateCollection(collection.id, trimmedName, trimmedDesc);
      } else {
        result = await createCollection(trimmedName, trimmedDesc);
      }

      onSuccess?.(result);
      onClose?.();
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 28, color: C.text, fontWeight: 700 }}>
            {collection ? 'Edit Collection' : 'Create Collection'}
          </h2>
          <button
            onClick={onClose}
            style={{
              border: `1px solid ${C.border}`,
              background: C.surface2,
              color: C.text,
              borderRadius: 8,
              padding: 6,
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid rgba(237,66,69,0.35)`,
                background: 'rgba(237,66,69,0.14)',
                color: C.red,
                fontSize: 14,
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="name" style={{ display: 'block', marginBottom: 6, color: C.muted, fontSize: 14 }}>
              Collection Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Validation Commands"
              maxLength="100"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: C.surface2,
                color: C.text,
                fontSize: 15,
              }}
              disabled={loading}
            />
            <p style={{ margin: '6px 0 0', color: C.faint, fontSize: 12 }}>{name.length}/100</p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="description" style={{ display: 'block', marginBottom: 6, color: C.muted, fontSize: 14 }}>
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this collection is about..."
              maxLength="500"
              rows="3"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: C.surface2,
                color: C.text,
                fontSize: 15,
                resize: 'vertical',
                minHeight: 90,
              }}
              disabled={loading}
            />
            <p style={{ margin: '6px 0 0', color: C.faint, fontSize: 12 }}>{description.length}/500</p>
          </div>

          <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: C.surface2,
                color: C.text,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 10,
                border: 'none',
                background: C.blurple,
                color: C.white,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Saving...' : collection ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
