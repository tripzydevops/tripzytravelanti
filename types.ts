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
  generalNotifications: boolean;
}

export interface Redemption {
  id: string;
  dealId: string;
  userId: string;
  redeemedAt: string;
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
  redemptions?: Redemption[];
  mobile?: string;
  address?: string;
  billingAddress?: string;
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
  discountPercentage?: number;
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
  price_tr: number;
  redemptionsPerMonth: number;
  features: string[];
  features_tr: string[];
}

export interface PageContent {
  id: string;
  page_key: string;
  section_key: string;
  content_key: string;
  content_value: string;
  content_value_tr?: string;
  content_type: 'text' | 'image' | 'rich_text';
}