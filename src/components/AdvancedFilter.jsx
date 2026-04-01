import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

/**
 * Advanced filter component for command listings
 */
export default function AdvancedFilter({ onFilterChange, defaultFilters = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    type: defaultFilters.type || '',
    framework: defaultFilters.framework || '',
    tags: defaultFilters.tags || [],
    sortBy: defaultFilters.sortBy || 'downloads',
    sortOrder: defaultFilters.sortOrder || 'desc',
    minRating: defaultFilters.minRating || 0,
    ...defaultFilters,
  });

  const FRAMEWORKS = ['Express', 'Fastify', 'Hapi', 'Koa', 'NestJS', 'Other'];
  const TYPES = ['Middleware', 'Plugin', 'Command', 'Utility', 'Decorator', 'Other'];
  const TAGS = [
    'api',
    'middleware',
    'auth',
    'validation',
    'database',
    'logging',
    'caching',
    'testing',
  ];
  const SORT_OPTIONS = [
    { value: 'downloads', label: 'Most Downloaded' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'createdAt', label: 'Newest First' },
    { value: 'updatedAt', label: 'Recently Updated' },
    { value: 'views', label: 'Most Viewed' },
    { value: 'favourites', label: 'Most Favorited' },
  ];

  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  const toggleTag = (tag) => {
    const updated = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    handleFilterChange('tags', updated);
  };

  const clearFilters = () => {
    const cleared = {
      type: '',
      framework: '',
      tags: [],
      sortBy: 'downloads',
      sortOrder: 'desc',
      minRating: 0,
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const hasActiveFilters =
    filters.type || filters.framework || filters.tags.length > 0 || filters.minRating > 0;

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition"
      >
        <span>
          Advanced Filters{' '}
          {hasActiveFilters &&
            `(${filters.tags.length + (filters.type ? 1 : 0) + (filters.framework ? 1 : 0)})`}
        </span>
        <ChevronDown size={20} className={`transform transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-4 p-6 bg-gray-800 rounded-lg border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">All Types</option>
                {TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Framework Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Framework</label>
              <select
                value={filters.framework}
                onChange={(e) => handleFilterChange('framework', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">All Frameworks</option>
                {FRAMEWORKS.map((fw) => (
                  <option key={fw} value={fw}>
                    {fw}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            {/* Min Rating */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Minimum Rating
              </label>
              <select
                value={filters.minRating}
                onChange={(e) => handleFilterChange('minRating', parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="0">Any Rating</option>
                <option value="1">1+ Stars</option>
                <option value="2">2+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="5">5 Stars</option>
              </select>
            </div>
          </div>

          {/* Tags Filter */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-300 mb-3">Tags</label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    filters.tags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="mt-6">
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-medium transition text-sm"
              >
                <X size={16} />
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
