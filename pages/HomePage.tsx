import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDeals } from '../contexts/DealContext';
import { useAuth } from '../contexts/AuthContext';
import DealCard from '../components/DealCard';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearch } from '../contexts/SearchContext';
import { Search, CogIcon, ClockIcon, TrashIcon } from '../components/Icons';

const LOCAL_STORAGE_KEY = 'wanderwise_recent_searches';

const HomePage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { deals } = useDeals();
  const { user } = useAuth();
  const {
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    ratingFilter,
    setRatingFilter,
  } = useSearch();

  // ... (keep existing state and effects)

  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const storedSearches = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedSearches) {
        setRecentSearches(JSON.parse(storedSearches));
      }
    } catch (error) {
      console.error("Failed to parse recent searches from localStorage", error);
    }
  }, []);

  const saveSearch = (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const updatedSearches = [
      trimmedQuery,
      ...recentSearches.filter(s => s.toLowerCase() !== trimmedQuery.toLowerCase())
    ].slice(0, 5);

    setRecentSearches(updatedSearches);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSearches));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveSearch(searchQuery);
      e.currentTarget.blur();
    }
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    saveSearch(query);
    setIsSearchFocused(false);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const categories = [
    { key: 'All', name: t('categoryAll') },
    { key: 'Flights', name: t('categoryFlights') || 'Flights' },
    { key: 'Dining', name: t('categoryDining') },
    { key: 'Wellness', name: t('categoryWellness') },
    { key: 'Travel', name: t('categoryTravel') },
  ];

  const ratingFilters = [
    { value: 0, label: t('allRatings') },
    { value: 4, label: `4+ ★` },
    { value: 3, label: `3+ ★` },
  ];

  const filteredDeals = deals.filter(deal => {
    const query = searchQuery.toLowerCase().trim();
    const queryMatch = !query ||
      deal.title.toLowerCase().includes(query) ||
      deal.title_tr.toLowerCase().includes(query) ||
      deal.description.toLowerCase().includes(query) ||
      deal.description_tr.toLowerCase().includes(query);

    const categoryMatch = categoryFilter === 'All' || deal.category === categoryFilter;

    const ratingMatch = deal.rating >= ratingFilter;

    return queryMatch && categoryMatch && ratingMatch;
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=2070')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-brand-bg"></div>
        </div>

        {/* Login Button for Unauthenticated Users */}
        {!user && (
          <div className="absolute top-4 right-4 z-20">
            <Link
              to="/login"
              className="px-6 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white font-semibold hover:bg-white/20 transition-all shadow-lg"
            >
              {t('login') || 'Login'}
            </Link>
          </div>
        )}

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 text-center animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-4 drop-shadow-lg">
            {t('heroTitle') || 'Discover the World for Less'}
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 drop-shadow-md">
            {t('heroSubtitle') || 'Exclusive travel deals and discounts at your fingertips'}
          </p>

          {/* Glassmorphism Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <div className="glass rounded-2xl p-2 shadow-2xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full py-4 pl-12 pr-4 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:border-transparent transition-all"
                  aria-label={t('searchPlaceholder')}
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Search className="h-6 w-6 text-white/70" />
                </div>
              </div>
            </div>

            {/* Recent Searches Dropdown */}
            {isSearchFocused && (
              <div className="absolute top-full mt-2 w-full glass rounded-xl shadow-2xl z-20 overflow-hidden border border-white/20 animate-slide-up">
                {recentSearches.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center px-4 py-3 border-b border-white/10">
                      <h4 className="text-sm font-semibold text-white/80">{t('recentSearches')}</h4>
                      <button onClick={clearRecentSearches} className="flex items-center text-xs text-brand-secondary hover:text-brand-secondary/80 transition-colors">
                        <TrashIcon className="w-4 h-4 mr-1" />
                        {t('clear')}
                      </button>
                    </div>
                    <ul>
                      {recentSearches.map((term, index) => (
                        <li key={index}>
                          <button
                            onClick={() => handleRecentSearchClick(term)}
                            className="w-full text-left px-4 py-3 flex items-center text-white hover:bg-white/10 transition-colors duration-150"
                          >
                            <ClockIcon className="w-4 h-4 mr-3 text-white/60" />
                            {term}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="p-4 text-center text-sm text-white/60">
                    {t('noRecentSearches')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Category Filters - Horizontal Scroll */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-brand-text-muted mb-3">{t('categories') || 'Categories'}</h3>
          <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.key}
                onClick={() => {
                  if (cat.key === 'Flights') {
                    navigate('/flights');
                  } else {
                    setCategoryFilter(cat.key as any);
                  }
                }}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap shadow-lg hover:scale-105 ${categoryFilter === cat.key
                  ? 'bg-gradient-primary text-white shadow-brand-primary/50'
                  : 'bg-brand-surface text-brand-text-muted hover:bg-brand-surface/80'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Rating Filters */}
        <div className="flex items-center space-x-4 mb-8">
          <h3 className="text-sm font-semibold text-brand-text-muted whitespace-nowrap">{t('filterByRating')}:</h3>
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
            {ratingFilters.map(filter => (
              <button
                key={filter.value}
                onClick={() => setRatingFilter(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 whitespace-nowrap ${ratingFilter === filter.value
                  ? 'bg-brand-primary text-white shadow-lg'
                  : 'bg-brand-surface text-brand-text-muted hover:bg-brand-surface/80'
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Deals Section */}
        <section>
          <h2 className="text-3xl font-heading font-bold text-brand-text-light mb-6">
            {t('featuredDeals')}
          </h2>
          {filteredDeals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDeals.map(deal => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-xl text-brand-text-muted">{t('noResults')}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default HomePage;