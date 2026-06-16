import { supabase } from '../supabaseClient';
import { Deal, SubscriptionTier } from '../../types';

// Internal interface for raw DB deal response
export interface DBDeal {
    id: string;
    title: string;
    title_tr: string;
    description: string;
    description_tr: string;
    image_url: string;
    category: string;
    category_tr: string;
    original_price: number;
    discounted_price: number;
    discount_percentage?: number;
    required_tier: string;
    is_teasable: boolean;
    is_external: boolean;
    vendor: string;
    expires_at: string;
    rating: number;
    rating_count: number;
    usage_limit: string;
    usage_limit_tr: string;
    validity: string;
    validity_tr: string;
    terms_url: string;
    redemption_code: string;
    partner_id?: string;
    company_logo_url?: string;
    status?: 'pending' | 'approved' | 'rejected';
    publish_at?: string;
    redemption_style?: ('online' | 'in_store')[];
    is_flash_deal?: boolean;
    flash_end_time?: string;
    deal_type_key?: string;
    time_type?: string;
    max_redemptions_total?: number;
    max_user_redemptions?: number;
    redemptions_count?: number;
    is_sold_out?: boolean;
}

// Helper function to transform database deal to app format
export function transformDealFromDB(dbDeal: any): Deal {
    return {
        id: dbDeal.id,
        title: dbDeal.title,
        title_tr: dbDeal.title_tr,
        description: dbDeal.description,
        description_tr: dbDeal.description_tr,
        imageUrl: dbDeal.image_url,
        category: dbDeal.category,
        category_tr: dbDeal.category_tr,
        originalPrice: dbDeal.original_price,
        discountedPrice: dbDeal.discounted_price,
        discountPercentage: dbDeal.discount_percentage,
        requiredTier: dbDeal.required_tier as SubscriptionTier,
        isTeasable: dbDeal.is_teasable ?? true,
        isExternal: dbDeal.is_external,
        vendor: dbDeal.vendor,
        expiresAt: dbDeal.expires_at,
        rating: dbDeal.rating,
        ratingCount: dbDeal.rating_count,
        usageLimit: dbDeal.usage_limit,
        usageLimit_tr: dbDeal.usage_limit_tr,
        validity: dbDeal.validity,
        validity_tr: dbDeal.validity_tr,
        termsUrl: dbDeal.terms_url,
        redemptionCode: dbDeal.redemption_code,
        partnerId: dbDeal.partner_id,
        companyLogoUrl: dbDeal.company_logo_url,
        status: dbDeal.status,
        publishAt: dbDeal.publish_at,
        redemptionStyle: dbDeal.redemption_style,
        is_flash_deal: dbDeal.is_flash_deal,
        flash_end_time: dbDeal.flash_end_time,
        dealTypeKey: dbDeal.deal_type_key as any,
        timeType: dbDeal.time_type as any,
        maxRedemptionsTotal: dbDeal.max_redemptions_total,
        maxRedemptionsUser: dbDeal.max_user_redemptions,
        redemptionsCount: dbDeal.redemptions_count || 0,
        isSoldOut: dbDeal.is_sold_out,
        latitude: dbDeal.latitude,
        longitude: dbDeal.longitude,
        storeLocations: dbDeal.store_locations
    };
}

