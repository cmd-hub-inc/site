import React, { useState, useEffect } from 'react';
import { Newspaper, AlertCircle } from 'lucide-react';
import { C } from '../constants';

export default function NewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setNews(data.news || []);
        setError(null);
      } catch (err) {
        console.error('[news] Error fetching news:', err);
        setError('Failed to load news: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

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
          <NewsCard key={item.id} news={item} />
        ))}
      </div>
    </div>
  );
}

function NewsCard({ news }) {
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
        background: C.darkBlog,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.blurple;
        e.currentTarget.style.background = C.blurpleDim;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.background = C.darkBlog;
      }}
    >
      {/* Title */}
      <h2
        style={{
          margin: '0 0 16px 0',
          fontSize: 22,
          fontWeight: 700,
          color: C.lightText,
        }}
      >
        {news.title}
      </h2>

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
