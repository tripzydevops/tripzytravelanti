import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Deal } from '../types';
import { getAllDeals, getDealById as getSupabaseDealById, getDealsPaginated, createDeal as apiCreateDeal, updateDeal as apiUpdateDeal, searchDealsSemantic } from '../lib/supabaseService';
import { supabase } from '../lib/supabaseClient';

interface DealContextType {
  deals: Deal[];
  total: number;
  loading: boolean;
  rateDeal: (dealId: string, rating: number) => Promise<void>;
  getDealById: (dealId: string) => Deal | undefined;
  addDeal: (deal: Deal) => Promise<void>;
  updateDeal: (deal: Deal) => Promise<void>;
  deleteDeal: (dealId: string) => Promise<void>;
  refreshDeals: () => Promise<void>;
  loadDealsPaginated: (page: number, limit: number, filters?: any, append?: boolean) => Promise<void>;
  categories: any[];
  categoriesLoading: boolean;
}

const DealContext = createContext<DealContextType | undefined>(undefined);

export const DealProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Load deals from Supabase (Legacy/Initial - can be replaced or kept for non-paginated needs if any)
  const loadDeals = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedDeals = await getAllDeals();
      setDeals(fetchedDeals);
      setTotal(fetchedDeals.length); // Fallback total
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const { getCategories } = await import('../lib/supabaseService');
      const fetchedCategories = await getCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Paginated Load
  const loadDealsPaginated = useCallback(async (page: number, limit: number, filters?: any, append: boolean = false) => {
    try {
      setLoading(true);
      let newDeals: Deal[];
      let totalCount: number;

      if (filters?.isSmartSearch && filters?.search) {
        newDeals = await searchDealsSemantic(filters.search, limit);
        totalCount = newDeals.length; // Pinecone doesn't always return total count, we take what we get
      } else {
        const result = await getDealsPaginated(page, limit, filters);
        newDeals = result.deals;
        totalCount = result.total;
      }

      setTotal(totalCount);

      if (append) {
        setDeals(prev => {
          // Filter out duplicates just in case
          const existingIds = new Set(prev.map(d => d.id));
          const uniqueNewDeals = newDeals.filter(d => !existingIds.has(d.id));
          return [...prev, ...uniqueNewDeals];
        });
      } else {
        setDeals(newDeals);
      }
    } catch (error) {
      console.error('Error loading paginated deals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadCategories();
    // Optimization: Do not automatically load all deals on mount.
    // Pages (HomePage, AdminPage) should trigger their own data fetching
    // using loadDealsPaginated or refreshDeals as needed.
  }, [loadCategories]);

  // Refresh deals manually
  const refreshDeals = useCallback(async () => {
    await loadDeals();
  }, [loadDeals]);

  // Rate a deal
  const rateDeal = useCallback(async (dealId: string, rating: number) => {
    try {
      const deal = deals.find((d) => d.id === dealId);
      if (!deal) return;

      const oldRatingTotal = deal.rating * deal.ratingCount;
      const newRatingCount = deal.ratingCount + 1;
      const newAverageRating = (oldRatingTotal + rating) / newRatingCount;

      const updatedRating = parseFloat(newAverageRating.toFixed(1));

      // Update in Supabase
      const { error } = await supabase
        .from('deals')
        .update({
          rating: updatedRating,
          rating_count: newRatingCount,
        })
        .eq('id', dealId);

      if (error) throw error;

      // Update local state
      setDeals((currentDeals) =>
        currentDeals.map((d) =>
          d.id === dealId
            ? { ...d, rating: updatedRating, ratingCount: newRatingCount }
            : d
        )
      );
    } catch (error) {
      console.error('Error rating deal:', error);
      throw error;
    }
  }, [deals]);

  // Get deal by ID
  const getDealById = useCallback((dealId: string): Deal | undefined => {
    return deals.find((d) => d.id === dealId);
  }, [deals]);

  // Add new deal (admin only)
  const addDeal = useCallback(async (newDeal: Deal) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await apiCreateDeal({
        ...newDeal,
        partnerId: user?.id,
      });

      // Refresh deals to get the new one
      await refreshDeals();
    } catch (error) {
      console.error('Error adding deal:', error);
      throw error;
    }
  }, [refreshDeals]);

  // Update existing deal (admin only)
  const updateDeal = useCallback(async (updatedDeal: Deal) => {
    try {
      await apiUpdateDeal(updatedDeal.id, updatedDeal);

      // Update local state
      setDeals((currentDeals) =>
        currentDeals.map((deal) => (deal.id === updatedDeal.id ? updatedDeal : deal))
      );
    } catch (error) {
      console.error('Error updating deal:', error);
      throw error;
    }
  }, []);

  // Delete deal (admin only)
  const deleteDeal = useCallback(async (dealId: string) => {
    try {
      const { error } = await supabase.from('deals').delete().eq('id', dealId);

      if (error) throw error;

      // Update local state
      setDeals((currentDeals) => currentDeals.filter((deal) => deal.id !== dealId));
    } catch (error) {
      console.error('Error deleting deal:', error);
      throw error;
    }
  }, []);

  return (
    <DealContext.Provider
      value={{
        deals,
        total,
        loading,
        rateDeal,
        getDealById,
        addDeal,
        updateDeal,
        deleteDeal,
        refreshDeals,
        loadDealsPaginated,
        categories,
        categoriesLoading
      }}
    >
      {children}
    </DealContext.Provider>
  );
};

export const useDeals = (): DealContextType => {
  const context = useContext(DealContext);
  if (!context) {
    throw new Error('useDeals must be used within a DealProvider');
  }
  return context;
};