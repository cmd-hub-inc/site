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

  const navigate = (p, params = {}) => { setPage(p); setPageParams(params); setSelectedCmd(null); try { window.scrollTo(0,0) } catch {} }
  const viewCommand = (cmd) => { setSelectedCmd(cmd); setPage('detail'); try { window.scrollTo(0,0) } catch {} }

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
