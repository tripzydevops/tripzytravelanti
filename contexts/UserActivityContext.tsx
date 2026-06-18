import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';
import { saveDeal, unsaveDeal, redeemDeal, claimDeal } from '../lib/supabaseService';
import { User } from '../types';

export interface UserActivityContextType {
    savedDeals: string[];
    ownedDeals: string[];
    redemptions: any[];
    saveDeal: (dealId: string) => Promise<void>;
    unsaveDeal: (dealId: string) => Promise<void>;
    claimDeal: (dealId: string, couponCodeId?: string) => Promise<void>;
    redeemDeal: (dealId: string, couponCodeId?: string) => Promise<void>;
    isDealSaved: (dealId: string) => boolean;
    isDealOwned: (dealId: string) => boolean;
    hasRedeemed: (dealId: string) => boolean;
    bufferSignal: (type: string, targetId?: string, metadata?: any) => void;
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

    const signalBuffer = useRef<{ signal_type: string; target_id: string; metadata?: any }[]>([]);

    const bufferSignal = useCallback((type: string, targetId?: string, metadata?: any) => {
        if (!targetId) return;
        console.log(`[Signal Buffered] Type: ${type}, Target: ${targetId}`, metadata);
        signalBuffer.current.push({
            signal_type: type,
            target_id: targetId,
            metadata
        });
    }, []);

    const flushSignals = useCallback(async () => {
        if (signalBuffer.current.length === 0) return;

        const session = (await supabase.auth.getSession()).data.session;
        const token = session?.access_token;
        const userId = session?.user?.id;

        if (!token || !userId) {
            // Clear buffer if not authenticated, as the API requires authentication
            signalBuffer.current = [];
            return;
        }

        const signalsToSend = [...signalBuffer.current];
        signalBuffer.current = [];

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const promises = signalsToSend.map(async (sig) => {
            try {
                const response = await fetch(`${apiUrl}/api/v1/signals`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        user_id: userId,
                        signal_type: sig.signal_type,
                        target_id: sig.target_id,
                        metadata: sig.metadata
                    })
                });
                if (!response.ok) {
                    console.error(`Failed to flush signal ${sig.signal_type} for ${sig.target_id}:`, response.statusText);
                }
            } catch (err) {
                console.error(`Error flushing signal ${sig.signal_type}:`, err);
            }
        });

        await Promise.all(promises);
    }, []);

    useEffect(() => {
        const intervalId = setInterval(flushSignals, 5000);
        return () => {
            clearInterval(intervalId);
            flushSignals();
        };
    }, [flushSignals]);

    const handleSaveDeal = useCallback(async (dealId: string) => {
        if (!user) return;
        try {
            await saveDeal(user.id, dealId);
            setSavedDeals(prev => [...new Set([...prev, dealId])]);
            bufferSignal('save', dealId);
        } catch (error) {
            console.error('Error saving deal:', error);
            throw error;
        }
    }, [user, bufferSignal]);

    const handleUnsaveDeal = useCallback(async (dealId: string) => {
        if (!user) return;
        try {
            await unsaveDeal(user.id, dealId);
            setSavedDeals(prev => prev.filter(id => id !== dealId));
            bufferSignal('favorite', dealId, { action: 'unsave' });
        } catch (error) {
            console.error('Error unsaving deal:', error);
            throw error;
        }
    }, [user, bufferSignal]);

    const handleClaimDeal = useCallback(async (dealId: string, couponCodeId?: string) => {
        if (!user) return;
        try {
            await claimDeal(user.id, dealId, couponCodeId);
            setOwnedDeals(prev => [...new Set([...prev, dealId])]);
            bufferSignal('claim', dealId, { couponCodeId });
        } catch (error) {
            console.error('Error claiming deal:', error);
            throw error;
        }
    }, [user, bufferSignal]);

    const handleRedeemDeal = useCallback(async (dealId: string, couponCodeId?: string) => {
        if (!user) return;
        try {
            await redeemDeal(user.id, dealId, couponCodeId);
            const newRedemption = {
                id: crypto.randomUUID(),
                dealId,
                userId: user.id,
                redeemedAt: new Date().toISOString()
            };
            setRedemptions(prev => [...prev, newRedemption]);
            bufferSignal('redeem', dealId, { couponCodeId });
        } catch (error) {
            console.error('Error redeeming deal:', error);
            throw error;
        }
    }, [user, bufferSignal]);

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
        hasRedeemed,
        bufferSignal
    }), [savedDeals, ownedDeals, redemptions, handleSaveDeal, handleUnsaveDeal, handleClaimDeal, handleRedeemDeal, isDealSaved, isDealOwned, hasRedeemed, bufferSignal]);

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
