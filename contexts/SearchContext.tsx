import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logEngagementEvent } from '../lib/supabaseService';
import { useAuth } from './AuthContext';

export type { CategoryFilter } from '../shared/dealTypes';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: CategoryFilter;
  setCategoryFilter: (category: CategoryFilter) => void;
  ratingFilter: number;
  setRatingFilter: (rating: number) => void;
  applyFiltersAndNavigate: (filters: {
    searchQuery?: string;
    category?: CategoryFilter;
    rating?: number;
  }) => void;
  userLocation: { lat: number; lng: number } | null;
  isLocationEnabled: boolean;
  enableLocation: () => Promise<void>;
  isSmartSearch: boolean;
  setIsSmartSearch: (isSmart: boolean) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isSmartSearch, setIsSmartSearch] = useState(false);
  const navigate = useNavigate();

  const enableLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    return new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsLocationEnabled(true);
          resolve();
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLocationEnabled(false);
          reject(error);
        }
      );
    });
  }, []);

  const applyFiltersAndNavigate = useCallback((filters: { searchQuery?: string; category?: CategoryFilter; rating?: number; }) => {
    if (filters.searchQuery !== undefined) {
      setSearchQuery(filters.searchQuery);
    }
    if (filters.category !== undefined) {
      setCategoryFilter(filters.category);
    }
    if (filters.rating !== undefined) {
      setRatingFilter(filters.rating);
    }

    // Phase 1: Log 'search' event
    const finalQuery = filters.searchQuery !== undefined ? filters.searchQuery : searchQuery;
    if (finalQuery && finalQuery.length > 2) {
      logEngagementEvent(user?.id, 'search', undefined, { query: finalQuery, category: filters.category || categoryFilter });
    }

    navigate('/');
  }, [navigate]);

  return (
    <SearchContext.Provider value={{
      searchQuery,
      setSearchQuery,
      categoryFilter,
      setCategoryFilter,
      ratingFilter,
      setRatingFilter,
      applyFiltersAndNavigate,
      userLocation,
      isLocationEnabled,
      enableLocation,
      isSmartSearch,
      setIsSmartSearch
    }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = (): SearchContextType => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};