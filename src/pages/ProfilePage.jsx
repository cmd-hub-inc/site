import React, { useEffect, useState } from 'react';
import { User, Package } from 'lucide-react';
import { C } from '../constants';
import CommandCard from '../components/CommandCard';
import { MOCK_COMMANDS } from '../data/mockCommands';
import CountUp from '../components/CountUp';

export default function ProfilePage({ user, profileId, onViewCommand, onNavigate }) {
  const [viewUser, setViewUser] = useState(user || null);
  // if viewing someone else's profile, we'll fetch their public profile
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profileId) return;
      const API_BASE = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE || '';
      try {
        const r = await fetch(`${API_BASE}/api/users/${encodeURIComponent(profileId)}`);
        if (r.ok) {
          const data = await r.json();
          if (!cancelled) setViewUser(data);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (!viewUser)
    return (
      <div style={{ textAlign: 'center', padding: '100px 24px' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <User size={28} color={C.faint} />
        </div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", color: C.white, marginBottom: 8 }}>
          Not logged in
        </h2>
        <p style={{ color: C.muted }}>
          Log in with Discord to view your profile and uploaded commands.
        </p>
      </div>
    );
  // Show a skeleton while user auth state is loading
  if (user === undefined)
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '44px 24px' }}>
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 30,
            marginBottom: 26,
          }}
        >
          <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="skeleton" style={{ width: 76, height: 76, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div
                className="skeleton"
                style={{ width: 220, height: 24, borderRadius: 6, marginBottom: 8 }}
              />
              <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 6 }} />
            </div>
            <div style={{ display: 'flex', gap: 28 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div className="skeleton" style={{ width: 64, height: 22, borderRadius: 6 }} />
                  <div style={{ color: C.muted, fontSize: 12 }}>&nbsp;</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <h2
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 20,
              fontWeight: 800,
              color: C.white,
              margin: 0,
            }}
          >
            Uploaded Commands
          </h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: 16,
          }}
        >
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div style={{ padding: 0 }}>
                <div
                  className="skeleton"
                  style={{ width: '100%', height: 140, borderRadius: 12 }}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 32 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 18,
            }}
          >
            <h2
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 20,
                fontWeight: 800,
                color: C.white,
                margin: 0,
              }}
            >
              Favourited Commands
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: 16,
            }}
          >
            {[1, 2].map((i) => (
              <div key={i}>
                <div
                  className="skeleton"
                  style={{ width: '100%', height: 120, borderRadius: 12 }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  const API_BASE = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE || '';
  // Normalize viewUser: some API responses return { user: {...}, top: [...] }
  const displayUser = viewUser && viewUser.user ? viewUser.user : viewUser;
  const [userCmds, setUserCmds] = useState([]);
  const [favCmds, setFavCmds] = useState([]);
  const [loadingUserCmds, setLoadingUserCmds] = useState(true);
  const [loadingFavCmds, setLoadingFavCmds] = useState(true);
  const totalDownloads = userCmds.reduce((a, c) => a + (c.downloads || 0), 0);
  const totalFavs = userCmds.reduce((a, c) => a + (c.favourites || 0), 0);

  useEffect(() => {
    let cancelled = false;
    if (!viewUser) return;
    (async () => {
      setLoadingUserCmds(true);
      try {
        const r = await fetch(`${API_BASE}/api/users/${encodeURIComponent(
          viewUser.id,
        )}/commands`);
        if (r.ok) {
          const cmds = await r.json();
          if (!cancelled) setUserCmds(cmds);
        } else {
          if (!cancelled) setUserCmds([]);
        }
      } catch (e) {
        if (!cancelled) setUserCmds([]);
      } finally {
        if (!cancelled) setLoadingUserCmds(false);
      }

      setLoadingFavCmds(true);
      try {
        const r2 = await fetch(`${API_BASE}/api/users/${encodeURIComponent(
          viewUser.id,
        )}/favourites`);
        if (r2.ok) {
          const f = await r2.json();
          if (!cancelled) setFavCmds(f);
        } else {
          if (!cancelled) setFavCmds([]);
        }
      } catch (e) {
        if (!cancelled) setFavCmds([]);
      } finally {
        if (!cancelled) setLoadingFavCmds(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewUser]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '44px 24px' }}>
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 30,
          marginBottom: 26,
        }}
      >
        <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.blurple}, #7289da)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
              fontWeight: 800,
              color: '#fff',
            }}
          >
            {displayUser && displayUser.avatar ? (
              <img
                src={displayUser.avatar}
                alt={displayUser.username}
                style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              (displayUser && displayUser.username ? displayUser.username[0].toUpperCase() : '')
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: C.white,
                margin: '0 0 4px',
              }}
            >
              {displayUser ? displayUser.username : ''}
            </h1>
            <div
              style={{
                color: C.muted,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Discord Verified Member
            </div>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            {[
              { label: 'Commands', value: loadingUserCmds ? null : userCmds.length },
              { label: 'Downloads', value: loadingUserCmds ? null : totalDownloads },
              { label: 'Favourites', value: loadingUserCmds ? null : totalFavs },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 26,
                    fontWeight: 800,
                    color: C.white,
                  }}
                >
                  {s.value === null ? (
                    <div
                      className="skeleton"
                      style={{ width: 64, height: 22, borderRadius: 6, margin: '0 auto' }}
                    />
                  ) : (
                    <CountUp value={s.value} duration={900} />
                  )}
                </div>
                <div style={{ color: C.muted, fontSize: 12 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 20,
            fontWeight: 800,
            color: C.white,
            margin: 0,
          }}
        >
          Uploaded Commands
        </h2>
        <button
          onClick={() => onNavigate('upload')}
          style={{
            background: C.blurple,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Upload New
        </button>
      </div>
      {loadingUserCmds ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: 16,
          }}
        >
          {[1, 2, 3].map((i) => (
            <CommandCard key={`skeleton-${i}`} loading={true} cmd={{}} onClick={() => {}} />
          ))}
        </div>
      ) : userCmds.length === 0 ? (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: '60px 20px',
            textAlign: 'center',
            color: C.muted,
          }}
        >
          <Package
            size={36}
            style={{ marginBottom: 14, opacity: 0.25, display: 'block', margin: '0 auto 14px' }}
          />
          <p style={{ margin: 0, fontSize: 16 }}>No commands uploaded yet</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>
            Be the first to share your work with the community
          </p>
          <button
            onClick={() => onNavigate('upload')}
            style={{
              marginTop: 20,
              background: C.blurple,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 22px',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Upload your first command
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: 16,
          }}
        >
          {userCmds.map((cmd) => (
            <CommandCard key={cmd.id} cmd={cmd} onClick={onViewCommand} />
          ))}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <h2
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 20,
              fontWeight: 800,
              color: C.white,
              margin: 0,
            }}
          >
            Favourited Commands
          </h2>
        </div>
        {loadingFavCmds ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: 16,
            }}
          >
            {[1, 2].map((i) => (
              <CommandCard key={`fav-skel-${i}`} loading={true} cmd={{}} onClick={() => {}} />
            ))}
          </div>
        ) : favCmds.length === 0 ? (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: '40px 20px',
              textAlign: 'center',
              color: C.muted,
            }}
          >
            No favourited commands yet
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: 16,
            }}
          >
            {favCmds.map((cmd) => (
              <CommandCard key={cmd.id} cmd={cmd} onClick={onViewCommand} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
