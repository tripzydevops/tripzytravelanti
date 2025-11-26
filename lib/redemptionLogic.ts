import { User, SubscriptionTier } from '../types';

export const TIER_LIMITS: Record<SubscriptionTier, number> = {
    [SubscriptionTier.NONE]: 0,
    [SubscriptionTier.FREE]: 1,
    [SubscriptionTier.BASIC]: 5,
    [SubscriptionTier.PREMIUM]: 20,
    [SubscriptionTier.VIP]: Infinity,
};

export const calculateRemainingRedemptions = (user: User) => {
    if (!user) return { used: 0, total: 0, remaining: 0 };

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const usedThisMonth = user.redemptions?.filter(r => {
        const date = new Date(r.redeemedAt);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length || 0;

    const baseLimit = TIER_LIMITS[user.tier] || 0;
    const extra = user.extraRedemptions || 0;
    const total = baseLimit === Infinity ? Infinity : baseLimit + extra;
    const remaining = total === Infinity ? Infinity : Math.max(0, total - usedThisMonth);

    return { used: usedThisMonth, total, remaining };
};

export const getNextRenewalDate = (): Date => {
    const now = new Date();
    // Renewal is always on the 1st of the next month
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
};
