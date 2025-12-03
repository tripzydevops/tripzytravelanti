import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Deal } from '../types';
import { getAllDeals, getDealById as getSupabaseDealById, getDealsPaginated } from '../lib/supabaseService';
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
}

const DealContext = createContext<DealContextType | undefined>(undefined);

export const DealProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

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

  // Paginated Load
  const loadDealsPaginated = useCallback(async (page: number, limit: number, filters?: any, append: boolean = false) => {
    try {
      setLoading(true);
      const { deals: newDeals, total: totalCount } = await getDealsPaginated(page, limit, filters);

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
    // We can leave the initial load empty or default to first page
    // loadDeals(); 
    // Actually, HomePage triggers loadDealsPaginated on mount/filter change, so we might not need this auto-call if we want to be purely driven by the page.
    // But to be safe for other pages using useDeals without pagination params:
    loadDeals();
  }, [loadDeals]);

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

      const { data, error } = await supabase
        .from('deals')
        .insert({
          title: newDeal.title,
          title_tr: newDeal.title_tr,
          description: newDeal.description,
          description_tr: newDeal.description_tr,
          image_url: newDeal.imageUrl,
          category: newDeal.category,
          category_tr: newDeal.category_tr,
          original_price: newDeal.originalPrice,
          discounted_price: newDeal.discountedPrice,
          discount_percentage: newDeal.discountPercentage,
          required_tier: newDeal.requiredTier,
          is_external: newDeal.isExternal,
          vendor: newDeal.vendor,
          expires_at: newDeal.expiresAt,
          rating: newDeal.rating,
          rating_count: newDeal.ratingCount,
          usage_limit: newDeal.usageLimit,
          usage_limit_tr: newDeal.usageLimit_tr,
          validity: newDeal.validity,
          validity_tr: newDeal.validity_tr,
          terms_url: newDeal.termsUrl,
          redemption_code: newDeal.redemptionCode,
          latitude: newDeal.latitude,
          longitude: newDeal.longitude,
          redemption_style: newDeal.redemptionStyle,
          partner_id: user?.id,
          status: newDeal.status || 'pending',
          is_flash_deal: newDeal.is_flash_deal,
          flash_end_time: newDeal.flash_end_time,
        })
        .select()
        .single();

      if (error) throw error;

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
      const { error } = await supabase
        .from('deals')
        .update({
          title: updatedDeal.title,
          title_tr: updatedDeal.title_tr,
          description: updatedDeal.description,
          description_tr: updatedDeal.description_tr,
          image_url: updatedDeal.imageUrl,
          category: updatedDeal.category,
          category_tr: updatedDeal.category_tr,
          original_price: updatedDeal.originalPrice,
          discounted_price: updatedDeal.discountedPrice,
          discount_percentage: updatedDeal.discountPercentage,
          required_tier: updatedDeal.requiredTier,
          is_external: updatedDeal.isExternal,
          vendor: updatedDeal.vendor,
          expires_at: updatedDeal.expiresAt,
          rating: updatedDeal.rating,
          rating_count: updatedDeal.ratingCount,
          usage_limit: updatedDeal.usageLimit,
          usage_limit_tr: updatedDeal.usageLimit_tr,
          validity: updatedDeal.validity,
          validity_tr: updatedDeal.validity_tr,
          terms_url: updatedDeal.termsUrl,
          redemption_code: updatedDeal.redemptionCode,
          latitude: updatedDeal.latitude,
          longitude: updatedDeal.longitude,
          status: updatedDeal.status,
          redemption_style: updatedDeal.redemptionStyle,
          is_flash_deal: updatedDeal.is_flash_deal,
          flash_end_time: updatedDeal.flash_end_time,
        })
        .eq('id', updatedDeal.id);

      if (error) throw error;

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