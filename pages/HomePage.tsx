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
  const [activeMainTab, setActiveMainTab] = React.useState<'trending' | 'nearby' | 'foryou'>('trending');

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
      const storedSearches = localStorage.getItem('tripzy_recent_searches');
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
    localStorage.setItem('tripzy_recent_searches', JSON.stringify(updatedSearches));
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
    localStorage.removeItem('tripzy_recent_searches');
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
              <div className="relative bg-white/70 dark:bg-white/10 backdrop-blur-xl border border-slate-200 dark:border-white/20 rounded-full p-2 shadow-2xl flex items-center transition-all duration-300 focus-within:bg-white dark:focus-within:bg-white/15 focus-within:border-gold-500/50">
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
                  className="w-full bg-transparent border-none text-slate-900 dark:text-white text-lg placeholder-slate-400 dark:placeholder-white/60 focus:ring-0 px-2 py-3"
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
                <div className="absolute top-full mt-4 w-full bg-white/95 dark:bg-[#0f172a]/90 backdrop-blur-xl rounded-2xl shadow-2xl z-20 overflow-hidden border border-slate-200 dark:border-white/10 animate-slide-up">
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
                          className="w-full text-left px-6 py-3 flex items-center text-slate-700 dark:text-white/90 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-gold-500 dark:hover:text-gold-400 transition-colors duration-150 border-b border-slate-100 dark:border-white/5 last:border-0"
                        >
                          <ClockIcon className="w-4 h-4 mr-3 text-slate-400 dark:text-white/40" />
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Search Suggestions (Did you mean?) */}
              {isSearchFocused && suggestions.length > 0 && (
                <div className="absolute top-full mt-4 w-full bg-white dark:bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl shadow-2xl z-30 overflow-hidden border border-gold-500/30 dark:border-gold-500/20 animate-slide-up">
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
                        className="w-full text-left px-4 py-3 rounded-xl flex items-center text-slate-800 dark:text-white/90 hover:bg-gold-500/5 dark:hover:bg-gold-500/10 hover:text-gold-500 dark:hover:text-gold-400 transition-all duration-200 group"
                      >
                        <Search className="w-4 h-4 mr-3 text-slate-300 dark:text-white/20 group-hover:text-gold-500 dark:group-hover:text-gold-400/50" />
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
                  <h2 className="text-3xl font-heading font-bold text-slate-900 dark:text-white tracking-tight drop-shadow-lg">
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
          <div className="mb-8 transition-all duration-300">
            <CategoryBar
              categories={categoryBarData}
              selectedCategoryId={categoryFilter}
              onSelectCategory={(id) => setCategoryFilter(id as any)}
            />
          </div>

          {/* Main Deal Tabs */}
          <div className="mb-8 flex items-center justify-center">
            <div className="flex bg-slate-100/50 dark:bg-white/5 backdrop-blur-md p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-lg dark:shadow-2xl">
              {[
                { id: 'foryou', label: t('tabForYou'), icon: SparklesIcon },
                { id: 'trending', label: t('tabTrending'), icon: FireIcon },
                { id: 'nearby', label: t('tabNearby'), icon: LocationMarkerIcon },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeMainTab === tab.id
                    ? 'bg-gold-500 text-white shadow-[0_0_20px_rgba(212,175,55,0.3)]'
                    : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                >
                  <tab.icon className={`w-4 h-4 ${activeMainTab === tab.id ? 'animate-pulse' : ''}`} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <section className="min-h-[400px]">
            {activeMainTab === 'foryou' && (
              <div className="animate-fade-in">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-gold-500/10 rounded-xl border border-gold-500/20">
                        <SparklesIcon className="w-6 h-6 text-gold-400" />
                      </div>
                      <h2 className="text-3xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">{smartPicksTitle}</h2>
                    </div>
                    {loadingRecommendations ? (
                      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                        <DealCardSkeleton count={5} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                        {recommendations.map(deal => <DealCard key={deal.id} deal={deal} />)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-20 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
                    <SparklesIcon className="w-12 h-12 text-gold-400/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('loginToUnlock')}</h3>
                    <p className="text-slate-500 dark:text-white/40 mb-6">{t('startExploringForRecommendations')}</p>
                    <Link to="/login" className="inline-block px-8 py-3 bg-gold-500 text-white font-bold rounded-full">{t('login')}</Link>
                  </div>
                )}
              </div>
            )}

            {activeMainTab === 'nearby' && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <LocationMarkerIcon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h2 className="text-3xl font-heading font-bold text-slate-900 dark:text-white tracking-tight">{t('nearbyDeals')}</h2>
                </div>
                {isLocationEnabled && userLocation ? (
                  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                    {deals
                      .filter(d => d.latitude && d.longitude)
                      .map(d => {
                        const R = 6371;
                        const dLat = (d.latitude! - userLocation.lat) * (Math.PI / 180);
                        const dLon = (d.longitude! - userLocation.lng) * (Math.PI / 180);
                        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(userLocation.lat * (Math.PI / 180)) * Math.cos(d.latitude! * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                        return { ...d, distance: R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) };
                      })
                      .sort((a, b) => a.distance - b.distance)
                      .map(deal => (
                        <div key={deal.id} className="relative group/nearby">
                          <DealCard deal={deal} />
                          <div className="absolute top-4 right-4 bg-[#0f172a]/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-3 py-1 rounded-full z-20">
                            {deal.distance.toFixed(1)} KM
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
                    <LocationMarkerIcon className="w-12 h-12 text-emerald-400/30 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">{t('locationServices')}</h3>
                    <p className="text-white/40 mb-6">{t('locationServicesSubtitle')}</p>
                  </div>
                )}
              </div>
            )}

            {activeMainTab === 'trending' && (
              <div className="animate-fade-in">
                {categoryFilter === 'Flights' ? (
                  <div className="animate-fade-in text-center py-16 bg-white/5 rounded-3xl border border-white/10">
                    <div className="inline-flex p-4 bg-blue-500/10 rounded-full mb-6">
                      <span className="text-4xl text-blue-400">✈️</span>
                    </div>
                    <h2 className="text-3xl font-heading font-bold text-white mb-4">{t('flightsMovedTitle')}</h2>
                    <p className="text-brand-text-muted text-lg mb-8 max-w-lg mx-auto">{t('flightsMovedSubtitle')}</p>
                    <button onClick={() => navigate('/travel')} className="bg-brand-primary hover:bg-brand-primary-dark text-white font-bold py-3 px-8 rounded-2xl transition-all shadow-lg">{t('goToTravelHub')}</button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <FireIcon className="w-6 h-6 text-purple-400" />
                      </div>
                      <h2 className="text-3xl font-heading font-bold text-white tracking-tight">{t('trending') || displayFeaturedDealsTitle || t('featuredDeals')}</h2>
                    </div>

                    {filteredDeals.length > 0 ? (
                      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 perspective-1000">
                        {filteredDeals.map((deal, index) => (
                          <div key={deal.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in-up">
                            <DealCard deal={deal} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-24 bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/5 mx-auto max-w-2xl relative group overflow-hidden">
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-gold-500/10 rounded-full blur-[80px]" />
                        {loading ? (
                          <div className="flex flex-col items-center justify-center space-y-4">
                            <SpinnerIcon className="w-12 h-12 text-gold-500 animate-spin" />
                            <p className="text-gold-400 font-medium animate-pulse tracking-widest uppercase text-xs">Looking for deals...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center relative z-10 px-8">
                            <Search className="w-16 h-16 text-white/10 mb-6" />
                            <h3 className="text-2xl font-bold text-white mb-2">{t('noResults')}</h3>
                            <p className="text-white/40 mb-8 max-w-sm">We couldn't find exactly what you're looking for. Try adjusting your filters.</p>
                            <button onClick={() => { setCategoryFilter('All'); setSearchQuery(''); }} className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white font-semibold">{t('clear')}</button>
                          </div>
                        )}
                      </div>
                    )}

                    {hasMore && (
                      <div className="flex justify-center mt-12 mb-8">
                        <button onClick={handleLoadMore} disabled={loading} className="relative group px-10 py-3.5 rounded-full overflow-hidden shadow-2xl transition-all hover:scale-105 disabled:opacity-50">
                          <div className="absolute inset-0 bg-gradient-to-r from-gold-600 to-gold-400" />
                          <div className="relative flex items-center gap-2 text-white font-bold">{loading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : t('loadMore')}</div>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
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