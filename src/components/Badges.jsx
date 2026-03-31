import React, { useState } from 'react';
import { Code2, MousePointer, MessageSquare } from 'lucide-react';
import { C, FW_COLORS, TYPE_COLORS } from '../constants';

export function TagBadge({ tag, onClick, selected }) {
  const [hov, setHov] = useState(false);
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        cursor: onClick ? 'pointer' : 'default',
        background: selected
          ? C.blurpleDim
          : hov && onClick
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(255,255,255,0.05)',
        color: selected ? C.blurple : C.muted,
        border: `1px solid ${selected ? 'rgba(88,101,242,0.35)' : 'transparent'}`,
      }}
    >
      #{tag}
    </span>
  );
}

export function FrameworkBadge({ fw }) {
  const c = FW_COLORS[fw] || FW_COLORS['Custom'];
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        background: c.bg,
        color: c.color,
      }}
    >
      {fw}
    </span>
  );
}

export function TypeBadge({ type }) {
  const icons = {
    Slash: <Code2 size={10} />,
    Context: <MousePointer size={10} />,
    Message: <MessageSquare size={10} />,
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
        background: 'rgba(255,255,255,0.06)',
        color: TYPE_COLORS[type] || C.muted,
      }}
    >
      {icons[type]} {type}
    </span>
  );
}

export default TagBadge;
