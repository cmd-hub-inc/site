import React, { useState } from 'react'
import { Download, Heart } from 'lucide-react'
import { C } from '../constants'
import { FrameworkBadge, TypeBadge, TagBadge } from './Badges'
import { StarRow } from './Stars'
import { fmt } from '../constants'

export default function CommandCard({ cmd, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={() => onClick(cmd)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: C.surface, border: `1px solid ${hov ? 'rgba(88,101,242,0.4)' : C.border}`, borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'all 0.18s ease', transform: hov ? 'translateY(-3px)' : 'none', boxShadow: hov ? '0 10px 30px rgba(0,0,0,0.4)' : 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, color: C.white }}>/ {cmd.name}</span>
          <TypeBadge type={cmd.type} />
        </div>
        <span style={{ color: C.faint, fontSize: 11, whiteSpace: 'nowrap' }}>{cmd.version}</span>
      </div>
      <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.55, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{cmd.description}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{cmd.tags.map(t => <TagBadge key={t} tag={t} />)}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
        <FrameworkBadge fw={cmd.framework} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: C.muted, fontSize: 12 }}><Download size={12} /> {fmt(cmd.downloads)}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: C.muted, fontSize: 12 }}><Heart size={12} /> {fmt(cmd.favourites)}</span>
          <StarRow rating={cmd.rating} size={11} />
        </div>
      </div>
    </div>
  )
}
