import React from 'react'
import { Code2 } from 'lucide-react'
import { C } from '../constants'

export default function Footer({ onNavigate }) {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, padding: '36px 24px', marginTop: 40 }}>
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, background: C.blurple, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Code2 size={14} color="#fff" /></div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: C.white, fontSize: 15 }}>CmdHub</span>
          </div>
          <p style={{ color: C.faint, fontSize: 12, margin: 0, maxWidth: 260, lineHeight: 1.6 }}>The open command registry for Discord bots. Browse, share, and download command data across every framework.</p>
        </div>
        <div style={{ display: 'flex', gap: 40 }}>
          <div>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Platform</div>
            {['home','browse','upload'].map(p => <button key={p} onClick={() => onNavigate(p)} style={{ background: 'none', border: 'none', color: C.faint, cursor: 'pointer', display: 'block', fontSize: 13, textAlign: 'left', padding: '3px 0', fontFamily: 'inherit', textTransform: 'capitalize' }}>{p}</button>)}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center', color: C.faint, fontSize: 12, marginTop: 28 }}>© 2025 CmdHub · Built for the Discord bot community</div>
    </footer>
  )
}
