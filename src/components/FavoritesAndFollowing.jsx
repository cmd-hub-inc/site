import { useState, useEffect } from 'react';
import { Heart, Users, Trash2 } from 'lucide-react';

/**
 * Favorites & Following component
 */
export default function FavoritesAndFollowing({ user, onNavigate }) {
  const [activeTab, setActiveTab] = useState('favorites');
  const [favorites, setFavorites] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '' : '');

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'favorites') {
          const res = await fetch(`${API_BASE}/api/favorites`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            setFavorites(data);
          }
        } else if (activeTab === 'followers') {
          const res = await fetch(`${API_BASE}/api/users/${user.id}/followers`, {
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            setFollowers(data);
          }
        } else if (activeTab === 'following') {
          const res = await fetch(`${API_BASE}/api/users/${user.id}/following`, {
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            setFollowing(data);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch ${activeTab}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, activeTab, API_BASE]);

  const handleRemoveFavorite = async (commandId) => {
    try {
      const res = await fetch(`${API_BASE}/api/favorites/${commandId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setFavorites(favorites.filter((f) => f.id !== commandId));
      }
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/follow`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setFollowing(following.filter((f) => f.id !== userId));
      }
    } catch (error) {
      console.error('Failed to unfollow user:', error);
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center text-gray-400">
        Please log in to view your favorites and following list.
      </div>
    );
  }

  const tabs = [
    { id: 'favorites', label: 'Favorites', icon: Heart, count: favorites.length },
    { id: 'followers', label: 'Followers', icon: Users, count: followers.length },
    { id: 'following', label: 'Following', icon: Users, count: following.length },
  ];

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-700 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Icon size={18} />
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 8, background: '#2b2d31', height: 72 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 14, borderRadius: 4, marginBottom: 8, width: '60%' }} />
                  <div className="skeleton" style={{ height: 12, borderRadius: 4, width: '40%' }} />
                </div>
              </div>
              <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'favorites' && (
            <div className="space-y-3">
              {favorites.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No favorites yet. Start adding commands!
                </p>
              ) : (
                favorites.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
                  >
                    <div
                      onClick={() => onNavigate?.('detail', { id: cmd.id })}
                      className="flex-1 cursor-pointer"
                    >
                      <h3 className="font-semibold text-white hover:text-blue-400 transition">
                        {cmd.name}
                      </h3>
                      <p className="text-sm text-gray-400">{cmd.description.substring(0, 60)}...</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFavorite(cmd.id)}
                      className="ml-4 p-2 text-red-500 hover:bg-red-500/10 rounded transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'followers' && (
            <div className="space-y-3">
              {followers.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No followers yet.</p>
              ) : (
                followers.map((follower) => (
                  <div
                    key={follower.id}
                    className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition cursor-pointer"
                    onClick={() => onNavigate?.('profile', { id: follower.id })}
                  >
                    {follower.avatar && (
                      <img
                        src={follower.avatar}
                        alt={follower.username}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-white">{follower.username}</p>
                      <p className="text-xs text-gray-400">
                        Followed {new Date(follower.followedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'following' && (
            <div className="space-y-3">
              {following.length === 0 ? (
                <p className="text-gray-400 text-center py-8">You're not following anyone yet.</p>
              ) : (
                following.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
                  >
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => onNavigate?.('profile', { id: user.id })}
                    >
                      {user.avatar && (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-white hover:text-blue-400 transition">
                          {user.username}
                        </p>
                        <p className="text-xs text-gray-400">
                          Following since {new Date(user.followedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnfollow(user.id)}
                      className="ml-4 px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition"
                    >
                      Unfollow
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
