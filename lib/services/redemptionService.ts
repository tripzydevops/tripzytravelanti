import { supabase } from '../supabaseClient';
import { User, Redemption } from '../../types';
import { addUserPoints } from './loyaltyService';
import { checkMonthlyLimit } from './walletService';

export const redeemDeal = async (userId: string, dealId: string, couponCodeId?: string) => {
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
        const activeCouponId = updatedItems[0].coupon_code_id || couponCodeId || null;
        const { data: redemptionRecord } = await supabase
            .from('deal_redemptions')
            .insert({
                user_id: userId,
                deal_id: dealId,
                redeemed_at: new Date().toISOString(),
                coupon_code_id: activeCouponId
            })
            .select()
            .single();

        // Award Points (100 pts)
        try {
            if (redemptionRecord?.id) {
                await addUserPoints(userId, 100, 'earn_redemption', 'deal_redemption', redemptionRecord.id);
            } else {
                await addUserPoints(userId, 100);
            }
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
            redeemed_at: new Date().toISOString(),
            coupon_code_id: couponCodeId || null
        })
        .select()
        .single();

    if (insertError) {
        console.error('Error in immediate redemption insert:', insertError);
        throw insertError;
    }

    // Increment global count using RPC
    try {
        await supabase.rpc('increment_deal_redemption', { deal_id_input: dealId });
    } catch (e) {
        console.warn('Failed to increment global redemption count:', e);
    }

    // Award Points (100 pts)
    try {
        if (redemptionRecord?.id) {
            await addUserPoints(userId, 100, 'earn_redemption', 'deal_redemption', redemptionRecord.id);
        } else {
            await addUserPoints(userId, 100);
        }
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

export async function redeemImmediate(userId: string, dealId: string, couponCodeId?: string) {
    return redeemDeal(userId, dealId, couponCodeId);
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

