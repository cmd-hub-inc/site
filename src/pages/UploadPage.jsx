import React, { useState, useEffect } from 'react';
import { LogIn, Upload, Check, AlertCircle, Eye, EyeOff, Rocket, Clipboard, Save, XCircle, Lightbulb, CheckCircle2 } from 'lucide-react';
import { C, CMD_TYPES, FRAMEWORKS, BOT_TOOLS, ALL_TAGS, fmt } from '../constants';
import { TagBadge, FrameworkBadge, TypeBadge } from '../components/Badges';
import MonacoEditor from '../components/MonacoEditor';
import CommandCard from '../components/CommandCard';
import { saveReturnTo } from '../lib/authHelpers';

const DRAFT_STORAGE_KEY = 'upload_form_draft';
const DRAFT_AUTO_SAVE_INTERVAL = 3000; // Auto-save every 3 seconds

export default function UploadPage({ user, onNavigate }) {
  const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '' : '');
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    return saved
      ? JSON.parse(saved)
      : {
          name: '',
          description: '',
          type: 'Slash',
          framework: 'Discord.js',
          version: 'v1.0.0',
          uploadCategory: 'Framework',
          tags: [],
          githubUrl: '',
          websiteUrl: '',
          changelog: '',
          rawData: '',
          screenshotUrl: '',
        };
  });
  const [showPreview, setShowPreview] = useState(false);
  const [jsonError, setJsonError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imageError, setImageError] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  // Auto-save draft to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
    }, DRAFT_AUTO_SAVE_INTERVAL);
    return () => clearTimeout(timer);
  }, [form]);

  // Keyboard shortcut: Ctrl+Enter to submit
  useEffect(() => {
    const handleKeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canSubmit && !submitted) {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [form, submitted]);

  // Auto-update framework when switching categories
  useEffect(() => {
    if (form.uploadCategory === 'Framework' && BOT_TOOLS.includes(form.framework)) {
      set('framework', FRAMEWORKS[0]);
    } else if (form.uploadCategory === 'Bot Tool' && FRAMEWORKS.includes(form.framework)) {
      set('framework', BOT_TOOLS[0]);
    }
  }, [form.uploadCategory]);

  // Validation helpers
  const validations = {
    name: form.name.length >= 2 && form.name.length <= 50,
    description: form.description.length >= 10 && form.description.length <= 500,
    rawData: form.rawData.length >= 10,
    screenshot: !form.screenshotUrl || (imageError === '' && !imageLoading),
    json:
      form.uploadCategory === 'Bot Tool'
        ? !jsonError && form.rawData.length > 0
        : true,
  };

  const allValid = Object.values(validations).every(Boolean);
  const canSubmit = validations.name && validations.description && validations.rawData && validations.json && !jsonError;

  // Validation errors for summary
  const errors = [
    !validations.name && 'Command name must be 2-50 characters',
    !validations.description && 'Description must be 10-500 characters',
    !validations.rawData && 'Code/JSON must be at least 10 characters',
    jsonError && `JSON Error: ${jsonError}`,
    form.tags.length === 0 && 'Select at least one tag',
    imageError && `Image Error: ${imageError}`,
  ].filter(Boolean);

  if (!user)
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: C.blurpleDim,
            border: `1px solid rgba(88,101,242,0.3)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <LogIn size={28} color={C.blurple} />
        </div>
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            color: C.white,
            marginBottom: 8,
            fontSize: 24,
          }}
        >
          Login Required
        </h2>
        <p style={{ color: C.muted, marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
          You need to log in with Discord to upload commands to CmdHub.
        </p>
        <a
          href="/api/auth/discord"
          onClick={(e) => {
            saveReturnTo('/upload');
            console.log('[client] upload page login clicked, saving return destination');
          }}
          style={{
            background: C.blurple,
            color: '#fff',
            textDecoration: 'none',
            border: 'none',
            borderRadius: 8,
            padding: '12px 28px',
            fontSize: 15,
            fontWeight: 700,
            display: 'inline-block',
          }}
        >
          Login with Discord
        </a>
      </div>
    );

  if (submitted)
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ fontSize: 52, marginBottom: 18 }}>
          <Rocket size={52} style={{ color: C.blurple }} />
        </div>
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            color: C.white,
            marginBottom: 8,
            fontSize: 24,
          }}
        >
          Command Submitted!
        </h2>
        <p style={{ color: C.muted, marginBottom: 30 }}>
          Your command is being reviewed and will appear in the registry shortly.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => {
              setSubmitted(false);
              setForm({
                name: '',
                description: '',
                type: 'Slash',
                framework: 'Discord.js',
                version: 'v1.0.0',
                uploadCategory: 'Framework',
                tags: [],
                githubUrl: '',
                websiteUrl: '',
                changelog: '',
                rawData: '',
                screenshotUrl: '',
              });
            }}
            style={{
              background: C.surface,
              color: C.text,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '11px 22px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Upload Another
          </button>
          <button
            onClick={() => onNavigate('browse')}
            style={{
              background: C.blurple,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '11px 22px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Browse Commands
          </button>
        </div>
      </div>
    );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleTag = (t) =>
    set('tags', form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t]);

  // Handle raw data change
  const handleRaw = (v) => {
    set('rawData', v);
    if (!v) {
      setJsonError('');
      return;
    }
    if (form.uploadCategory === 'Bot Tool') {
      try {
        JSON.parse(v);
        setJsonError('');
      } catch {
        setJsonError('Invalid JSON — please check your syntax');
      }
    } else {
      setJsonError('');
    }
  };

  // Validate image URL and load thumbnail
  const validateImageUrl = (url) => {
    if (!url) {
      setImageError('');
      return;
    }
    setImageLoading(true);
    setImageError('');
    const img = new Image();
    img.onload = () => {
      setImageLoading(false);
    };
    img.onerror = () => {
      setImageError('Invalid image URL or image failed to load');
      setImageLoading(false);
    };
    img.src = url;
  };

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      // Check file size (2GB limit)
      if (file.size > 2 * 1024 * 1024 * 1024) {
        alert('File size exceeds 2GB limit');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        handleRaw(text);
      };
      reader.onerror = () => {
        alert('Failed to read file');
      };
      reader.readAsText(file);
    }
  };

  // Submit form
  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const payload = { ...form };
      const r = await fetch(`${API_BASE}/api/commands`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.status === 201) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setSubmitted(true);
      } else if (r.status === 401) {
        alert('You must be logged in to submit a command.');
      } else {
        const txt = await r.text();
        alert('Submission failed: ' + txt);
      }
    } catch (err) {
      console.error('submit failed', err);
      alert('Submission failed — check console for details.');
    }
  };

  // Preview command object
  const previewCmd = {
    name: form.name || 'command-name',
    description: form.description || 'Command description will appear here.',
    type: form.type,
    framework: form.framework,
    version: form.version,
    tags: form.tags,
    downloads: 0,
    favourites: 0,
    rating: 0,
  };

  const inp = {
    width: '100%',
    background: C.surface2,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '11px 14px',
    color: C.text,
    fontSize: 14,
    boxSizing: 'border-box',
  };

  const inputValid = (isValid) => ({
    ...inp,
    borderColor: isValid ? C.green || '#00B06F' : C.border,
    boxShadow: isValid ? `0 0 0 2px rgba(0, 176, 111, 0.1)` : 'none',
  });

  const label = {
    display: 'block',
    color: C.muted,
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 32,
              fontWeight: 700,
              color: C.white,
              marginBottom: 6,
              margin: 0,
            }}
          >
            Upload a Command
          </h1>
          <p style={{ color: C.muted, marginBottom: 0, fontSize: 14, marginTop: 8 }}>
            Share your command raw data with the CmdHub community.
          </p>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          style={{
            background: showPreview ? C.blurple : C.surface,
            color: showPreview ? '#fff' : C.text,
            border: `1px solid ${showPreview ? C.blurple : C.border}`,
            borderRadius: 8,
            padding: '10px 16px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
          }}
        >
          {showPreview ? <Eye size={16} /> : <EyeOff size={16} />}
          <span style={{ display: 'none' }}>Show</span>
          <span style={{ display: 'inline' }}>Preview</span>
        </button>
      </div>

      {/* VALIDATION SUMMARY */}
      {errors.length > 0 && (
        <div
          style={{
            background: `rgba(220, 38, 38, 0.1)`,
            border: `1px solid ${C.red}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'start', marginBottom: errors.length > 1 ? 12 : 0 }}>
            <AlertCircle size={18} style={{ color: C.red, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              {errors.length === 1 ? (
                <p style={{ color: C.red, fontSize: 13, margin: 0, fontWeight: 600 }}>{errors[0]}</p>
              ) : (
                <div>
                  <p style={{ color: C.red, fontSize: 13, margin: 0, fontWeight: 600, marginBottom: 8 }}>
                    {errors.length} issues to fix:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 20, color: C.red, fontSize: 13 }}>
                    {errors.map((e, i) => (
                      <li key={i} style={{ marginBottom: i < errors.length - 1 ? 4 : 0 }}>
                        {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* READY TO SUBMIT CHECKLIST */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          {allValid ? (
            <CheckCircle2 size={20} style={{ color: '#00B06F' }} />
          ) : (
            <Clipboard size={20} style={{ color: C.muted }} />
          )}
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.white }}>
            Requirements {allValid ? 'Complete' : `(${[validations.name && 1, validations.description && 1, validations.rawData && 1, form.tags.length > 0 && 1].filter(Boolean).length}/4)`}
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { label: 'Command Name', valid: validations.name },
            { label: 'Description', valid: validations.description },
            { label: 'Code / JSON', valid: validations.rawData },
            { label: 'Tags Selected', valid: form.tags.length > 0 },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: item.valid ? `rgba(0, 176, 111, 0.1)` : `rgba(107, 114, 128, 0.1)`,
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              {item.valid ? (
                <Check size={16} style={{ color: '#00B06F' }} />
              ) : (
                <div style={{ width: 16, height: 16, borderRadius: 999, border: `2px solid ${C.faint}` }} />
              )}
              <span style={{ color: item.valid ? '#00B06F' : C.muted }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="upload-form-grid" style={{ display: 'grid', gridTemplateColumns: showPreview ? 'minmax(280px, 1fr) minmax(280px, 380px)' : '1fr', gap: 'clamp(16px, 4vw, 28px)' }}>
        {/* FORM SECTION */}
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {['Framework', 'Bot Tool'].map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  set('uploadCategory', opt);
                  setJsonError('');
                }}
                style={{
                  background: form.uploadCategory === opt ? C.blurple : 'transparent',
                  color: form.uploadCategory === opt ? '#fff' : C.muted,
                  border: `1px solid ${form.uploadCategory === opt ? C.blurple : C.border}`,
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 'clamp(16px, 4vw, 30px)',
              overflow: 'hidden',
            }}
          >
            {/* Command Name + Version */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'clamp(140px, 1fr, 1fr) clamp(100px, 160px, 180px)',
                gap: 16,
                marginBottom: 20,
                alignItems: 'start',
              }}
            >
              <div>
                <label style={label}>
                  Command Name <span style={{ color: C.red }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: C.blurple,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 16,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    /
                  </span>
                  <input
                    value={form.name}
                    onChange={(e) => set('name', e.target.value.replace(/\s/g, '-').toLowerCase())}
                    placeholder="command-name"
                    style={{
                      ...inputValid(validations.name),
                      height: 40,
                      padding: '0 14px 0 36px',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                  {form.name && (
                    <span style={{ color: C.faint, fontSize: 11, marginTop: 4, display: 'block' }}>
                      {form.name.length}/50
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label style={label}>Version</label>
                <input
                  value={form.version}
                  onChange={(e) => set('version', e.target.value)}
                  placeholder="v1.0.0"
                  style={{ ...inputValid(true), paddingLeft: 12 }}
                />
              </div>
            </div>

            {/* Framework + Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={label}>
                  {form.uploadCategory === 'Framework' ? 'Framework' : 'Tool'}
                </label>
                <select
                  value={form.framework}
                  onChange={(e) => set('framework', e.target.value)}
                  style={{ ...inputValid(true), cursor: 'pointer' }}
                >
                  {form.uploadCategory === 'Framework'
                    ? FRAMEWORKS.map((f) => <option key={f}>{f}</option>)
                    : BOT_TOOLS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Command Type</label>
                <select
                  value={form.type}
                  onChange={(e) => set('type', e.target.value)}
                  style={{ ...inputValid(true), cursor: 'pointer' }}
                >
                  {CMD_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                  {form.uploadCategory === 'Bot Tool' && <option key="Tool">Tool</option>}
                </select>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <label style={label}>
                Description <span style={{ color: C.red }}>*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="What does this command do?"
                rows={3}
                style={{ ...inputValid(validations.description), resize: 'vertical' }}
              />
              <span style={{ color: C.faint, fontSize: 11, marginTop: 4, display: 'block' }}>
                {form.description.length}/500
              </span>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: 20 }}>
              <label style={label}>
                Tags <span style={{ color: C.red }}>*</span>
              </label>
              
              {/* Tag Search Input */}
              <input
                type="text"
                placeholder="Search tags..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value.toLowerCase())}
                style={{
                  ...inputValid(true),
                  marginBottom: 12,
                  width: '100%',
                }}
              />

              {/* Selected Tags Display */}
              {form.tags.length > 0 && (
                <div style={{ marginBottom: 12, padding: 10, background: C.surface2, borderRadius: 8 }}>
                  <div style={{ color: C.faint, fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>
                    Selected ({form.tags.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {form.tags.sort().map((t) => (
                      <TagBadge
                        key={t}
                        tag={t}
                        onClick={() => toggleTag(t)}
                        selected={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Available Tags */}
              <div>
                <div style={{ color: C.faint, fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>
                  Available
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ALL_TAGS
                    .filter((t) => t.includes(tagSearch) && !form.tags.includes(t))
                    .sort()
                    .map((t) => (
                      <TagBadge
                        key={t}
                        tag={t}
                        onClick={() => toggleTag(t)}
                        selected={false}
                      />
                    ))}
                </div>
                {ALL_TAGS.filter((t) => t.includes(tagSearch) && !form.tags.includes(t)).length === 0 && tagSearch && (
                  <p style={{ color: C.faint, fontSize: 12, marginTop: 8 }}>
                    No tags match "{tagSearch}"
                  </p>
                )}
              </div>

              {form.tags.length === 0 && (
                <p style={{ color: C.faint, fontSize: 12, marginTop: 8 }}>
                  Select at least one tag to help people find your command.
                </p>
              )}
            </div>

            {/* GitHub & Website URLs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={label}>GitHub URL</label>
                <input
                  value={form.githubUrl}
                  onChange={(e) => set('githubUrl', e.target.value)}
                  placeholder="https://github.com/you/repo"
                  style={{ ...inputValid(true) }}
                />
              </div>
              <div>
                <label style={label}>Website URL</label>
                <input
                  value={form.websiteUrl}
                  onChange={(e) => set('websiteUrl', e.target.value)}
                  placeholder="https://yoursite.com"
                  style={{ ...inputValid(true) }}
                />
              </div>
            </div>

            {/* Code / Raw Data with Drag & Drop */}
            <div style={{ marginBottom: 20 }}>
              <label style={label}>
                {form.uploadCategory === 'Bot Tool' ? (
                  <>
                    Raw JSON Data <span style={{ color: C.red }}>*</span>
                  </>
                ) : (
                  <>
                    Code / Raw Data <span style={{ color: C.red }}>*</span>
                  </>
                )}
              </label>
              {form.uploadCategory === 'Bot Tool' ? (
                <textarea
                  value={form.rawData}
                  onChange={(e) => handleRaw(e.target.value)}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  placeholder={`{
  "name": "your-command",
  "description": "...",
  "options": []
}`}
                  rows={15}
                  style={{
                    ...inp,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    resize: 'vertical',
                    minHeight: 'clamp(200px, 40vh, 400px)',
                    borderColor: jsonError ? C.red : dragActive ? C.blurple : C.border,
                    backgroundColor: dragActive ? `rgba(88, 101, 242, 0.1)` : C.surface2,
                    transition: 'all 0.2s ease',
                  }}
                />
              ) : (
                <div>
                  <div
                    style={{
                      background: C.surface2,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
                      <div>
                        <div style={{ color: C.faint, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                          FRAMEWORK
                        </div>
                        <div
                          style={{
                            color: C.white,
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {form.framework}
                        </div>
                      </div>
                      <div
                        style={{
                          width: 1,
                          height: 30,
                          background: C.border,
                        }}
                      />
                      <div>
                        <div style={{ color: C.faint, fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                          LANGUAGE
                        </div>
                        <div
                          style={{
                            color: C.blurple,
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: "'JetBrains Mono', monospace",
                            textTransform: 'capitalize',
                          }}
                        >
                          {form.framework && form.framework.toLowerCase().includes('python')
                            ? 'Python'
                            : form.framework && form.framework.toLowerCase().includes('json')
                              ? 'JSON'
                              : 'JavaScript'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: C.muted }}>
                      <Clipboard size={16} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 12 }}>Drag & drop</span>
                      <span style={{ opacity: 0.5 }}>•</span>
                      <span style={{ fontSize: 12 }}>Paste code</span>
                    </div>
                  </div>
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    style={{
                      border: dragActive ? `2px solid ${C.blurple}` : `1px solid ${C.border}`,
                      borderRadius: 8,
                      overflow: 'hidden',
                      backgroundColor: C.surface2,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <MonacoEditor
                      value={form.rawData}
                      onChange={(v) => handleRaw(v)}
                      language={
                        form.framework && form.framework.toLowerCase().includes('python')
                          ? 'python'
                          : form.framework && form.framework.toLowerCase().includes('json')
                            ? 'json'
                            : 'javascript'
                      }
                      height="clamp(200px, 40vh, 300px)"
                    />
                  </div>
                </div>
              )}
              <div style={{ marginTop: 8, color: C.muted, fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                {form.uploadCategory === 'Bot Tool' ? (
                  <>
                    <Clipboard size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>Expecting framework-agnostic JSON. Drag & drop a .json file or paste code directly. {form.rawData.length}/∞</span>
                  </>
                ) : (
                  <>
                    <Save size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                      Paste your {form.framework} code or snippet. Include the command implementation, handler, or any exports needed. {form.rawData.length}/∞
                    </span>
                  </>
                )}
              </div>
              {jsonError && (
                <div style={{ color: C.red, fontSize: 12, marginTop: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{jsonError}</span>
                </div>
              )}
            </div>

            {/* Changelog */}
            <div style={{ marginBottom: 20 }}>
              <label style={label}>Changelog / Update Notes</label>
              <textarea
                value={form.changelog}
                onChange={(e) => set('changelog', e.target.value)}
                placeholder={'v1.0.0: Initial release.'}
                rows={3}
                style={{ ...inputValid(true), resize: 'vertical' }}
              />
            </div>

            {/* Screenshot URL */}
            <div style={{ marginBottom: 28 }}>
              <label style={label}>Preview Screenshot (Image URL) - Coming Soon</label>
              <input
                value={form.screenshotUrl}
                onChange={(e) => {
                  set('screenshotUrl', e.target.value);
                  validateImageUrl(e.target.value);
                }}
                placeholder="https://example.com/screenshot.png"
                style={{
                  ...inputValid(!imageError && !imageLoading),
                  opacity: 0.5,
                  cursor: 'not-allowed',
                  pointerEvents: 'none',
                }}
                disabled
              />
              <div style={{ color: C.faint, fontSize: 12, marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                <Rocket size={12} />
                <span>Full image upload functionality coming soon. But keep an eye out!</span>
              </div>
              {form.screenshotUrl && !imageError && !imageLoading && (
                <img
                  src={form.screenshotUrl}
                  alt="preview"
                  style={{
                    marginTop: 12,
                    maxWidth: '100%',
                    maxHeight: 200,
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                  }}
                />
              )}
              {imageLoading && (
                <div style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>Loading image...</div>
              )}
              {imageError && (
                <div style={{ color: C.red, fontSize: 12, marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <XCircle size={14} />
                  <span>{imageError}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                width: '100%',
                background: canSubmit ? C.blurple : C.surface3,
                color: canSubmit ? '#fff' : C.faint,
                border: 'none',
                borderRadius: 10,
                padding: '14px',
                fontSize: 15,
                fontWeight: 800,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
              title={canSubmit ? 'Or press Ctrl+Enter' : ''}
            >
              {canSubmit ? (
                <>
                  <Check size={16} style={{ marginRight: 6, display: 'inline' }} />
                  Submit Command
                </>
              ) : (
                'Complete form to submit'
              )}
            </button>
            {canSubmit && (
              <div style={{ color: C.faint, fontSize: 11, marginTop: 8, textAlign: 'center', display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                <Lightbulb size={14} />
                <span>Tip: Press <kbd style={{ background: C.surface2, padding: '2px 6px', borderRadius: 4 }}>Ctrl+Enter</kbd> to submit</span>
              </div>
            )}
          </div>
        </div>

        {/* PREVIEW PANEL */}
        {showPreview && (
          <div style={{ height: 'fit-content', position: 'sticky', top: 'clamp(12px, 2vh, 24px)' }}>
            <h3 style={{ color: C.white, fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              Preview
            </h3>
            <CommandCard cmd={previewCmd} />
          </div>
        )}
      </div>
    </div>
  );
}
