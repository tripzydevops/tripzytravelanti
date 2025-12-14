import { SubscriptionTier } from '../types';

// Default wallet capacity limits per tier
export const DEFAULT_WALLET_LIMITS: Record<SubscriptionTier, number> = {
    [SubscriptionTier.NONE]: 0,
    [SubscriptionTier.FREE]: 3,
    [SubscriptionTier.BASIC]: 10,
    [SubscriptionTier.PREMIUM]: 25,
    [SubscriptionTier.VIP]: 999999, // Effectively unlimited
};

// Get user's wallet limit (checks for individual override first)
export const getWalletLimit = (
    userTier: SubscriptionTier,
    customLimit?: number | null
): number => {
    // If user has a custom limit set by admin, use that
    if (customLimit !== undefined && customLimit !== null) {
        return customLimit;
    }
    // Otherwise use the tier default
    return DEFAULT_WALLET_LIMITS[userTier] || DEFAULT_WALLET_LIMITS[SubscriptionTier.FREE];
};

// Check if user can add more deals to wallet
export const canAddToWallet = (
    currentActiveDeals: number,
    userTier: SubscriptionTier,
    customLimit?: number | null
): boolean => {
    const limit = getWalletLimit(userTier, customLimit);
    return currentActiveDeals < limit;
};

// Get remaining wallet slots
export const getRemainingWalletSlots = (
    currentActiveDeals: number,
    userTier: SubscriptionTier,
    customLimit?: number | null
): number => {
    const limit = getWalletLimit(userTier, customLimit);
    return Math.max(0, limit - currentActiveDeals);
};

// Get wallet usage percentage (for progress bar)
export const getWalletUsagePercent = (
    currentActiveDeals: number,
    userTier: SubscriptionTier,
    customLimit?: number | null
): number => {
    const limit = getWalletLimit(userTier, customLimit);
    if (limit >= 999999) return 0; // VIP shows empty bar (unlimited)
    return Math.min(100, (currentActiveDeals / limit) * 100);
};

// Check if wallet is near capacity (80%+)
export const isWalletNearCapacity = (
    currentActiveDeals: number,
    userTier: SubscriptionTier,
    customLimit?: number | null
): boolean => {
    const percent = getWalletUsagePercent(currentActiveDeals, userTier, customLimit);
    return percent >= 80;
};

// Check if wallet is full
export const isWalletFull = (
    currentActiveDeals: number,
    userTier: SubscriptionTier,
    customLimit?: number | null
): boolean => {
    return !canAddToWallet(currentActiveDeals, userTier, customLimit);
};

// Format limit for display (handle unlimited)
export const formatWalletLimit = (
    userTier: SubscriptionTier,
    customLimit?: number | null,
    language: 'en' | 'tr' = 'en'
): string => {
    const limit = getWalletLimit(userTier, customLimit);
    if (limit >= 999999) {
        return language === 'tr' ? 'Sınırsız' : 'Unlimited';
    }
    return limit.toString();
};
