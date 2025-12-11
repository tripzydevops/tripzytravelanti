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
}

// =====================================================
// USER PROFILE OPERATIONS
// =====================================================

// =====================================================
// USER PROFILE OPERATIONS
// =====================================================

export async function getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select(`
      *,
      saved_deals:saved_deals(deal_id),
      deal_redemptions:deal_redemptions(id, deal_id, user_id, redeemed_at),
      user_deals:user_deals(deal_id)
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
        savedDeals: data.saved_deals?.map((sd: { deal_id: string }) => sd.deal_id) || [],
        ownedDeals: data.user_deals?.map((ud: { deal_id: string }) => ud.deal_id) || [],
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

        role: data.role,
        status: data.status,
    };
}
// ... (updateUserProfile implementation unchanged)

export async function getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
        .rpc('get_admin_users_list', {});

    if (error) {
        console.error('Error fetching users:', error);
        return [];
    }

    return data.map((user: any) => ({
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email,
        tier: (user.tier as SubscriptionTier) || SubscriptionTier.FREE,
        isAdmin: user.is_admin,
        savedDeals: user.saved_deals?.map((sd: { deal_id: string }) => sd.deal_id) || [],
        ownedDeals: user.owned_deals?.map((od: { deal_id: string }) => od.deal_id) || [],
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
        address: user.address,
        billingAddress: user.billing_address,
        role: user.role,
        status: user.status || 'active',
        emailConfirmedAt: user.email_confirmed_at,
        lastSignInAt: user.last_sign_in_at,
        createdAt: user.created_at
    }));
}

export async function getUsersPaginated(
    page: number,
    limit: number,
    filters?: { search?: string; tier?: SubscriptionTier | 'All' }
): Promise<{ users: User[]; total: number }> {
    let query = supabase
        .from('profiles')
        .select(`
            *,
            saved_deals:saved_deals(deal_id),
            deal_redemptions:deal_redemptions(id, deal_id, user_id, redeemed_at),
            user_deals:user_deals(deal_id)
        `, { count: 'exact' });

    if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`name.ilike.${searchTerm},email.ilike.${searchTerm},mobile.ilike.${searchTerm}`);
    }

    if (filters?.tier && filters.tier !== 'All') {
        query = query.eq('tier', filters.tier);
    }

    // Sort by created_at desc (newest first)
    query = query.order('created_at', { ascending: false });

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query.range(from, to);

    if (error) {
        console.error('Error fetching paginated users:', error);
        return { users: [], total: 0 };
    }

    const users = data.map((user: any) => ({
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email,
        tier: (user.tier as SubscriptionTier) || SubscriptionTier.FREE,
        isAdmin: user.is_admin,
        savedDeals: user.saved_deals?.map((sd: { deal_id: string }) => sd.deal_id) || [],
        ownedDeals: user.user_deals?.map((od: { deal_id: string }) => od.deal_id) || [],
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
        address: user.address,
        billingAddress: user.billing_address,
        role: user.role,
        status: user.status || 'active',
        emailConfirmedAt: user.email_confirmed_at,
        lastSignInAt: user.last_sign_in_at,
        createdAt: user.created_at
    }));

    return { users, total: count || 0 };
}

// ... (existing functions)

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

    return data.map((sd: { deal_id: string }) => sd.deal_id);
}

// =====================================================
// OWNED DEALS (WALLET) OPERATIONS
// =====================================================

export async function assignDealToUser(userId: string, dealId: string) {
    const { error } = await supabase
        .from('user_deals')
        .insert({
            user_id: userId,
            deal_id: dealId,
            status: 'active',
            acquired_at: new Date().toISOString()
        });

    if (error) {
        if (error.code === '23505') return;
        console.error('Error assigning deal to user:', error);
        throw error;
    }
}

export async function removeDealFromUser(userId: string, dealId: string) {
    const { error } = await supabase
        .from('user_deals')
        .delete()
        .eq('user_id', userId)
        .eq('deal_id', dealId);

    if (error) {
        console.error('Error removing deal from user:', error);
        throw error;
    }
}

export async function claimDeal(userId: string, dealId: string) {
    // 1. Check Limit
    const { allowed } = await checkMonthlyLimit(userId);
    if (!allowed) {
        throw new Error('Monthly redemption limit reached');
    }

    const { error } = await supabase
        .from('user_deals')
        .insert({
            user_id: userId,
            deal_id: dealId,
            status: 'active',
            acquired_at: new Date().toISOString()
        });

    if (error) {
        // If unique constraint violation (already claimed), we might want to return a specific error or just ignore
        if (error.code === '23505') return; // User already owns it, don't count limit again implies we should check this BEFORE limit check? 
        // Logic: if already owned, checkMonthlyLimit shouldn't run or trigger error.
        // However, checking "isDealOwned" from client side is better. 
        // If we hit DB constraint, it means they have it. We should probably NOT decrement limit if it fails?
        // But checkMonthlyLimit only CHECKS. The INSERT is what 'uses' the limit. 
        // If insert fails (duplicate), simple return means no impact. Good.
        console.error('Error claiming deal:', error);
        throw error;
    }
}

export async function updateUserProfile(
    userId: string,
    updates: Partial<{
        name: string;
        email: string;
        tier: SubscriptionTier;
        avatar_url: string;
        extra_redemptions: number;
        notification_preferences: UserNotificationPreferences;
        mobile: string;
        address: string;

        billing_address: string;
        status: 'active' | 'banned' | 'suspended';
        referred_by: string | null;
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



export async function confirmUserEmail(userId: string) {
    const { error } = await supabase.rpc('admin_confirm_user_email', { target_user_id: userId });

    if (error) {
        console.error('Error confirming user email:', error);
        throw error;
    }
}

export async function deleteUserProfile(userId: string) {
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

    if (error) {
        console.error('Error deleting user profile:', error);
        throw error;
    }
}

export async function updateAllUsersNotificationPreferences(
    preferences: Record<string, boolean>
) {
    const { error } = await supabase.rpc('update_all_notification_preferences', {
        new_prefs: preferences
    });

    if (error) {
        console.error('Error updating all users notification preferences:', error);
        throw error;
    }
}


// =====================================================
// SUBSCRIPTION PLANS OPERATIONS
// =====================================================

export async function getAllSubscriptionPlans() {
    const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

    if (error) {
        console.error('Error fetching subscription plans:', error);
        return [];
    }

    return data;
}

export async function createSubscriptionPlan(plan: any) {
    const { data, error } = await supabase
        .from('subscription_plans')
        .insert(plan)
        .select()
        .single();

    if (error) {
        console.error('Error creating subscription plan:', error);
        throw error;
    }

    return data;
}

export async function updateSubscriptionPlan(tier: string, updates: any) {
    const { data, error } = await supabase
        .from('subscription_plans')
        .update(updates)
        .eq('tier', tier)
        .select()
        .single();

    if (error) {
        console.error('Error updating subscription plan:', error);
        throw error;
    }

    return data;
}

export async function deleteSubscriptionPlan(tier: string) {
    const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('tier', tier);

    if (error) {
        console.error('Error deleting subscription plan:', error);
        throw error;
    }
}

// =====================================================
// DEAL OPERATIONS
// =====================================================

export async function getDealsPaginated(
    page: number,
    limit: number,
    filters?: { category?: string; search?: string; searchQuery?: string; tier?: SubscriptionTier; includeExpired?: boolean }
): Promise<{ deals: Deal[]; total: number }> {
    let query = supabase
        .from('deals')
        .select('*', { count: 'exact' });

    if (filters?.category && filters.category !== 'All') {
        query = query.eq('category', filters.category);
    }

    // Support both 'search' and 'searchQuery' for compatibility
    const searchTerm = filters?.search || filters?.searchQuery;
    if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`);
    }

    if (filters?.tier) {
        // Filter logic for tiers if needed
    }

    // Filter out expired deals by default unless explicitly requested
    if (!filters?.includeExpired) {
        const now = new Date().toISOString();
        query = query.gt('expires_at', now);
        // Also filter out future published deals
        query = query.or(`publish_at.is.null,publish_at.lte.${now}`);
        // Only show approved deals
        query = query.eq('status', 'approved');
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching paginated deals:', error);
        return { deals: [], total: 0 };
    }

    const deals = data.map(transformDealFromDB);
    return { deals, total: count || 0 };
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
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching deals:', error);
        return [];
    }

    return data.map(transformDealFromDB);
}

export async function getDealById(id: string): Promise<Deal | null> {
    const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching deal:', error);
        return null;
    }

    return transformDealFromDB(data);
}

export async function getDealsForTier(tier: SubscriptionTier, includeExpired: boolean = false): Promise<Deal[]> {
    const tierHierarchy = {
        [SubscriptionTier.NONE]: [],
        [SubscriptionTier.FREE]: ['FREE'],
        [SubscriptionTier.BASIC]: ['FREE', 'BASIC'],
        [SubscriptionTier.PREMIUM]: ['FREE', 'BASIC', 'PREMIUM'],
        [SubscriptionTier.VIP]: ['FREE', 'BASIC', 'PREMIUM', 'VIP'],
    };

    const allowedTiers = tierHierarchy[tier] || [];

    let query = supabase
        .from('deals')
        .select('*')
        .in('required_tier', allowedTiers)
        .order('created_at', { ascending: false });

    if (!includeExpired) {
        const now = new Date().toISOString();
        query = query.gt('expires_at', now);
        query = query.or(`publish_at.is.null,publish_at.lte.${now}`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching deals for tier:', error);
        return [];
    }

    return data.map(transformDealFromDB);
}

// Helper function to transform database deal to app format
function transformDealFromDB(dbDeal: DBDeal): Deal {
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
        flash_end_time: deal.flash_end_time
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

export async function getFlashDeals(): Promise<Deal[]> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('is_flash_deal', true)
        .gt('flash_end_time', now)
        .eq('status', 'approved')
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

    let baseLimit = plan.redemptions_per_period;
    if (plan.billing_period === 'yearly') {
        baseLimit = Math.floor(baseLimit / 12);
    }

    const limit = baseLimit + (user.extraRedemptions || 0);

    // 3. Calculate Cumulative Usage (Lifetime)
    // Rollover Logic: Unused redemptions carry over.
    // Total Allowance = (MonthlyRate * MonthsActive) + ExtraRedemptions
    // Remaining = Total Allowance - Total Lifetime Usage

    // Fetch IDs instead of Count to avoid double counting
    const { data: redemptions, error: redemptionError } = await supabase
        .from('deal_redemptions')
        .select('deal_id')
        .eq('user_id', userId);
    // Removed .gte('redeemed_at', startOfMonthISO) to count lifetime

    const { data: claims, error: claimError } = await supabase
        .from('user_deals')
        .select('deal_id')
        .eq('user_id', userId);
    // Removed .gte('acquired_at', startOfMonthISO) to count lifetime

    if (redemptionError || claimError) {
        console.error('Error calculating usage:', redemptionError, claimError);
        throw new Error('Failed to calculate usage');
    }

    // 4. Calculate Total Usage (Lifetime)
    // Usage = (All Wallet Claims) + (Redemptions of deals NOT in wallet)
    // - Wallet Claims: Cost 1 credit (granting effective unlimited usage of that deal)
    // - Direct Redemptions: Cost 1 credit per use (if not in wallet)

    const claimedDealIds = new Set<string>();
    claims?.forEach((c: any) => claimedDealIds.add(c.deal_id));

    // Count redemptions for deals that are NOT currently in wallet
    // (If they are in wallet, the cost is covered by the claim)
    const nonWalletRedemptionCount = redemptions?.filter((r: any) => !claimedDealIds.has(r.deal_id)).length || 0;

    // Total Usage = Wallet Count + Direct Redemption Count
    const totalLifetimeUsage = (claims?.length || 0) + nonWalletRedemptionCount;

    // 4. Calculate Total Accrued Allowance
    const createdAt = new Date(user.createdAt || new Date());
    const now = new Date();

    // Calculate months difference roughly
    let monthsActive = (now.getFullYear() - createdAt.getFullYear()) * 12 + (now.getMonth() - createdAt.getMonth());
    // Add current month (e.g. if created today, it's 1st month)
    monthsActive = Math.max(1, monthsActive + 1);

    const monthlyRate = baseLimit; // baseLimit is already divided by 12 for yearly plans
    const totalAccruedLimit = (monthlyRate * monthsActive) + (user.extraRedemptions || 0);

    const remaining = Math.max(0, totalAccruedLimit - totalLifetimeUsage);

    return {
        allowed: totalLifetimeUsage < totalAccruedLimit,
        remaining,
        limit: totalAccruedLimit
    };
}

export const redeemDeal = async (userId: string, dealId: string) => {
    // 0. Check if deal is already owned (in wallet)
    // If owned, the redemption count was already taken when claimed (acquired).
    // So we do NOT check limit again.
    const cleanUserId = userId.trim();
    const cleanDealId = dealId.trim();

    // DEBUG: Fetch ALL owned deals to see what supabase can see
    const { data: allDeals, error: allDealsError } = await supabase
        .from('user_deals')
        .select('deal_id')
        .eq('user_id', cleanUserId);

    console.log('[redeemDeal] ALL owned deals for user:', allDeals);

    // Check if the current deal is in the list of all deals (Client-side fallback check)
    const isOwnedInList = allDeals?.some((d: { deal_id: string }) => d.deal_id === cleanDealId);

    const { data: ownedDeal, error: ownedError } = await supabase
        .from('user_deals')
        .select('*')
        .eq('user_id', cleanUserId)
        .eq('deal_id', cleanDealId)
        .maybeSingle();

    console.log('[redeemDeal] Checking ownership direct query:', {
        userId: cleanUserId,
        dealId: cleanDealId,
        ownedDeal,
        ownedError,
        isOwnedInList
    });

    const isOwned = !!ownedDeal || !!isOwnedInList;

    if (!isOwned) {
        // 1. Check Limit ONLY if not owned
        console.log('[redeemDeal] Deal NOT found in wallet. Checking monthly limit...');
        const { allowed, limit, remaining } = await checkMonthlyLimit(cleanUserId);
        console.log('[redeemDeal] Check Limit Result:', { allowed, limit, remaining });

        if (!allowed) {
            throw new Error('Monthly redemption limit reached');
        }
    } else {
        console.log('[redeemDeal] Deal IS found in wallet. Bypassing limit check.');
    }

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

        // ALWAYS remove from wallet after redemption
        // Deals in wallet are treated as single-use tickets (already paid for by credit)
        await removeDealFromUser(userId, dealId);

        // Transform snake_case to camelCase
        return {
            id: data.id,
            userId: data.user_id,
            dealId: data.deal_id,
            redeemedAt: data.redeemed_at
        };
    } catch (error) {
        console.error('Error redeeming deal:', error);
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
// DEAL REDEMPTION OPERATIONS
// =====================================================



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


