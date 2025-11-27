import { supabase } from './supabaseClient';
import { User, Deal, SubscriptionTier } from '../types';

// =====================================================
// USER PROFILE OPERATIONS
// =====================================================

export async function getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select(`
      *,
      saved_deals:saved_deals(deal_id),
      deal_redemptions:deal_redemptions(id, deal_id, user_id, redeemed_at)
    `)
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }

    // Transform database format to app format
    return {
        id: data.id,
        name: data.name,
        email: data.email,
        tier: data.tier as SubscriptionTier,
        isAdmin: data.is_admin,
        savedDeals: data.saved_deals?.map((sd: any) => sd.deal_id) || [],
        avatarUrl: data.avatar_url,
        referredBy: data.referred_by,
        extraRedemptions: data.extra_redemptions,
        notificationPreferences: data.notification_preferences,
        redemptions: data.deal_redemptions?.map((r: any) => ({
            id: r.id,
            dealId: r.deal_id,
            userId: r.user_id,
            redeemedAt: r.redeemed_at
        })) || [],
        mobile: data.mobile,
        address: data.address,
        billingAddress: data.billing_address,
    };
}

export async function updateUserProfile(
    userId: string,
    updates: Partial<{
        name: string;
        email: string;
        tier: SubscriptionTier;
        avatar_url: string;
        extra_redemptions: number;
        notification_preferences: any;
        mobile: string;
        address: string;
        billing_address: string;
    }>
) {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }

    return data;
}

export async function getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select(`
      *,
      saved_deals:saved_deals(deal_id),
      deal_redemptions:deal_redemptions(id, deal_id, user_id, redeemed_at)
    `);

    if (error) {
        console.error('Error fetching users:', error);
        return [];
    }

    return data.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        tier: user.tier as SubscriptionTier,
        isAdmin: user.is_admin,
        savedDeals: user.saved_deals?.map((sd: any) => sd.deal_id) || [],
        avatarUrl: user.avatar_url,
        referredBy: user.referred_by,
        extraRedemptions: user.extra_redemptions,
        notificationPreferences: user.notification_preferences,
        redemptions: user.deal_redemptions?.map((r: any) => ({
            id: r.id,
            dealId: r.deal_id,
            userId: r.user_id,
            redeemedAt: r.redeemed_at
        })) || [],
        mobile: user.mobile,
    }));
}

export async function deleteUserProfile(userId: string) {
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

    if (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
}

// =====================================================
// DEAL OPERATIONS
// =====================================================

export async function getAllDeals(): Promise<Deal[]> {
    const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching deals:', error);
        return [];
    }

    return data.map(transformDealFromDB);
}

export async function getDealById(dealId: string): Promise<Deal | null> {
    const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

    if (error) {
        console.error('Error fetching deal:', error);
        return null;
    }

    return transformDealFromDB(data);
}

export async function getDealsForTier(tier: SubscriptionTier): Promise<Deal[]> {
    const tierHierarchy = {
        [SubscriptionTier.NONE]: [],
        [SubscriptionTier.FREE]: ['FREE'],
        [SubscriptionTier.BASIC]: ['FREE', 'BASIC'],
        [SubscriptionTier.PREMIUM]: ['FREE', 'BASIC', 'PREMIUM'],
        [SubscriptionTier.VIP]: ['FREE', 'BASIC', 'PREMIUM', 'VIP'],
    };

    const allowedTiers = tierHierarchy[tier] || [];

    const { data, error } = await supabase
        .from('deals')
        .select('*')
        .in('required_tier', allowedTiers)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching deals for tier:', error);
        return [];
    }

    return data.map(transformDealFromDB);
}

// Helper function to transform database deal to app format
function transformDealFromDB(dbDeal: any): Deal {
    return {
        id: dbDeal.id,
        title: dbDeal.title,
        title_tr: dbDeal.title_tr,
        description: dbDeal.description,
        description_tr: dbDeal.description_tr,
        imageUrl: dbDeal.image_url,
        category: dbDeal.category,
        category_tr: dbDeal.category_tr,
        originalPrice: parseFloat(dbDeal.original_price),
        discountedPrice: parseFloat(dbDeal.discounted_price),
        discountPercentage: dbDeal.discount_percentage ? parseFloat(dbDeal.discount_percentage) : undefined,
        requiredTier: dbDeal.required_tier as SubscriptionTier,
        isExternal: dbDeal.is_external,
        vendor: dbDeal.vendor,
        expiresAt: dbDeal.expires_at,
        rating: parseFloat(dbDeal.rating),
        ratingCount: dbDeal.rating_count,
        usageLimit: dbDeal.usage_limit,
        usageLimit_tr: dbDeal.usage_limit_tr,
        validity: dbDeal.validity,
        validity_tr: dbDeal.validity_tr,
        termsUrl: dbDeal.terms_url,
        redemptionCode: dbDeal.redemption_code,
    };
}

// =====================================================
// SAVED DEALS OPERATIONS
// =====================================================

export async function saveDeal(userId: string, dealId: string) {
    const { error } = await supabase
        .from('saved_deals')
        .insert({ user_id: userId, deal_id: dealId });

    if (error) {
        console.error('Error saving deal:', error);
        throw error;
    }
}

export async function unsaveDeal(userId: string, dealId: string) {
    const { error } = await supabase
        .from('saved_deals')
        .delete()
        .eq('user_id', userId)
        .eq('deal_id', dealId);

    if (error) {
        console.error('Error unsaving deal:', error);
        throw error;
    }
}

export async function getSavedDeals(userId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('saved_deals')
        .select('deal_id')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching saved deals:', error);
        return [];
    }

    return data.map((sd) => sd.deal_id);
}

// =====================================================
// REFERRAL OPERATIONS
// =====================================================

export async function createReferral(referrerId: string, referredId: string) {
    const { error } = await supabase
        .from('referrals')
        .insert({ referrer_id: referrerId, referred_id: referredId });

    if (error) {
        console.error('Error creating referral:', error);
        throw error;
    }
}

export async function getReferralNetwork(userId: string): Promise<string[]> {
    const { data, error } = await supabase
        .rpc('get_referral_network', { user_uuid: userId });

    if (error) {
        console.error('Error fetching referral network:', error);
        return [];
    }

    return data.map((row: any) => row.referred_user_id);
}

export async function getReferralChain(userId: string): Promise<string[]> {
    const { data, error } = await supabase
        .rpc('get_referral_chain', { user_uuid: userId });

    if (error) {
        console.error('Error fetching referral chain:', error);
        return [];
    }

    return data.map((row: any) => row.referrer_user_id);
}

export async function getDirectReferrals(userId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('referrals')
        .select('referred_id')
        .eq('referrer_id', userId);

    if (error) {
        console.error('Error fetching direct referrals:', error);
        return [];
    }

    return data.map((r) => r.referred_id);
}

// =====================================================
// DEAL REDEMPTION OPERATIONS
// =====================================================

export async function redeemDeal(userId: string, dealId: string) {
    const { error } = await supabase
        .from('deal_redemptions')
        .insert({ user_id: userId, deal_id: dealId });

    if (error) {
        console.error('Error redeeming deal:', error);
        throw error;
    }
}

export async function getUserRedemptions(userId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('deal_redemptions')
        .select('*, deals(*)')
        .eq('user_id', userId)
        .order('redeemed_at', { ascending: false });

    if (error) {
        console.error('Error fetching user redemptions:', error);
        return [];
    }

    return data;
}

export async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
        console.error('Error updating password:', error);
        throw error;
    }
}

// =====================================================
// PAYMENT OPERATIONS
// =====================================================

export async function getUserTransactions(userId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user transactions:', error);
        return [];
    }

    return data.map(t => ({
        id: t.id,
        userId: t.user_id,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        paymentMethod: t.payment_method,
        tier: t.tier,
        taxId: t.tax_id,
        transactionId: t.transaction_id,
        errorMessage: t.error_message,
        createdAt: t.created_at
    }));
}
