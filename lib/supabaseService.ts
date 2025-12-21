import { supabase } from './supabaseClient';
import { User, Deal, SubscriptionTier, PaymentTransaction, UserNotificationPreferences, PageContent } from '../types';
import { PostgrestError } from '@supabase/supabase-js';
import { upsertDealVector } from './vectorService';

export interface Category {
    id: string;
    name: string;
    name_tr: string;
    icon?: string;
}

// Internal interface for raw DB deal response
interface DBDeal {
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

// =====================================================
// USER PROFILE OPERATIONS
// =====================================================

export async function getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*, deal_redemptions(*)')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }

    return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        isAdmin: data.role === 'admin' || data.is_admin === true,
        tier: data.tier || 'FREE',
        createdAt: data.created_at,
        subscriptionStartDate: data.subscription_start_date,
        walletLimit: data.wallet_limit,
        extraRedemptions: data.extra_redemptions,
        notificationPreferences: data.notification_preferences,
        avatarUrl: data.avatar_url,
        mobile: data.mobile,
        address: data.address,
        billingAddress: data.billing_address,
        status: data.status,
        referredBy: data.referred_by,
        referralCode: data.referral_code,
        points: data.points || 0,
        rank: data.rank,
        totalReferrals: data.total_referrals || 0,
        emailConfirmedAt: data.email_confirmed_at,
        redemptions: data.deal_redemptions ? data.deal_redemptions.map((r: any) => ({
            id: r.id,
            dealId: r.deal_id,
            userId: r.user_id,
            redeemedAt: r.redeemed_at
        })) : []
    };
}

export async function updateUserProfile(userId: string, updates: Partial<User>) {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.tier) dbUpdates.tier = updates.tier;
    if (updates.subscriptionStartDate) dbUpdates.subscription_start_date = updates.subscriptionStartDate;
    if (updates.walletLimit !== undefined) dbUpdates.wallet_limit = updates.walletLimit;
    if (updates.notificationPreferences) dbUpdates.notification_preferences = updates.notificationPreferences;
    if (updates.extraRedemptions !== undefined) dbUpdates.extra_redemptions = updates.extraRedemptions;
    if (updates.referredBy) dbUpdates.referred_by = updates.referredBy;
    if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.mobile) dbUpdates.mobile = updates.mobile;
    if (updates.address) dbUpdates.address = updates.address;
    if (updates.billingAddress) dbUpdates.billing_address = updates.billingAddress;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.points !== undefined) dbUpdates.points = updates.points;
    if (updates.rank !== undefined) dbUpdates.rank = updates.rank;

    const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId);

    if (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
}

export async function savePushSubscription(userId: string, subscription: any) {
    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
            user_id: userId,
            endpoint,
            p256dh,
            auth
        }, { onConflict: 'endpoint' });

    if (error) {
        console.error('Error saving push subscription:', error);
        throw error;
    }
}

export async function resetUserHistory(userId: string) {

    // 0. Delete from redemption_logs (Foreign Key to wallet_items)
    // We try/catch or ignore error if table doesn't exist yet (soft dependency)
    try {
        await supabase
            .from('redemption_logs')
            .delete()
            .eq('user_id', userId);
    } catch (e) {
        console.warn('Could not delete from redemption_logs (might not exist)', e);
    }

    // 0.5 Delete from user_deals (Favorites) - Optional but good for clean slate
    await supabase.from('user_deals').delete().eq('user_id', userId);

    // 1. Delete all wallet items
    const { error: walletError } = await supabase
        .from('wallet_items')
        .delete()
        .eq('user_id', userId);

    if (walletError) {
        console.error('Error resetting wallet items:', walletError);
        throw walletError;
    }

    // 2. Delete all redemption history
    const { error: redemptionError } = await supabase
        .from('deal_redemptions')
        .delete()
        .eq('user_id', userId);

    if (redemptionError) {
        console.error('Error resetting redemptions:', redemptionError);
        throw redemptionError;
    }

    return { success: true };
}

export async function submitPartnerLead(lead: {
    businessName: string;
    contactName: string;
    email: string;
    phone?: string;
    industry?: string;
    message?: string;
}) {
    const { error } = await supabase
        .from('partner_leads')
        .insert({
            business_name: lead.businessName,
            contact_name: lead.contactName,
            email: lead.email,
            phone: lead.phone,
            industry: lead.industry,
            message: lead.message
        });

    if (error) {
        console.error('Error submitting partner lead:', error);
        throw error;
    }

    return { success: true };
}

export async function deleteUserProfile(userId: string) {
    // 1. Delete associated data (if not handled by cascade)
    // Supabase cascade rules should handle most, but explicit deletion is safer

    // Delete profile (this usually triggers cascade for user_deals, redemptions etc if configured)
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

    if (error) {
        console.error('Error deleting user profile:', error);
        throw error;
    }

    // Auth user deletion requires Admin API (service role). 
    // Client-side can only delete public profile data.
}

export async function getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all users:', error);
        return [];
    }

    return data.map((data: any) => ({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        isAdmin: data.role === 'admin' || data.is_admin === true,
        tier: data.tier,
        createdAt: data.created_at,
        subscriptionStartDate: data.subscription_start_date,
        walletLimit: data.wallet_limit,
        extraRedemptions: data.extra_redemptions,
        notificationPreferences: data.notification_preferences,
        avatarUrl: data.avatar_url,
        mobile: data.mobile,
        address: data.address,
        billingAddress: data.billing_address,
        status: data.status,
        referredBy: data.referred_by,
        emailConfirmedAt: data.email_confirmed_at
    }));
}

export async function getUsersPaginated(page: number, limit: number, filters?: any): Promise<{ users: User[], total: number }> {
    let query = supabase
        .from('profiles')
        .select('*, deal_redemptions(*)', { count: 'exact' });

    if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    if (filters?.tier && filters.tier !== 'All') {
        query = query.eq('tier', filters.tier);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, count, error } = await query;

    if (error) {
        console.error('Error fetching paginated users:', error);
        return { users: [], total: 0 };
    }

    const users = data.map((d: any) => ({
        id: d.id,
        email: d.email,
        name: d.name,
        role: d.role,
        isAdmin: d.role === 'admin' || d.is_admin === true,
        tier: d.tier,
        createdAt: d.created_at,
        subscriptionStartDate: d.subscription_start_date,
        walletLimit: d.wallet_limit,
        extraRedemptions: d.extra_redemptions,
        notificationPreferences: d.notification_preferences,
        avatarUrl: d.avatar_url,
        mobile: d.mobile,
        address: d.address,
        billingAddress: d.billing_address,
        status: d.status,
        referredBy: d.referred_by,
        emailConfirmedAt: d.email_confirmed_at,
        redemptions: d.deal_redemptions ? d.deal_redemptions.map((r: any) => ({
            id: r.id,
            dealId: r.deal_id,
            userId: r.user_id,
            redeemedAt: r.redeemed_at
        })) : []
    }));

    return { users, total: count || 0 };
}

export async function confirmUserEmail(userId: string) {
    // Use the RPC function that has SECURITY DEFINER and can update auth.users
    const { error } = await supabase
        .rpc('admin_confirm_user_email', { target_user_id: userId });

    if (error) {
        console.error('Error confirming user email:', error);
        throw error;
    }
}

export async function updateAllUsersNotificationPreferences(prefs: Partial<UserNotificationPreferences>) {
    // Note: This operation should ideally be done via a database function to be atomic and efficient for all users.
    // Current implementation is a client-side loop which is not scalable for large user bases.
    // For now, we will try to update using a direct update query if RLS permits (Admin).
    // Assuming 'notification_preferences' is a JSONB column.

    // Since we can't easily merge JSONB for ALL rows without a specific postgres function or value,
    // we will rely on a potential RPC or just warn.
    // However, to satisfy the build and basic functionality, if we assume we just want to set a default for everyone:

    console.warn('updateAllUsersNotificationPreferences is not fully implemented for efficient bulk updates.');

    // Placeholder: throwing error or doing nothing might be better than doing it wrong.
    // But let's try to fetch all users and update them (slow but works for small user base of MVP).
    const users = await getAllUsers();
    for (const user of users) {
        const current = user.notificationPreferences || { newDeals: true, expiringDeals: true, generalNotifications: true };
        const newPrefs = { ...current, ...prefs };
        await updateUserProfile(user.id, { notificationPreferences: newPrefs });
    }
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

export async function createDeal(deal: Omit<Deal, 'id' | 'rating' | 'ratingCount'>) {
    const dbDeal = {
        title: deal.title,
        title_tr: deal.title_tr,
        description: deal.description,
        description_tr: deal.description_tr,
        image_url: deal.imageUrl,
        category: deal.category,
        category_tr: deal.category_tr,
        original_price: deal.originalPrice,
        discounted_price: deal.discountedPrice,
        discount_percentage: deal.discountPercentage,
        required_tier: deal.requiredTier,
        is_teasable: deal.isTeasable ?? true,
        is_external: deal.isExternal,
        vendor: deal.vendor,
        expires_at: deal.expiresAt,
        usage_limit: deal.usageLimit,
        usage_limit_tr: deal.usageLimit_tr,
        validity: deal.validity,
        validity_tr: deal.validity_tr,
        terms_url: deal.termsUrl,
        redemption_code: deal.redemptionCode,
        partner_id: deal.partnerId,
        company_logo_url: deal.companyLogoUrl,
        status: deal.status || 'pending',
        rating: 0,
        rating_count: 0,
        publish_at: deal.publishAt,
        redemption_style: deal.redemptionStyle,
        is_flash_deal: deal.is_flash_deal,
        flash_end_time: deal.flash_end_time,
        deal_type_key: deal.dealTypeKey,
        time_type: deal.timeType,
        max_redemptions_total: deal.maxRedemptionsTotal,
        max_user_redemptions: deal.maxRedemptionsUser,
        latitude: deal.latitude,
        longitude: deal.longitude,
        store_locations: deal.storeLocations
    };

    const { data, error } = await supabase
        .from('deals')
        .insert(dbDeal)
        .select()
        .single();

    if (error) {
        console.error('Error creating deal:', error);
        throw error;
    }

    const createdDeal = transformDealFromDB(data);

    // Index in vector database (async)
    upsertDealVector(createdDeal).catch(err => console.error('Failed to index new deal:', err));

    return createdDeal;
}

export async function updateDeal(dealId: string, updates: Partial<Deal>) {
    // Convert app format to DB format
    const dbUpdates: any = {};
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.title_tr) dbUpdates.title_tr = updates.title_tr;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.description_tr) dbUpdates.description_tr = updates.description_tr;
    if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;
    if (updates.category) dbUpdates.category = updates.category;
    if (updates.category_tr) dbUpdates.category_tr = updates.category_tr;
    if (updates.originalPrice !== undefined) dbUpdates.original_price = updates.originalPrice;
    if (updates.discountedPrice !== undefined) dbUpdates.discounted_price = updates.discountedPrice;
    if (updates.discountPercentage !== undefined) dbUpdates.discount_percentage = updates.discountPercentage;
    if (updates.requiredTier) dbUpdates.required_tier = updates.requiredTier;
    if (updates.isTeasable !== undefined) dbUpdates.is_teasable = updates.isTeasable;
    if (updates.isExternal !== undefined) dbUpdates.is_external = updates.isExternal;
    if (updates.vendor) dbUpdates.vendor = updates.vendor;
    if (updates.expiresAt) dbUpdates.expires_at = updates.expiresAt;
    if (updates.usageLimit) dbUpdates.usage_limit = updates.usageLimit;
    if (updates.usageLimit_tr) dbUpdates.usage_limit_tr = updates.usageLimit_tr;
    if (updates.validity) dbUpdates.validity = updates.validity;
    if (updates.validity_tr) dbUpdates.validity_tr = updates.validity_tr;
    if (updates.termsUrl) dbUpdates.terms_url = updates.termsUrl;
    if (updates.redemptionCode) dbUpdates.redemption_code = updates.redemptionCode;
    if (updates.companyLogoUrl) dbUpdates.company_logo_url = updates.companyLogoUrl;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.publishAt) dbUpdates.publish_at = updates.publishAt;
    if (updates.redemptionStyle) dbUpdates.redemption_style = updates.redemptionStyle;
    if (updates.is_flash_deal !== undefined) dbUpdates.is_flash_deal = updates.is_flash_deal;
    if (updates.flash_end_time) dbUpdates.flash_end_time = updates.flash_end_time;
    if (updates.dealTypeKey) dbUpdates.deal_type_key = updates.dealTypeKey;
    if (updates.timeType) dbUpdates.time_type = updates.timeType;
    if (updates.maxRedemptionsTotal !== undefined) dbUpdates.max_redemptions_total = updates.maxRedemptionsTotal;
    if (updates.maxRedemptionsUser !== undefined) dbUpdates.max_user_redemptions = updates.maxRedemptionsUser;
    if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
    if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
    if (updates.storeLocations !== undefined) dbUpdates.store_locations = updates.storeLocations;

    const { data, error } = await supabase
        .from('deals')
        .update(dbUpdates)
        .eq('id', dealId)
        .select()
        .single();

    if (error) {
        console.error('Error updating deal:', error);
        throw error;
    }

    const updatedDeal = transformDealFromDB(data);

    // Update index in vector database (async)
    upsertDealVector(updatedDeal).catch(err => console.error('Failed to update deal index:', err));

    return updatedDeal;
}

export async function getDealsByPartner(partnerId: string): Promise<Deal[]> {
    const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching partner deals:', error);
        return [];
    }

    return data.map(transformDealFromDB);
}

export async function getDealsByPartnerPaginated(partnerId: string, page: number, limit: number): Promise<{ deals: Deal[], total: number }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabase
        .from('deals')
        .select('*', { count: 'exact' })
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching paginated partner deals:', error);
        return { deals: [], total: 0 };
    }

    return {
        deals: (data || []).map(transformDealFromDB),
        total: count || 0
    };
}

export async function updateDealStatus(dealId: string, status: 'approved' | 'rejected') {
    const { error } = await supabase
        .from('deals')
        .update({ status })
        .eq('id', dealId);

    if (error) {
        console.error('Error updating deal status:', error);
        throw error;
    }
}

export async function getPendingDeals(): Promise<Deal[]> {
    const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching pending deals:', error);
        return [];
    }

    return data.map(transformDealFromDB);
}

export async function getAllDeals(includeExpired: boolean = false): Promise<Deal[]> {
    let query = supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });

    if (!includeExpired) {
        const now = new Date().toISOString();
        query = query.gt('expires_at', now);
        query = query.or(`publish_at.is.null,publish_at.lte.${now}`);
        // Only show approved deals
        query = query.eq('status', 'approved');
        // HIDE SOLD OUT DEALS
        query = query.eq('is_sold_out', false);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching all deals:', error);
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

export async function getDealsPaginated(page: number, limit: number, filters?: any): Promise<{ deals: Deal[], total: number }> {
    let query = supabase
        .from('deals')
        .select('*', { count: 'exact' });

    // Basic filtering logic
    if (filters?.category && filters.category !== 'All' && filters.category !== '') {
        query = query.eq('category', filters.category);
    }

    if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
    }

    // Default to active/approved unless specified
    if (!filters?.includeAllStatus) {
        const now = new Date().toISOString();
        query = query.eq('status', 'approved')
            .eq('is_sold_out', false) // Only hide sold out if NOT including all status
            .gt('expires_at', now);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, count, error } = await query;

    if (error) {
        console.error('Error fetching paginated deals:', error);
        return { deals: [], total: 0 };
    }

    return {
        deals: (data || []).map(transformDealFromDB),
        total: count || 0
    };
}

export async function getFlashDeals(): Promise<Deal[]> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('is_flash_deal', true)
        .gt('flash_end_time', now)
        .eq('status', 'approved')
        .eq('is_sold_out', false) // HIDE SOLD OUT DEALS
        .order('flash_end_time', { ascending: true });

    if (error) {
        console.error('Error fetching flash deals:', error);
        return [];
    }

    return data.map(transformDealFromDB);
}



// =====================================================
// REDEMPTION OPERATIONS
// =====================================================
// =====================================================
// REDEMPTION OPERATIONS
// =====================================================

export async function checkMonthlyLimit(userId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    // 1. Get User Profile to check Tier
    const user = await getUserProfile(userId);
    if (!user) throw new Error('User not found');

    // 2. Get Plan Limits
    const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('redemptions_per_period, billing_period')
        .eq('tier', user.tier)
        .single();

    if (planError || !plan) {
        console.error('Error fetching plan limit:', planError);
        throw new Error('Could not determine subscription limit');
    }

    // Determine limit (Slots)
    let maxSlots = plan.redemptions_per_period;

    // Check for Admin Override (wallet_limit)
    if (user.walletLimit !== undefined && user.walletLimit !== null) {
        maxSlots = user.walletLimit;
    }

    if (plan.billing_period === 'yearly' && (!user.walletLimit)) {
        // Only divide if NO override was present (assuming override is absolute)
        if (maxSlots > 12) {
            maxSlots = Math.floor(maxSlots / 12);
        }
    }

    // Add extra redemptions (Bonus Slots)
    const limit = maxSlots + (user.extraRedemptions || 0);

    // 3. Calculate Usage (Active Wallet Items)
    // CHANGED: We now count 'active' items, not 'created_this_month'.
    // This implements the "Slot" model: Delete a deal -> Get a slot back.

    const { count: activeCount, error: walletError } = await supabase
        .from('wallet_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active'); // Only count ACTIVE items

    if (walletError) {
        console.error('Error checking wallet usage:', walletError);
        throw new Error('Failed to check usage');
    }

    const usage = activeCount || 0;
    const remaining = Math.max(0, limit - usage);

    return {
        allowed: usage < limit,
        remaining,
        limit
    };
}

export const redeemDeal = async (userId: string, dealId: string) => {
    const cleanUserId = userId.trim();
    const cleanDealId = dealId.trim();

    // 0. CHECK IF ALREADY REDEEMED (LIFETIME CHECK FOR STRICT LIMITS)
    // First, get deal rules
    const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select('max_redemptions_total, redemptions_count, usage_limit, max_user_redemptions, required_tier')
        .eq('id', dealId)
        .single();

    if (dealError) throw dealError;

    // Check Global Limit first
    if (dealData.max_redemptions_total !== null && (dealData.redemptions_count || 0) >= dealData.max_redemptions_total) {
        throw new Error('This deal has reached its global usage limit and is sold out.');
    }

    // Check if user has ALREADY redeemed this deal (Lifetime)
    const { count: lifetimeCount } = await supabase
        .from('deal_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', cleanUserId)
        .eq('deal_id', cleanDealId);

    const hasRedeemedBefore = (lifetimeCount || 0) > 0;

    // Strictly enforce "1 per user" if usage_limit is '1' OR max_user_redemptions is 1
    if (hasRedeemedBefore && (dealData.usage_limit === '1' || dealData.max_user_redemptions === 1)) {
        throw new Error('You have already redeemed this deal. This offer is limited to one per user.');
    }

    // Check Monthly Limit if max_user_redemptions > 1
    if (dealData.max_user_redemptions !== null && dealData.max_user_redemptions > 1) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { count: monthlyCount } = await supabase
            .from('deal_redemptions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', cleanUserId)
            .eq('deal_id', cleanDealId)
            .gte('redeemed_at', startOfMonth);

        if ((monthlyCount || 0) >= dealData.max_user_redemptions) {
            throw new Error(`You have reached the monthly redemption limit for this deal (${dealData.max_user_redemptions} per month).`);
        }
    }

    // 1. Attempt Atomic Redemption for OWNED deals first
    const { data: updatedItems, error: updateError } = await supabase
        .from('wallet_items')
        .update({ status: 'redeemed', redeemed_at: new Date().toISOString() })
        .eq('user_id', cleanUserId)
        .eq('deal_id', cleanDealId)
        .eq('status', 'active')
        .select();

    if (updateError) throw updateError;

    if (updatedItems && updatedItems.length > 0) {
        // Record the redemption in history
        const { data: redemptionRecord } = await supabase
            .from('deal_redemptions')
            .insert({
                user_id: userId,
                deal_id: dealId,
                redeemed_at: new Date().toISOString()
            })
            .select()
            .single();

        // Award Points (100 pts)
        try {
            await addUserPoints(userId, 100);
        } catch (e) {
            console.warn('Failed to award loyalty points:', e);
        }

        return {
            id: redemptionRecord?.id || 'unknown',
            userId: userId,
            dealId: dealId,
            redeemedAt: updatedItems[0].redeemed_at
        };
    }

    // 2. Immediate Redemption Flow (Not in wallet or already redeemed/expired in wallet)
    const { data: existingItem } = await supabase
        .from('wallet_items')
        .select('status')
        .eq('user_id', cleanUserId)
        .eq('deal_id', cleanDealId)
        .maybeSingle();

    if (existingItem) {
        if (existingItem.status === 'redeemed') throw new Error('This deal has already been redeemed.');
        if (existingItem.status === 'expired') throw new Error('This deal has expired.');
    }

    // Tier validation for NEW redemptions
    const { data: userProfile } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', cleanUserId)
        .single();

    const userTier = userProfile?.tier || 'FREE';
    const requiredTier = dealData.required_tier || 'FREE';

    const TIER_STRENGTH: Record<string, number> = {
        'NONE': 0, 'FREE': 1, 'BASIC': 2, 'PREMIUM': 3, 'VIP': 4
    };

    if (TIER_STRENGTH[userTier] < TIER_STRENGTH[requiredTier]) {
        throw new Error(`This deal requires ${requiredTier} membership. Please upgrade to redeem.`);
    }

    // Check User Limit (Slots/Month) - only for new redemptions
    const { allowed } = await checkMonthlyLimit(userId);
    if (!allowed) {
        throw new Error('Wallet limit reached. Cannot redeem new deal.');
    }

    // Record the redemption
    const { data: redemptionRecord, error: insertError } = await supabase
        .from('deal_redemptions')
        .insert({
            user_id: userId,
            deal_id: dealId,
            redeemed_at: new Date().toISOString()
        })
        .select()
        .single();

    if (insertError) {
        console.error('Error in immediate redemption insert:', insertError);
        throw insertError;
    }

    // Increment global count using RPC
    try {
        await supabase.rpc('increment_redemptions_count', { deal_id: dealId });
    } catch (e) {
        console.warn('Failed to increment global redemption count:', e);
    }

    // Award Points (100 pts)
    try {
        await addUserPoints(userId, 100);
    } catch (e) {
        console.warn('Failed to award loyalty points:', e);
    }

    return {
        id: redemptionRecord.id,
        userId: userId,
        dealId: dealId,
        redeemedAt: redemptionRecord.redeemed_at
    };
};

export async function redeemImmediate(userId: string, dealId: string) {
    return redeemDeal(userId, dealId);
}


// =====================================================
// REFERRAL OPERATIONS
// =====================================================

export async function handleReferralCode(referrerCode: string, userId: string) {
    const { data, error } = await supabase.rpc('handle_referral', {
        referrer_code: referrerCode,
        referee_id: userId
    });

    if (error) {
        console.error('Error handling referral code:', error);
        throw error;
    }

    return data;
}

export async function addUserPoints(userId: string, pointsToAdd: number) {
    const { data, error } = await supabase.rpc('add_user_points', {
        user_uuid: userId,
        points_to_add: pointsToAdd
    });

    if (error) {
        console.error('Error adding points:', error);
        throw error;
    }

    return data;
}

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

    return data.map((row: { referred_user_id: string }) => row.referred_user_id);
}

export async function getReferralChain(userId: string): Promise<string[]> {
    const { data, error } = await supabase
        .rpc('get_referral_chain', { user_uuid: userId });

    if (error) {
        console.error('Error fetching referral chain:', error);
        return [];
    }

    return data.map((row: { referrer_user_id: string }) => row.referrer_user_id);
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

    return data.map((r: { referred_id: string }) => r.referred_id);
}

// =====================================================
// USER DEAL OPERATIONS
// =====================================================

export async function saveDeal(userId: string, dealId: string) {
    // FIX: Favorites should NOT consume quota or global limits.
    // It is just a bookmark.
    // Logic moved to addDealToWallet()

    // 1. Check if already saved
    const { data: existing } = await supabase
        .from('user_deals')
        .select('deal_id')
        .eq('user_id', userId)
        .eq('deal_id', dealId)
        .maybeSingle();

    if (existing) return; // Already saved

    // 2. Insert into user_deals (Favorites) - NO LIMITS CHECK
    const { error } = await supabase
        .from('user_deals')
        .insert({ user_id: userId, deal_id: dealId });

    if (error) {
        console.error('Error saving deal:', error);
        throw error;
    }
}

export async function assignDealToUser(userId: string, dealId: string) {
    return saveDeal(userId, dealId);
}


export async function bulkUpdateUserStatus(userIds: string[], status: 'active' | 'banned' | 'suspended') {
    const { data, error } = await supabase
        .from('profiles')
        .update({ status })
        .in('id', userIds)
        .select();

    if (error) {
        console.error('Error in bulk update user status:', error);
        throw error;
    }
    return data;
}

export async function unsaveDeal(userId: string, dealId: string) {
    const { error } = await supabase
        .from('user_deals')
        .delete()
        .eq('user_id', userId)
        .eq('deal_id', dealId);

    if (error) throw error;
}

export async function removeDealFromUser(userId: string, dealId: string) {
    return unsaveDeal(userId, dealId);
}

export async function removeWalletItemFromUser(userId: string, dealId: string) {
    // 1. Find the wallet item first (to get ID for logs)
    const { data: item } = await supabase
        .from('wallet_items')
        .select('id')
        .eq('user_id', userId)
        .eq('deal_id', dealId)
        .maybeSingle();

    if (!item) return;

    // 2. Delete logs first (soft fail)
    await supabase.from('redemption_logs').delete().eq('wallet_item_id', item.id);

    // 3. Delete the item
    const { error } = await supabase
        .from('wallet_items')
        .delete()
        .eq('id', item.id);

    if (error) throw error;
}

export async function checkDealSavedStatus(userId: string, dealId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('user_deals')
        .select('id')
        .eq('user_id', userId)
        .eq('deal_id', dealId)
        .eq('deal_id', dealId)
        .maybeSingle();

    return !!data && !error;
}

export async function getSavedDeals(userId: string): Promise<Deal[]> {
    const { data, error } = await supabase
        .from('user_deals')
        .select('deal_id, deals(*)')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching saved deals:', error);
        return [];
    }

    return data.map((item: any) => transformDealFromDB(item.deals));
}

export async function claimDeal(userId: string, dealId: string): Promise<{ walletItemId: string; redemptionCode: string }> {
    // Use the new secure wallet system
    // This handles monthly limits, global limits, and generates unique codes
    return addDealToWallet(userId, dealId);
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

export async function getUserTransactions(userId: string): Promise<PaymentTransaction[]> {
    const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user transactions:', error);
        return [];
    }

    return data.map((t: any) => ({
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

// =====================================================
// ANALYTICS OPERATIONS
// =====================================================

export async function getAnalyticsData() {
    try {
        // 1. Fetch Stats via RPCs (Fast & Scalable)
        const { data: stats, error: statsError } = await supabase.rpc('get_admin_stats');
        if (statsError) throw statsError;

        const { data: revenueByMonth, error: revError } = await supabase.rpc('get_revenue_by_month');
        if (revError) throw revError;

        const { data: cityDistribution, error: cityError } = await supabase.rpc('get_city_distribution');
        if (cityError) throw cityError;

        const { data: retentionStats, error: retError } = await supabase.rpc('get_retention_stats');
        if (retError) throw retError;

        const { data: mauTrend, error: mauError } = await supabase.rpc('get_mau_trend');
        if (mauError) throw mauError;

        // 2. We still need some details for secondary charts (Top Deals, Categories)
        // These are harder to RPC purely without complex returns, so we keep them slightly hybrid for now.
        const { data: deals, error: dealsError } = await supabase
            .from('deals')
            .select('id, title, category, vendor');
        if (dealsError) throw dealsError;

        const { data: redemptions, error: redemptionsError } = await supabase
            .from('deal_redemptions')
            .select('deal_id');
        if (redemptionsError) throw redemptionsError;

        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('tier, created_at');
        if (usersError) throw usersError;

        // --- Aggregation for complex metrics ---

        // Category distribution
        const categoryCounts: Record<string, number> = {};
        deals.forEach((d: any) => {
            const cat = d.category || 'Other';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
        const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

        // Top Deals
        const redemptionCounts: Record<string, number> = {};
        redemptions.forEach((r: any) => {
            redemptionCounts[r.deal_id] = (redemptionCounts[r.deal_id] || 0) + 1;
        });
        const topDeals = Object.entries(redemptionCounts)
            .map(([dealId, count]) => {
                const deal = deals.find((d: any) => d.id === dealId);
                return { name: deal ? deal.title : 'Unknown Deal', redemptions: count };
            })
            .sort((a, b) => b.redemptions - a.redemptions)
            .slice(0, 5);

        // Tier Distribution
        const tierCounts: Record<string, number> = {};
        users.forEach((u: any) => {
            const tier = u.tier || 'FREE';
            tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        });
        const tierData = Object.entries(tierCounts).map(([name, value]) => ({ name, value }));

        // Scaling Metrics
        const scalingGoal = 100000;
        const totalUsers = stats.totalUsers || 0;
        const scalingProgress = (totalUsers / scalingGoal) * 100;

        // Growth Velocity (approx from recent users)
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const usersLastWeek = users.filter((u: any) => new Date(u.created_at) <= sevenDaysAgo).length;
        const growthVelocity = (totalUsers - usersLastWeek) / 7;

        return {
            metrics: {
                ...stats,
                growthVelocity,
                conversionRate: totalUsers > 0 ? (stats.totalRedemptions / totalUsers) * 100 : 0,
                scalingProgress,
                retention: retentionStats
            },
            charts: {
                revenueData: revenueByMonth.map((r: any) => ({ name: r.month_name, revenue: r.revenue })),
                userGrowthData: [], // We can keep user growth calculation or move to RPC too
                categoryData,
                topDeals,
                tierData,
                cityData: cityDistribution.map((c: any) => ({ name: c.city_name, value: c.user_count })),
                mauData: mauTrend ? mauTrend.map((m: any) => ({ name: m.month, users: m.active_users })) : [],
                merchantData: [] // Simplified for now
            }
        };

    } catch (error) {
        console.error('[supabaseService] Error fetching analytics data:', error);
        return null;
    }
}

export interface VendorAnalytics {
    name: string;
    dealCount: number;
    totalRedemptions: number;
    estimatedRevenue: number;
}

export async function getVendorAnalytics(): Promise<VendorAnalytics[]> {
    try {
        // 1. Fetch all deals (needed to link vendor to deal ID)
        const { data: deals, error: dealsError } = await supabase
            .from('deals')
            .select('id, vendor, discounted_price, status');

        if (dealsError) throw dealsError;

        // 2. Fetch all redemptions
        const { data: redemptions, error: redemptionsError } = await supabase
            .from('deal_redemptions')
            .select('deal_id');

        if (redemptionsError) throw redemptionsError;

        // 3. Aggregate Data
        const vendorStats: Record<string, VendorAnalytics> = {};

        // Helper to normalize vendor name
        const normalize = (name: string) => (name || 'Unknown').trim();

        deals.forEach((deal: any) => {
            const vendorName = normalize(deal.vendor);

            if (!vendorStats[vendorName]) {
                vendorStats[vendorName] = {
                    name: vendorName,
                    dealCount: 0,
                    totalRedemptions: 0,
                    estimatedRevenue: 0
                };
            }

            // Increment deal count if active/approved (optional, or just total created?)
            // Let's count all non-rejected deals or just check status
            if (deal.status !== 'rejected') {
                vendorStats[vendorName].dealCount += 1;
            }

            // Calculate redemptions for this deal
            const dealRedemptions = redemptions.filter((r: any) => r.deal_id === deal.id).length;
            vendorStats[vendorName].totalRedemptions += dealRedemptions;

            // Estimate revenue: redemptions * price
            // (Assuming price was constant, which is an estimation)
            const revenue = dealRedemptions * (deal.discounted_price || 0);
            vendorStats[vendorName].estimatedRevenue += revenue;
        });

        // Convert to array and sort by revenue
        return Object.values(vendorStats).sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);

    } catch (error) {
        console.error('Error fetching vendor analytics:', error);
        return [];
    }
}

// =====================================================
// COMMUNICATIONS (Announcements & Notifications)
// =====================================================

export async function getActiveAnnouncements() {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching announcements:', error);
        return [];
    }

    return data.map((a: any) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        type: a.type,
        isActive: a.is_active,
        createdAt: a.created_at,
        endAt: a.end_at
    }));
}

export async function createAnnouncement(announcement: { title: string; message: string; type: string; endAt?: string }) {
    const { data, error } = await supabase
        .from('announcements')
        .insert([{
            title: announcement.title,
            message: announcement.message,
            type: announcement.type,
            end_at: announcement.endAt
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getUserNotifications(userId: string) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }

    return data.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.is_read,
        createdAt: n.created_at,
        link: n.link
    }));
}

export async function markNotificationAsRead(notificationId: string) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) console.error('Error marking notification read:', error);
}

export async function createNotification(notification: { userId: string; title: string; message: string; type: string; link?: string }) {
    const { error } = await supabase
        .from('notifications')
        .insert([{
            user_id: notification.userId,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            link: notification.link
        }]);

    if (error) throw error;
}
// =====================================================
// BACKGROUND IMAGE OPERATIONS
// =====================================================

export interface BackgroundImage {
    id: string;
    url: string;
    time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
    is_active: boolean;
}

export async function getBackgroundImages(timeOfDay?: string): Promise<BackgroundImage[]> {
    let query = supabase
        .from('background_images')
        .select('*')
        .eq('is_active', true);

    if (timeOfDay) {
        query = query.eq('time_of_day', timeOfDay);
    }

    const { data, error } = await query;

    if (error) {
        // Fallback or silent error if table doesn't exist yet
        console.warn('Error fetching background images (table may not exist yet):', error);
        return [];
    }

    return data as BackgroundImage[];
}


export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

    return `${data.publicUrl}?t=${new Date().getTime()}`;
}

export async function uploadBackgroundImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('backgrounds')
        .upload(filePath, file);

    if (uploadError) {
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(filePath);

    return data.publicUrl;
}

export async function addBackgroundImage(url: string, timeOfDay: string) {
    const { data, error } = await supabase
        .from('background_images')
        .insert({
            url,
            time_of_day: timeOfDay,
            is_active: true
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding background image:', error);
        throw error;
    }

    return data;
}


export const updateBackgroundImage = async (id: string, timeOfDay: string) => {
    const { error } = await supabase
        .from('background_images')
        .update({ time_of_day: timeOfDay })
        .eq('id', id);

    if (error) {
        console.error('Error updating background image:', error);
        throw error;
    }
};

export async function deleteBackgroundImage(id: string, url: string) {
    // Delete from DB first
    const { error } = await supabase
        .from('background_images')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting background image record:', error);
        throw error;
    }

    // Try to delete from storage if it's a supabase storage URL
    if (url.includes('storage/v1/object/public/backgrounds/')) {
        const path = url.split('backgrounds/')[1];
        if (path) {
            const { error: storageError } = await supabase.storage
                .from('backgrounds')
                .remove([path]);

            if (storageError) {
                console.warn('Error deleting file from storage (orphan file may remain):', storageError);
            }
        }
    }
}



export interface ActivityLogItem {
    id: string;
    type: 'joined' | 'deal_claimed' | 'deal_redeemed' | 'subscription_payment' | 'deal_unsaved' | 'deal_saved';
    description: string;
    timestamp: string;
    metadata?: any;
}

export async function getUserActivityLog(userId: string): Promise<ActivityLogItem[]> {
    const activities: ActivityLogItem[] = [];

    // 1. Get Profile Creation (Joined)
    const { data: profile } = await supabase
        .from('profiles')
        .select('created_at, name')
        .eq('id', userId)
        .single();

    if (profile) {
        activities.push({
            id: 'join-' + userId,
            type: 'joined',
            description: `User joined the platform`,
            timestamp: profile.created_at
        });
    }

    // 2. Get Deal Claims (Added to Wallet)
    const { data: claims } = await supabase
        .from('user_deals')
        .select(`
            id,
            acquired_at,
            deal:deals(title, title_tr)
        `)
        .eq('user_id', userId);

    if (claims) {
        claims.forEach((claim: any) => {
            const title = claim.deal?.title || 'Unknown Deal';
            activities.push({
                id: claim.id,
                type: 'deal_saved',
                description: `Saved to favorites: ${title}`,
                timestamp: claim.acquired_at
            });
        });
    }

    // 3. Get Redemptions
    const { data: redemptions } = await supabase
        .from('deal_redemptions')
        .select(`
            id,
            redeemed_at,
            deal:deals(title, title_tr)
        `)
        .eq('user_id', userId);

    if (redemptions) {
        redemptions.forEach((r: any) => {
            const title = r.deal?.title || 'Unknown Deal';
            activities.push({
                id: r.id,
                type: 'deal_redeemed',
                description: `Redeemed deal: ${title}`,
                timestamp: r.redeemed_at
            });
        });
    }

    // 4. Get Payments
    const { data: payments } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId);

    if (payments) {
        payments.forEach((p: any) => {
            activities.push({
                id: p.id,
                type: 'subscription_payment',
                description: `Payment of ${p.amount} ${p.currency} (${p.status})`,
                timestamp: p.created_at || new Date().toISOString(), // Fallback if created_at missing in type
                metadata: { status: p.status }
            });
        });
    }

    // Sort by timestamp DESC
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getGlobalActivityLog(limit: number = 20): Promise<ActivityLogItem[]> {
    const activities: ActivityLogItem[] = [];

    // 1. Get New Registrations
    const { data: newUsers } = await supabase
        .from('profiles')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (newUsers) {
        newUsers.forEach(u => {
            activities.push({
                id: 'join-' + u.id,
                type: 'joined',
                description: `${u.name || 'A new user'} joined the platform`,
                timestamp: u.created_at,
                metadata: { userId: u.id, userName: u.name }
            });
        });
    }

    // 2. Get Deal Redemptions
    const { data: redemptions } = await supabase
        .from('deal_redemptions')
        .select('id, redeemed_at, user_id, profiles:user_id(name), deal:deals(title)')
        .order('redeemed_at', { ascending: false })
        .limit(limit);

    if (redemptions) {
        redemptions.forEach((r: any) => {
            const userName = r.profiles?.name || 'A user';
            const dealTitle = r.deal?.title || 'a deal';
            activities.push({
                id: 'redeem-' + r.id,
                type: 'deal_redeemed',
                description: `${userName} redeemed: ${dealTitle}`,
                timestamp: r.redeemed_at,
                metadata: { userId: r.user_id, userName, dealTitle }
            });
        });
    }

    // 3. Get Recent Payments
    const { data: payments } = await supabase
        .from('payment_transactions')
        .select('id, amount, currency, status, created_at, user_id, profiles:user_id(name)')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (payments) {
        payments.forEach((p: any) => {
            const userName = p.profiles?.name || 'A user';
            activities.push({
                id: 'pay-' + p.id,
                type: 'subscription_payment',
                description: `${userName} paid ${p.amount} ${p.currency}`,
                timestamp: p.created_at,
                metadata: { userId: p.user_id, userName, amount: p.amount }
            });
        });
    }

    // Sort combined by timestamp DESC and slice to the requested limit
    return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
}

// =====================================================
// PROMO CODE OPERATIONS
// =====================================================

export interface PromoCode {
    code: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    maxUses?: number;
    currentUses: number;
    expiresAt?: string;
    isActive: boolean;
    createdAt: string;
}

export async function getPromoCodes(): Promise<PromoCode[]> {
    const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching promo codes:', error);
        return [];
    }

    return data.map((pc: any) => ({
        code: pc.code,
        discountType: pc.discount_type,
        discountValue: pc.discount_value,
        maxUses: pc.max_uses,
        currentUses: pc.current_uses,
        expiresAt: pc.expires_at,
        isActive: pc.is_active,
        createdAt: pc.created_at
    }));
}

export async function createPromoCode(promoCode: Omit<PromoCode, 'currentUses' | 'createdAt'>) {
    const dbPromo = {
        code: promoCode.code,
        discount_type: promoCode.discountType,
        discount_value: promoCode.discountValue,
        max_uses: promoCode.maxUses,
        expires_at: promoCode.expiresAt,
        is_active: promoCode.isActive
    };

    const { data, error } = await supabase
        .from('promo_codes')
        .insert(dbPromo)
        .select()
        .single();

    if (error) {
        console.error('Error creating promo code:', error);
        throw error;
    }

    return data;
}

export async function togglePromoCodeStatus(code: string, isActive: boolean) {
    const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: isActive })
        .eq('code', code);

    if (error) {
        console.error('Error updating promo code status:', error);
        throw error;
    }
}

export async function deletePromoCode(code: string) {
    const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('code', code);

    if (error) {
        console.error('Error deleting promo code:', error);
        throw error;
    }
}

export async function verifyPromoCode(code: string): Promise<{ valid: boolean; message: string; code?: string; discountType?: 'percentage' | 'fixed_amount'; discountValue?: number }> {
    const { data, error } = await supabase.rpc('verify_promo_code', { code_input: code });

    if (error) {
        console.error('Error verifying promo code:', error);
        return { valid: false, message: 'Verification failed' };
    }

    return {
        valid: data.valid,
        message: data.message,
        code: data.code,
        discountType: data.discount_type,
        discountValue: data.discount_value
    };
}

export async function applyPromoCode(code: string, txnId?: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('apply_promo_code', { code_input: code, txn_id: txnId });

    if (error) {
        console.error('Error applying promo code:', error);
        return false;
    }

    return data;
}

// =====================================================
// CATEGORY OPERATIONS
// =====================================================

export async function getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching categories:', error);
        return [];
    }

    return data;
}

export async function createCategory(category: Omit<Category, 'id'>) {
    const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateCategory(id: string, updates: Partial<Category>) {
    const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteCategory(id: string) {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

// =====================================================
// VECTOR / AI OPERATIONS
// =====================================================

/**
 * Fetch deals similar to a given deal using vector similarity search
 */
export async function getSimilarDeals(dealId: string, limit: number = 3): Promise<Deal[]> {
    try {
        const { data, error } = await supabase.functions.invoke('vector-sync', {
            body: {
                action: 'query',
                query: { dealId, topK: limit }
            }
        });

        if (error || !data?.success) {
            console.error('Vector query error:', error || data?.error);
            return [];
        }

        // The vector-sync function returns Pinecone matches. 
        // We need to fetch the actual deal data from Supabase for these IDs.
        const matches = data.results || [];
        const dealIds = matches.map((m: any) => m.id);

        if (dealIds.length === 0) return [];

        const { data: deals, error: dealsError } = await supabase
            .from('deals')
            .select('*')
            .in('id', dealIds);

        if (dealsError) {
            console.error('Error fetching deals for matches:', dealsError);
            return [];
        }

        // Return transformed deals, keeping the order from Pinecone (relevance)
        return dealIds.map((id: string) => {
            const deal = deals.find((d: any) => d.id === id);
            return deal ? transformDealFromDB(deal) : null;
        }).filter(Boolean) as Deal[];

    } catch (err) {
        console.error('getSimilarDeals failed:', err);
        return [];
    }
}

/**
 * Perform semantic search on deals using vector embeddings
 */
export async function searchDealsSemantic(text: string, limit: number = 20): Promise<Deal[]> {
    try {
        // If query is 'trending' or empty, return most recent active deals
        if (!text || text.toLowerCase() === 'trending') {
            const { data, error } = await supabase
                .from('deals')
                .select('*')
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data.map(transformDealFromDB);
        }

        const { data, error } = await supabase.functions.invoke('vector-sync', {
            body: {
                action: 'query',
                query: { text, topK: limit }
            }
        });

        if (error || !data?.success) {
            console.error('Semantic search error:', error || data?.error);
            return [];
        }

        const matches = data.results || [];
        const dealIds = matches.map((m: any) => m.id);

        if (dealIds.length === 0) return [];

        const { data: deals, error: dealsError } = await supabase
            .from('deals')
            .select('*')
            .in('id', dealIds);

        if (dealsError) {
            console.error('Error fetching deals for matches:', dealsError);
            return [];
        }

        // Return transformed deals, keeping the order from Pinecone (relevance score)
        return dealIds.map((id: string) => {
            const deal = deals.find((d: any) => d.id === id);
            return deal ? transformDealFromDB(deal) : null;
        }).filter(Boolean) as Deal[];

    } catch (err) {
        console.error('searchDealsSemantic failed:', err);
        return [];
    }
}

// =====================================================
// SECURE WALLET OPERATIONS (Fraud-Resistant)
// =====================================================

/**
 * Generate a unique, short redemption code (e.g., "XA7B2K")
 */
export function generateRedemptionCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0, O, 1, I)
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Add a deal to user's wallet with a unique redemption code
 */
export async function addDealToWallet(userId: string, dealId: string, bypassChecks: boolean = false): Promise<{ walletItemId: string; redemptionCode: string }> {
    // Check if already in wallet
    const { data: existing } = await supabase
        .from('wallet_items')
        .select('id, redemption_code')
        .eq('user_id', userId)
        .eq('deal_id', dealId)
        .maybeSingle();

    if (existing) {
        return { walletItemId: existing.id, redemptionCode: existing.redemption_code };
    }

    // Check user's monthly limit
    if (!bypassChecks) {
        const limitCheck = await checkMonthlyLimit(userId);
        if (!limitCheck.allowed) {
            throw new Error('Monthly redemption limit reached. Please upgrade your plan.');
        }
    }

    // Check global deal limit and tier requirement
    const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('max_redemptions_total, redemptions_count, is_sold_out, required_tier')
        .eq('id', dealId)
        .single();

    if (dealError || !deal) throw new Error('Deal not found');
    if (deal.is_sold_out || (deal.max_redemptions_total && (deal.redemptions_count || 0) >= deal.max_redemptions_total)) {
        throw new Error('This deal is sold out.');
    }

    // Tier validation
    const { data: userProfile } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', userId)
        .single();

    const userTier = userProfile?.tier || 'FREE';
    const requiredTier = deal.required_tier || 'FREE';

    // Import hierachy logic locally to avoid circular deps if any, 
    // but better to just use the value mapping here since it's a critical service
    const TIER_STRENGTH: Record<string, number> = {
        'NONE': 0, 'FREE': 1, 'BASIC': 2, 'PREMIUM': 3, 'VIP': 4
    };

    if (!bypassChecks && TIER_STRENGTH[userTier] < TIER_STRENGTH[requiredTier]) {
        throw new Error(`This deal requires ${requiredTier} membership. Please upgrade to unlock.`);
    }

    // Generate unique code and insert
    const redemptionCode = generateRedemptionCode();
    const { data, error } = await supabase
        .from('wallet_items')
        .insert({
            user_id: userId,
            deal_id: dealId,
            redemption_code: redemptionCode,
            status: 'active'
        })
        .select('id, redemption_code')
        .single();

    if (error) {
        if (error.code === '23505') {
            // Unique constraint - retry with different code
            return addDealToWallet(userId, dealId);
        }
        throw error;
    }

    // INCREMENT GLOBAL REDEMPTION COUNT (Claiming a spot)
    try {
        const { error: updateError } = await supabase.rpc('increment_redemptions_count', { row_id: dealId });
        if (updateError) throw updateError;
    } catch (rpcError) {
        console.warn('RPC increment_redemptions_count failed in addDealToWallet, falling back to direct update:', rpcError);
        // Fallback logic
        const { data: currentDeal } = await supabase.from('deals').select('redemptions_count').eq('id', dealId).single();
        const nextCount = (currentDeal?.redemptions_count || 0) + 1;
        await supabase.from('deals').update({ redemptions_count: nextCount }).eq('id', dealId);
    }

    return { walletItemId: data.id, redemptionCode: data.redemption_code };
}

/**
 * Get all wallet items for a user
 */
export async function getWalletItems(userId: string): Promise<any[]> {
    const { data, error } = await supabase
        .from('wallet_items')
        .select(`
            id,
            redemption_code,
            status,
            created_at,
            redeemed_at,
            deal_id,
            deals (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching wallet items:', error);
        return [];
    }

    return data.map((item: any) => ({
        ...item,
        deal: item.deals ? transformDealFromDB(item.deals) : null
    }));
}

/**
 * Redeem a wallet item (called by vendor)
 * Returns { success, requiresConfirmation, confirmationToken } for high-value deals
 */
/**
 * Redeem a wallet item (called by vendor)
 * Use secure RPC to bypass RLS
 */
export async function redeemWalletItem(
    walletItemId: string,
    redemptionCode: string,
    vendorId?: string
): Promise<{ success: boolean; message: string; requiresConfirmation?: boolean; confirmationToken?: string; dealInfo?: any }> {
    try {
        const { data, error } = await supabase.rpc('validate_redemption', {
            p_wallet_item_id: walletItemId,
            p_redemption_code: redemptionCode,
            p_vendor_id: vendorId
        });

        if (error) {
            console.error('Redemption RPC error:', error);
            // Fallback for legacy/dev environment handling if RPC doesn't exist yet
            if (error.code === 'PGRST202') { // Function not found
                return { success: false, message: 'Redemption system updating. Please contact admin.' };
            }
            return { success: false, message: error.message };
        }

        return data as any;
    } catch (err: any) {
        console.error('Redemption Exception:', err);
        return { success: false, message: err.message };
    }
}

/**
 * Confirm a high-value redemption (called by user from app)
 */
export async function confirmRedemption(walletItemId: string, confirmationToken: string): Promise<{ success: boolean; message: string }> {
    const { data: walletItem, error } = await supabase
        .from('wallet_items')
        .select('id, confirmation_token, confirmation_expires_at, status, user_id, deal_id')
        .eq('id', walletItemId)
        .single();

    if (error || !walletItem) {
        return { success: false, message: 'Wallet item not found' };
    }

    if (walletItem.confirmation_token !== confirmationToken) {
        return { success: false, message: 'Invalid confirmation token' };
    }

    if (new Date(walletItem.confirmation_expires_at) < new Date()) {
        return { success: false, message: 'Confirmation expired. Please try again.' };
    }

    // Complete redemption
    const { error: updateError } = await supabase
        .from('wallet_items')
        .update({
            status: 'redeemed',
            redeemed_at: new Date().toISOString(),
            confirmation_token: null,
            confirmation_expires_at: null
        })
        .eq('id', walletItemId);

    if (updateError) {
        return { success: false, message: 'Failed to confirm redemption' };
    }

    // Log redemption
    await supabase.from('redemption_logs').insert({
        wallet_item_id: walletItemId,
        user_id: walletItem.user_id,
        deal_id: walletItem.deal_id
    });

    // Increment global redemption count
    await supabase.rpc('increment_deal_redemption', { deal_id_input: walletItem.deal_id });

    return { success: true, message: 'Redemption confirmed!' };
}

/**
 * Update user's FCM token for push notifications
 */
export async function updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({ fcm_token: fcmToken })
        .eq('id', userId);

    if (error) {
        console.error('Error updating FCM token:', error);
    }
}

/**
 * Send a test notification to a specific user (Admin Debugging)
 */
export async function sendTestNotification(userId: string): Promise<{ success: boolean; message: string }> {
    try {
        const { data, error } = await supabase.functions.invoke('send-push-notification', {
            body: {
                userId,
                title: 'Test Notification',
                body: 'This is a test notification from the Admin Panel.',
                data: {
                    type: 'test_notification'
                }
            }
        });

        if (error) {
            console.error('Test notification function error:', error);
            // Try to extract a useful message if it's a known structure
            const msg = error.message || JSON.stringify(error);
            return { success: false, message: `Function Error: ${msg}` };
        }

        // Even if no "error" property on the invocation object, check the data itself if the function returns an error structure
        if (data && data.error) {
            return { success: false, message: `Push Error: ${data.error}` };
        }

        return { success: true, message: 'Test notification sent! Check device.' };
    } catch (error: any) {
        console.error('Test notification failed:', error);
        return { success: false, message: error.message || 'Unknown error occurred' };
    }
}

// =====================================================
// ENGAGEMENT TRACKING (PHASE 1)
// =====================================================

export async function logEngagementEvent(userId: string | undefined, eventType: 'view' | 'click' | 'search' | 'favorite', itemId?: string, metadata: any = {}) {
    // If no user is logged in, we might still want to track anonymous events later, 
    // but for Phase 1, we focus on authenticated users to build profiles.
    if (!userId) return;

    try {
        const { error } = await supabase
            .from('engagement_logs')
            .insert({
                user_id: userId,
                event_type: eventType,
                item_id: itemId,
                metadata: metadata
            });

        if (error) {
            console.error('Error logging engagement event:', error);
        }
    } catch (err) {
        console.error('Failed to log engagement event:', err);
    }
}

export async function getEngagementLogs(userId: string, limit: number = 20) {
    // We fetch logs first, and we'll handle the deal data separately to avoid join errors if FK is missing
    const { data, error } = await supabase
        .from('engagement_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching engagement logs:', error.message);
        return [];
    }
    return data || [];
}
export async function getRetentionStats() {
    const { data, error } = await supabase.rpc('get_retention_stats');
    if (error) {
        console.error('Error fetching retention stats:', error);
        return null;
    }
    return data;
}

export async function getMAUTrend() {
    const { data, error } = await supabase.rpc('get_mau_trend');
    if (error) {
        console.error('Error fetching MAU trend:', error);
        return [];
    }
    return data;
}
