import { supabase } from '../supabaseClient';
import { User, Deal } from '../../types';
import { getUserProfile } from './userService';
import { transformDealFromDB } from './helpers';

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

export async function claimDeal(userId: string, dealId: string, couponCodeId?: string): Promise<{ walletItemId: string; redemptionCode: string }> {
    // Use the new secure wallet system
    // This handles monthly limits, global limits, and generates unique codes
    return addDealToWallet(userId, dealId, false, couponCodeId);
}

/**
 * Add a deal to user's wallet with a unique redemption code
 */
export async function addDealToWallet(
    userId: string, 
    dealId: string, 
    bypassChecks: boolean = false,
    couponCodeId?: string
): Promise<{ walletItemId: string; redemptionCode: string }> {
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

    // Let database securely generate unique code and insert
    const { data, error } = await supabase
        .from('wallet_items')
        .insert({
            user_id: userId,
            deal_id: dealId,
            status: 'active',
            coupon_code_id: couponCodeId || null
        })
        .select('id, redemption_code')
        .single();

    if (error) {
        if (error.code === '23505') {
            // Unique constraint - retry with different code
            return addDealToWallet(userId, dealId, bypassChecks, couponCodeId);
        }
        throw error;
    }

    // INCREMENT GLOBAL REDEMPTION COUNT (Claiming a spot)
    try {
        const { error: updateError } = await supabase.rpc('increment_deal_redemption', { deal_id_input: dealId });
        if (updateError) throw updateError;
    } catch (rpcError) {
        console.warn('RPC increment_deal_redemption failed in addDealToWallet, falling back to direct update:', rpcError);
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

