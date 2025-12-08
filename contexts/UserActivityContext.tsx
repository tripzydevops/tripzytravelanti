import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { saveDeal, unsaveDeal, redeemDeal } from '../lib/supabaseService';
import { User } from '../types';

interface UserActivityContextType {
    savedDeals: string[];
    redemptions: any[]; // using any for now, should be Redemption type if available
    saveDeal: (dealId: string) => Promise<void>;
    unsaveDeal: (dealId: string) => Promise<void>;
    redeemDeal: (dealId: string) => Promise<void>;
    isDealSaved: (dealId: string) => boolean;
    hasRedeemed: (dealId: string) => boolean;
}

const UserActivityContext = createContext<UserActivityContextType | undefined>(undefined);

export const UserActivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [savedDeals, setSavedDeals] = useState<string[]>([]);
    const [redemptions, setRedemptions] = useState<any[]>([]);

    // Sync state with user object when it changes (initial load)
    useEffect(() => {
        if (user) {
            setSavedDeals(user.savedDeals || []);
            setRedemptions(user.redemptions || []);
        } else {
            setSavedDeals([]);
            setRedemptions([]);
        }
    }, [user]);

    const handleSaveDeal = useCallback(async (dealId: string) => {
        if (!user) return;
        try {
            await saveDeal(user.id, dealId);
            setSavedDeals(prev => [...new Set([...prev, dealId])]);
        } catch (error) {
            console.error('Error saving deal:', error);
            throw error;
        }
    }, [user]);

    const handleUnsaveDeal = useCallback(async (dealId: string) => {
        if (!user) return;
        try {
            await unsaveDeal(user.id, dealId);
            setSavedDeals(prev => prev.filter(id => id !== dealId));
        } catch (error) {
            console.error('Error unsaving deal:', error);
            throw error;
        }
    }, [user]);

    const handleRedeemDeal = useCallback(async (dealId: string) => {
        if (!user) return;
        try {
            await redeemDeal(user.id, dealId);
            const newRedemption = {
                id: crypto.randomUUID(),
                dealId,
                userId: user.id,
                redeemedAt: new Date().toISOString()
            };
            setRedemptions(prev => [...prev, newRedemption]);
        } catch (error) {
            console.error('Error redeeming deal:', error);
            throw error;
        }
    }, [user]);

    const isDealSaved = useCallback((dealId: string) => {
        return savedDeals.includes(dealId);
    }, [savedDeals]);

    const hasRedeemed = useCallback((dealId: string) => {
        return redemptions.some(r => r.dealId === dealId);
    }, [redemptions]);

    const contextValue = useMemo(() => ({
        savedDeals,
        redemptions,
        saveDeal: handleSaveDeal,
        unsaveDeal: handleUnsaveDeal,
        redeemDeal: handleRedeemDeal,
        isDealSaved,
        hasRedeemed
    }), [savedDeals, redemptions, handleSaveDeal, handleUnsaveDeal, handleRedeemDeal, isDealSaved, hasRedeemed]);

    return (
        <UserActivityContext.Provider value={contextValue}>
            {children}
        </UserActivityContext.Provider>
    );
};

export const useUserActivity = (): UserActivityContextType => {
    const context = useContext(UserActivityContext);
    if (!context) {
        throw new Error('useUserActivity must be used within a UserActivityProvider');
    }
    return context;
};
