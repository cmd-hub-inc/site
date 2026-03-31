import React, { useEffect, useState } from 'react'
import { Zap, ChevronRight } from 'lucide-react'
import CommandCard from '../components/CommandCard'
import { C } from '../constants'
import { MOCK_COMMANDS } from '../data/mockCommands'

export default function HomePage({ onNavigate, onViewCommand }) {
  const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE || '')

  const totalDownloads = MOCK_COMMANDS.reduce((a,c) => a + c.downloads, 0)
  const [featured, setFeatured] = useState([...MOCK_COMMANDS].slice(0,3))
  const [stats, setStats] = useState({ commands: MOCK_COMMANDS.length, downloads: totalDownloads, frameworks: 6 })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`${API_BASE}/api/stats`)
        if (r.ok) {
          const j = await r.json()
          if (!cancelled) setStats(j)
        }
      } catch (e) {
        // ignore
      }

      try {
        const r2 = await fetch(`${API_BASE}/api/commands`)
        if (r2.ok) {
          const cmds = await r2.json()
          const sorted = cmds.sort((a, b) => (b.downloads || 0) - (a.downloads || 0)).slice(0, 3)
          if (!cancelled && Array.isArray(sorted) && sorted.length) setFeatured(sorted)
        }
      } catch (e) {
        // ignore
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '88px 24px 72px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: C.blurpleDim, border: '1px solid rgba(88,101,242,0.3)', borderRadius: 999, padding: '5px 16px', fontSize: 12, color: C.blurple, fontWeight: 700, marginBottom: 24 }}><Zap size={11} /> The open command registry for Discord bots</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 800, color: C.white, margin: '0 0 18px', lineHeight: 1.1 }}>
          Find & share<br /><span style={{ color: C.blurple }}>bot commands</span>
        </h1>
        <p style={{ color: C.muted, fontSize: 17, maxWidth: 520, margin: '0 auto 36px' }}>The centralised hub for Discord bot command data. Browse, download, and share slash commands across any framework — open to everyone.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => onNavigate('browse')} style={{ background: C.blurple, color: '#fff', border: 'none', borderRadius: 10, padding: '13px 30px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Browse Commands</button>
          <button onClick={() => onNavigate('upload')} style={{ background: C.surface2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px 30px', fontSize: 15, fontWeight: 700 }}>Upload a Command</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, maxWidth: 620, margin: '0 auto 72px', padding: '0 24px' }}>
        {[{label:'Commands', value: stats.commands, color: C.blurple},{label:'Downloads', value: stats.downloads, color: C.green},{label:'Frameworks', value: stats.frameworks, color: C.yellow}].map(s => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '22px 16px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 34, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 72px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: C.white }}>🔥 Most Downloaded</h2>
          <button onClick={() => onNavigate('browse')} style={{ background: 'none', border: 'none', color: C.blurple, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>View all <ChevronRight size={15} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {featured.map(cmd => <CommandCard key={cmd.id} cmd={cmd} onClick={onViewCommand} />)}
        </div>
      </div>
    </div>
  )
}
