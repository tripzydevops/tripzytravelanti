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
        role: data.role,
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
        role: user.role,
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
        partnerId: dbDeal.partner_id,
        status: dbDeal.status,
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
        status: deal.status || 'pending',
        rating: 0,
        rating_count: 0
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
        const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        const activeDeals = deals.filter(d => d.status === 'approved' || d.status === 'active').length; // Assuming 'approved' or 'active' means active
        const totalRedemptions = redemptions.length;

        // Charts: Revenue & User Growth (Last 6 Months)
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            months.push(d.toLocaleString('default', { month: 'short' }));
        }

        const revenueData = months.map(month => {
            const monthlyTransactions = transactions.filter(t => new Date(t.created_at).toLocaleString('default', { month: 'short' }) === month);
            return {
                name: month,
                revenue: monthlyTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
            };
        });

        const userGrowthData = months.map(month => {
            // Cumulative users up to this month
            // This is a bit simplified. Ideally we'd filter by created_at <= end of that month.
            // Let's do it properly:
            const currentYear = new Date().getFullYear();
            // Find the index of the month in the current year context or handle year wrapping?
            // Simple approach: Filter users created in that month
            const monthlyUsers = users.filter(u => new Date(u.created_at).toLocaleString('default', { month: 'short' }) === month).length;
            return {
                name: month,
                users: monthlyUsers // This shows new users per month. If we want total users, we need to accumulate.
            };
        });

        // Let's make userGrowth cumulative for the chart "User Growth" usually implies total base growth or new users. 
        // The mock data showed increasing numbers (400 -> 600 -> 800), implying cumulative.
        let runningTotalUsers = 0;
        // We need to know users before the 6 month window to start correctly, but for now let's just accumulate within the window or fetch all and filter.
        // Since we fetched ALL users, we can calculate cumulative correctly.

        const userGrowthCumulative = months.map((month, index) => {
            const now = new Date();
            const targetDate = new Date(now.getFullYear(), now.getMonth() - 5 + index + 1, 0); // End of that month

            const count = users.filter(u => new Date(u.created_at) <= targetDate).length;
            return { name: month, users: count };
        });


        // Charts: Categories
        const categoryCounts: Record<string, number> = {};
        deals.forEach(d => {
            const cat = d.category || 'Other';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
        const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));

        // Charts: Top Performing Deals
        const redemptionCounts: Record<string, number> = {};
        redemptions.forEach(r => {
            redemptionCounts[r.deal_id] = (redemptionCounts[r.deal_id] || 0) + 1;
        });

        // Map deal IDs to titles
        const topDeals = Object.entries(redemptionCounts)
            .map(([dealId, count]) => {
                const deal = deals.find(d => d.id === dealId);
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
