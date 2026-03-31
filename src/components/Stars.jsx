import React from 'react'
import { Star } from 'lucide-react'
import { C } from '../constants'

export function StarRow({ rating, count, size = 12 }) {
  const full = Math.round(rating)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color: C.yellow, fontSize: size, lineHeight: 1 }}>{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>
      <span style={{ color: C.muted, fontSize: size }}>{rating.toFixed(1)}</span>
      {count != null && <span style={{ color: C.faint, fontSize: size }}>({count})</span>}
    </div>
  )
}

export function StatPill({ icon, value, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 13 }}>
      {icon}
      <strong style={{ color: C.text }}>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

export default StarRow
