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

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const userId = params.get('userId')
      const username = params.get('username')
      if (userId && username) {
        setUser({ id: userId, username })
        // remove query params from URL
        const url = new URL(window.location.href)
        url.search = ''
        window.history.replaceState({}, document.title, url.toString())
      }
    } catch (e) {}
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#1e1f22' }}>
      <Navbar page={page} user={user} onNavigate={navigate} onLogin={() => { window.location.href = '/api/auth/discord' }} onLogout={() => setUser(null)} />

      {page === 'home' && <HomePage onNavigate={navigate} onViewCommand={viewCommand} />}
      {page === 'browse' && <BrowsePage initialTag={pageParams.tag} onViewCommand={viewCommand} />}
      {page === 'upload' && <UploadPage user={user} onNavigate={navigate} />}
      {page === 'profile' && <ProfilePage user={user} onViewCommand={viewCommand} onNavigate={navigate} />}
      {page === 'detail' && selectedCmd && <CommandDetailPage cmd={selectedCmd} onBack={() => navigate('browse')} user={user} />}

      <Footer onNavigate={navigate} />
    </div>
  )
}
