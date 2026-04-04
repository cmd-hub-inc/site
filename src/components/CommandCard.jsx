import { useState } from 'react';
import { Download, Heart, Copy, ChevronRight } from 'lucide-react';
import { C } from '../constants';
import { FrameworkBadge, TypeBadge, TagBadge } from './Badges';
import { StarRow } from './Stars';
import { fmt } from '../constants';

export default function CommandCard({ cmd, onClick, loading = false }) {
  const [hov, setHov] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!loading && !cmd) {
    return null;
  }

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`/${cmd.name}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFavorite = (e) => {
    e.stopPropagation();
    // Placeholder for favorite functionality
  };

  if (loading) {
    return (
      <div
        style={{
          background: `linear-gradient(135deg, ${C.surface} 0%, rgba(88,101,242,0.03) 100%)`,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="skeleton" style={{ width: 160, height: 18, borderRadius: 6 }} />
            <div className="skeleton" style={{ width: 60, height: 16, borderRadius: 6 }} />
          </div>
          <div className="skeleton" style={{ width: 36, height: 14, borderRadius: 6 }} />
        </div>
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          <div className="skeleton" style={{ width: '100%', height: 14, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: '85%', height: 14, borderRadius: 6 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          <div className="skeleton" style={{ width: 70, height: 22, borderRadius: 999 }} />
          <div className="skeleton" style={{ width: 52, height: 22, borderRadius: 999 }} />
          <div className="skeleton" style={{ width: 44, height: 22, borderRadius: 999 }} />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 14,
            marginTop: 14,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <div className="skeleton" style={{ width: 90, height: 14, borderRadius: 6 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 6 }} />
            <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 6 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick && onClick(cmd)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: `linear-gradient(135deg, ${C.surface} 0%, ${hov ? 'rgba(88,101,242,0.08)' : 'rgba(88,101,242,0.02)'} 100%)`,
        border: `1px solid ${hov ? 'rgba(88,101,242,0.5)' : C.border}`,
        borderRadius: 12,
        padding: 16,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hov
          ? '0 12px 40px rgba(88,101,242,0.15), 0 1px 3px rgba(0,0,0,0.3)'
          : '0 1px 2px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
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

      {/* Header with command name and type */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 16,
                fontWeight: 700,
                color: C.white,
                letterSpacing: '0.5px',
              }}
            >
              /{cmd.name}
            </span>
            <TypeBadge type={cmd.type} />
          </div>
        </div>
        <span
          style={{
            color: C.faint,
            fontSize: 11,
            whiteSpace: 'nowrap',
            background: 'rgba(255,255,255,0.04)',
            padding: '3px 8px',
            borderRadius: 4,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {cmd.version}
        </span>
      </div>

      {/* Description - Fixed height with ellipsis */}
      <p
        style={{
          color: C.text,
          fontSize: 14,
          lineHeight: 1.5,
          margin: '12px 0 0 0',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          flexShrink: 0,
          minHeight: '42px',
        }}
      >
        {cmd.description}
      </p>

      {/* Tags - Fixed height container */}
      {(cmd.tags || []).length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 10,
            minHeight: '28px',
            flexShrink: 0,
          }}
        >
          {(cmd.tags || []).slice(0, 3).map((t) => (
            <TagBadge key={t} tag={t} />
          ))}
          {(cmd.tags || []).length > 3 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                color: C.muted,
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              +{(cmd.tags || []).length - 3}
            </span>
          )}
        </div>
      )}

      {/* Spacer - grows to push footer down */}
      <div style={{ flex: 1 }} />

      {/* Divider */}
      <div style={{ height: '1px', background: C.border, margin: '12px 0', flexShrink: 0 }} />

      {/* Footer stats and actions - Fixed at bottom */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              color: C.muted,
              fontSize: 12,
              transition: 'color 0.2s ease',
              opacity: hov ? 1 : 0.8,
              whiteSpace: 'nowrap',
            }}
          >
            <Download size={13} strokeWidth={2} />
            <span style={{ fontWeight: 600 }}>{fmt(cmd.downloads)}</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              color: C.muted,
              fontSize: 12,
              transition: 'color 0.2s ease',
              opacity: hov ? 1 : 0.8,
              whiteSpace: 'nowrap',
            }}
          >
            <Heart size={13} strokeWidth={2} />
            <span style={{ fontWeight: 600 }}>{fmt(cmd.favourites)}</span>
          </div>

          <div style={{ whiteSpace: 'nowrap' }}>
            <StarRow rating={cmd.rating} size={11} />
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              background: copied ? C.green : 'rgba(255,255,255,0.08)',
              border: 'none',
              color: copied ? C.bg : C.muted,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: 12,
              fontWeight: 600,
              padding: 0,
            }}
            onMouseEnter={(e) => {
              if (!copied) e.target.style.background = 'rgba(255,255,255,0.12)';
            }}
            onMouseLeave={(e) => {
              if (!copied) e.target.style.background = 'rgba(255,255,255,0.08)';
            }}
            title="Copy command"
          >
            <Copy size={12} strokeWidth={2} />
          </button>
          <button
            onClick={handleFavorite}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: C.muted,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: 12,
              fontWeight: 600,
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(88,101,242,0.2)';
              e.target.style.color = C.blurple;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.08)';
              e.target.style.color = C.muted;
            }}
            title="Add to favorites"
          >
            <Heart size={12} strokeWidth={2} />
          </button>
          <button
            onClick={() => onClick && onClick(cmd)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              background: C.blurple,
              border: 'none',
              color: C.white,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: 12,
              fontWeight: 600,
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.target.style.background = C.blurpleHov;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = C.blurple;
            }}
            title="View details"
          >
            <ChevronRight size={12} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Framework badge row at bottom */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 10,
          borderTop: `1px solid ${C.border}`,
          marginTop: 10,
          flexShrink: 0,
        }}
      >
        <FrameworkBadge fw={cmd.framework} />
        <span style={{ color: C.faint, fontSize: 11 }}>Click to view</span>
      </div>
    </div>
  );
}
