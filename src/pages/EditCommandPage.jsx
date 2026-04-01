import React, { useEffect, useState } from 'react';
import { C, FRAMEWORKS, CMD_TYPES, ALL_TAGS } from '../constants';

export default function EditCommandPage({ user, pageParams }) {
  const id = pageParams && pageParams.id;
  const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '' : '/api');
  const [cmd, setCmd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [original, setOriginal] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/commands/${encodeURIComponent(id)}`);
        if (r.ok) {
          const j = await r.json();
          if (!cancelled) {
            setCmd(j);
            setOriginal(j);
          }
        }
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => (cancelled = true);
  }, [id]);

  useEffect(() => {
    try {
      setDirty(original ? JSON.stringify(original) !== JSON.stringify(cmd) : false);
    } catch (e) {
      setDirty(false);
    }
  }, [cmd, original]);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!cmd) return <div style={{ padding: 24 }}>Command not found.</div>;

  const handleChange = (k, v) => setCmd((s) => ({ ...s, [k]: v }));

  

  const cancel = () => {
    try {
      window.history.back();
    } catch (e) {
      // fallback: go to profile
      window.location.href = '/';
    }
  };

  const save = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const body = {
        name: cmd.name,
        description: cmd.description,
        type: cmd.type,
        framework: cmd.framework,
        version: cmd.version,
        tags: Array.isArray(cmd.tags) ? cmd.tags : (cmd.tags || '').split(',').map(t=>t.trim()).filter(Boolean),
        githubUrl: cmd.githubUrl,
        websiteUrl: cmd.websiteUrl,
        changelog: cmd.changelog,
        rawData: cmd.rawData,
        uploadCategory: cmd.uploadCategory || 'Framework',
      };
      const r = await fetch(`${API_BASE}/api/commands/${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const j = await r.json();
        setCmd(j);
        setSuccess(true);
        setOriginal(j);
        setDirty(false);
      } else if (r.status === 403) {
        alert('You are not authorized to edit this upload.');
      } else {
        const t = await r.text();
        alert('Save failed: ' + t);
      }
    } catch (e) {
      console.error(e);
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '24px auto', padding: '12px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ color: C.white, margin: 0 }}>Edit upload</h2>
          <div style={{ color: C.muted, marginTop: 6 }}>/ {cmd.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={cancel} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: C.text, padding: '8px 12px', borderRadius: 8 }}>Cancel</button>
          <button onClick={save} disabled={saving || !dirty} style={{ background: saving ? '#4b59d6' : '#5865F2', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontWeight: 700 }}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 18, borderRadius: 12 }}>
          <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Name</label>
          <input value={cmd.name || ''} onChange={(e)=>handleChange('name', e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, marginBottom: 12, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }} />

          <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Description</label>
          <textarea value={cmd.description || ''} onChange={(e)=>handleChange('description', e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, minHeight: 96, marginBottom: 12, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }} />

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Type</label>
              <select value={cmd.type || ''} onChange={(e)=>handleChange('type', e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }}>
                {CMD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Framework</label>
              <select value={cmd.framework || ''} onChange={(e)=>handleChange('framework', e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }}>
                {FRAMEWORKS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Version</label>
          <input value={cmd.version || ''} onChange={(e)=>handleChange('version', e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, marginBottom: 12, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }} />

          <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Tags (comma separated)</label>
          <input value={Array.isArray(cmd.tags)?cmd.tags.join(', '):(cmd.tags||'')} onChange={(e)=>handleChange('tags', e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, marginBottom: 12, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }} list="tag-suggestions" />
          <datalist id="tag-suggestions">
            {ALL_TAGS.map(t=> <option key={t} value={t} />)}
          </datalist>

          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>GitHub URL</label>
              <input value={cmd.githubUrl || ''} onChange={(e)=>handleChange('githubUrl', e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Website URL</label>
              <input value={cmd.websiteUrl || ''} onChange={(e)=>handleChange('websiteUrl', e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }} />
            </div>
          </div>

          <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Changelog</label>
          <textarea value={cmd.changelog || ''} onChange={(e)=>handleChange('changelog', e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, minHeight: 72, marginBottom: 12, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }} />

          <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Upload Category</label>
          <select value={cmd.uploadCategory || 'Framework'} onChange={(e)=>handleChange('uploadCategory', e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, marginBottom: 12, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }}>
            <option value="Framework">Framework</option>
            <option value="Bot Tool">Bot Tool</option>
          </select>

        </div>

        <aside style={{ position: 'relative' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 14, borderRadius: 12, marginBottom: 12 }}>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Raw Data (live preview)</div>
            <textarea value={cmd.rawData || ''} onChange={(e)=>handleChange('rawData', e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, minHeight: 200, background: '#0f1012', color: '#e6edf3', fontFamily: 'monospace', fontSize: 12, border: `1px solid ${C.border}` }} />
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 12, borderRadius: 12 }}>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Preview</div>
            <div style={{ color: C.text, fontSize: 13, lineHeight: '1.4', maxHeight: 220, overflow: 'auto' }}>
              {(() => {
                try {
                  const parsed = typeof cmd.rawData === 'string' ? JSON.parse(cmd.rawData || '{}') : cmd.rawData || {};
                  return <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', margin: 0, color: '#cfd8e3' }}>{JSON.stringify(parsed, null, 2)}</pre>;
                } catch (e) {
                  return <div style={{ color: C.yellow }}>Invalid JSON — preview unavailable</div>;
                }
              })()}
            </div>
          </div>
        </aside>
      </div>

      {success && <div style={{ marginTop: 12, color: C.green }}>Saved — changes persisted.</div>}
    </div>
  );
}
