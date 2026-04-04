import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import CommandCard from './CommandCard';

/**
 * Trending commands component
 */
export default function TrendingCommands({ onViewCommand }) {
  const [trendingCommands, setTrendingCommands] = useState([]);
  const [timeWindow, setTimeWindow] = useState('weekly');
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '' : '');

  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/trending?timeWindow=${timeWindow}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setTrendingCommands(data);
        }
      } catch (error) {
        console.error('Failed to fetch trending commands:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, [timeWindow, API_BASE]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp size={24} className="text-orange-500" />
          <h2 className="text-2xl font-bold text-white">Trending Commands</h2>
        </div>
        <div className="flex gap-2">
          {['weekly', 'monthly'].map((window) => (
            <button
              key={window}
              onClick={() => setTimeWindow(window)}
              className={`px-4 py-2 rounded font-medium transition ${
                timeWindow === window
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {window === 'weekly' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">Loading trending commands...</div>
      ) : trendingCommands.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No trending commands yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trendingCommands.map((cmd, index) => (
            <div key={cmd.id} className="relative">
              <div className="absolute -top-3 -left-3 bg-orange-600 rounded-full w-8 h-8 flex items-center justify-center text-white font-bold text-sm z-10">
                #{cmd.rank || index + 1}
              </div>
              <CommandCard cmd={cmd} onViewCommand={onViewCommand} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
