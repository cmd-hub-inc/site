import React, { useState } from 'react'
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

  return (
    <div style={{ minHeight: '100vh', background: '#1e1f22' }}>
      <Navbar page={page} user={user} onNavigate={navigate} onLogin={() => setUser(MOCK_USER)} onLogout={() => setUser(null)} />

      {page === 'home' && <HomePage onNavigate={navigate} onViewCommand={viewCommand} />}
      {page === 'browse' && <BrowsePage initialTag={pageParams.tag} onViewCommand={viewCommand} />}
      {page === 'upload' && <UploadPage user={user} onNavigate={navigate} />}
      {page === 'profile' && <ProfilePage user={user} onViewCommand={viewCommand} onNavigate={navigate} />}
      {page === 'detail' && selectedCmd && <CommandDetailPage cmd={selectedCmd} onBack={() => navigate('browse')} user={user} />}

      <Footer onNavigate={navigate} />
    </div>
  )
}
