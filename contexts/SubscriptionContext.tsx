import React, { createContext, useContext, useState, useEffect } from 'react';
import { SubscriptionPlan } from '../types';
import { getSubscriptionPlans } from '../lib/subscriptionService';

interface SubscriptionContextType {
    plans: SubscriptionPlan[];
    isLoading: boolean;
    error: any;
    refreshPlans: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const fetchPlans = async () => {
        try {
            setIsLoading(true);
            const data = await getSubscriptionPlans();
            setPlans(data);
            setError(null);
        } catch (err) {
            console.error('Error loading subscription plans:', err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    return (
        <SubscriptionContext.Provider value={{ plans, isLoading, error, refreshPlans: fetchPlans }}>
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};
