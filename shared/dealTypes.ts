/**
 * Centralized Deal Types and Categories Configuration
 * This file defines all deal-related constants used across the application.
 * Both admin and merchant deal creation forms use these definitions.
 */

// ============================================
// DEAL CATEGORIES (Industry/What the deal is for)
// ============================================

export interface DealCategory {
  key: string;
  name: string;
  name_tr: string;
  icon: string;
  isActive: boolean;
}

export const DEAL_CATEGORIES: DealCategory[] = [
  { key: 'dining', name: 'Dining', name_tr: 'Yemek', icon: '🍽️', isActive: true },
  { key: 'wellness', name: 'Wellness & Spa', name_tr: 'Sağlık & Spa', icon: '💆', isActive: true },
  { key: 'travel', name: 'Travel & Tours', name_tr: 'Seyahat & Turlar', icon: '✈️', isActive: true },
  { key: 'hotels', name: 'Hotels & Accommodation', name_tr: 'Otel & Konaklama', icon: '🏨', isActive: true },
  { key: 'flights', name: 'Flights', name_tr: 'Uçuşlar', icon: '🛫', isActive: true },
  { key: 'shopping', name: 'Shopping & Retail', name_tr: 'Alışveriş', icon: '🛍️', isActive: true },
  { key: 'entertainment', name: 'Entertainment', name_tr: 'Eğlence', icon: '🎭', isActive: true },
  { key: 'services', name: 'Services', name_tr: 'Hizmetler', icon: '🔧', isActive: true },
  { key: 'health_beauty', name: 'Health & Beauty', name_tr: 'Sağlık & Güzellik', icon: '💄', isActive: true },
  { key: 'electronics', name: 'Electronics', name_tr: 'Elektronik', icon: '📱', isActive: true },
  { key: 'automotive', name: 'Automotive', name_tr: 'Otomotiv', icon: '🚗', isActive: true },
  { key: 'education', name: 'Education', name_tr: 'Eğitim', icon: '📚', isActive: true },
];

// Helper to get category options for dropdowns
export const getCategoryOptions = (language: 'en' | 'tr' = 'en') => {
  return DEAL_CATEGORIES
    .filter(cat => cat.isActive)
    .map(cat => ({
      value: language === 'tr' ? cat.name_tr : cat.name,
      label: `${cat.icon} ${language === 'tr' ? cat.name_tr : cat.name}`,
      key: cat.key,
    }));
};

// Legacy category name mapping for backward compatibility with existing data
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  'Dining': 'dining',
  'Yemek': 'dining',
  'Wellness': 'wellness',
  'Sağlık': 'wellness',
  'Travel': 'travel',
  'Seyahat': 'travel',
  'Flights': 'flights',
  'Uçuşlar': 'flights',
  'Shopping': 'shopping',
  'Alışveriş': 'shopping',
  'Entertainment': 'entertainment',
  'Eğlence': 'entertainment',
  'Services': 'services',
  'Hizmetler': 'services',
  'Food & Dining': 'dining',
};

// ============================================
// DISCOUNT TYPES (How the discount works)
// ============================================

export type DealDiscountType =
  | 'percentage_off'
  | 'fixed_amount_off'
  | 'fixed_price'
  | 'bogo'
  | 'bundle'
  | 'free_gift'
  | 'cashback'
  | 'custom';

export interface DiscountTypeConfig {
  key: DealDiscountType;
  name: string;
  name_tr: string;
  description: string;
  description_tr: string;
  icon: string;
  /** Fields that must be shown for this type */
  requiredFields: string[];
  /** Fields that are optional for this type */
  optionalFields: string[];
  /** Fields to hide for this type */
  hiddenFields: string[];
  isActive: boolean;
  /** Only admins can create this type */
  adminOnly: boolean;
}

export const DISCOUNT_TYPES: DiscountTypeConfig[] = [
  {
    key: 'percentage_off',
    name: 'Percentage Off',
    name_tr: 'Yüzde İndirim',
    description: 'X% discount on original price (e.g., 20% OFF)',
    description_tr: 'Orijinal fiyat üzerinden %X indirim (örn. %20 İNDİRİM)',
    icon: '🏷️',
    requiredFields: ['discountPercentage'],
    optionalFields: ['originalPrice', 'discountedPrice'],
    hiddenFields: [],
    isActive: true,
    adminOnly: false,
  },
  {
    key: 'fixed_amount_off',
    name: 'Fixed Amount Off',
    name_tr: 'Sabit Tutar İndirimi',
    description: '₺X off the price (e.g., ₺50 OFF)',
    description_tr: 'Fiyattan ₺X indirim (örn. ₺50 İNDİRİM)',
    icon: '💵',
    requiredFields: ['originalPrice', 'discountedPrice'],
    optionalFields: ['discountPercentage'],
    hiddenFields: [],
    isActive: true,
    adminOnly: false,
  },
  {
    key: 'fixed_price',
    name: 'Special Fixed Price',
    name_tr: 'Özel Sabit Fiyat',
    description: 'Special price without showing original (e.g., Only ₺99)',
    description_tr: 'Orijinal gösterilmeden özel fiyat (örn. Sadece ₺99)',
    icon: '✨',
    requiredFields: ['discountedPrice'],
    optionalFields: [],
    hiddenFields: ['originalPrice', 'discountPercentage'],
    isActive: true,
    adminOnly: false,
  },
  {
    key: 'bogo',
    name: 'Buy One Get One',
    name_tr: '1 Al 1 Bedava',
    description: 'Buy X get Y free or discounted',
    description_tr: 'X al Y bedava veya indirimli',
    icon: '🎁',
    requiredFields: ['originalPrice'],
    optionalFields: ['discountedPrice', 'discountPercentage'],
    hiddenFields: [],
    isActive: true,
    adminOnly: false,
  },
  {
    key: 'bundle',
    name: 'Bundle Deal',
    name_tr: 'Paket Fırsat',
    description: 'Multiple items at special price',
    description_tr: 'Birden fazla ürün özel fiyatla',
    icon: '📦',
    requiredFields: ['originalPrice', 'discountedPrice'],
    optionalFields: ['discountPercentage'],
    hiddenFields: [],
    isActive: true,
    adminOnly: false,
  },
  {
    key: 'free_gift',
    name: 'Free Gift',
    name_tr: 'Ücretsiz Hediye',
    description: 'Free item with purchase',
    description_tr: 'Alışverişle ücretsiz hediye',
    icon: '🎀',
    requiredFields: ['originalPrice'],
    optionalFields: ['discountedPrice'],
    hiddenFields: ['discountPercentage'],
    isActive: true,
    adminOnly: false,
  },
  {
    key: 'cashback',
    name: 'Cashback',
    name_tr: 'Para İadesi',
    description: 'Money back after purchase (e.g., 10% cashback)',
    description_tr: 'Alışveriş sonrası para iadesi (örn. %10 para iadesi)',
    icon: '💰',
    requiredFields: ['originalPrice', 'discountPercentage'],
    optionalFields: [],
    hiddenFields: ['discountedPrice'],
    isActive: true,
    adminOnly: true,
  },
  {
    key: 'custom',
    name: 'Custom / Other',
    name_tr: 'Özel / Diğer',
    description: 'Configure deal terms manually',
    description_tr: 'Fırsat şartlarını manuel yapılandırın',
    icon: '⚙️',
    requiredFields: [],
    optionalFields: ['originalPrice', 'discountedPrice', 'discountPercentage'],
    hiddenFields: [],
    isActive: true,
    adminOnly: false,
  },
];

// Helper to get discount type options for dropdowns
export const getDiscountTypeOptions = (language: 'en' | 'tr' = 'en', isAdmin: boolean = false) => {
  return DISCOUNT_TYPES
    .filter(type => type.isActive && (isAdmin || !type.adminOnly))
    .map(type => ({
      value: type.key,
      label: `${type.icon} ${language === 'tr' ? type.name_tr : type.name}`,
      description: language === 'tr' ? type.description_tr : type.description,
    }));
};

// Get configuration for a specific discount type
export const getDiscountTypeConfig = (key: DealDiscountType): DiscountTypeConfig | undefined => {
  return DISCOUNT_TYPES.find(type => type.key === key);
};

// ============================================
// TIME-BASED TYPES (When/how long the deal lasts)
// ============================================

export type DealTimeType =
  | 'standard'
  | 'flash'
  | 'daily'
  | 'weekend'
  | 'seasonal'
  | 'evergreen';

export interface TimeTypeConfig {
  key: DealTimeType;
  name: string;
  name_tr: string;
  description: string;
  description_tr: string;
  icon: string;
  /** Auto-set validity text */
  defaultValidity?: string;
  defaultValidity_tr?: string;
  isActive: boolean;
}

export const TIME_TYPES: TimeTypeConfig[] = [
  {
    key: 'standard',
    name: 'Standard',
    name_tr: 'Standart',
    description: 'Regular deal with expiry date',
    description_tr: 'Bitiş tarihli normal fırsat',
    icon: '📅',
    isActive: true,
  },
  {
    key: 'flash',
    name: 'Flash Deal',
    name_tr: 'Flaş Fırsat',
    description: 'Limited time (hours/minutes) with countdown',
    description_tr: 'Geri sayımlı sınırlı süre (saat/dakika)',
    icon: '⚡',
    isActive: true,
  },
  {
    key: 'daily',
    name: 'Daily Deal',
    name_tr: 'Günlük Fırsat',
    description: 'Refreshes daily',
    description_tr: 'Her gün yenilenir',
    icon: '🌅',
    defaultValidity: 'Valid today only',
    defaultValidity_tr: 'Sadece bugün geçerli',
    isActive: true,
  },
  {
    key: 'weekend',
    name: 'Weekend Special',
    name_tr: 'Hafta Sonu Özel',
    description: 'Only valid on weekends',
    description_tr: 'Sadece hafta sonları geçerli',
    icon: '🎉',
    defaultValidity: 'Valid on weekends only',
    defaultValidity_tr: 'Sadece hafta sonları geçerli',
    isActive: true,
  },
  {
    key: 'seasonal',
    name: 'Seasonal',
    name_tr: 'Sezonluk',
    description: 'Holiday/season specific',
    description_tr: 'Tatil/sezon özel',
    icon: '🎄',
    isActive: true,
  },
  {
    key: 'evergreen',
    name: 'Evergreen',
    name_tr: 'Süresiz',
    description: 'Never expires',
    description_tr: 'Süresi dolmaz',
    icon: '♾️',
    defaultValidity: 'No expiration',
    defaultValidity_tr: 'Süresi dolmaz',
    isActive: true,
  },
];

// Helper to get time type options for dropdowns
export const getTimeTypeOptions = (language: 'en' | 'tr' = 'en') => {
  return TIME_TYPES
    .filter(type => type.isActive)
    .map(type => ({
      value: type.key,
      label: `${type.icon} ${language === 'tr' ? type.name_tr : type.name}`,
      description: language === 'tr' ? type.description_tr : type.description,
    }));
};

// Get configuration for a specific time type
export const getTimeTypeConfig = (key: DealTimeType): TimeTypeConfig | undefined => {
  return TIME_TYPES.find(type => type.key === key);
};

// ============================================
// FILTER CATEGORIES (For search/browse UI)
// ============================================

// These are the categories shown in the search/filter UI
// Includes 'All' option and may differ slightly from deal categories
export type CategoryFilter =
  | 'All'
  | 'Dining'
  | 'Wellness & Spa'
  | 'Travel & Tours'
  | 'Hotels & Accommodation'
  | 'Flights'
  | 'Shopping & Retail'
  | 'Entertainment'
  | 'Services'
  | 'Health & Beauty'
  | 'Electronics'
  | 'Automotive'
  | 'Education';

export const FILTER_CATEGORIES: { value: CategoryFilter; label: string; label_tr: string }[] = [
  { value: 'All', label: 'All', label_tr: 'Tümü' },
  ...DEAL_CATEGORIES.filter(c => c.isActive).map(cat => ({
    value: cat.name as CategoryFilter,
    label: `${cat.icon} ${cat.name}`,
    label_tr: `${cat.icon} ${cat.name_tr}`,
  })),
];

// ============================================
// DEFAULT VALUES FOR NEW DEALS
// ============================================

export const DEFAULT_DEAL_VALUES = {
  discountType: 'percentage_off' as DealDiscountType,
  timeType: 'standard' as DealTimeType,
  usageLimit: 'Unlimited',
  usageLimit_tr: 'Sınırsız',
  validity: 'Valid all days',
  validity_tr: 'Her gün geçerli',
};

// ============================================
// PRESETS FOR COMMON DEAL PATTERNS
// ============================================

export interface DealPreset {
  key: string;
  name: string;
  name_tr: string;
  description: string;
  discountType: DealDiscountType;
  timeType: DealTimeType;
  defaultPercentage?: number;
  defaultValidity?: string;
  defaultValidity_tr?: string;
}

export const DEAL_PRESETS: DealPreset[] = [
  {
    key: 'restaurant_standard',
    name: 'Restaurant Discount',
    name_tr: 'Restoran İndirimi',
    description: 'Standard percentage off at a restaurant',
    discountType: 'percentage_off',
    timeType: 'standard',
    defaultPercentage: 20,
    defaultValidity: 'Valid on weekdays',
    defaultValidity_tr: 'Hafta içi geçerli',
  },
  {
    key: 'flash_sale',
    name: 'Flash Sale',
    name_tr: 'Flaş İndirim',
    description: 'Limited time flash deal',
    discountType: 'percentage_off',
    timeType: 'flash',
    defaultPercentage: 50,
  },
  {
    key: 'hotel_package',
    name: 'Hotel Package',
    name_tr: 'Otel Paketi',
    description: 'Bundled hotel accommodation',
    discountType: 'bundle',
    timeType: 'seasonal',
  },
  {
    key: 'bogo_cafe',
    name: 'Cafe BOGO',
    name_tr: 'Kafe 1 Al 1 Bedava',
    description: 'Buy one get one free at cafe',
    discountType: 'bogo',
    timeType: 'standard',
    defaultValidity: 'Valid Monday to Thursday',
    defaultValidity_tr: 'Pazartesi-Perşembe geçerli',
  },
];

// Get preset by key
export const getDealPreset = (key: string): DealPreset | undefined => {
  return DEAL_PRESETS.find(preset => preset.key === key);
};
