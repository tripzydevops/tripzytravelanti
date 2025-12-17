import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';
import { saveDeal, unsaveDeal, redeemDeal, claimDeal } from '../lib/supabaseService';
import { User } from '../types';

interface UserActivityContextType {
    savedDeals: string[];
    ownedDeals: string[];
    redemptions: any[]; // using any for now, should be Redemption type if available
    saveDeal: (dealId: string) => Promise<void>;
    unsaveDeal: (dealId: string) => Promise<void>;
    claimDeal: (dealId: string) => Promise<void>;
    redeemDeal: (dealId: string) => Promise<void>;
    isDealSaved: (dealId: string) => boolean;
    isDealOwned: (dealId: string) => boolean;
    hasRedeemed: (dealId: string) => boolean;
}

const UserActivityContext = createContext<UserActivityContextType | undefined>(undefined);

export const UserActivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [savedDeals, setSavedDeals] = useState<string[]>([]);
    const [ownedDeals, setOwnedDeals] = useState<string[]>([]);
    const [redemptions, setRedemptions] = useState<any[]>([]);

    // Sync state with user object when it changes (initial load)
    // Sync state with user object when it changes (initial load)
    useEffect(() => {
        if (user) {
            // Fetch saved deals from Supabase
            supabase
                .from('user_deals')
                .select('deal_id')
                .eq('user_id', user.id)
                .then(({ data }) => {
                    if (data) {
                        setSavedDeals(data.map(d => d.deal_id));
                    }
                });

            // Fetch owned deals (wallet items) from Supabase
            supabase
                .from('wallet_items')
                .select('deal_id')
                .eq('user_id', user.id)
                // We want ALL wallet items (active, redeemed, expired) to be considered "owned"
                // so that we don't show "Add to Wallet" button for something already in history.
                .then(({ data }) => {
                    if (data) {
                        setOwnedDeals(data.map(d => d.deal_id));
                    }
                });

            setRedemptions(user.redemptions || []);
        } else {
            setSavedDeals([]);
            setOwnedDeals([]);
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

    const handleClaimDeal = useCallback(async (dealId: string) => {
        if (!user) return;
        try {
            await claimDeal(user.id, dealId);
            setOwnedDeals(prev => [...new Set([...prev, dealId])]);
        } catch (error) {
            console.error('Error claiming deal:', error);
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

    const isDealOwned = useCallback((dealId: string) => {
        return ownedDeals.includes(dealId);
    }, [ownedDeals]);

    const hasRedeemed = useCallback((dealId: string) => {
        return redemptions.some(r => r.dealId === dealId);
    }, [redemptions]);

    const contextValue = useMemo(() => ({
        savedDeals,
        ownedDeals,
        redemptions,
        saveDeal: handleSaveDeal,
        unsaveDeal: handleUnsaveDeal,
        claimDeal: handleClaimDeal,
        redeemDeal: handleRedeemDeal,
        isDealSaved,
        isDealOwned,
        hasRedeemed
    }), [savedDeals, ownedDeals, redemptions, handleSaveDeal, handleUnsaveDeal, handleClaimDeal, handleRedeemDeal, isDealSaved, isDealOwned, hasRedeemed]);

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
