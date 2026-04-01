import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  Copy,
  Check,
  Heart,
  Shield,
  ExternalLink,
  Github,
  Globe,
  Eye,
  Star,
  LogIn,
} from 'lucide-react';
import { C } from '../constants';
import { FrameworkBadge, TypeBadge, TagBadge } from '../components/Badges';
import { StatPill } from '../components/Stars';

export default function CommandDetailPage({ cmd, onBack, user, loading = false }) {
  if (loading || !cmd) {
    return (
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '44px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <div className="skeleton" style={{ width: 140, height: 22, borderRadius: 8 }} />
        </div>
        <div
          className="skeleton"
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 28,
            minHeight: 300,
          }}
        />
      </div>
    );
  }

  const [copied, setCopied] = useState(false);
  const [faved, setFaved] = useState(null);
  const [favCount, setFavCount] = useState(cmd.favourites || 0);
  const [downloadCount, setDownloadCount] = useState(cmd.downloads || 0);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [aggRating, setAggRating] = useState(cmd.rating || 0);
  const [aggRatingCount, setAggRatingCount] = useState(cmd.ratingCount || 0);
  const [activeTab, setActiveTab] = useState('raw');
  const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '' : '');

  const canEdit = Boolean(user && (user.id === (cmd.author && cmd.author.id) || user.isAdmin));

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      setFaved(null);
      try {
        const r = await fetch(
          `${API_BASE}/api/commands/${encodeURIComponent(cmd.id)}/is-favourited`,
          {
            credentials: 'include',
          },
        );
        if (r.ok) {
          const j = await r.json();
          if (mounted) setFaved(Boolean(j.favourited));
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => (mounted = false);
  }, [cmd.id, user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      if (cmd && cmd.myRating != null) {
        if (mounted) setUserRating(Number(cmd.myRating) || 0);
        return;
      }
      try {
        const r = await fetch(`${API_BASE}/api/commands/${encodeURIComponent(cmd.id)}/my-rating`, {
          credentials: 'include',
        });
        if (r.ok) {
          const j = await r.json();
          if (mounted) setUserRating(Number(j.rating) || 0);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => (mounted = false);
  }, [cmd.id, user]);

  useEffect(() => {
    setAggRating(cmd.rating || 0);
    setAggRatingCount(cmd.ratingCount || 0);
    if (cmd && cmd.myRating != null) setUserRating(Number(cmd.myRating) || 0);
  }, [cmd.id, cmd.rating, cmd.ratingCount, cmd.myRating]);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(cmd.rawData);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const recordDownload = async () => {
    try {
      setDownloadCount((n) => (n || 0) + 1);
      await fetch(`${API_BASE}/api/commands/${encodeURIComponent(cmd.id)}/download`, {
        method: 'POST',
      });
    } catch (e) {
      console.error('recordDownload failed', e);
    }
  };

  const dateStr = (s) =>
    new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '44px 24px' }}>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: C.muted,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 14,
          marginBottom: 28,
        }}
      >
        <ArrowLeft size={15} /> Back to Browse
      </button>

      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 28,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          <div style={{ flex: 1, minWidth: 260 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                marginBottom: 12,
              }}
            >
              <h1
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 26,
                  fontWeight: 700,
                  color: C.white,
                  margin: 0,
                }}
              >
                / {cmd.name}
              </h1>
              <TypeBadge type={cmd.type} />
              <FrameworkBadge fw={cmd.framework} />
              <span style={{ color: C.faint, fontSize: 12 }}>{cmd.version}</span>
            </div>
            <p
              style={{
                color: C.muted,
                fontSize: 15,
                lineHeight: 1.65,
                margin: '0 0 16px',
                maxWidth: 580,
              }}
            >
              {cmd.description}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(cmd.tags || []).map((t) => (
                <TagBadge key={t} tag={t} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
            <button
              onClick={() => {
                recordDownload();
              }}
              style={{
                background: C.blurple,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '11px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Download size={15} /> Download JSON
            </button>
            <button
              onClick={handleCopy}
              style={{
                background: C.surface2,
                color: copied ? C.green : C.text,
                border: `1px solid ${copied ? 'rgba(87,242,135,0.3)' : C.border}`,
                borderRadius: 8,
                padding: '11px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {copied ? (
                <>
                  <Check size={15} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={15} /> Copy JSON
                </>
              )}
            </button>

            {user === undefined ? (
              <div className="skeleton" style={{ minWidth: 160, height: 38, borderRadius: 8 }} />
            ) : user ? (
              faved === null ? (
                <div className="skeleton" style={{ minWidth: 160, height: 38, borderRadius: 8 }} />
              ) : (
                <button
                  onClick={async () => {
                    try {
                      const r = await fetch(
                        `${API_BASE}/api/commands/${encodeURIComponent(cmd.id)}/favourite`,
                        { method: 'POST', credentials: 'include' },
                      );
                      if (r.ok) {
                        const j = await r.json();
                        setFaved(Boolean(j.favourited));
                        setFavCount((prev) => (j.favourited ? prev + 1 : Math.max(0, prev - 1)));
                      }
                    } catch (e) {
                      console.error('favourite toggle failed', e);
                    }
                  }}
                  style={{
                    background: faved ? 'rgba(237,66,69,0.12)' : C.surface2,
                    color: faved ? C.red : C.muted,
                    border: `1px solid ${faved ? 'rgba(237,66,69,0.3)' : C.border}`,
                    borderRadius: 8,
                    padding: '11px 20px',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <Heart size={15} /> {faved ? 'Favourited' : 'Favourite'}
                </button>
              )
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 24,
            flexWrap: 'wrap',
            marginTop: 22,
            paddingTop: 20,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <StatPill icon={<Download size={14} />} value={downloadCount} label="downloads" />
          <StatPill icon={<Eye size={14} />} value={cmd.views} label="views" />
          <StatPill
            icon={<Star size={14} color={C.yellow} />}
            value={aggRating ? Number(aggRating).toFixed(1) : '0.0'}
            label="rating"
          />
          <StatPill icon={<Heart size={14} />} value={favCount} label="favourites" />
          <div style={{ marginLeft: 'auto', color: C.faint, fontSize: 12 }}>
            Updated {dateStr(cmd.updatedAt)} · Created {dateStr(cmd.createdAt)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              color: C.muted,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 14,
            }}
          >
            Creator
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            <div
              role="button"
              onClick={() => {
                try {
                  const path = `/profile/${encodeURIComponent(cmd.author.id)}`;
                  window.history.pushState({}, '', path);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                } catch (e) {
                  window.location.href = `/profile/${encodeURIComponent(cmd.author.id)}`;
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: C.blurple,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#fff',
                }}
              >
                {cmd.author && cmd.author.avatar ? (
                  <img
                    src={cmd.author.avatar}
                    alt={cmd.author.username}
                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : cmd.author && cmd.author.username ? (
                  cmd.author.username[0].toUpperCase()
                ) : (
                  '?'
                )}
              </div>
              <div>
                <div style={{ color: C.text, fontWeight: 600 }}>
                  {cmd.author && cmd.author.username ? cmd.author.username.replace(/#0$/, '') : ''}
                </div>
                <div
                  style={{
                    color: C.faint,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Shield size={11} /> Discord Verified
                </div>
              </div>
            </div>

            {canEdit && (
              <button
                title="Edit upload"
                onClick={() => {
                  try {
                    const path = `/command/${encodeURIComponent(cmd.id)}/edit`;
                    window.history.pushState({}, '', path);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  } catch (e) {
                    window.location.href = `/command/${encodeURIComponent(cmd.id)}/edit`;
                  }
                }}
                style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor" />
                  <path
                    d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              color: C.muted,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 14,
            }}
          >
            Links
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cmd.githubUrl ? (
              <a
                href={cmd.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: C.text,
                  textDecoration: 'none',
                  fontSize: 13,
                }}
              >
                <Github size={15} color={C.muted} /> View on GitHub{' '}
                <ExternalLink size={11} color={C.faint} />
              </a>
            ) : (
              <span style={{ color: C.faint, fontSize: 13 }}>No GitHub link provided</span>
            )}
            {cmd.websiteUrl && (
              <a
                href={cmd.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: C.text,
                  textDecoration: 'none',
                  fontSize: 13,
                }}
              >
                <Globe size={15} color={C.muted} /> Visit Website{' '}
                <ExternalLink size={11} color={C.faint} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
          {['raw', 'changelog'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab ? C.blurple : 'transparent'}`,
                padding: '14px 22px',
                fontSize: 14,
                fontWeight: 600,
                color: activeTab === tab ? C.blurple : C.muted,
                cursor: 'pointer',
              }}
            >
              {tab === 'raw' ? 'Raw JSON' : 'Changelog'}
            </button>
          ))}
        </div>
        <div style={{ padding: 22 }}>
          {activeTab === 'raw' ? (
            <pre
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                color: C.text,
                background: C.bg,
                borderRadius: 8,
                padding: '18px 20px',
                overflow: 'auto',
                maxHeight: 420,
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              {cmd.rawData}
            </pre>
          ) : (
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                color: C.muted,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.9,
              }}
            >
              {cmd.changelog || 'No changelog provided.'}
            </div>
          )}
        </div>
      </div>

      {user === undefined ? (
        <div
          className="skeleton"
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 22,
            minHeight: 84,
          }}
        />
      ) : user ? (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 22,
          }}
        >
          <div style={{ color: C.text, fontWeight: 600, marginBottom: 12, fontSize: 15 }}>
            Rate this command
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={async () => {
                  const prev = userRating || 0;
                  setUserRating(n);
                  try {
                    const r = await fetch(
                      `${API_BASE}/api/commands/${encodeURIComponent(cmd.id)}/rate`,
                      {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rating: n }),
                      },
                    );
                    if (r.ok) {
                      const j = await r.json();
                      if (j.rating != null) setAggRating(Number(j.rating));
                      if (j.ratingCount != null) setAggRatingCount(Number(j.ratingCount));
                    } else {
                      setUserRating(prev);
                    }
                  } catch (e) {
                    console.error('rate failed', e);
                    setUserRating(prev);
                  }
                }}
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 28,
                  cursor: 'pointer',
                  color: n <= (hoverRating || userRating) ? C.yellow : C.faint,
                }}
              >
                {'★'}
              </button>
            ))}
          </div>
          {userRating > 0 && (
            <div style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>
              You rated this {userRating}/5 — thanks!
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
            textAlign: 'center',
            color: C.muted,
            fontSize: 14,
          }}
        >
          <LogIn size={16} style={{ marginBottom: 6, display: 'block', margin: '0 auto 8px' }} />
          Log in with Discord to rate and favourite this command
        </div>
      )}
    </div>
  );
}
