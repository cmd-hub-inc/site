import React, { useEffect, useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import CommandCard from '../components/CommandCard'
import { C, ALL_TAGS, FRAMEWORKS, CMD_TYPES } from '../constants'
import { MOCK_COMMANDS } from '../data/mockCommands'
import { TagBadge } from '../components/Badges'

export default function BrowsePage({ initialTag, onViewCommand }) {
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState(initialTag ? [initialTag] : [])
  const [selectedFW, setSelectedFW] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [sort, setSort] = useState('downloads')
  const [showFilters, setShowFilters] = useState(false)

  const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE || '')
  const [commands, setCommands] = useState(MOCK_COMMANDS)

  useEffect(() => { if (initialTag) setSelectedTags([initialTag]) }, [initialTag])
  const toggleTag = (t) => setSelectedTags(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev, t])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const maxAttempts = 30
      for (let i = 0; i < maxAttempts && !cancelled; i++) {
        try {
          const r = await fetch(`${API_BASE}/api/commands`)
          if (r.ok) {
            const data = await r.json()
            if (!cancelled && Array.isArray(data)) setCommands(data)
            break
          }
          if (r.status === 503) {
            await new Promise(r => setTimeout(r, 1000))
            continue
          }
          break
        } catch (e) {
          await new Promise(r => setTimeout(r, 1000))
        }
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = commands.filter(cmd => {
    if (search) {
      const q = search.toLowerCase()
      const name = (cmd.name || '').toLowerCase()
      const desc = (cmd.description || '').toLowerCase()
      if (!name.includes(q) && !desc.includes(q)) return false
    }
    if (selectedTags.length && !selectedTags.every(t => (cmd.tags || []).includes(t))) return false
    if (selectedFW && cmd.framework !== selectedFW) return false
    if (selectedType && cmd.type !== selectedType) return false
    return true
  }).sort((a,b)=>{
    if (sort==='downloads') return (b.downloads||0)-(a.downloads||0)
    if (sort==='rating') return (b.rating||0)-(a.rating||0)
    if (sort==='newest') return new Date(b.createdAt)-new Date(a.createdAt)
    return 0
  })

  const activeFilterCount = selectedTags.length + (selectedFW?1:0) + (selectedType?1:0)

  const inp = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 14 }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '44px 24px' }}>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: C.white, marginBottom: 28 }}>Browse Commands</h1>
      <div style={{ display: 'flex', gap: 10, marginBottom:14, flexWrap: 'wrap' }}>
        <div style={{ flex:1, minWidth:200, position:'relative' }}>
          <Search size={15} style={{ position: 'absolute', left:12, top:'50%', transform:'translateY(-50%)', color: C.muted }} />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search commands…' style={{ ...inp, paddingLeft:36, width:'100%' }} />
        </div>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
          <option value='downloads'>Most Downloaded</option>
          <option value='rating'>Highest Rated</option>
          <option value='newest'>Newest</option>
        </select>
        <button onClick={()=>setShowFilters(!showFilters)} style={{ background: showFilters?C.blurpleDim:C.surface, border: `1px solid ${showFilters?'rgba(88,101,242,0.35)':C.border}`, color: showFilters?C.blurple:C.muted, borderRadius:8, padding:'10px 16px', display:'flex', alignItems:'center', gap:6 }}>{<Filter size={14} />} Filters{activeFilterCount>0 && ` (${activeFilterCount})`}</button>
      </div>

      {showFilters && (
        <div style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:22, marginBottom:16 }}>
          <div><div style={{ color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:10 }}>Framework</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>{FRAMEWORKS.map(fw => <button key={fw} onClick={()=>setSelectedFW(selectedFW===fw? '':fw)} style={{ background: selectedFW===fw?C.blurpleDim:'rgba(255,255,255,0.05)', border:`1px solid ${selectedFW===fw?'rgba(88,101,242,0.35)':'transparent'}`, borderRadius:999, padding:'4px 13px', color: selectedFW===fw?C.blurple:C.muted }}>{fw}</button>)}</div>
          </div>
          <div style={{ marginTop:12 }}><div style={{ color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:10 }}>Command Type</div>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>{CMD_TYPES.map(t=><button key={t} onClick={()=>setSelectedType(selectedType===t?'':t)} style={{ background:selectedType===t?C.blurpleDim:'rgba(255,255,255,0.05)', border:`1px solid ${selectedType===t?'rgba(88,101,242,0.35)':'transparent'}`, borderRadius:999, padding:'4px 13px', color:selectedType===t?C.blurple:C.muted }}>{t}</button>)}</div>
          </div>
          <div style={{ marginTop:12 }}><div style={{ color:C.muted,fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:10 }}>Tags</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{ALL_TAGS.map(t => <TagBadge key={t} tag={t} onClick={()=>toggleTag(t)} selected={selectedTags.includes(t)} />)}</div>
          </div>
          {activeFilterCount>0 && <button onClick={()=>{ setSelectedTags([]); setSelectedFW(''); setSelectedType('') }} style={{ marginTop:12, background:'none', border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 14px', color:C.muted, display:'flex', alignItems:'center', gap:5 }}><X size={13} /> Clear filters</button>}
        </div>
      )}

      <div style={{ color:C.muted, fontSize:13, marginBottom:18 }}>{filtered.length} command{filtered.length!==1?'s':''} found</div>

      {filtered.length>0 ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(290px, 1fr))', gap:16 }}>{filtered.map(cmd => <CommandCard key={cmd.id} cmd={cmd} onClick={onViewCommand} />)}</div>
      ) : (
        <div style={{ textAlign:'center', padding:'80px 20px', color:C.muted }}>
          <Search size={40} style={{ marginBottom:16, opacity:0.25 }} />
          <p style={{ fontSize:16, margin:0 }}>No commands match your search</p>
          <p style={{ fontSize:13, marginTop:8 }}>Try adjusting your filters or search term</p>
        </div>
      )}
    </div>
  )
}
