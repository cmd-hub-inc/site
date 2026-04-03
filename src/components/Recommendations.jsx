import React, { useState, useEffect } from 'react';
import { Spark, Loader, ChevronRight } from 'lucide-react';
import { C } from '../constants';
import CommandCard from './CommandCard';

export default function Recommendations({ onViewCommand }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '' : '');

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(`${API_BASE}/api/recommendations?limit=6`, {
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          setRecommendations(Array.isArray(data) ? data.slice(0, 6) : []);
        } else {
          setError('Failed to load recommendations');
        }
      } catch (err) {
        setError('Failed to load recommendations');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchRecommendations, 500); // Small delay to avoid immediate load
    return () => clearTimeout(timer);
  }, [API_BASE]);

  if (loading) {
    return (
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Spark size={28} strokeWidth={2} color={C.blurple} />
          <h2 style={{
            fontSize: 24,
            fontWeight: 700,
            color: C.white,
            margin: 0,
            fontFamily: "'Syne', sans-serif",
          }}>
            Recommended for You
          </h2>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CommandCard key={i} loading={true} />
          ))}
        </div>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Spark size={28} strokeWidth={2} color={C.blurple} />
        <h2 style={{
          fontSize: 24,
          fontWeight: 700,
          color: C.white,
          margin: 0,
          fontFamily: "'Syne', sans-serif",
        }}>
          Recommended for You
        </h2>
        <p style={{
          fontSize: 12,
          color: C.muted,
          margin: 0,
          marginLeft: 'auto',
        }}>
          Based on your browsing history
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 16,
      }}>
        {recommendations.map((cmd) => (
          <div
            key={cmd.id}
            onClick={() => onViewCommand && onViewCommand(cmd)}
            style={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              borderRadius: 12,
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <CommandCard cmd={cmd} onClick={() => onViewCommand && onViewCommand(cmd)} />
          </div>
        ))}
      </div>
    </div>
  );
}
