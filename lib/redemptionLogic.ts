import { User, SubscriptionTier } from '../types';

import { SUBSCRIPTION_PLANS } from '../constants';

export const TIER_LIMITS: Record<SubscriptionTier, number> = SUBSCRIPTION_PLANS.reduce((acc, plan) => {
    acc[plan.tier] = plan.redemptionsPerMonth;
    return acc;
}, {} as Record<SubscriptionTier, number>);

// Ensure NONE tier is handled if not in plans
if (!(SubscriptionTier.NONE in TIER_LIMITS)) {
    TIER_LIMITS[SubscriptionTier.NONE] = 0;
}

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
