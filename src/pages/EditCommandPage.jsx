import React, { useEffect, useState } from 'react';
import { C, FRAMEWORKS, CMD_TYPES, ALL_TAGS } from '../constants';

export default function EditCommandPage({ user, pageParams }) {
  const id = pageParams && pageParams.id;
  const API_BASE = import.meta.env.DEV ? '' : import.meta.env.VITE_API_BASE || '';
  const [cmd, setCmd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/commands/${encodeURIComponent(id)}`);
        if (r.ok) {
          const j = await r.json();
          if (!cancelled) setCmd(j);
        }
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => (cancelled = true);
  }, [id]);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!cmd) return <div style={{ padding: 24 }}>Command not found.</div>;

  const handleChange = (k, v) => setCmd((s) => ({ ...s, [k]: v }));

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
    <div style={{ maxWidth: 920, margin: '24px auto', padding: '24px' }}>
      <h2 style={{ color: C.white }}>Edit upload: /{cmd.name}</h2>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 20, borderRadius: 12 }}>
        <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Name</label>
        <input value={cmd.name || ''} onChange={(e)=>handleChange('name', e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, marginBottom: 12 }} />

        <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Description</label>
        <textarea value={cmd.description || ''} onChange={(e)=>handleChange('description', e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, minHeight: 80, marginBottom: 12 }} />

        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Type</label>
            <select value={cmd.type || ''} onChange={(e)=>handleChange('type', e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6 }}>
              {CMD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Framework</label>
            <select value={cmd.framework || ''} onChange={(e)=>handleChange('framework', e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6 }}>
              {FRAMEWORKS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Version</label>
        <input value={cmd.version || ''} onChange={(e)=>handleChange('version', e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, marginBottom: 12 }} />

        <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Tags (comma separated)</label>
        <input value={Array.isArray(cmd.tags)?cmd.tags.join(', '):(cmd.tags||'')} onChange={(e)=>handleChange('tags', e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, marginBottom: 12 }} list="tag-suggestions" />
        <datalist id="tag-suggestions">
          {ALL_TAGS.map(t=> <option key={t} value={t} />)}
        </datalist>

        <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>GitHub URL</label>
        <input value={cmd.githubUrl || ''} onChange={(e)=>handleChange('githubUrl', e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, marginBottom: 12 }} />

        <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Website URL</label>
        <input value={cmd.websiteUrl || ''} onChange={(e)=>handleChange('websiteUrl', e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, marginBottom: 12 }} />

        <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Changelog</label>
        <textarea value={cmd.changelog || ''} onChange={(e)=>handleChange('changelog', e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, minHeight: 80, marginBottom: 12 }} />

        <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Upload Category</label>
        <select value={cmd.uploadCategory || 'Framework'} onChange={(e)=>handleChange('uploadCategory', e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, marginBottom: 12 }}>
          <option value="Framework">Framework</option>
          <option value="Bot Tool">Bot Tool</option>
        </select>

        <label style={{ display: 'block', color: C.muted, fontSize: 13 }}>Raw Data</label>
        <textarea value={cmd.rawData || ''} onChange={(e)=>handleChange('rawData', e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, minHeight: 140, marginBottom: 12 }} />

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={save} disabled={saving} style={{ background: '#5865F2', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 8 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {success && <div style={{ color: C.green }}>Saved — changes persisted.</div>}
        </div>
      </div>
    </div>
  );
}
