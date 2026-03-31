import React, { useState } from 'react'
import { LogIn, Upload } from 'lucide-react'
import { C, CMD_TYPES, FRAMEWORKS, ALL_TAGS } from '../constants'
import { TagBadge } from '../components/Badges'

export default function UploadPage({ user, onNavigate }) {
  const [form, setForm] = useState({ name:'', description:'', type:'Slash', framework:'Discord.js', version:'v1.0.0', tags:[], githubUrl:'', websiteUrl:'', changelog:'', rawData:'' })
  const [jsonError, setJsonError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!user) return (
    <div style={{ textAlign:'center', padding:'100px 24px' }}>
      <div style={{ width:72, height:72, borderRadius:'50%', background:C.blurpleDim, border:`1px solid rgba(88,101,242,0.3)`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}><LogIn size={28} color={C.blurple} /></div>
      <h2 style={{ fontFamily: "'Syne', sans-serif", color:C.white, marginBottom:8, fontSize:24 }}>Login Required</h2>
      <p style={{ color:C.muted, marginBottom:28, maxWidth:380, margin:'0 auto 28px' }}>You need to log in with Discord to upload commands to CmdHub.</p>
      <button onClick={()=>{ window.location.href = '/api/auth/discord' }} style={{ background:C.blurple, color:'#fff', border:'none', borderRadius:8, padding:'12px 28px', fontSize:15, fontWeight:700 }}>Login with Discord</button>
    </div>
  )

  if (submitted) return (
    <div style={{ textAlign:'center', padding:'100px 24px' }}>
      <div style={{ fontSize:52, marginBottom:18 }}>🎉</div>
      <h2 style={{ fontFamily: "'Syne', sans-serif", color:C.white, marginBottom:8, fontSize:24 }}>Command Submitted!</h2>
      <p style={{ color:C.muted, marginBottom:30 }}>Your command is being reviewed and will appear in the registry shortly.</p>
      <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
        <button onClick={()=>{ setSubmitted(false); setForm({ name:'', description:'', type:'Slash', framework:'Discord.js', version:'v1.0.0', tags:[], githubUrl:'', websiteUrl:'', changelog:'', rawData:'' }) }} style={{ background:C.surface, color:C.text, border:`1px solid ${C.border}`, borderRadius:8, padding:'11px 22px', cursor:'pointer', fontSize:14, fontWeight:600 }}>Upload Another</button>
        <button onClick={()=>onNavigate('browse')} style={{ background:C.blurple, color:'#fff', border:'none', borderRadius:8, padding:'11px 22px', cursor:'pointer', fontSize:14, fontWeight:700 }}>Browse Commands</button>
      </div>
    </div>
  )

  const set = (k,v) => setForm(f=>({ ...f, [k]:v }))
  const toggleTag = (t) => set('tags', form.tags.includes(t) ? form.tags.filter(x=>x!==t) : [...form.tags, t])
  const handleRaw = (v) => { set('rawData', v); if (!v) { setJsonError(''); return } try { JSON.parse(v); setJsonError('') } catch { setJsonError('Invalid JSON — please check your syntax') } }
  const canSubmit = form.name && form.description && form.rawData && !jsonError

  const inp = { width:'100%', background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, padding:'11px 14px', color:C.text, fontSize:14 }
  const label = { display:'block', color:C.muted, fontSize:11, fontWeight:700, marginBottom:7, textTransform:'uppercase', letterSpacing:0.8 }

  return (
    <div style={{ maxWidth:740, margin:'0 auto', padding:'44px 24px' }}>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize:30, fontWeight:800, color:C.white, marginBottom:6 }}>Upload a Command</h1>
      <p style={{ color:C.muted, marginBottom:32, fontSize:15 }}>Share your command raw data with the CmdHub community.</p>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:30 }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:20 }}>
          <div><label style={label}>Command Name *</label><div style={{ position:'relative' }}><span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.blurple, fontFamily:"'JetBrains Mono', monospace", fontSize:16 }}>/</span><input value={form.name} onChange={e=>set('name', e.target.value.replace(/\s/g,'-').toLowerCase())} placeholder='command-name' style={{ ...inp, paddingLeft:26, fontFamily:"'JetBrains Mono', monospace" }} /></div></div>
          <div><label style={label}>Version</label><input value={form.version} onChange={e=>set('version', e.target.value)} placeholder='v1.0.0' style={inp} /></div>
        </div>
        <div style={{ marginBottom:20 }}><label style={label}>Description *</label><textarea value={form.description} onChange={e=>set('description', e.target.value)} placeholder='What does this command do?' rows={3} style={{ ...inp, resize:'vertical' }} /></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
          <div><label style={label}>Command Type</label><select value={form.type} onChange={e=>set('type', e.target.value)} style={{ ...inp, cursor:'pointer' }}>{CMD_TYPES.map(t=> <option key={t}>{t}</option>)}</select></div>
          <div><label style={label}>Framework</label><select value={form.framework} onChange={e=>set('framework', e.target.value)} style={{ ...inp, cursor:'pointer' }}>{FRAMEWORKS.map(f=> <option key={f}>{f}</option>)}</select></div>
        </div>
        <div style={{ marginBottom:20 }}><label style={label}>Tags</label><div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{ALL_TAGS.map(t=> <TagBadge key={t} tag={t} onClick={()=>toggleTag(t)} selected={form.tags.includes(t)} />)}</div>{form.tags.length===0 && <p style={{ color:C.faint, fontSize:12, marginTop:8 }}>Select at least one tag to help people find your command.</p>}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
          <div><label style={label}>GitHub URL</label><input value={form.githubUrl} onChange={e=>set('githubUrl', e.target.value)} placeholder='https://github.com/you/repo' style={inp} /></div>
          <div><label style={label}>Website URL</label><input value={form.websiteUrl} onChange={e=>set('websiteUrl', e.target.value)} placeholder='https://yoursite.com' style={inp} /></div>
        </div>
        <div style={{ marginBottom:20 }}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}><label style={{ ...label, marginBottom:0 }}>Raw JSON Data *</label>{jsonError && <span style={{ color:C.red, fontSize:12 }}>⚠ {jsonError}</span>}</div><textarea value={form.rawData} onChange={e=>handleRaw(e.target.value)} placeholder={'{\n  "name": "your-command",\n  "description": "...",\n  "options": []\n}'} rows={10} style={{ ...inp, fontFamily:"'JetBrains Mono', monospace", fontSize:12, resize:'vertical', border:`1px solid ${jsonError?C.red:C.border}` }} /></div>
        <div style={{ marginBottom:20 }}><label style={label}>Changelog / Update Notes</label><textarea value={form.changelog} onChange={e=>set('changelog', e.target.value)} placeholder={'v1.0.0: Initial release.'} rows={3} style={{ ...inp, resize:'vertical' }} /></div>
        <div style={{ marginBottom:28 }}><label style={label}>Preview Screenshot</label><div style={{ border:`2px dashed ${C.border}`, borderRadius:10, padding:'28px 20px', textAlign:'center', cursor:'pointer' }}><Upload size={22} style={{ color:C.faint, marginBottom:8 }} /><div style={{ color:C.muted, fontSize:14 }}>Click to upload a screenshot</div><div style={{ color:C.faint, fontSize:12, marginTop:4 }}>PNG or JPG · Max 2MB</div></div></div>
        <button onClick={()=>{ if (canSubmit) setSubmitted(true) }} disabled={!canSubmit} style={{ width:'100%', background: canSubmit?C.blurple:C.surface3, color: canSubmit? '#fff':C.faint, border:'none', borderRadius:10, padding:'14px', fontSize:15, fontWeight:800, cursor: canSubmit? 'pointer':'not-allowed' }}>Submit Command</button>
      </div>
    </div>
  )
}
