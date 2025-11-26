import { SubscriptionTier } from './types';

export const SUBSCRIPTION_PRICES = {
    [SubscriptionTier.NONE]: { en: 0, tr: 0 },
    [SubscriptionTier.FREE]: { en: 0, tr: 0 },
    [SubscriptionTier.BASIC]: { en: 29, tr: 299 },
    [SubscriptionTier.PREMIUM]: { en: 99, tr: 999 },
    [SubscriptionTier.VIP]: { en: 199, tr: 1999 },
};

export const TIER_NAMES = {
    [SubscriptionTier.NONE]: 'None',
    [SubscriptionTier.FREE]: 'Free',
    [SubscriptionTier.BASIC]: 'Basic',
    [SubscriptionTier.PREMIUM]: 'Premium',
    [SubscriptionTier.VIP]: 'VIP',
};
