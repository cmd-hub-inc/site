import React, { useEffect, useState } from 'react';
import { User, Package } from 'lucide-react';
import { C } from '../constants';
import CommandCard from '../components/CommandCard';
import ShareButtons from '../components/ShareButtons';
import { MOCK_COMMANDS } from '../data/mockCommands';
import CountUp from '../components/CountUp';

export default function ProfilePage({ user, profileId, onViewCommand, onNavigate }) {
  console.info('[client] ProfilePage mount', { profileId, hasUserProp: !!user });
  // If viewing a specific profileId that isn't the current user, start null (loading)
  const initialViewUser = profileId
    ? user && String(user.id) === String(profileId)
      ? user
      : null
    : user || null;
  const [viewUser, setViewUser] = useState(initialViewUser);

  // Note: hooks below must run on every render (move before conditional returns)
  const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '' : '');
  // Normalize viewUser: some API responses return { user: {...}, top: [...] }
  const displayUser = viewUser && viewUser.user ? viewUser.user : viewUser;
  const [userCmds, setUserCmds] = useState([]);
  const [favCmds, setFavCmds] = useState([]);
  const [loadingUserCmds, setLoadingUserCmds] = useState(true);
  const [loadingFavCmds, setLoadingFavCmds] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const totalDownloads = userCmds.reduce((a, c) => a + (c.downloads || 0), 0);
  const totalFavs = userCmds.reduce((a, c) => a + (c.favourites || 0), 0);

  // Fetch profile data when viewing another user's profile
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!profileId) return;
      if (user && String(user.id) === String(profileId)) {
        setViewUser(user);
        return;
      }
      try {
        console.info('[client] fetching profile', profileId);
        let resp = null;
        for (let attempt = 0; attempt < 8 && !cancelled; attempt++) {
          try {
            resp = await fetch(`${API_BASE}/api/users/${encodeURIComponent(profileId)}`);
          } catch (e) {
            resp = null;
          }
          if (!resp) {
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
          if (resp.ok) break;
          if (resp.status === 202 || resp.status === 503) {
            await new Promise((r) => setTimeout(r, 500));
            continue;
          }
          break;
        }

        if (cancelled) return;
        if (resp && resp.ok) {
          const data = await resp.json();
          const normalized = data && data.user ? data.user : data;
          console.info('[client] fetched profile data for', profileId, { respStatus: resp.status, data });
          if (!cancelled) {
            setViewUser(normalized);
            console.info('[client] set viewUser to', normalized);
          }
        } else if (resp && resp.status === 404) {
          if (!cancelled)
            setViewUser({
              id: profileId,
              username: 'Unknown user',
              avatar: null,
              followers: 0,
              following: 0,
            });
        } else {
          console.info('[client] failed to fetch profile after retries', { profileId, status: resp ? resp.status : 'no-response' });
          if (!cancelled)
            setViewUser({
              id: profileId,
              username: 'Unknown user',
              avatar: null,
              followers: 0,
              following: 0,
            });
        }
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profileId, user, API_BASE]);

  useEffect(() => {
    let cancelled = false;
    if (!profileId) return;
    (async () => {
      setLoadingUserCmds(true);
      try {
        const id = viewUser && viewUser.id ? viewUser.id : profileId;
        const r = await fetch(`${API_BASE}/api/users/${encodeURIComponent(id)}/commands`);
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
        const id = viewUser && viewUser.id ? viewUser.id : profileId;
        const r2 = await fetch(`${API_BASE}/api/users/${encodeURIComponent(id)}/favourites`);
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
  }, [profileId, user, viewUser, API_BASE]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!displayUser || !user) return;
      if (String(displayUser.id) === String(user.id)) return;
      try {
        const r = await fetch(
          `${API_BASE}/api/users/${encodeURIComponent(displayUser.id)}/is-following`,
          { credentials: 'include' },
        );
        if (r.ok) {
          const b = await r.json();
          if (!cancelled) setIsFollowing(!!b.following);
        }
      } catch (e) {}
    })();
    return () => {
      cancelled = true;
    };
  }, [displayUser, user, API_BASE]);

  // Render conditional UI without early returns to preserve hook order
  if (!viewUser) {
    // If we're loading a remote profile or the client is logged in but viewUser isn't set yet,
    // show a header loading placeholder. Only show the 'Not logged in' message when no
    // profileId and no authenticated user.
    if (profileId || user) {
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
        </div>
      );
    }
    // Not viewing a profile and no auth
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
  }
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
            ) : displayUser && displayUser.username ? (
              displayUser.username[0].toUpperCase()
            ) : (
              ''
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

      {displayUser && (
        <ShareButtons 
          command={{ name: displayUser.username }}
          shareUrl={`${window.location.origin}/profile/${displayUser.id}`}
          user={user}
          theme={{ surface: C.surface, border: C.border, text: C.text, muted: C.muted }}
        />
      )}

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {displayUser && user && String(displayUser.id) === String(user.id) && (
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
          )}

          {/* Follow / Unfollow for other users */}
          {displayUser && user && String(displayUser.id) !== String(user.id) && (
            <button
              onClick={async () => {
                try {
                  if (isFollowing) {
                    const r = await fetch(
                      `${API_BASE}/api/users/${encodeURIComponent(displayUser.id)}/unfollow`,
                      { method: 'POST', credentials: 'include' },
                    );
                    if (r.ok) {
                      const body = await r.json();
                      setIsFollowing(false);
                      if (body && typeof body.followers !== 'undefined') {
                        setViewUser((v) => ({ ...(v || {}), followers: body.followers }));
                      }
                    }
                  } else {
                    const r = await fetch(
                      `${API_BASE}/api/users/${encodeURIComponent(displayUser.id)}/follow`,
                      { method: 'POST', credentials: 'include' },
                    );
                    if (r.ok) {
                      const body = await r.json();
                      setIsFollowing(true);
                      if (body && typeof body.followers !== 'undefined') {
                        setViewUser((v) => ({ ...(v || {}), followers: body.followers }));
                      }
                    }
                  }
                } catch (e) {
                  // ignore
                }
              }}
              style={{
                background: isFollowing ? 'transparent' : C.blurple,
                color: isFollowing ? C.white : '#fff',
                border: isFollowing ? `1px solid ${C.border}` : 'none',
                borderRadius: 8,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
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
            {displayUser && user && String(displayUser.id) === String(user.id)
              ? 'Be the first to share your work with the community'
              : `${displayUser?.username || 'This user'} hasn't uploaded any commands yet`}
          </p>
          {displayUser && user && String(displayUser.id) === String(user.id) && (
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
          )}
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
