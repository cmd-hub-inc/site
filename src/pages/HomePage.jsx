import React, { useEffect, useState } from 'react';
import { Zap, ChevronRight, TrendingUp, Bell } from 'lucide-react';
import CommandCard from '../components/CommandCard';
import { C } from '../constants';
import { MOCK_COMMANDS } from '../data/mockCommands';
import CountUp from '../components/CountUp';

export default function HomePage({ onNavigate, onViewCommand }) {
  const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '' : '');

  const [featured, setFeatured] = useState(null);
  const [commandsList, setCommandsList] = useState(null);
  const [derived, setDerived] = useState({
    latest: null,
    creators: null,
    frameworks: null,
    tags: null,
    recent: null,
  });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/stats`);
        if (r.ok) {
          const j = await r.json();
          if (!cancelled) setStats(j);
        }
      } catch (e) {
        // ignore
      }

      try {
        const r2 = await fetch(`${API_BASE}/api/commands`);
        if (r2.ok) {
          const cmds = await r2.json();
          if (!cancelled) setCommandsList(cmds);

          const sorted = cmds
            .slice()
            .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
            .slice(0, 3);
          if (!cancelled && Array.isArray(sorted) && sorted.length) setFeatured(sorted);

          // derive latest uploads
          const latest = cmds
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 4);

          // top creators (group by author id when available, fallback to username)
          const creatorMap = cmds.reduce((acc, c) => {
            const id = c.author && c.author.id ? c.author.id : null;
            const name = (c.author && c.author.username) || 'Unknown';
            const avatar =
              (c.author && (c.author.avatar || c.author.avatarUrl || c.author.avatar_url)) || null;
            const key = id || name;
            if (!acc[key]) acc[key] = { id, name, avatar: avatar || null, count: 0 };
            acc[key].count += 1;
            if (avatar && !acc[key].avatar) acc[key].avatar = avatar;
            return acc;
          }, {});
          const creators = Object.keys(creatorMap)
            .map((k) => ({
              id: creatorMap[k].id,
              name: creatorMap[k].name,
              count: creatorMap[k].count,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);

          // frameworks counts
          const fwMap = cmds.reduce((acc, c) => {
            const fw = c.framework || 'Other';
            acc[fw] = (acc[fw] || 0) + 1;
            return acc;
          }, {});
          const frameworks = Object.keys(fwMap)
            .map((k) => ({ name: k, count: fwMap[k] }))
            .sort((a, b) => b.count - a.count);

          // trending tags
          const tagMap = cmds.reduce((acc, c) => {
            (c.tags || []).forEach((t) => (acc[t] = (acc[t] || 0) + 1));
            return acc;
          }, {});
          const tags = Object.keys(tagMap)
            .map((k) => ({ tag: k, count: tagMap[k] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 12);

          const recent = latest.slice(0, 6);

          if (!cancelled) setDerived({ latest, creators, frameworks, tags, recent });
        }
        // leave as null (show skeleton) if response not ok
      } catch (e) {
        // leave featured as null so skeleton shows when fetch fails
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div
        style={{
          textAlign: 'center',
          padding: 'clamp(40px, 10vw, 88px) 24px clamp(36px, 10vw, 72px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            background: C.blurpleDim,
            border: '1px solid rgba(88,101,242,0.3)',
            borderRadius: 999,
            padding: '5px 16px',
            fontSize: 12,
            color: C.blurple,
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          <Zap size={11} /> The open command registry for Discord bots
        </div>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 'clamp(36px, 6vw, 60px)',
            fontWeight: 800,
            color: C.white,
            margin: '0 0 18px',
            lineHeight: 1.1,
          }}
        >
          Find & share
          <br />
          <span style={{ color: C.blurple }}>bot commands</span>
        </h1>
        <p style={{ color: C.muted, fontSize: 'clamp(14px, 2.5vw, 17px)', maxWidth: 520, margin: '0 auto 36px' }}>
          The centralised hub for Discord bot command data. Browse, download, and share slash
          commands across any framework — open to everyone.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', maxWidth: '100%' }}>
          <button
            onClick={() => onNavigate('browse')}
            style={{
              background: C.blurple,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '13px 24px',
              fontSize: 'clamp(13px, 2vw, 15px)',
              fontWeight: 700,
              cursor: 'pointer',
              flex: '1 1 auto',
              minWidth: 140,
              maxWidth: 200,
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = `0 8px 16px ${C.blurple}40`;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Browse Commands
          </button>
          <button
            onClick={() => onNavigate('upload')}
            style={{
              background: C.surface2,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: '13px 24px',
              fontSize: 'clamp(13px, 2vw, 15px)',
              fontWeight: 700,
              flex: '1 1 auto',
              minWidth: 140,
              maxWidth: 200,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = `0 8px 16px ${C.border}40`;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Upload a Command
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 14,
          maxWidth: 620,
          margin: '0 auto 72px',
          padding: '0 24px',
        }}
      >
        {[
          { label: 'Commands', value: stats?.commands ?? null, color: C.blurple },
          { label: 'Downloads', value: stats?.downloads ?? null, color: C.green },
          { label: 'Frameworks & Tools', value: derived.frameworks?.length ?? null, color: C.yellow },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: 'clamp(16px, 4vw, 22px)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 'clamp(24px, 6vw, 34px)',
                fontWeight: 800,
                color: s.color,
              }}
            >
              <CountUp value={s.value} duration={900} />
            </div>
            <div style={{ color: C.muted, fontSize: 'clamp(12px, 2vw, 13px)', marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 72px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <h2
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 'clamp(18px, 4vw, 22px)',
              fontWeight: 800,
              color: C.white,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} />
              Most Downloaded
            </span>
          </h2>
          <button
            onClick={() => onNavigate('browse')}
            style={{
              background: 'none',
              border: 'none',
              color: C.blurple,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => (e.target.style.gap = '8px')}
            onMouseLeave={(e) => (e.target.style.gap = '4px')}
          >
            View all <ChevronRight size={15} />
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: 16,
          }}
        >
          {featured == null
            ? [0, 1, 2].map((i) => <CommandCard key={i} loading />)
            : featured.map((cmd) => <CommandCard key={cmd.id} cmd={cmd} onClick={onViewCommand} />)}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px clamp(36px, 10vw, 72px)' }}>
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 'clamp(18px, 4vw, 22px)',
            fontWeight: 800,
            color: C.white,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} />
            Latest Uploads
          </span>
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: 16,
          }}
        >
          {derived.latest == null
            ? [0, 1, 2, 3].map((i) => <CommandCard key={i} loading />)
            : derived.latest.map((cmd) => (
                <CommandCard key={cmd.id} cmd={cmd} onClick={onViewCommand} />
              ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginTop: 28 }}>
          <div>
            <h3 style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: C.white, marginBottom: 8 }}>Top Creators</h3>
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 12,
              }}
            >
              {derived.creators == null
                ? [0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="skeleton"
                      style={{ height: 18, marginBottom: 8, borderRadius: 6 }}
                    />
                  ))
                : (() => {
                    const max = Math.max(1, ...derived.creators.map((c) => c.count));
                    return derived.creators.map((c, idx) => (
                      <div
                        key={c.name}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          padding: '6px 0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 26, color: C.muted, fontWeight: 700 }}>
                            {idx + 1}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {c.avatar ? (
                              <img
                                src={c.avatar}
                                alt={c.name}
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 999,
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 999,
                                  background: C.surface2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: C.white,
                                  fontWeight: 700,
                                }}
                              >
                                {String(c.name || 'U')
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                            )}
                          </div>
                          {c.id ? (
                            <button
                              onClick={() => onNavigate('profile', { id: c.id })}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: C.white,
                                cursor: 'pointer',
                                fontWeight: 700,
                              }}
                            >
                              {c.name}
                            </button>
                          ) : (
                            <div style={{ color: C.white, fontWeight: 700 }}>{c.name}</div>
                          )}
                          <div style={{ marginLeft: 'auto', color: C.muted, fontSize: 13 }}>
                            {c.count}
                          </div>
                        </div>
                        <div
                          style={{
                            height: 8,
                            background: C.surface2,
                            borderRadius: 6,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.round((c.count / max) * 100)}%`,
                              height: '100%',
                              background: C.blurple,
                              borderRadius: 6,
                            }}
                          />
                        </div>
                      </div>
                    ));
                  })()}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: C.white, marginBottom: 8 }}>Browse by Framework</h3>
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 12,
              }}
            >
              {derived.frameworks == null
                ? [0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="skeleton"
                      style={{ height: 48, marginBottom: 8, borderRadius: 6 }}
                    />
                  ))
                : (() => {
                    const maxFw = Math.max(1, ...derived.frameworks.map((f) => f.count));
                    return (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                          gap: 10,
                        }}
                      >
                        {derived.frameworks.slice(0, 12).map((f) => (
                          <button
                            key={f.name}
                            onClick={() => onNavigate('browse', { framework: f.name })}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: 6,
                              padding: 10,
                              background: C.surface2,
                              border: `1px solid ${C.border}`,
                              borderRadius: 10,
                              cursor: 'pointer',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                width: '100%',
                              }}
                            >
                              <div style={{ fontWeight: 700, color: C.white }}>{f.name}</div>
                              <div style={{ marginLeft: 'auto', color: C.muted }}>{f.count}</div>
                            </div>
                            <div
                              style={{
                                width: '100%',
                                height: 8,
                                background: C.surface,
                                borderRadius: 6,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.round((f.count / maxFw) * 100)}%`,
                                  height: '100%',
                                  background: C.green,
                                  borderRadius: 6,
                                }}
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 28 }}>
          <div>
            <h3 style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: C.white, marginBottom: 8 }}>Trending Tags</h3>
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 12,
              }}
            >
              {derived.tags == null ? (
                <div>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="skeleton"
                      style={{ height: 14, marginBottom: 8, borderRadius: 6 }}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {derived.tags.map((t) => (
                    <div
                      key={t.tag}
                      style={{ background: C.surface2, padding: '6px 10px', borderRadius: 999 }}
                    >
                      {t.tag} ({t.count})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 'clamp(16px, 3vw, 18px)', color: C.white, marginBottom: 8 }}>Recent Activity</h3>
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 12,
              }}
            >
              {derived.recent == null
                ? [0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="skeleton"
                      style={{ height: 14, marginBottom: 8, borderRadius: 6 }}
                    />
                  ))
                : derived.recent.map((r) => (
                    <div
                      key={r.id}
                      style={{ padding: '8px 6px', borderBottom: `1px dashed ${C.border}` }}
                    >
                      <div style={{ color: C.white, fontWeight: 700 }}>/ {r.name}</div>
                      <div style={{ color: C.muted, fontSize: 12 }}>
                        {r.author?.username || 'Unknown'} • {r.createdAt}
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
