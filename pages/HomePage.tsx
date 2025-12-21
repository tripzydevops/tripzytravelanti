import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDeals } from '../contexts/DealContext';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import DealCard from '../components/DealCard';
import DealCardSkeleton from '../components/DealCardSkeleton';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearch } from '../contexts/SearchContext';
import {
  Search,
  CogIcon,
  ClockIcon,
  TrashIcon,
  LocationMarkerIcon,
  SpinnerIcon,
  StarIcon,
  SparklesIcon,
  FireIcon,
  GlobeIcon,
  TicketIcon,
  CompassIcon,
  TagIcon,
  CustomBriefcaseIcon,
  CustomHeartIcon as HeartIcon,
  CustomUtensilsIcon,
  CustomPlaneIcon,
  CustomShoppingBagIcon,
  CustomSparklesIcon
} from '../components/Icons';
import FlightSearchWidget from '../components/FlightSearchWidget';
import PullToRefresh from '../components/PullToRefresh';

import { getThumbnailUrl } from '../lib/imageUtils';
import { getAIRecommendations } from '../lib/recommendationLogic';
import { getBackgroundImages, getFlashDeals } from '../lib/supabaseService';
import { Deal } from '../types';
import MetaHead from '../components/MetaHead';
import FlashDealCard from '../components/FlashDealCard';
import SimilarDeals from '../components/SimilarDeals';
import CategoryBar from '../components/CategoryBar';

// Helper function to get time-based greeting
const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const HomePage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { deals, loading, loadDealsPaginated, total, categories: dynamicCategories } = useDeals();
  const { user } = useAuth();
  const {
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    ratingFilter,
    setRatingFilter,
    userLocation,
    isLocationEnabled,
    isSmartSearch,
    setIsSmartSearch,
    suggestions,
    fetchSuggestions,
    clearSuggestions
  } = useSearch();

  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [flightWidgetParams, setFlightWidgetParams] = React.useState<{ origin?: string, destination?: string, departDate?: string }>({});
  const flightWidgetRef = React.useRef<HTMLDivElement>(null);
  const [flashDeals, setFlashDeals] = React.useState<Deal[]>([]);
  const [timeOfDay, setTimeOfDay] = React.useState<'morning' | 'afternoon' | 'evening' | 'night'>(getTimeOfDay());

  // Pull-to-refresh handler
  const handleRefresh = React.useCallback(async () => {
    setPage(1);
    await loadDealsPaginated(1, DEALS_PER_PAGE, {
      category: categoryFilter,
      search: searchQuery,
      rating: ratingFilter
    }, false);
    // Also refresh flash deals
    const newFlashDeals = await getFlashDeals();
    setFlashDeals(newFlashDeals);
  }, [categoryFilter, searchQuery, ratingFilter, loadDealsPaginated]);

  // Local Storage for Recent Searches
  React.useEffect(() => {
    try {
      const storedSearches = localStorage.getItem('wanderwise_recent_searches');
      if (storedSearches) {
        setRecentSearches(JSON.parse(storedSearches));
      }
    } catch (error) {
      console.error("Failed to parse recent searches from localStorage", error);
    }
  }, []);
  React.useEffect(() => {
    const fetchFlashDeals = async () => {
      const deals = await getFlashDeals();
      setFlashDeals(deals);
    };
    fetchFlashDeals();
  }, []);

  const { content, getContent } = useContent();
  const { language } = useLanguage();

  // Get dynamic content
  const heroTitle = getContent('home', 'hero', 'title');
  const heroSubtitle = getContent('home', 'hero', 'subtitle');
  const heroImage = getContent('home', 'hero', 'image_url');
  const categoriesTitle = getContent('home', 'categories', 'title');
  const featuredDealsTitle = getContent('home', 'featured_deals', 'title');
  const smartPicksTitle = language === 'tr' ? 'Zeki Seçimler' : 'Smart Picks';
  const flightsTitle = getContent('home', 'flights', 'title');

  const displayTitle = language === 'tr' ? (heroTitle?.content_value_tr || heroTitle?.content_value) : heroTitle?.content_value;
  const displaySubtitle = language === 'tr' ? (heroSubtitle?.content_value_tr || heroSubtitle?.content_value) : heroSubtitle?.content_value;
  const displayImage = heroImage?.content_value || 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=2070';
  const displayCategoriesTitle = language === 'tr' ? (categoriesTitle?.content_value_tr || categoriesTitle?.content_value) : categoriesTitle?.content_value;
  const displayFeaturedDealsTitle = language === 'tr' ? (featuredDealsTitle?.content_value_tr || featuredDealsTitle?.content_value) : featuredDealsTitle?.content_value;
  const displayFlightsTitle = language === 'tr' ? (flightsTitle?.content_value_tr || flightsTitle?.content_value) : flightsTitle?.content_value;

  // ==========================================
  // Dynamic Background Logic
  // ==========================================
  const [backgroundImages, setBackgroundImages] = React.useState<string[]>([
    displayImage // Use the CMS image as initial default
  ]);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  React.useEffect(() => {
    const fetchBackgrounds = async () => {
      // Determine Time of Day
      const hour = new Date().getHours();
      let timeOfDay = 'afternoon';
      if (hour >= 6 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
      else if (hour >= 18 && hour < 24) timeOfDay = 'evening';
      else timeOfDay = 'night';

      const images = await getBackgroundImages(timeOfDay);
      if (images && images.length > 0) {
        setBackgroundImages(images.map(img => img.url));
        // Pick a random image from the set to display
        setCurrentImageIndex(Math.floor(Math.random() * images.length));
      }
    };
    fetchBackgrounds();
  }, []);

  // Removed auto-rotation interval to prevent "changing really fast" issue.
  // The background will now be static per session (but random from the pool).

  // Pagination State
  const [page, setPage] = React.useState(1);
  const DEALS_PER_PAGE = 12;
  const hasMore = deals.length < total;

  // Fetch deals when filters change
  React.useEffect(() => {
    const fetchDeals = async () => {
      // Reset page to 1 when filters change
      setPage(1);
      await loadDealsPaginated(1, DEALS_PER_PAGE, {
        category: categoryFilter,
        search: searchQuery,
        rating: ratingFilter,
        isSmartSearch: isSmartSearch
      }, false); // false = reset list
    };

    const timeoutId = setTimeout(() => {
      fetchDeals();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [categoryFilter, searchQuery, ratingFilter, isSmartSearch, loadDealsPaginated]);

  // Handle suggestions
  React.useEffect(() => {
    if (searchQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        fetchSuggestions(searchQuery);
      }, 800);
      return () => clearTimeout(timeoutId);
    } else {
      clearSuggestions();
    }
  }, [searchQuery, fetchSuggestions, clearSuggestions]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await loadDealsPaginated(nextPage, DEALS_PER_PAGE, {
      category: categoryFilter,
      search: searchQuery,
      rating: ratingFilter,
      isSmartSearch: isSmartSearch
    }, true); // true = append
  };

  const saveSearch = (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const updatedSearches = [
      trimmedQuery,
      ...recentSearches.filter(s => s.toLowerCase() !== trimmedQuery.toLowerCase())
    ].slice(0, 5);

    setRecentSearches(updatedSearches);
    localStorage.setItem('wanderwise_recent_searches', JSON.stringify(updatedSearches));
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
    localStorage.removeItem('wanderwise_recent_searches');
  };

  const categories = React.useMemo(() => {
    return [
      { key: 'All', name: t('categoryAll') },
      ...(dynamicCategories || []).map(cat => ({
        key: cat.name,
        name: language === 'tr' ? cat.name_tr : cat.name
      }))
    ];
  }, [dynamicCategories, language, t]);

  // Icon mapping for categories - Keys must match database 'name' exactly
  const categoryIconMap: Record<string, React.FC<{ className?: string }>> = {
    'All': CustomSparklesIcon,
    'Dining': CustomUtensilsIcon,
    'Travel': CustomPlaneIcon,
    'Shopping': CustomShoppingBagIcon,
    'Wellness': CustomSparklesIcon, // Or a wellness specific one if added
    'Health': CustomSparklesIcon,
    'Food & Drink': CustomUtensilsIcon,
    'Travel & Tours': CustomPlaneIcon,
    'Beauty & Wellness': CustomSparklesIcon,
  };

  const categoryBarData = React.useMemo(() => {
    return categories
      .filter(cat => cat.key !== 'FlightWidget') // Hide internal widget category from UI
      .map(cat => ({
        id: cat.key,
        label: cat.name,
        icon: categoryIconMap[cat.key] || CompassIcon
      }));
  }, [categories, categoryIconMap]);

  const ratingFilters = [
    { value: 0, label: t('allRatings') },
    { value: 4, label: `4+ ★` },
    { value: 3, label: `3+ ★` },
  ];

  // No more client-side filtering
  // Sort deals: Active first, then Sold Out last.
  const filteredDeals = React.useMemo(() => {
    return [...deals].sort((a, b) => {
      if (a.isSoldOut && !b.isSoldOut) return 1;
      if (!a.isSoldOut && b.isSoldOut) return -1;
      return 0;
    });
  }, [deals]);

  const flightRoutes = deals.filter(d => d.category === 'FlightWidget');

  const handleRouteClick = (route: any) => {
    setFlightWidgetParams({
      origin: route.vendor,
      destination: route.redemptionCode,
      departDate: route.expiresAt
    });
    flightWidgetRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const [recommendations, setRecommendations] = React.useState<Deal[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = React.useState(false);

  React.useEffect(() => {
    const fetchRecommendations = async () => {
      if (user && deals.length > 0) {
        setLoadingRecommendations(true);
        try {
          // Get stored preferences
          const storedPrefs = localStorage.getItem('tripzy_user_preferences');
          const preferences = storedPrefs ? JSON.parse(storedPrefs) : undefined;

          const recs = await getAIRecommendations(user, deals, preferences);
          setRecommendations(recs);
        } catch (error) {
          console.error("Failed to fetch recommendations", error);
        } finally {
          setLoadingRecommendations(false);
        }
      }
    };

    fetchRecommendations();
  }, [user, deals]);
  // Get the greeting based on time of day
  const greetingKey = `greeting${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}` as keyof typeof t;
  const greetingSubtitleKey = `greetingSubtitle${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}` as keyof typeof t;

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
      <div className="min-h-screen">
        <MetaHead
          title={t('homeTitle') || "Tripzy - Travel Discounts & Deals"}
          description={t('homeDescription') || "Save on travel, hotels, and flights with Tripzy subscriptions."}
          url="https://tripzy.app/"
        />

        {/* Ambient Background Glows */}
        {/* ... */}

        {/* Hero Section */}
        <section className="relative h-[65vh] min-h-[500px] flex items-center justify-center overflow-hidden z-10">
          {/* Background Image Carousel */}
          {backgroundImages.map((img, index) => (
            <div
              key={img}
              className={`absolute inset-0 bg-cover bg-center transform scale-105 transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
              style={{
                backgroundImage: `url('${img}')`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/40 via-[#0f172a]/20 to-[#0f172a]"></div>
              <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
            </div>
          ))}

          {/* Login Button for Unauthenticated Users */}
          {!user && (
            <div className="absolute top-6 right-6 z-20">
              <Link
                to="/login"
                className="px-8 py-2.5 bg-white/10 hover:bg-gold-500 hover:text-white backdrop-blur-md border border-white/20 rounded-full text-white font-semibold transition-all shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
              >
                {t('login') || 'Login'}
              </Link>
            </div>
          )}

          {/* Hero Content */}
          <div className="relative z-10 container mx-auto px-4 text-center animate-fade-in">
            {/* Personalized Greeting for logged-in users */}
            {user && (
              <div className="mb-6 animate-fade-in">
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-gold-400 drop-shadow-lg">
                  {t(greetingKey)}, {user.name?.split(' ')[0] || t('welcome')}! 👋
                </h2>
                <p className="text-sm md:text-base text-white/70 mt-1">
                  {t(greetingSubtitleKey)}
                </p>
              </div>
            )}
            <h1 className="text-5xl md:text-7xl font-heading font-extrabold text-white mb-6 drop-shadow-2xl tracking-tight">
              {displayTitle || t('heroTitle') || 'Discover the World for Less'}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-10 drop-shadow-lg font-light max-w-3xl mx-auto leading-relaxed">
              {displaySubtitle || t('heroSubtitle') || 'Exclusive travel deals and discounts at your fingertips'}
            </p>

            {/* Premium Glass Search Bar */}
            <div className="max-w-3xl mx-auto relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-gold-500/20 to-purple-500/20 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-full p-2 shadow-2xl flex items-center transition-all duration-300 focus-within:bg-white/15 focus-within:border-gold-500/50">
                <div className="pl-4 pr-2">
                  <Search className="h-6 w-6 text-gold-400" />
                </div>
                <input
                  type="text"
                  name="search"
                  id="home-search-input"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full bg-transparent border-none text-white text-lg placeholder-white/60 focus:ring-0 px-2 py-3"
                  aria-label={t('searchPlaceholder')}
                />

                {/* AI Toggle Button */}
                <button
                  onClick={() => setIsSmartSearch(!isSmartSearch)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 mr-2 ${isSmartSearch
                    ? 'bg-gold-500 text-white shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                    }`}
                  title={isSmartSearch ? "Smart Search ON" : "Standard Search"}
                >
                  <SparklesIcon className={`w-4 h-4 ${isSmartSearch ? 'animate-pulse' : ''}`} />
                  <span className="text-xs font-bold hidden sm:inline uppercase tracking-widest">
                    {isSmartSearch ? 'AI Smart' : 'Smart'}
                  </span>
                </button>

                {/* Search Button (Optional visual cue) */}
                <button className="hidden md:block px-6 py-2 bg-gold-500 hover:bg-gold-600 text-white font-bold rounded-full transition-colors shadow-lg">
                  Search
                </button>
              </div>

              {/* Recent Searches Dropdown */}
              {isSearchFocused && recentSearches.length > 0 && (
                <div className="absolute top-full mt-4 w-full bg-[#0f172a]/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-20 overflow-hidden border border-white/10 animate-slide-up">
                  <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
                    <h4 className="text-xs font-bold text-gold-500 uppercase tracking-widest">{t('recentSearches')}</h4>
                    <button onClick={clearRecentSearches} className="flex items-center text-xs text-white/50 hover:text-white transition-colors">
                      <TrashIcon className="w-3 h-3 mr-1" />
                      {t('clear')}
                    </button>
                  </div>
                  <ul>
                    {recentSearches.map((term, index) => (
                      <li key={index}>
                        <button
                          onClick={() => handleRecentSearchClick(term)}
                          className="w-full text-left px-6 py-3 flex items-center text-white/90 hover:bg-white/5 hover:text-gold-400 transition-colors duration-150 border-b border-white/5 last:border-0"
                        >
                          <ClockIcon className="w-4 h-4 mr-3 text-white/40" />
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Search Suggestions (Did you mean?) */}
              {isSearchFocused && suggestions.length > 0 && (
                <div className="absolute top-full mt-4 w-full bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-30 overflow-hidden border border-gold-500/20 animate-slide-up">
                  <div className="px-6 py-4 border-b border-white/5 bg-gold-500/5 flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-gold-400" />
                    <h4 className="text-xs font-bold text-gold-500 uppercase tracking-widest">{t('didYouMean') || 'Did you mean?'}</h4>
                  </div>
                  <div className="p-3 grid grid-cols-1 gap-1">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchQuery(suggestion);
                          saveSearch(suggestion);
                          setIsSearchFocused(false);
                          clearSuggestions();
                        }}
                        className="w-full text-left px-4 py-3 rounded-xl flex items-center text-white/90 hover:bg-gold-500/10 hover:text-gold-400 transition-all duration-200 group"
                      >
                        <Search className="w-4 h-4 mr-3 text-white/20 group-hover:text-gold-400/50" />
                        <span className="font-medium">{suggestion}</span>
                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full uppercase tracking-tighter font-bold">Try this</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12 relative z-10">

          {/* Flash Deals Section - Horizontal Scroll Carousel */}
          {flashDeals.length > 0 && (
            <div className="mb-16 animate-fade-in-up">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl border border-red-500/30 backdrop-blur-md">
                    <FireIcon className="w-6 h-6 text-red-500 animate-pulse" />
                  </div>
                  <h2 className="text-3xl font-heading font-bold text-white tracking-tight drop-shadow-lg">
                    {t('flashDeals') || 'Flash Deals'}
                  </h2>
                </div>
                {/* Visual Indicator for more deals on mobile */}
                <div className="flex gap-1.5 md:hidden">
                  {flashDeals.map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  ))}
                </div>
              </div>

              <div className="flex gap-6 overflow-x-auto pb-8 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
                {flashDeals.map(deal => (
                  <div key={deal.id} className="shrink-0 w-[88vw] md:w-full max-w-4xl snap-center">
                    <FlashDealCard deal={deal} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Filters - Airbnb Style Category Bar */}
          <div className="mb-12 transition-all duration-300">
            <CategoryBar
              categories={categoryBarData}
              selectedCategoryId={categoryFilter}
              onSelectCategory={(id) => setCategoryFilter(id as any)}
            />
          </div>

          {/* Recommendations Section */}
          {user && (
            <section className="mb-16 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gold-500/10 rounded-xl border border-gold-500/20 backdrop-blur-md shadow-[0_0_15px_rgba(212,175,55,0.15)]">
                  <SparklesIcon className="w-6 h-6 text-gold-400" />
                </div>
                <h2 className="text-3xl font-heading font-bold text-white tracking-tight drop-shadow-lg">
                  {smartPicksTitle}
                </h2>
              </div>

              {loadingRecommendations ? (
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                  <DealCardSkeleton count={5} />
                </div>
              ) : recommendations.length > 0 ? (
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 perspective-1000">
                  {recommendations.map(deal => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
                </div>
              ) : (
                <p className="text-white/50 italic bg-white/5 p-6 rounded-xl border border-white/5">{t('startExploringForRecommendations')}</p>
              )}
            </section>
          )}

          {/* Nearby Deals Section */}
          {isLocationEnabled && userLocation && (
            <section className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 backdrop-blur-md">
                  <LocationMarkerIcon className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-white tracking-tight">
                  {t('nearbyDeals') || 'Nearby Deals'}
                </h2>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                {deals
                  .filter(d => d.latitude && d.longitude)
                  .map(d => {
                    const R = 6371;
                    const dLat = (d.latitude! - userLocation.lat) * (Math.PI / 180);
                    const dLon = (d.longitude! - userLocation.lng) * (Math.PI / 180);
                    const a =
                      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(userLocation.lat * (Math.PI / 180)) * Math.cos(d.latitude! * (Math.PI / 180)) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const distance = R * c;
                    return { ...d, distance };
                  })
                  .sort((a, b) => a.distance - b.distance)
                  .slice(0, 3)
                  .map(deal => (
                    <div key={deal.id} className="relative group/nearby">
                      <DealCard deal={deal} />
                      <div className="absolute top-4 right-4 bg-[#0f172a]/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1.5 rounded-full flex items-center shadow-lg z-20 group-hover/nearby:bg-emerald-500 group-hover/nearby:text-white transition-all">
                        <LocationMarkerIcon className="w-3 h-3 mr-1" />
                        {deal.distance.toFixed(1)} km
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Rating Filters */}
          {categoryFilter !== 'Flights' && (
            <div className="flex items-center space-x-4 mb-10 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 shrink-0">
                <StarIcon className="w-4 h-4 text-gold-500" />
                <h3 className="text-sm font-bold text-white/80 whitespace-nowrap">{t('filterByRating')}:</h3>
              </div>

              <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10">
                {ratingFilters.map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setRatingFilter(filter.value)}
                    className={`px-5 py-1.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${ratingFilter === filter.value
                      ? 'bg-white/20 text-white shadow-inner'
                      : 'text-white/50 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deals Section */}
          <section>
            {categoryFilter === 'Flights' ? (
              <div className="animate-fade-in text-center py-16 bg-white/5 rounded-3xl border border-white/10">
                <div className="inline-flex p-4 bg-blue-500/10 rounded-full mb-6">
                  <span className="text-4xl text-blue-400">✈️</span>
                </div>
                <h2 className="text-3xl font-heading font-bold text-white mb-4">
                  {t('flightsMovedTitle') || 'Flights are now in Travel Hub'}
                </h2>
                <p className="text-brand-text-muted text-lg mb-8 max-w-lg mx-auto">
                  {t('flightsMovedSubtitle') || 'We have moved all travel-related features to our new dedicated section.'}
                </p>
                <button
                  onClick={() => navigate('/travel')}
                  className="bg-brand-primary hover:bg-brand-primary-dark text-white font-bold py-3 px-8 rounded-2xl transition-all shadow-lg"
                >
                  {t('goToTravelHub') || 'Visit Travel Hub'}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20 backdrop-blur-md">
                      <StarIcon className="w-6 h-6 text-purple-400" />
                    </div>
                    <h2 className="text-3xl font-heading font-bold text-white tracking-tight">
                      {displayFeaturedDealsTitle || t('featuredDeals')}
                    </h2>
                  </div>
                </div>

                {filteredDeals.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 perspective-1000">
                      {filteredDeals.map(deal => (
                        <DealCard key={deal.id} deal={deal} />
                      ))}
                    </div>
                    {/* Load More Button */}
                    {hasMore && (
                      <div className="flex justify-center mt-12 mb-8">
                        <button
                          onClick={handleLoadMore}
                          disabled={loading}
                          className="relative group px-10 py-3.5 rounded-full overflow-hidden shadow-2xl transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-gold-600 via-gold-500 to-gold-400 group-hover:via-gold-400 group-hover:to-gold-300 transition-all duration-500"></div>
                          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="relative flex items-center gap-2 text-white font-bold tracking-wide">
                            {loading ? (
                              <>
                                <SpinnerIcon className="w-5 h-5 animate-spin" />
                                {t('loading') || 'Loading...'}
                              </>
                            ) : (
                              t('loadMore') || 'Load More'
                            )}
                          </div>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-24 bg-white/5 rounded-3xl border border-white/5 mx-auto max-w-2xl">
                    {loading ? (
                      <div className="flex justify-center">
                        <SpinnerIcon className="w-10 h-10 text-gold-500 animate-spin" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                          <Search className="w-8 h-8 text-white/30" />
                        </div>
                        <p className="text-xl text-white/60 font-medium">{t('noResults')}</p>

                        {suggestions.length > 0 && (
                          <div className="mt-8">
                            <p className="text-sm text-white/40 mb-3 uppercase tracking-widest font-bold">Suggested Searches:</p>
                            <div className="flex flex-wrap justify-center gap-3">
                              {suggestions.map((s, i) => (
                                <button
                                  key={i}
                                  onClick={() => setSearchQuery(s)}
                                  className="px-4 py-2 bg-white/5 hover:bg-gold-500/20 border border-white/10 hover:border-gold-500/40 rounded-full text-gold-400 text-sm font-medium transition-all"
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <button onClick={() => { setCategoryFilter('All'); setSearchQuery(''); clearSuggestions(); }} className="mt-8 text-gold-500 hover:text-gold-400 underline font-medium">
                          Reset Filters
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
          {/* AI-Powered Trending Deals Section */}
          <div className="mt-16 pb-12">
            <SimilarDeals dealId="" limit={3} />
          </div>

        </div>
      </div>
    </PullToRefresh>
  );
};

export default HomePage;