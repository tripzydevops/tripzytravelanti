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
  ownedDeals?: string[];
  avatarUrl?: string;
  referralCode?: string;
  referredBy?: string;
  referrals?: string[]; // Array of user IDs this user has directly referred
  referralChain?: string[]; // Ancestors: [referrer's referrer, referrer]
  referralNetwork?: string[]; // Descendants: [referred user, their referred user, ...]
  points?: number;
  totalReferrals?: number;
  extraRedemptions?: number;
  notificationPreferences?: UserNotificationPreferences;
  redemptions?: Redemption[];
  mobile?: string;
  address?: string;
  billingAddress?: string;
  subscriptionStartDate?: string; // For yearly renewal tracking
  role?: 'user' | 'admin' | 'partner' | 'vendor';
  status?: 'active' | 'banned' | 'suspended';
  rank?: string;
  emailConfirmedAt?: string | null;
  lastSignInAt?: string | null;
  walletLimit?: number | null; // Admin override for wallet capacity (null = use tier default)
  geofenceEnforcementMode?: 'off' | 'soft_warning' | 'hard_block';
  createdAt?: string;
}

export interface PartnerStats {
  id: string;
  partnerId: string;
  totalViews: number;
  totalRedemptions: number;
  updatedAt: string;
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
  isTeasable?: boolean;
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
  latitude?: number;
  longitude?: number;
  // Store locations (for in-store deals)
  storeLocations?: {
    name: string;
    address: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  }[];
  countries?: string[]; // For filtering deals by country
  partnerId?: string;
  companyLogoUrl?: string;
  status?: 'pending' | 'approved' | 'rejected';
  publishAt?: string;
  redemptionStyle?: ('online' | 'in_store')[];
  is_flash_deal?: boolean;
  flash_end_time?: string;
  companyWebsiteUrl?: string;
  // Deal type classification
  dealTypeKey?: 'percentage_off' | 'fixed_amount_off' | 'fixed_price' | 'bogo' | 'bundle' | 'free_gift' | 'cashback' | 'custom';
  timeType?: 'standard' | 'flash' | 'daily' | 'weekend' | 'seasonal' | 'evergreen';
  maxRedemptionsTotal?: number | null;
  maxRedemptionsUser?: number | null; // Limit per user (e.g. 1)
  redemptionsCount?: number;
  isSoldOut?: boolean;
  galleryUrls?: string[];
  aiMatchScore?: number;
  aiMatchReason?: string;
  aiMatchReason_tr?: string;
  neighborhood?: string;
  neighborhood_tr?: string;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  name_tr: string;
  price: number;
  price_tr: number;
  redemptionsPerMonth: number;
  billingPeriod: 'yearly'; // Billing period
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

export interface PaymentTransaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  paymentMethod: 'stripe' | 'iyzico';
  tier: SubscriptionTier;
  taxId: string;
  transactionId?: string;
  errorMessage?: string;
  createdAt: string;
  // Populated fields
  userName?: string;
  userEmail?: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isActive: boolean;
  createdAt: string;
  endAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface WalletItem {
  id: string;
  userId: string;
  dealId: string;
  redemptionCode: string;
  status: 'active' | 'redeemed' | 'expired';
  confirmationToken?: string;
  confirmationExpiresAt?: string;
  createdAt: string;
  redeemedAt?: string;
  expiresAt?: string;
  qrTokenId?: string;
  claimedLatitude?: number;
  claimedLongitude?: number;
  couponCodeId?: string;
  // Joined fields
  deal?: Deal;
}

export interface ExternalUserMapping {
  id: string;
  userId: string;
  externalPlatform: string;
  externalUserId: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  type:
    | 'earn_redemption'
    | 'earn_referral'
    | 'earn_streak'
    | 'earn_campaign'
    | 'burn_reward'
    | 'burn_coupon'
    | 'expire'
    | 'adjust_admin'
    | 'transfer_out'
    | 'transfer_in';
  amount: number;
  runningBalance: number;
  referenceType?: string;
  referenceId?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface LoyaltyReward {
  id: string;
  title: string;
  title_tr: string;
  description?: string;
  description_tr?: string;
  pointsCost: number;
  rewardType: 'deal_unlock' | 'subscription_upgrade' | 'custom_voucher';
  rewardData?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponCampaign {
  id: string;
  partnerId?: string;
  dealId?: string;
  title: string;
  description?: string;
  discountType: 'percentage' | 'fixed_amount' | 'free_gift' | 'bogo';
  discountValue: number;
  maxDiscountAmount?: number;
  minSubtotal: number;
  usageLimit?: number;
  usageCount: number;
  maxPerUser: number;
  startsAt?: string;
  expiresAt?: string;
  isActive: boolean;
  stackingRules?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CouponCode {
  id: string;
  campaignId: string;
  code: string;
  status: 'active' | 'redeemed' | 'expired' | 'revoked';
  assignedTo?: string;
  claimedAt?: string;
  redeemedBy?: string;
  redeemedAt?: string;
  createdAt: string;
}

export interface QRToken {
  id: string;
  walletItemId: string;
  tokenHash: string;
  issuedAt: string;
  expiresAt: string;
  usedAt?: string;
  version: number;
  ipAddress?: string;
  deviceInfo?: string;
}

export interface QRScanEvent {
  id: string;
  walletItemId?: string;
  qrTokenId?: string;
  vendorId?: string;
  scanTimestamp: string;
  scanLatitude?: number;
  scanLongitude?: number;
  scanMethod: 'qr_scan' | 'manual_code' | 'nfc' | 'geo_auto';
  scanResult: 'success' | 'invalid_code' | 'expired_token' | 'already_redeemed' | 'geo_mismatch' | 'rate_limited';
  rawScannedPayload?: string;
  ipAddress?: string;
  deviceInfo?: string;
}

export interface GeofenceZone {
  id: string;
  partnerId: string;
  dealId?: string;
  name: string;
  zone?: any; // postgis polygon
  radiusMeters?: number;
  centroid?: any; // postgis point
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeoValidationEvent {
  id: string;
  userId: string;
  dealId: string;
  geofenceZoneId?: string;
  userLatitude: number;
  userLongitude: number;
  distanceMeters?: number;
  isWithinBounds: boolean;
  checkedAt: string;
}

export interface FraudSignal {
  id: string;
  userId?: string;
  vendorId?: string;
  walletItemId?: string;
  signalType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, any>;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

// =====================================================
// INSTAGRAM STORIES & SOCIAL DISCOVERY
// =====================================================
export interface StorySlide {
  id: string;
  title: string;
  title_tr?: string;
  subtitle?: string;
  subtitle_tr?: string;
  imageUrl: string;
  dealId?: string;
  ctaText?: string;
  ctaText_tr?: string;
  tag?: string;
  location?: string;
}

export interface StoryGroup {
  id: string;
  partnerId?: string;
  title: string;
  title_tr?: string;
  avatarUrl: string;
  category: string;
  isLive?: boolean;
  slides: StorySlide[];
  isSeen?: boolean;
  createdAt?: string;
}

// =====================================================
// TRAVEL PASSPORT & QUESTS GAMIFICATION
// =====================================================
export interface TravelPassportStamp {
  id: string;
  slug: string;
  city?: string;
  category?: string;
  name: string;
  name_tr: string;
  description: string;
  description_tr: string;
  icon: string;
  xpReward: number;
  pointsReward?: number;
  requiredCount: number;
  currentCount: number;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export interface UserGamificationState {
  level: number;
  levelTitle: string;
  levelTitle_tr: string;
  xp: number;
  xpForNextLevel: number;
  streakDays: number;
  lastStreakClaimDate: string | null;
  canClaimDailyStreak: boolean;
  canScratchCard: boolean;
  stamps: TravelPassportStamp[];
  totalSavedAmount: number;
}

// =====================================================
// SOCIAL MEDIA RAFFLES & GIVEAWAYS (ÇEKİLİŞLER)
// =====================================================
export interface RaffleEntryQuest {
  id: string;
  title: string;
  title_tr: string;
  description: string;
  description_tr: string;
  ticketsReward: number;
  actionType: 'instagram_follow' | 'instagram_story' | 'referral' | 'redeem_deal' | 'points_exchange';
  pointsCost?: number;
  actionUrl?: string;
  isCompleted: boolean;
}

export interface Raffle {
  id: string;
  title: string;
  title_tr: string;
  description: string;
  description_tr: string;
  imageUrl: string;
  prizeValue: string;
  sponsorName?: string;
  sponsorLogoUrl?: string;
  endDate: string;
  drawDate: string;
  totalTickets: number;
  userTickets: number;
  status: 'active' | 'drawn' | 'upcoming';
  winnerName?: string;
  winnerAvatar?: string;
  quests: RaffleEntryQuest[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl?: string;
  city?: string;
  totalSaved: number;
  stampsUnlocked: number;
  level: number;
  tier: SubscriptionTier;
}

// =====================================================
// FLASH LOTTERY & INSTAGRAM SHARE VERIFICATION (FLAŞ ÇEKİLİŞ)
// =====================================================
export type LotteryVerificationMethod = 
  | 'webhook_tag' 
  | 'story_canvas' 
  | 'referral_click' 
  | 'ocr_screenshot' 
  | 'points_exchange'
  | 'rewarded_ad';

export interface LotteryTicket {
  id: string;
  campaignId: string;
  userId: string;
  ticketNumber: string; // e.g. TRPZ-LOT-89210
  verificationMethod: LotteryVerificationMethod;
  verifiedAt: string;
  isWinner: boolean;
  proofUrl?: string;
  createdAt: string;
}

export interface LotteryCampaign {
  id: string;
  dealId?: string;
  merchantId?: string;
  merchantName?: string;
  title: string;
  title_tr: string;
  description: string;
  description_tr: string;
  prizeDescription: string;
  prizeDescription_tr: string;
  imageUrl: string;
  totalWinners: number;
  startsAt: string;
  endsAt: string;
  status: 'active' | 'drawn' | 'cancelled';
  winningTicketIds?: string[];
  totalTicketsMinted: number;
  userTicketsCount?: number;
  userTickets?: LotteryTicket[];
  createdAt: string;
  deal?: Deal;
}

export interface LotteryDraw {
  id: string;
  campaignId: string;
  winningTicketId: string;
  winningUserId: string;
  winningTicketNumber: string;
  winnerName?: string;
  drawSeed: string; // Cryptographic SHA-256 seed for provable fairness
  drawnAt: string;
}

export interface LotteryDrawResult {
  success: boolean;
  campaignId: string;
  winners: {
    ticketId: string;
    ticketNumber: string;
    userId: string;
    userName: string;
  }[];
  seed: string;
  drawnAt: string;
}
