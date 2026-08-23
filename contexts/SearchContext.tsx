import React, { createContext, useState, useContext, ReactNode, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSearchSuggestions } from '../lib/vectorService';
import { useAuth } from './AuthContext';
import { useUserActivity } from './UserActivityContext';

import { CategoryFilter } from '../shared/dealTypes';
export type { CategoryFilter };

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
  suggestions: string[];
  fetchSuggestions: (query: string) => Promise<void>;
  clearSuggestions: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { bufferSignal } = useUserActivity();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isSmartSearch, setIsSmartSearch] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const navigate = useNavigate();

  const activeBreachesRef = useRef<string[]>([]);
  const watcherIdRef = useRef<number | null>(null);

  const triggerGeofenceNotification = useCallback(async (zoneId: string, lat: number, lng: number) => {
    try {
      const { supabase } = await import('../lib/supabaseClient');
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;
      const userId = session?.user?.id;

      if (!token || !userId) return;

      const { getBackendApiUrl } = await import('../lib/apiConfig');
      const apiUrl = getBackendApiUrl();
      if (!apiUrl) return;

      const response = await fetch(`${apiUrl}/api/v1/location-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: userId,
          geofence_zone_id: zoneId,
          latitude: lat,
          longitude: lng
        })
      });

      if (!response.ok) {
        console.error('Failed to trigger geofence location update:', response.statusText);
        return;
      }
      const result = await response.json();
      console.log('[Geofence Location Update Triggered]', result);
    } catch (err) {
      console.error('Error triggering geofence location update:', err);
    }
  }, []);

  const startLocationWatcher = useCallback(async () => {
    if (!navigator.geolocation) return;

    let activeZones: any[] = [];
    try {
      const { getAllActiveGeofenceZones } = await import('../lib/supabaseService');
      activeZones = await getAllActiveGeofenceZones();
    } catch (err) {
      console.error('Failed to fetch geofence zones:', err);
    }

    if (watcherIdRef.current) {
      navigator.geolocation.clearWatch(watcherIdRef.current);
    }

    watcherIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        setUserLocation({ lat: userLat, lng: userLng });
        setIsLocationEnabled(true);

        if (activeZones.length === 0) return;

        const { calculateDistance } = await import('../lib/locationUtils');
        const currentBreaches: string[] = [];

        for (const zone of activeZones) {
          let zoneLat = 0;
          let zoneLng = 0;

          if (typeof zone.centroid === 'string') {
            const matches = zone.centroid.match(/POINT\(([^ ]+) ([^ ]+)\)/);
            if (matches) {
              zoneLng = parseFloat(matches[1]);
              zoneLat = parseFloat(matches[2]);
            }
          } else if (zone.centroid && typeof zone.centroid === 'object') {
            const coords = zone.centroid.coordinates;
            if (coords && coords.length === 2) {
              zoneLng = coords[0];
              zoneLat = coords[1];
            }
          } else {
            zoneLat = zone.latitude || 0;
            zoneLng = zone.longitude || 0;
          }

          if (zoneLat === 0 && zoneLng === 0) continue;

          const distKm = calculateDistance(userLat, userLng, zoneLat, zoneLng);
          const distMeters = distKm * 1000;

          if (distMeters <= zone.radius_meters) {
            currentBreaches.push(zone.id);

            if (!activeBreachesRef.current.includes(zone.id)) {
              triggerGeofenceNotification(zone.id, userLat, userLng);
            }
          }
        }

        activeBreachesRef.current = currentBreaches;
      },
      (error) => {
        console.error('Error watching location:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 6000
      }
    );
  }, [triggerGeofenceNotification]);

  const enableLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    localStorage.setItem('location_preference', 'enabled');
    await startLocationWatcher();
  }, [startLocationWatcher]);

  useEffect(() => {
    // Automatically auto-start watcher if location preference was previously allowed and user is active
    if (user && localStorage.getItem('location_preference') === 'enabled') {
      startLocationWatcher();
    }

    return () => {
      if (watcherIdRef.current) {
        navigator.geolocation.clearWatch(watcherIdRef.current);
      }
    };
  }, [user, startLocationWatcher]);

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
      bufferSignal('search', finalQuery, { query: finalQuery, category: filters.category || categoryFilter });
    }

    navigate('/');
  }, [navigate, searchQuery, categoryFilter, bufferSignal]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    const results = await getSearchSuggestions(query);
    setSuggestions(results || []);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

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
      setIsSmartSearch,
      suggestions,
      fetchSuggestions,
      clearSuggestions
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