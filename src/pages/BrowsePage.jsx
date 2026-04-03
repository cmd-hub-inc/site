import React, { useEffect, useState } from 'react';
import { Search, Filter, X, Flame, Command } from 'lucide-react';
import CommandCard from '../components/CommandCard';
import { C, ALL_TAGS, FRAMEWORKS, CMD_TYPES } from '../constants';
import { MOCK_COMMANDS } from '../data/mockCommands';
import { TagBadge } from '../components/Badges';

export default function BrowsePage({ initialTag, onViewCommand }) {
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState(initialTag ? [initialTag] : []);
  const [selectedFW, setSelectedFW] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [sort, setSort] = useState('downloads');
  const [showFilters, setShowFilters] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '' : '');
  const [commands, setCommands] = useState([]);
  const [loadingCommands, setLoadingCommands] = useState(true);

  useEffect(() => {
    if (initialTag) setSelectedTags([initialTag]);
  }, [initialTag]);
  const toggleTag = (t) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Preflight /api/ready before attempting to fetch commands
      const readyAttempts = 8;
      const readyBackoff = 200; // ms
      let ready = false;
      for (let i = 0; i < readyAttempts && !cancelled; i++) {
        try {
          const r = await fetch(`${API_BASE}/api/ready`);
          if (r.ok) {
            ready = true;
            break;
          }
        } catch (e) {
          // ignore
        }
        await new Promise((r) => setTimeout(r, readyBackoff));
      }

      if (!ready) {
        // DB not ready — stop loading skeleton sooner
        if (!cancelled) setLoadingCommands(false);
        return;
      }

      // Now fetch commands with a few short retries
      const maxAttempts = 6;
      const backoff = 250; // ms
      for (let i = 0; i < maxAttempts && !cancelled; i++) {
        try {
          const r = await fetch(`${API_BASE}/api/commands`);
          if (r.ok) {
            const data = await r.json();
            if (!cancelled && Array.isArray(data)) setCommands(data);
            break;
          }
          if (r.status === 503) {
            await new Promise((r) => setTimeout(r, backoff));
            continue;
          }
          break;
        } catch (e) {
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
      if (!cancelled) setLoadingCommands(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = commands
    .filter((cmd) => {
      if (search) {
        const q = search.toLowerCase();
        const name = (cmd.name || '').toLowerCase();
        const desc = (cmd.description || '').toLowerCase();
        if (!name.includes(q) && !desc.includes(q)) return false;
      }
      if (selectedTags.length && !selectedTags.every((t) => (cmd.tags || []).includes(t)))
        return false;
      if (selectedFW && cmd.framework !== selectedFW) return false;
      if (selectedType && cmd.type !== selectedType) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === 'downloads') return (b.downloads || 0) - (a.downloads || 0);
      if (sort === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });

  const activeFilterCount = selectedTags.length + (selectedFW ? 1 : 0) + (selectedType ? 1 : 0);

  const inp = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '10px 14px',
    color: C.text,
    fontSize: 14,
  };

  // Top downloaded commands (used in the section below the search controls)
  const topDownloaded = loadingCommands
    ? []
    : [...commands].sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 4);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
      {/* Header Section */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <Search size={32} strokeWidth={2} color={C.blurple} />
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 32,
              fontWeight: 700,
              color: C.white,
              margin: 0,
              letterSpacing: 0,
            }}
          >
            Browse Commands
          </h1>
        </div>
        <p
          style={{
            color: C.muted,
            fontSize: 16,
            margin: 0,
            fontWeight: 400,
          }}
        >
          Discover powerful commands to enhance your Discord server
        </p>
      </div>

      {/* Search & Controls Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: 12,
          marginBottom: 24,
          alignItems: 'center',
        }}
      >
        {/* Search Input */}
        <div
          style={{
            gridColumn: 'span 1',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: C.surface,
            border: `2px solid ${C.border}`,
            borderRadius: 10,
            padding: '12px 16px',
            transition: 'all 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(88,101,242,0.5)';
            e.currentTarget.style.background = C.surface;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = C.border;
          }}
        >
          <Search size={18} color={C.muted} strokeWidth={2} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: C.text,
              fontSize: 15,
              outline: 'none',
            }}
          />
        </div>

        {/* Sort Dropdown */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{
            background: C.surface,
            border: `2px solid ${C.border}`,
            color: C.text,
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 15,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = 'rgba(88,101,242,0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = C.border;
          }}
        >
          <option value="downloads">Most Downloaded</option>
          <option value="rating">Highest Rated</option>
          <option value="newest">Newest</option>
        </select>

        {/* Filters Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            background: showFilters ? C.blurple : C.surface,
            border: `2px solid ${showFilters ? C.blurple : C.border}`,
            color: showFilters ? C.white : C.text,
            borderRadius: 10,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!showFilters) {
              e.target.style.borderColor = C.blurple;
              e.target.style.background = 'rgba(88,101,242,0.08)';
              e.target.style.color = C.blurple;
            }
          }}
          onMouseLeave={(e) => {
            if (!showFilters) {
              e.target.style.borderColor = C.border;
              e.target.style.background = C.surface;
              e.target.style.color = C.text;
            }
          }}
        >
          <Filter size={16} strokeWidth={2} />
          Filters
          {activeFilterCount > 0 && (
            <span
              style={{
                background: C.green,
                color: C.bg,
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: 12,
                fontWeight: 700,
                marginLeft: 4,
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div
          style={{
            background: `linear-gradient(135deg, ${C.surface} 0%, rgba(88,101,242,0.03) 100%)`,
            border: `1px solid rgba(88,101,242,0.2)`,
            borderRadius: 12,
            padding: 28,
            marginBottom: 32,
            animation: 'slideInUp 0.3s ease-out',
          }}
        >
          {/* Framework Filter */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                color: C.blurple,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Framework
              {selectedFW && (
                <span
                  style={{
                    background: C.blurpleDim,
                    color: C.blurple,
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                  }}
                >
                  {selectedFW}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {FRAMEWORKS.map((fw) => (
                <button
                  key={fw}
                  onClick={() => setSelectedFW(selectedFW === fw ? '' : fw)}
                  style={{
                    background: selectedFW === fw ? C.blurple : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${selectedFW === fw ? C.blurple : 'transparent'}`,
                    color: selectedFW === fw ? C.white : C.muted,
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedFW !== fw) {
                      e.target.style.background = 'rgba(255,255,255,0.12)';
                      e.target.style.color = C.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedFW !== fw) {
                      e.target.style.background = 'rgba(255,255,255,0.06)';
                      e.target.style.color = C.muted;
                    }
                  }}
                >
                  {fw}
                </button>
              ))}
            </div>
          </div>

          {/* Command Type Filter */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                color: C.blurple,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Command Type
              {selectedType && (
                <span
                  style={{
                    background: C.blurpleDim,
                    color: C.blurple,
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                  }}
                >
                  {selectedType}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CMD_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(selectedType === t ? '' : t)}
                  style={{
                    background: selectedType === t ? C.blurple : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${selectedType === t ? C.blurple : 'transparent'}`,
                    color: selectedType === t ? C.white : C.muted,
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedType !== t) {
                      e.target.style.background = 'rgba(255,255,255,0.12)';
                      e.target.style.color = C.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedType !== t) {
                      e.target.style.background = 'rgba(255,255,255,0.06)';
                      e.target.style.color = C.muted;
                    }
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          <div style={{ marginBottom: activeFilterCount > 0 ? 20 : 0 }}>
            <div
              style={{
                color: C.blurple,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              Tags ({selectedTags.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ALL_TAGS.map((t) => (
                <TagBadge
                  key={t}
                  tag={t}
                  onClick={() => toggleTag(t)}
                  selected={selectedTags.includes(t)}
                />
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setSelectedTags([]);
                setSelectedFW('');
                setSelectedType('');
              }}
              style={{
                marginTop: 20,
                background: 'rgba(237, 66, 69, 0.1)',
                border: `1px solid rgba(237, 66, 69, 0.3)`,
                borderRadius: 8,
                padding: '8px 14px',
                color: C.red,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(237, 66, 69, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(237, 66, 69, 0.1)';
              }}
            >
              <X size={14} strokeWidth={2} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Most Downloaded Section */}
      {commands &&
        commands.length > 0 &&
        !search &&
        selectedTags.length === 0 &&
        !selectedFW &&
        !selectedType && (
          <div style={{ marginBottom: 48 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <Flame size={24} color={C.red} strokeWidth={2} />
                  <h2
                    style={{
                      color: C.white,
                      fontSize: 22,
                      fontWeight: 800,
                      margin: 0,
                    }}
                  >
                    Most Downloaded
                  </h2>
                </div>
                <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                  The most popular commands in the community
                </p>
              </div>
            </div>
            <div
              className="command-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 14,
              }}
            >
              {loadingCommands
                ? [1, 2, 3].map((i) => (
                    <CommandCard key={`top-skel-${i}`} loading={true} cmd={{}} onClick={() => {}} />
                  ))
                : topDownloaded.map((cmd) => (
                    <CommandCard key={`top-${cmd.id}`} cmd={cmd} onClick={onViewCommand} />
                  ))}
            </div>
          </div>
        )}

      {/* All Commands Section */}
      <div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Command size={24} color={C.blurple} strokeWidth={2} />
            <h2
              style={{
                color: C.white,
                fontSize: 22,
                fontWeight: 800,
                margin: 0,
              }}
            >
              All Commands
            </h2>
          </div>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
            {filtered.length} command{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {loadingCommands ? (
          <div
            className="command-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: 16,
            }}
          >
            {[...Array(8)].map((_, i) => (
              <CommandCard key={`skel-${i}`} loading={true} cmd={{}} onClick={() => {}} />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div
            className="command-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: 16,
            }}
          >
            {filtered.map((cmd) => (
              <CommandCard key={cmd.id} cmd={cmd} onClick={onViewCommand} />
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '120px 20px',
              color: C.muted,
            }}
          >
            <Search size={56} color={C.muted} strokeWidth={1} style={{ opacity: 0.3, marginBottom: 20 }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 8px 0' }}>
              No commands match your search
            </h3>
            <p style={{ fontSize: 14, margin: '0 0 20px 0', opacity: 0.8 }}>
              Try adjusting your filters or search term
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedTags([]);
                setSelectedFW('');
                setSelectedType('');
              }}
              style={{
                background: C.blurple,
                border: 'none',
                color: C.white,
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = C.blurpleHov;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = C.blurple;
              }}
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
