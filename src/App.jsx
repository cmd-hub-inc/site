import React, { useState, useEffect, Suspense, lazy } from 'react';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import { MOCK_USER } from './constants';
import { getReturnTo, clearReturnTo, saveReturnTo } from './lib/authHelpers';
import { getUnreadNewsCount } from './lib/newsReadState';

// Code splitting: lazy load page components
const HomePage = lazy(() => import('./pages/HomePage'));
const BrowsePage = lazy(() => import('./pages/BrowsePage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const CommandDetailPage = lazy(() => import('./pages/CommandDetailPage'));
const EditCommandPage = lazy(() => import('./pages/EditCommandPage'));
const NotFound = lazy(() => import('./pages/NotFound'));
const CreatorsPage = lazy(() => import('./pages/CreatorsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const NewsPage = lazy(() => import('./pages/NewsPage'));

// Loading component for lazy-loaded pages
function PageLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg text-gray-600">Loading...</div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState(() => {
    try {
      const pathname = typeof window !== 'undefined' ? window.location.pathname || '' : '';
      if (pathname === '/' || pathname === '') return 'home';
      if (pathname.startsWith('/browse')) return 'browse';
      if (pathname.startsWith('/creators')) return 'creators';
      if (pathname.startsWith('/news')) return 'news';
      if (pathname.startsWith('/dashboard')) return 'dashboard';
      if (pathname.startsWith('/admin')) return 'admin';
      if (pathname.startsWith('/upload')) return 'upload';
      if (pathname.startsWith('/profile')) return 'profile';
      if (pathname.startsWith('/command/')) return 'detail';
      // If path doesn't match any known client routes, show NotFound
      return 'notfound';
    } catch (e) {
      // ignore and fallback to notfound
      return 'notfound';
    }
  });
  console.info('[client] initial page', page, 'path=', typeof window !== 'undefined' ? window.location.pathname : '');
  const [pageParams, setPageParams] = useState({});
  // `undefined` = loading, `null` = not authenticated, object = authenticated
  const [user, setUser] = useState(undefined);
  const [selectedCmd, setSelectedCmd] = useState(null);
  const [newsHasUnread, setNewsHasUnread] = useState(false);

  const navigate = (p, params = {}) => {
    setPage(p);
    setPageParams(params);
    if (p !== 'detail' && p !== 'edit') setSelectedCmd(null);
    try {
      window.scrollTo(0, 0);
    } catch {}

    // update URL for shareable links
    try {
      let newPath = '/';
      const hash = params && params.hash ? String(params.hash).replace(/^#/, '') : '';
      if (p === 'browse') newPath = '/browse';
      else if (p === 'creators') newPath = '/creators';
      else if (p === 'news') newPath = '/news';
      else if (p === 'dashboard') newPath = '/dashboard';
      else if (p === 'admin') newPath = '/admin';
      else if (p === 'upload') newPath = '/upload';
      else if (p === 'profile') {
        // if no id provided and we have an authenticated `user`, canonicalize to use their id
        const pid = params && params.id ? params.id : user && user.id ? user.id : undefined;
        newPath = pid ? `/profile/${encodeURIComponent(pid)}` : '/profile';
        // always write canonical id into pageParams so parent and URL stay in sync
        setPageParams({ ...(params || {}), id: pid });
      } else if (p === 'detail' && params && params.id) {
        newPath = `/command/${encodeURIComponent(params.id)}`;
      } else if (p === 'edit' && params && params.id) {
        newPath = `/command/${encodeURIComponent(params.id)}/edit`;
      }
      if (hash) newPath = `${newPath}#${encodeURIComponent(hash)}`;
      window.history.pushState({}, '', newPath);
    } catch (e) {
      // ignore history push failures
    }

    // If navigating to edit, fetch command in background to hydrate editor
    try {
      if (p === 'edit' && params && params.id) {
        (async () => {
          try {
            const rc = await fetch(`${API_BASE}/api/commands/${encodeURIComponent(params.id)}`);
            if (rc.ok) {
              const cmd = await rc.json();
              setSelectedCmd(cmd);
            }
          } catch (e) {
            // ignore
          }
        })();
      }
    } catch (e) {}
  };

  const viewCommand = (cmd) => {
    if (!cmd) return;
    if (typeof cmd === 'string') {
      navigate('detail', { id: cmd });
    } else {
      setSelectedCmd(cmd);
      setPage('detail');
      try {
        window.scrollTo(0, 0);
      } catch {}
      try {
        window.history.pushState({}, '', `/command/${encodeURIComponent(cmd.id)}`);
      } catch (e) {}
    }
  };

  const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '' : '/api/proxy');

  useEffect(() => {
    // Poll /ready before asking server for current user (avoids 503 during startup)
    let cancelled = false;
    const pollInterval = 1000;
    const maxAttempts = 30;
    const waitUntilReady = async () => {
      for (let i = 0; i < maxAttempts && !cancelled; i++) {
        try {
          const r = await fetch(`${API_BASE}/api/ready`);
          if (r.ok) return true;
        } catch (e) {
          // ignore and retry
        }
        await new Promise((r) => setTimeout(r, pollInterval));
      }
      return false;
    };
    // Start a background poll for `/api/ready` but do not block initialization.
    (async () => {
      try {
        for (let i = 0; i < maxAttempts && !cancelled; i++) {
          try {
            const r = await fetch(`${API_BASE}/api/ready`);
            if (r.ok) break;
          } catch (e) {
            // ignore and retry
          }
          await new Promise((r) => setTimeout(r, pollInterval));
        }
      } catch (e) {
        // ignore
      }
    })();

    // Continue with the rest of initialization immediately (do not wait for /api/ready)
    (async () => {
      try {
        // If URL contains pendingToken, try to complete auth flow first
        const params = new URLSearchParams(window.location.search);
        const pendingToken = params.get('pendingToken');
        if (pendingToken) {
          // Poll /api/auth/complete until it returns 200
          for (let a = 0; a < 60 && !cancelled; a++) {
            try {
              const r = await fetch(
                `${API_BASE}/api/auth/complete?token=${encodeURIComponent(pendingToken)}`,
                { credentials: 'include' },
              );
              if (r.status === 200) {
                const body = await r.json();
                setUser(body && body.user !== undefined ? body.user : body);
                // remove pendingToken from URL
                params.delete('pendingToken');
                const url = new URL(window.location.href);
                url.search = params.toString();
                window.history.replaceState({}, document.title, url.toString());
                
                // Check if there's a destination to return to after login
                const returnTo = getReturnTo();
                if (returnTo && !cancelled) {
                  clearReturnTo();
                  try {
                    window.history.pushState({}, '', returnTo);
                    window.location.reload();
                  } catch (e) {
                    // ignore reload errors
                  }
                }
                return;
              }
              if (r.status === 202) {
                // still pending, wait and retry
              }
            } catch (e) {
              // ignore and retry
            }
            await new Promise((r) => setTimeout(r, 1000));
          }
        }

        // If URL path looks like a command link, fetch and show that command
        try {
          const pathname = window.location.pathname || '';
          const editMatch = pathname.match(/^\/command\/(.+)\/edit$/);
          const cmdMatch = pathname.match(/^\/command\/(.+)$/);
          const profMatch = pathname.match(/^\/profile\/(.+)$/);

          if (editMatch) {
            const id = decodeURIComponent(editMatch[1]);
            try {
              const rc = await fetch(`${API_BASE}/api/commands/${encodeURIComponent(id)}`);
              if (rc.ok) {
                const cmd = await rc.json();
                setSelectedCmd(cmd);
                setPage('edit');
                setPageParams({ id });
              } else {
                setPage('edit');
                setPageParams({ id });
              }
            } catch (e) {
              setPage('edit');
              setPageParams({ id });
            }
          } else if (cmdMatch) {
            const id = decodeURIComponent(cmdMatch[1]);
            try {
              const rc = await fetch(`${API_BASE}/api/commands/${encodeURIComponent(id)}`);
              if (rc.ok) {
                const cmd = await rc.json();
                setSelectedCmd(cmd);
                setPage('detail');
                // still try to fetch user afterwards
              } else {
                // command not found -> show client NotFound page
                setPage('notfound');
                setSelectedCmd(null);
              }
            } catch (e) {
              // network error or other failure -> show NotFound
              setPage('notfound');
              setSelectedCmd(null);
            }
          } else if (profMatch) {
            const id = decodeURIComponent(profMatch[1]);
            setPage('profile');
            setPageParams({ id });
          }
        } catch (e) {
          // ignore
        }

        try {
          // Wait for backend readiness before checking auth session.
          await waitUntilReady();
          const resp = await fetch(`${API_BASE}/api/me`, { credentials: 'include' });
          if (resp.ok) {
            const body = await resp.json();
            setUser(body && body.user !== undefined ? body.user : body);
          } else {
            setUser(null);
          }
        } catch (e) {
          setUser(null);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const computeUnreadNews = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/news`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const unread = getUnreadNewsCount(data.news || [], user);
        setNewsHasUnread(unread > 0);
      } catch {
        // ignore errors while computing badge state
      }
    };

    computeUnreadNews();
    return () => {
      cancelled = true;
    };
  }, [user, page]);

  // Handle browser back/forward for shareable links
  useEffect(() => {
    let mounted = true;
    const onPop = async () => {
      if (!mounted) return;
      try {
        const pathname = window.location.pathname || '';
        const editMatch = pathname.match(/^\/command\/(.+)\/edit$/);
        const cmdMatch = pathname.match(/^\/command\/(.+)$/);
        const profMatch = pathname.match(/^\/profile\/(.+)$/);

        if (editMatch) {
          const id = decodeURIComponent(editMatch[1]);
          try {
            const rc = await fetch(`${API_BASE}/api/commands/${encodeURIComponent(id)}`);
            if (rc.ok) {
              const cmd = await rc.json();
              setSelectedCmd(cmd);
              setPage('edit');
              setPageParams({ id });
              return;
            }
          } catch (e) {
            // ignore
          }
          // If fetch failed or returned non-OK, still navigate to the edit view (form may handle missing data)
          setPage('edit');
          setPageParams({ id });
          return;
        }

        if (cmdMatch) {
          const id = decodeURIComponent(cmdMatch[1]);
          try {
            const rc = await fetch(`${API_BASE}/api/commands/${encodeURIComponent(id)}`);
            if (rc.ok) {
              const cmd = await rc.json();
              setSelectedCmd(cmd);
              setPage('detail');
              return;
            }
          } catch (e) {
            // ignore
          }
          // not found or error -> show NotFound
          setPage('notfound');
          setSelectedCmd(null);
          return;
        }

        if (profMatch) {
          const id = decodeURIComponent(profMatch[1]);
          setPage('profile');
          setPageParams({ id });
          setSelectedCmd(null);
          return;
        }

        // handle bare /profile when user is authenticated: canonicalize to /profile/:id
        if (pathname === '/profile' && user) {
          const pid = user.id;
          window.history.replaceState({}, '', `/profile/${encodeURIComponent(pid)}`);
          setPage('profile');
          setPageParams({ id: pid });
          setSelectedCmd(null);
          return;
        }

        // fallback: map path to pages
        if (pathname.startsWith('/browse')) {
          setPage('browse');
          setSelectedCmd(null);
          return;
        }
        if (pathname.startsWith('/creators')) {
          setPage('creators');
          setSelectedCmd(null);
          return;
        }
        if (pathname.startsWith('/dashboard')) {
          setPage('dashboard');
          setSelectedCmd(null);
          return;
        }
        if (pathname.startsWith('/admin')) {
          setPage('admin');
          setSelectedCmd(null);
          return;
        }
        if (pathname.startsWith('/upload')) {
          setPage('upload');
          setSelectedCmd(null);
          return;
        }
        if (pathname.startsWith('/profile')) {
          setPage('profile');
          setSelectedCmd(null);
          return;
        }
        if (pathname.startsWith('/news')) {
          setPage('news');
          setSelectedCmd(null);
          return;
        }

        // default to notfound for unknown client paths
        setPage('notfound');
        setSelectedCmd(null);
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('popstate', onPop);
    return () => {
      mounted = false;
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1e1f22',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Navbar
        page={page}
        user={user}
        pageParams={pageParams}
        newsHasUnread={newsHasUnread}
        onNavigate={navigate}
        onLogin={() => {
          // Save the current page as the return destination
          if (page === 'upload') {
            saveReturnTo('/upload');
          } else if (page === 'dashboard') {
            saveReturnTo('/dashboard');
          } else if (page === 'edit' && pageParams && pageParams.id) {
            saveReturnTo(`/command/${encodeURIComponent(pageParams.id)}/edit`);
          } else if (page === 'profile' && pageParams && pageParams.id) {
            saveReturnTo(`/profile/${encodeURIComponent(pageParams.id)}`);
          }
          console.log('[client] login click, navigating to', `${API_BASE}/api/auth/discord`);
          window.location.href = `${API_BASE}/api/auth/discord`;
        }}
        onLogout={async () => {
          try {
            await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' });
          } catch {}
          setUser(null);
        }}
      />
      <main style={{ flex: 1 }}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoadingSpinner />}>
            {page === 'home' && <HomePage onNavigate={navigate} onViewCommand={viewCommand} />}
            {page === 'browse' && (
              <BrowsePage initialTag={pageParams.tag} onViewCommand={viewCommand} />
            )}
            {page === 'creators' && <CreatorsPage onNavigate={navigate} />}
            {page === 'upload' && <UploadPage user={user} onNavigate={navigate} />}
            {page === 'profile' && (
              <ProfilePage
                key={pageParams && pageParams.id}
                user={user}
                profileId={pageParams && pageParams.id}
                onViewCommand={viewCommand}
                onNavigate={navigate}
              />
            )}
            {page === 'detail' && (
              <CommandDetailPage
                cmd={selectedCmd}
                loading={!selectedCmd}
                onBack={() => navigate('browse')}
                user={user}
              />
            )}
            {page === 'edit' && <EditCommandPage user={user} pageParams={pageParams} />}
            {page === 'dashboard' && <DashboardPage user={user} onNavigate={navigate} />}
            {page === 'admin' && <AdminDashboardPage user={user} onNavigate={navigate} />}
            {page === 'news' && (
              <NewsPage
                user={user}
                onReadStateChange={(hasUnread) => setNewsHasUnread(Boolean(hasUnread))}
              />
            )}
            {page === 'notfound' && <NotFound />}
          </Suspense>
        </ErrorBoundary>
      </main>

      <Footer onNavigate={navigate} />
    </div>
  );
}
