export enum SubscriptionTier {
  NONE = 'NONE',
  FREE = 'FREE',
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  VIP = 'VIP',
}

export interface UserNotificationPreferences {
  newDeals: boolean;
  expiringDeals: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  tier: SubscriptionTier;
  isAdmin?: boolean;
  savedDeals?: string[];
  avatarUrl?: string;
  referredBy?: string; // ID of the user who referred this user
  referrals?: string[]; // Array of user IDs this user has directly referred
  referralChain?: string[]; // Ancestors: [referrer's referrer, referrer]
  referralNetwork?: string[]; // Descendants: [referred user, their referred user, ...]
  extraRedemptions?: number;
  notificationPreferences?: UserNotificationPreferences;
}

export interface Deal {
  id: string;
  title: string;
  title_tr: string;
  description: string;
  description_tr: string;
  imageUrl: string;
  category: string;
  category_tr: string;
  originalPrice: number;
  discountedPrice: number;
  requiredTier: SubscriptionTier;
  isExternal: boolean;
  vendor: string;
  expiresAt: string;
  rating: number;
  ratingCount: number;
  usageLimit: string;
  usageLimit_tr: string;
  validity: string;
  validity_tr: string;
  termsUrl: string;
  redemptionCode: string;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  name_tr: string;
  price: number;
  redemptionsPerMonth: number;
  features: string[];
  features_tr: string[];
}