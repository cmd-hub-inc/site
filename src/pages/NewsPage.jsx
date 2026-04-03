import React, { useState, useEffect } from 'react';
import { Newspaper, AlertCircle } from 'lucide-react';
import { C } from '../constants';
import {
  getNewsReadToken,
  getUnreadNewsCount,
  isNewsRead,
  markAllNewsAsRead,
  markNewsAsRead,
} from '../lib/newsReadState';

export default function NewsPage({ user, onReadStateChange }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readIds, setReadIds] = useState(() => new Set());

  const unreadCount = getUnreadNewsCount(news, user);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        console.log('[news] Fetching published news...');
        const res = await fetch('/api/news', { credentials: 'include' });
        console.log('[news] Response status:', res.status);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error('[news] Error response:', errData);
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        console.log('[news] Loaded', data.news?.length || 0, 'news items');
        const items = data.news || [];
        setNews(items);
        const nextReadIds = new Set(
          items.filter((item) => isNewsRead(item, user)).map((item) => getNewsReadToken(item)),
        );
        setReadIds(nextReadIds);
        onReadStateChange?.(getUnreadNewsCount(items, user) > 0);
        setError(null);
      } catch (err) {
        console.error('[news] Error fetching news:', err);
        setError('Failed to load news: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [user, onReadStateChange]);

  const handleMarkRead = (newsItem) => {
    markNewsAsRead(newsItem, user);
    const next = new Set(readIds);
    next.add(getNewsReadToken(newsItem));
    setReadIds(next);
    const unreadAfter = news.filter((item) => !next.has(getNewsReadToken(item))).length;
    onReadStateChange?.(unreadAfter > 0);
  };

  const handleMarkAllRead = () => {
    markAllNewsAsRead(news, user);
    setReadIds(new Set(news.map((item) => getNewsReadToken(item))));
    onReadStateChange?.(false);
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Newspaper size={32} color={C.blurple} />
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: C.lightText }}>
            News & Updates
          </h1>
        </div>
        <p style={{ margin: 0, color: C.muted, fontSize: 15 }}>
          Stay updated with the latest news and announcements from CmdHub.
        </p>
        {!loading && !error && news.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: C.muted, fontSize: 13 }}>
              {unreadCount} unread update{unreadCount === 1 ? '' : 's'}
            </span>
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: unreadCount > 0 ? C.blurpleDim : 'transparent',
                color: unreadCount > 0 ? C.blurple : C.muted,
                cursor: unreadCount > 0 ? 'pointer' : 'not-allowed',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Mark all as read
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted }}>
          <p>Loading news...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 20,
            background: C.blurpleDim,
            borderRadius: 12,
            border: `1px solid ${C.blurple}`,
            marginBottom: 20,
          }}
        >
          <AlertCircle size={20} color={C.blurple} />
          <p style={{ margin: 0, color: C.blurple }}>{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && news.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: C.muted,
          }}
        >
          <Newspaper size={48} color={C.muted} style={{ marginBottom: 16, opacity: 0.5 }} />
          <p style={{ fontSize: 16, margin: '0 0 8px 0' }}>No news yet</p>
          <p style={{ fontSize: 14, margin: 0 }}>
            Check back soon for updates and announcements.
          </p>
        </div>
      )}

      {/* News list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {news.map((item) => (
          <NewsCard
            key={item.id}
            news={item}
            isRead={readIds.has(getNewsReadToken(item))}
            onMarkRead={() => handleMarkRead(item)}
          />
        ))}
      </div>
    </div>
  );
}

function NewsCard({ news, isRead, onMarkRead }) {
  const [hovered, setHovered] = useState(false);

  const parseNewsMeta = (rawTitle) => {
    let title = String(rawTitle || '');
    let category = 'General';
    let important = false;

    const catMatch = title.match(/^\[([^\]]+)\]\s*/);
    if (catMatch) {
      category = catMatch[1];
      title = title.replace(/^\[[^\]]+\]\s*/, '');
    }

    if (/^IMPORTANT:\s*/i.test(title)) {
      important = true;
      title = title.replace(/^IMPORTANT:\s*/i, '');
    }

    return { title, category, important };
  };

  const parsed = parseNewsMeta(news.title);
  const publishedDate = news.publishedAt
    ? new Date(news.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown date';

  return (
    <article
      style={{
        padding: 24,
        background: hovered ? C.blurpleDim : C.darkBlog,
        borderRadius: 12,
        border: `1px solid ${hovered ? C.blurple : parsed.important ? C.red : C.border}`,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: C.lightText,
          }}
        >
          {parsed.title}
        </h2>
        <button
          onClick={onMarkRead}
          disabled={isRead}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: `1px solid ${isRead ? C.border : C.blurple}`,
            background: isRead ? 'transparent' : C.blurpleDim,
            color: isRead ? C.muted : C.blurple,
            fontSize: 12,
            fontWeight: 600,
            cursor: isRead ? 'default' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {isRead ? 'Read' : 'Mark as read'}
        </button>
      </div>

      {/* Meta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          fontSize: 13,
          color: C.muted,
        }}
      >
        {news.authorAvatar && (
          <img
            src={news.authorAvatar}
            alt={news.author}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        )}
        <span>{news.author}</span>
        <span style={{ color: C.muted }}>•</span>
        <time dateTime={news.publishedAt}>{publishedDate}</time>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <span
          style={{
            fontSize: 11,
            padding: '3px 7px',
            borderRadius: 999,
            background: 'rgba(88,101,242,0.14)',
            color: C.blurple,
            fontWeight: 600,
          }}
        >
          {parsed.category}
        </span>
        {parsed.important && (
          <span
            style={{
              fontSize: 11,
              padding: '3px 7px',
              borderRadius: 999,
              background: 'rgba(237,66,69,0.14)',
              color: C.red,
              fontWeight: 700,
            }}
          >
            Important
          </span>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          color: C.text,
          fontSize: 15,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {news.content}
      </div>
    </article>
  );
}
