import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Deal } from '../types';
import { MOCK_DEALS } from '../constants';

interface DealContextType {
  deals: Deal[];
  rateDeal: (dealId: string, rating: number) => void;
  getDealById: (dealId: string) => Deal | undefined;
  addDeal: (deal: Deal) => void;
  updateDeal: (deal: Deal) => void;
  deleteDeal: (dealId: string) => void;
}

const DealContext = createContext<DealContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'tripzy_deals';

export const DealProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deals, setDeals] = useState<Deal[]>(() => {
    try {
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localData) {
        return JSON.parse(localData);
      }
    } catch (error) {
      console.error('Error reading deals from localStorage', error);
    }
    return MOCK_DEALS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(deals));
    } catch (error) {
      console.error('Error saving deals to localStorage', error);
    }
  }, [deals]);


  const rateDeal = useCallback((dealId: string, rating: number) => {
    setDeals(currentDeals =>
      currentDeals.map(deal => {
        if (deal.id === dealId) {
          const oldRatingTotal = deal.rating * deal.ratingCount;
          const newRatingCount = deal.ratingCount + 1;
          const newAverageRating = (oldRatingTotal + rating) / newRatingCount;
          return { 
            ...deal, 
            rating: parseFloat(newAverageRating.toFixed(1)), 
            ratingCount: newRatingCount 
          };
        }
        return deal;
      })
    );
  }, []);

  const getDealById = useCallback((dealId: string): Deal | undefined => {
    return deals.find(d => d.id === dealId);
  }, [deals]);
  
  const addDeal = useCallback((newDeal: Deal) => {
    setDeals(currentDeals => [...currentDeals, newDeal]);
  }, []);

  const updateDeal = useCallback((updatedDeal: Deal) => {
    setDeals(currentDeals => 
      currentDeals.map(deal => deal.id === updatedDeal.id ? updatedDeal : deal)
    );
  }, []);
  
  const deleteDeal = useCallback((dealId: string) => {
    setDeals(currentDeals => currentDeals.filter(deal => deal.id !== dealId));
  }, []);

  return (
    <DealContext.Provider value={{ deals, rateDeal, getDealById, addDeal, updateDeal, deleteDeal }}>
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