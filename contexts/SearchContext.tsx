import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export type CategoryFilter = 'All' | 'Dining' | 'Wellness' | 'Travel' | 'Flights';

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
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [ratingFilter, setRatingFilter] = useState(0);
  const navigate = useNavigate();

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
      applyFiltersAndNavigate
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