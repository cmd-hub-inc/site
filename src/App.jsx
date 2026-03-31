import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import BrowsePage from './pages/BrowsePage'
import UploadPage from './pages/UploadPage'
import ProfilePage from './pages/ProfilePage'
import CommandDetailPage from './pages/CommandDetailPage'
import Footer from './components/Footer'
import { MOCK_USER } from './constants'

export default function App() {
  const [page, setPage] = useState('home')
  const [pageParams, setPageParams] = useState({})
  const [user, setUser] = useState(null)
  const [selectedCmd, setSelectedCmd] = useState(null)

  const navigate = (p, params = {}) => {
    setPage(p)
    setPageParams(params)
    if (p !== 'detail') setSelectedCmd(null)
    try { window.scrollTo(0,0) } catch {}

    // update URL for shareable links
    try {
      let newPath = '/'
      if (p === 'browse') newPath = '/browse'
      else if (p === 'upload') newPath = '/upload'
      else if (p === 'profile') newPath = '/profile'
      else if (p === 'detail' && params && params.id) newPath = `/command/${encodeURIComponent(params.id)}`
      window.history.pushState({}, '', newPath)
    } catch (e) {
      // ignore
    }
  }

  const viewCommand = (cmd) => {
    // cmd can be either an id string or full command object
    if (!cmd) return
    if (typeof cmd === 'string') {
      // navigate to detail and fetch later in popstate/fetch logic
      navigate('detail', { id: cmd })
    } else {
      setSelectedCmd(cmd)
      setPage('detail')
      try { window.scrollTo(0,0) } catch {}
      try { window.history.pushState({}, '', `/command/${encodeURIComponent(cmd.id)}`) } catch (e) {}
    }
  }

  const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE || '')

  useEffect(() => {
    // Poll /ready before asking server for current user (avoids 503 during startup)
    let cancelled = false
    const pollInterval = 1000
    const maxAttempts = 30
    ;(async () => {
      try {
        for (let i = 0; i < maxAttempts && !cancelled; i++) {
          try {
            const r = await fetch(`${API_BASE}/api/ready`)
            if (r.ok) break
          } catch (e) {
            // ignore and retry
          }
          await new Promise(r => setTimeout(r, pollInterval))
        }

        if (cancelled) return
          // If URL contains pendingToken, try to complete auth flow first
            const params = new URLSearchParams(window.location.search)
            const pendingToken = params.get('pendingToken')
            if (pendingToken) {
              // Poll /api/auth/complete until it returns 200
              for (let a = 0; a < 60 && !cancelled; a++) {
                try {
                  const r = await fetch(`${API_BASE}/api/auth/complete?token=${encodeURIComponent(pendingToken)}`, { credentials: 'include' })
                  if (r.status === 200) {
                    const body = await r.json()
                    setUser(body.user)
                    // remove pendingToken from URL
                    params.delete('pendingToken')
                    const url = new URL(window.location.href)
                    url.search = params.toString()
                    window.history.replaceState({}, document.title, url.toString())
                    return
                  }
                  if (r.status === 202) {
                    // still pending, wait and retry
                  }
                } catch (e) {
                  // ignore and retry
                }
                await new Promise(r => setTimeout(r, 1000))
              }
            }

            // If URL path looks like a command link, fetch and show that command
            try {
              const pathname = window.location.pathname || ''
              const match = pathname.match(/^\/command\/(.+)$/)
              if (match) {
                const id = decodeURIComponent(match[1])
                try {
                  const rc = await fetch(`${API_BASE}/api/commands/${encodeURIComponent(id)}`)
                  if (rc.ok) {
                    const cmd = await rc.json()
                    setSelectedCmd(cmd)
                    setPage('detail')
                    // still try to fetch user afterwards
                  }
                } catch (e) {
                  // ignore
                }
              }
            } catch (e) {
              // ignore
            }

            const resp = await fetch(`${API_BASE}/api/me`, { credentials: 'include' })
            if (resp.ok) {
              const u = await resp.json()
              setUser(u)
            }
      } catch (e) {
        // ignore
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Handle browser back/forward for shareable links
  useEffect(() => {
    let mounted = true
    const onPop = async () => {
      if (!mounted) return
      try {
        const pathname = window.location.pathname || ''
        const match = pathname.match(/^\/command\/(.+)$/)
        if (match) {
          const id = decodeURIComponent(match[1])
          try {
            const rc = await fetch(`${API_BASE}/api/commands/${encodeURIComponent(id)}`)
            if (rc.ok) {
              const cmd = await rc.json()
              setSelectedCmd(cmd)
              setPage('detail')
              return
            }
          } catch (e) {
            // ignore
          }
        }
        // fallback: map path to pages
        if (pathname.startsWith('/browse')) {
          setPage('browse')
          setSelectedCmd(null)
          return
        }
        if (pathname.startsWith('/upload')) {
          setPage('upload')
          setSelectedCmd(null)
          return
        }
        if (pathname.startsWith('/profile')) {
          setPage('profile')
          setSelectedCmd(null)
          return
        }
        // default home
        setPage('home')
        setSelectedCmd(null)
      } catch (e) {
        // ignore
      }
    }
    window.addEventListener('popstate', onPop)
    return () => { mounted = false; window.removeEventListener('popstate', onPop) }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#1e1f22' }}>
      <Navbar page={page} user={user} onNavigate={navigate} onLogin={() => { console.log('[client] login click, navigating to', `${API_BASE}/api/auth/discord`); window.location.href = `${API_BASE}/api/auth/discord` }} onLogout={async () => { try { await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' }) } catch {} setUser(null) }} />

      {page === 'home' && <HomePage onNavigate={navigate} onViewCommand={viewCommand} />}
      {page === 'browse' && <BrowsePage initialTag={pageParams.tag} onViewCommand={viewCommand} />}
      {page === 'upload' && <UploadPage user={user} onNavigate={navigate} />}
      {page === 'profile' && <ProfilePage user={user} onViewCommand={viewCommand} onNavigate={navigate} />}
      {page === 'detail' && selectedCmd && <CommandDetailPage cmd={selectedCmd} onBack={() => navigate('browse')} user={user} />}

      <Footer onNavigate={navigate} />
    </div>
  )
}
