import React, { useState } from 'react';
import { BookOpen, Trash2, Edit2 } from 'lucide-react';
import { C } from '../constants';

export default function CollectionCard({ collection, onEdit, onDelete, showActions = false, onClick, loading = false }) {
  const [hov, setHov] = useState(false);

  if (!loading && !collection) {
    return null;
  }

  if (loading) {
    return (
      <div
        style={{
          background: `linear-gradient(135deg, ${C.surface} 0%, rgba(88,101,242,0.03) 100%)`,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 140,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative gradient accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: `linear-gradient(90deg, transparent, rgba(88,101,242,0.2), transparent)`,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <div className="skeleton" style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="skeleton" style={{ width: '70%', height: 16, borderRadius: 6, marginBottom: 6 }} />
            <div className="skeleton" style={{ width: '100%', height: 13, borderRadius: 6 }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 12 }}>
          <div className="skeleton" style={{ width: 40, height: 13, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: 30, height: 13, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: 50, height: 13, borderRadius: 6 }} />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: `linear-gradient(135deg, ${C.surface} 0%, ${hov ? 'rgba(88,101,242,0.08)' : 'rgba(88,101,242,0.02)'} 100%)`,
        border: `1px solid ${hov ? 'rgba(88,101,242,0.5)' : C.border}`,
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 140,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hov
          ? '0 12px 40px rgba(88,101,242,0.15), 0 1px 3px rgba(0,0,0,0.3)'
          : '0 1px 2px rgba(0,0,0,0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative gradient accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, rgba(88,101,242,${hov ? 0.5 : 0.2}), transparent)`,
        }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <BookOpen size={18} color={C.blurple} style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                color: C.white,
                fontSize: 16,
                fontWeight: 700,
                wordBreak: 'break-word',
              }}
            >
              {collection.name}
            </h3>
            {collection.description && (
              <p style={{ margin: '6px 0 0', color: C.muted, fontSize: 13, lineHeight: '1.4' }}>{collection.description}</p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, color: C.muted, fontSize: 12, marginTop: 'auto', paddingTop: 12 }}>
          <span>{collection.commandCount || 0} command{(collection.commandCount || 0) !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span>by {collection.creator?.username || 'Unknown'}</span>
        </div>
      </div>

      {showActions && (onEdit || onDelete) && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          {onEdit && (
            <button
              onClick={() => onEdit(collection)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: 'transparent',
                color: C.blurple,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                transition: 'all 0.2s ease',
              }}
            >
              <Edit2 size={14} />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(collection.id)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid rgba(237,66,69,0.35)`,
                background: 'transparent',
                color: C.red,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                transition: 'all 0.2s ease',
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
