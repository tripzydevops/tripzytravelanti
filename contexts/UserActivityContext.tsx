import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';
import { saveDeal, unsaveDeal, redeemDeal, claimDeal } from '../lib/supabaseService';
import { User } from '../types';

export interface UserActivityContextType {
    savedDeals: string[];
    ownedDeals: string[];
    redemptions: any[];
    sessionId: string;
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
    const sessionId = useMemo(() => crypto.randomUUID(), []);
    const [savedDeals, setSavedDeals] = useState<string[]>([]);
    const [ownedDeals, setOwnedDeals] = useState<string[]>([]);
    const [redemptions, setRedemptions] = useState<any[]>([]);

    // Sync state with user object when it changes (initial load)
    useEffect(() => {
        if (user) {
            if (navigator.onLine) {
                const fetchSaved = supabase
                    .from('user_deals')
                    .select('deal_id')
                    .eq('user_id', user.id)
                    .then(({ data }) => data ? data.map(d => d.deal_id) : []);

                const fetchOwned = supabase
                    .from('wallet_items')
                    .select('deal_id')
                    .eq('user_id', user.id)
                    .then(({ data }) => data ? data.map(d => d.deal_id) : []);

                Promise.all([fetchSaved, fetchOwned]).then(([saved, owned]) => {
                    setSavedDeals(saved);
                    setOwnedDeals(owned);
                    const userRedemptions = user.redemptions || [];
                    setRedemptions(userRedemptions);

                    // Sync cache
                    import('../lib/offlineStorage').then(({ saveWalletToOfflineCache }) => {
                        saveWalletToOfflineCache([{
                            id: 'wallet_state',
                            savedDeals: saved,
                            ownedDeals: owned,
                            redemptions: userRedemptions
                        }]).catch(err => console.error('Failed to cache wallet offline:', err));
                    });
                }).catch(err => {
                    console.error('Error loading activity data, trying local cache fallback:', err);
                    loadOfflineWallet();
                });
            } else {
                loadOfflineWallet();
            }
        } else {
            setSavedDeals([]);
            setOwnedDeals([]);
            setRedemptions([]);
        }

        async function loadOfflineWallet() {
            try {
                const { getCachedWallet } = await import('../lib/offlineStorage');
                const cachedArray = await getCachedWallet();
                const cachedState = cachedArray.find(item => item.id === 'wallet_state');
                if (cachedState) {
                    setSavedDeals(cachedState.savedDeals || []);
                    setOwnedDeals(cachedState.ownedDeals || []);
                    setRedemptions(cachedState.redemptions || []);
                }
            } catch (err) {
                console.error('Failed to load offline wallet items:', err);
            }
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

        try {
            const response = await fetch(`${apiUrl}/api/v1/signals/batch`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    user_id: userId,
                    session_id: sessionId,
                    signals: signalsToSend
                })
            });
            if (!response.ok) {
                console.error('Failed to flush signals batch:', response.statusText);
            }
        } catch (err) {
            console.error('Error flushing signals batch:', err);
        }
    }, [sessionId]);

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
        sessionId,
        saveDeal: handleSaveDeal,
        unsaveDeal: handleUnsaveDeal,
        claimDeal: handleClaimDeal,
        redeemDeal: handleRedeemDeal,
        isDealSaved,
        isDealOwned,
        hasRedeemed,
        bufferSignal
    }), [savedDeals, ownedDeals, redemptions, sessionId, handleSaveDeal, handleUnsaveDeal, handleClaimDeal, handleRedeemDeal, isDealSaved, isDealOwned, hasRedeemed, bufferSignal]);

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
