import { supabase } from './supabaseClient';
import { User, Deal, SubscriptionTier, PaymentTransaction, UserNotificationPreferences } from '../types';
import { PostgrestError } from '@supabase/supabase-js';

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

    const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId);

    if (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
}

export async function resetUserHistory(userId: string) {
    console.log('Starting history reset for:', userId);

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
        isSoldOut: dbDeal.is_sold_out
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

    return transformDealFromDB(data);
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

    return transformDealFromDB(data);
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

    console.log(`[checkMonthlyLimit] User: ${userId} | Tier: ${user.tier} | Slots: ${limit} | Active: ${usage} | Remaining: ${remaining}`);

    return {
        allowed: usage < limit,
        remaining,
        limit
    };
}

export const redeemDeal = async (userId: string, dealId: string) => {
    const cleanUserId = userId.trim();
    const cleanDealId = dealId.trim();

    // 1. Attempt Atomic Redemption for OWNED deals first
    // This effectively checks if it's in the wallet AND active, and redeems it in one go.
    // If this succeeds, we are done.

    const { data: updatedItems, error: updateError } = await supabase
        .from('wallet_items')
        .update({ status: 'redeemed', redeemed_at: new Date().toISOString() })
        .eq('user_id', cleanUserId)
        .eq('deal_id', cleanDealId)
        .eq('status', 'active') // CRITICAL: Only redeem if currently active
        .select();

    if (updateError) {
        console.error('Error during atomic redemption update:', updateError);
        throw updateError;
    }

    // Check if we successfully redeemed an owned item
    if (updatedItems && updatedItems.length > 0) {
        // SUCCESS: Deal was in wallet and is now redeemed.
        const redeemedItem = updatedItems[0];
        console.log('[redeemDeal] Atomic redemption successful for owned deal:', redeemedItem);

        // Record the redemption in history (deal_redemptions)
        // We do this AFTER the successful status update to prevent duplicates if this fails (rare, but better than double entry).
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
            console.error('Error inserting redemption record (post-update):', insertError);
            // Note: Wallet item is already 'redeemed', so user got their deal, but history might be missing one entry if this fails.
            // This is acceptable failure mode compared to double redemption.
        }

        return {
            id: redemptionRecord?.id || 'unknown',
            userId: userId,
            dealId: dealId,
            redeemedAt: redeemedItem.redeemed_at
        };
    }

    // 2. If atomic update affected 0 rows, either:
    //    a) Deal is not in wallet
    //    b) Deal is in wallet but already redeemed
    //    c) Deal is in wallet but expired (if status is 'expired')

    // Let's check which case it is to give correct error or proceed to unowned redemption.
    const { data: existingItem } = await supabase
        .from('wallet_items')
        .select('status')
        .eq('user_id', cleanUserId)
        .eq('deal_id', cleanDealId)
        .maybeSingle();

    if (existingItem) {
        // It existed but wasn't updated -> It wasn't 'active'.
        if (existingItem.status === 'redeemed') {
            throw new Error('This deal has already been redeemed.');
        } else if (existingItem.status === 'expired') {
            throw new Error('This deal has expired.');
        } else {
            // Should not happen if logic is correct, but fallback
            throw new Error(`Deal status is ${existingItem.status}, cannot redeem.`);
        }
    }

    // 3. Deal is NOT in wallet (Unowned / Immediate Redemption Flow)
    // Attempting to redeem a deal not in wallet.
    // Check limits and create fresh if allowed. (Same logic as before)

    console.log('[redeemDeal] Deal NOT found in wallet. Checking limits for immediate redemption...');

    // Check Global Limit
    const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select('max_redemptions_total, redemptions_count, usage_limit, max_user_redemptions')
        .eq('id', dealId)
        .single();

    if (dealError) throw dealError;

    if (dealData.max_redemptions_total !== null && (dealData.redemptions_count || 0) >= dealData.max_redemptions_total) {
        throw new Error('This deal has reached its global usage limit and is sold out.');
    }

    // CHECK PER-USER LIMIT (RESETS MONTHLY)
    // Priority 1: New Integer Column
    if (dealData.max_user_redemptions !== null && dealData.max_user_redemptions > 0) {
        // Get start of current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { count: monthlyRedemptions, error: redemptionCheckError } = await supabase
            .from('deal_redemptions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', cleanUserId)
            .eq('deal_id', cleanDealId)
            .gte('redeemed_at', startOfMonth); // Only count this month

        if (redemptionCheckError) {
            console.error('Error checking past redemptions:', redemptionCheckError);
        } else {
            const userCount = monthlyRedemptions || 0;
            if (userCount >= dealData.max_user_redemptions) {
                throw new Error(`You have reached the monthly redemption limit for this deal (${dealData.max_user_redemptions} per month).`);
            }
        }
    }
    // Priority 2: Legacy String Check (Fallback - Remains Lifetime/One-time)
    else if (dealData.usage_limit === '1') {
        const { count: pastRedemptions, error: redemptionCheckError } = await supabase
            .from('deal_redemptions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', cleanUserId)
            .eq('deal_id', cleanDealId);

        if (redemptionCheckError) {
            console.error('Error checking past redemptions:', redemptionCheckError);
        }

        if (pastRedemptions && pastRedemptions > 0) {
            throw new Error('You have already redeemed this deal.');
        }
    }

    // Check User Limit (Slots/Month)
    // Note: If they don't have it in wallet, adding/redeeming it requires a "Slot".
    const { allowed } = await checkMonthlyLimit(userId);
    if (!allowed) {
        throw new Error('Wallet limit reached. Cannot redeem new deal.');
    }

    // Proceed to Redemption (Insert transaction)
    try {
        const { data, error } = await supabase
            .from('deal_redemptions')
            .insert({
                user_id: userId,
                deal_id: dealId,
                redeemed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // Count increment using NEW RPC
        const { error: updateError } = await supabase.rpc('increment_redemptions_count', { row_id: dealId });
        if (updateError) {
            console.warn('RPC increment_redemptions_count failed', updateError);
            // Verify if it's 404 - if so, it means function missing.
            // But we just created it.
        }

        return {
            id: data.id,
            userId: data.user_id,
            dealId: data.deal_id,
            redeemedAt: data.redeemed_at
        };

    } catch (error) {
        console.error('Error redeeming unowned deal:', error);
        throw error;
    }
};

export async function redeemImmediate(userId: string, dealId: string) {
    return redeemDeal(userId, dealId);
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
        // 1. Fetch Total Users and Growth
        const { data: users, error: usersError } = await supabase
            .from('profiles')
            .select('created_at');

        if (usersError) throw usersError;

        // 2. Fetch Total Revenue and Revenue Over Time
        const { data: transactions, error: transactionsError } = await supabase
            .from('payment_transactions')
            .select('amount, created_at, status')
            .eq('status', 'succeeded'); // Only count successful transactions

        if (transactionsError) throw transactionsError;

        // 3. Fetch Active Deals and Categories
        const { data: deals, error: dealsError } = await supabase
            .from('deals')
            .select('id, title, category, status, created_at');

        if (dealsError) throw dealsError;

        // 4. Fetch Redemptions and Top Deals
        const { data: redemptions, error: redemptionsError } = await supabase
            .from('deal_redemptions')
            .select('deal_id, redeemed_at');

        if (redemptionsError) throw redemptionsError;

        // --- Aggregation Logic ---

        // Metrics
        const totalUsers = users.length;
        const totalRevenue = transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        const activeDeals = deals.filter((d: any) => d.status === 'approved' || d.status === 'active').length; // Assuming 'approved' or 'active' means active
        const totalRedemptions = redemptions.length;

        // Charts: Revenue & User Growth (Last 6 Months)
        const months: string[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            months.push(d.toLocaleString('default', { month: 'short' }));
        }

        const revenueData = months.map(month => {
            const monthlyTransactions = transactions.filter((t: any) => new Date(t.created_at).toLocaleString('default', { month: 'short' }) === month);
            return {
                name: month,
                revenue: monthlyTransactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
            };
        });

        const userGrowthData = months.map(month => {
            // Cumulative users up to this month
            // This is a bit simplified. Ideally we'd filter by created_at <= end of that month.
            // Let's do it properly:
            const currentYear = new Date().getFullYear();
            // Find the index of the month in the current year context or handle year wrapping?
            // Simple approach: Filter users created in that month
            const monthlyUsers = users.filter((u: any) => new Date(u.created_at).toLocaleString('default', { month: 'short' }) === month).length;
            return {
                name: month,
                users: monthlyUsers // This shows new users per month. If we want total users, we need to accumulate.
            };
        });

        // Let's make userGrowth cumulative for the chart "User Growth" usually implies total base growth or new users. 
        // The mock data showed increasing numbers (400 -> 600 -> 800), implying cumulative.
        // We need to know users before the 6 month window to start correctly, but for now let's just accumulate within the window or fetch all and filter.
        // Since we fetched ALL users, we can calculate cumulative correctly.

        const userGrowthCumulative = months.map((month, index) => {
            const now = new Date();
            const targetDate = new Date(now.getFullYear(), now.getMonth() - 5 + index + 1, 0); // End of that month

            const count = users.filter((u: any) => new Date(u.created_at) <= targetDate).length;
            return { name: month, users: count };
        });


        // Charts: Categories
        const categoryCounts: Record<string, number> = {};
        deals.forEach((d: any) => {
            const cat = d.category || 'Other';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
        const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

        // Charts: Top Performing Deals
        const redemptionCounts: Record<string, number> = {};
        redemptions.forEach((r: any) => {
            redemptionCounts[r.deal_id] = (redemptionCounts[r.deal_id] || 0) + 1;
        });

        // Map deal IDs to titles
        const topDeals = Object.entries(redemptionCounts)
            .map(([dealId, count]) => {
                const deal = deals.find((d: any) => d.id === dealId);
                return {
                    name: deal ? deal.title : 'Unknown Deal',
                    redemptions: count
                };
            })
            .sort((a, b) => b.redemptions - a.redemptions)
            .slice(0, 5);

        return {
            metrics: {
                totalUsers,
                totalRevenue,
                activeDeals,
                totalRedemptions
            },
            charts: {
                revenueData,
                userGrowthData: userGrowthCumulative,
                categoryData,
                topDeals
            }
        };

    } catch (error) {
        console.error('Error fetching analytics data:', error);
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
export async function addDealToWallet(userId: string, dealId: string): Promise<{ walletItemId: string; redemptionCode: string }> {
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
    const limitCheck = await checkMonthlyLimit(userId);
    if (!limitCheck.allowed) {
        throw new Error('Monthly redemption limit reached. Please upgrade your plan.');
    }

    // Check global deal limit
    const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('max_redemptions_total, redemptions_count, is_sold_out')
        .eq('id', dealId)
        .single();

    if (dealError || !deal) throw new Error('Deal not found');
    if (deal.is_sold_out || (deal.max_redemptions_total && (deal.redemptions_count || 0) >= deal.max_redemptions_total)) {
        throw new Error('This deal is sold out.');
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
export async function redeemWalletItem(
    walletItemId: string,
    redemptionCode: string,
    vendorId?: string
): Promise<{ success: boolean; message: string; requiresConfirmation?: boolean; confirmationToken?: string; dealInfo?: any }> {
    // 1. Find wallet item
    const { data: walletItem, error: findError } = await supabase
        .from('wallet_items')
        .select(`
            id,
            user_id,
            deal_id,
            status,
            redemption_code,
            deals (id, title, requires_confirmation)
        `)
        .eq('id', walletItemId)
        .single();

    if (findError || !walletItem) {
        return { success: false, message: 'Invalid wallet item' };
    }

    // 2. Verify code
    if (walletItem.redemption_code !== redemptionCode) {
        return { success: false, message: 'Invalid redemption code' };
    }

    // 3. Check status
    if (walletItem.status === 'redeemed') {
        return { success: false, message: 'This deal has already been redeemed' };
    }
    if (walletItem.status === 'expired') {
        return { success: false, message: 'This deal has expired' };
    }

    // 4. Check if requires confirmation (high-value deal)
    const deal = (walletItem as any).deals;
    if (deal?.requires_confirmation) {
        // Generate confirmation token
        const confirmationToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 60000).toISOString(); // 60 seconds

        await supabase
            .from('wallet_items')
            .update({
                confirmation_token: confirmationToken,
                confirmation_expires_at: expiresAt
            })
            .eq('id', walletItemId);

        // Send push notification to user
        try {
            await supabase.functions.invoke('send-push-notification', {
                body: {
                    userId: walletItem.user_id,
                    title: 'Confirm Redemption',
                    body: `A vendor wants to redeem "${deal.title}". Tap to confirm.`,
                    data: {
                        type: 'redemption_confirmation',
                        walletItemId,
                        confirmationToken,
                        dealTitle: deal.title
                    }
                }
            });
        } catch (pushError) {
            console.error('Push notification failed:', pushError);
            // Continue anyway - vendor can still wait for manual confirmation
        }

        return {
            success: false,
            message: 'User confirmation required',
            requiresConfirmation: true,
            confirmationToken,
            dealInfo: { title: deal.title }
        };
    }

    // 5. Complete redemption
    const { error: updateError } = await supabase
        .from('wallet_items')
        .update({
            status: 'redeemed',
            redeemed_at: new Date().toISOString()
        })
        .eq('id', walletItemId);

    if (updateError) {
        return { success: false, message: 'Failed to redeem' };
    }

    // 6. Log redemption
    await supabase.from('redemption_logs').insert({
        wallet_item_id: walletItemId,
        user_id: walletItem.user_id,
        deal_id: walletItem.deal_id,
        vendor_id: vendorId
    });

    // 7. Increment global redemption count
    await supabase.rpc('increment_deal_redemption', { deal_id_input: walletItem.deal_id });

    return {
        success: true,
        message: 'Deal redeemed successfully!',
        dealInfo: { title: deal?.title }
    };
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


