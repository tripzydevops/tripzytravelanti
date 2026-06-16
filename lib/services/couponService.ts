import { supabase } from '../supabaseClient';
import { Deal } from '../../types';

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
// COUPON CAMPAIGN & CODE OPERATIONS (PHASE 1)
// =====================================================
export async function createCouponCampaign(campaign: any): Promise<any> {
    const { data, error } = await supabase
        .from('coupon_campaigns')
        .insert({
            partner_id: campaign.partnerId,
            deal_id: campaign.dealId || null,
            title: campaign.title,
            description: campaign.description || null,
            discount_type: campaign.discountType,
            discount_value: campaign.discountValue,
            max_discount_amount: campaign.maxDiscountAmount || null,
            min_subtotal: campaign.minSubtotal || 0.00,
            usage_limit: campaign.usageLimit || null,
            max_per_user: campaign.maxPerUser || 1,
            starts_at: campaign.startsAt || null,
            expires_at: campaign.expiresAt || null,
            is_active: campaign.isActive !== undefined ? campaign.isActive : true,
            stacking_rules: campaign.stackingRules || { stackable: false }
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating coupon campaign:', error);
        throw error;
    }
    return data;
}

export async function getCouponCampaigns(partnerId?: string): Promise<any[]> {
    let query = supabase.from('coupon_campaigns').select('*');
    if (partnerId) {
        query = query.eq('partner_id', partnerId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching coupon campaigns:', error);
        throw error;
    }
    return data || [];
}

export async function generateCouponCodes(campaignId: string, count: number, customCodes?: string[]): Promise<any[]> {
    const codesToInsert = [];
    if (customCodes && customCodes.length > 0) {
        for (const code of customCodes) {
            codesToInsert.push({
                campaign_id: campaignId,
                code: code.trim().toUpperCase(),
                status: 'active'
            });
        }
    } else {
        // Generate random 8-character code prefixes
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        for (let i = 0; i < count; i++) {
            let code = '';
            for (let j = 0; j < 8; j++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            codesToInsert.push({
                campaign_id: campaignId,
                code,
                status: 'active'
            });
        }
    }

    const { data, error } = await supabase
        .from('coupon_codes')
        .insert(codesToInsert)
        .select();

    if (error) {
        console.error('Error generating coupon codes:', error);
        throw error;
    }
    return data || [];
}

export async function verifyCouponCode(code: string, userId?: string, dealId?: string): Promise<{ valid: boolean; message: string; campaign?: any; codeDetails?: any }> {
    const cleanCode = code.trim().toUpperCase();
    
    // Fetch code details with campaign
    const { data: codeDetails, error } = await supabase
        .from('coupon_codes')
        .select('*, campaign:coupon_campaigns(*)')
        .eq('code', cleanCode)
        .maybeSingle();

    if (error || !codeDetails) {
        return { valid: false, message: 'Invalid coupon code' };
    }

    if (codeDetails.status !== 'active') {
        return { valid: false, message: `Coupon is ${codeDetails.status}` };
    }

    const campaign = codeDetails.campaign;
    if (!campaign || !campaign.is_active) {
        return { valid: false, message: 'Campaign is inactive' };
    }

    const now = new Date();
    if (campaign.starts_at && new Date(campaign.starts_at) > now) {
        return { valid: false, message: 'Campaign has not started yet' };
    }

    if (campaign.expires_at && new Date(campaign.expires_at) < now) {
        return { valid: false, message: 'Campaign has expired' };
    }

    if (campaign.usage_limit && campaign.usage_count >= campaign.usage_limit) {
        return { valid: false, message: 'Coupon campaign usage limit reached' };
    }

    // Deal-level validation: if campaign is locked to a specific deal, verify match
    if (campaign.deal_id && dealId && campaign.deal_id !== dealId) {
        return { valid: false, message: 'This coupon is not valid for this deal' };
    }

    // Check user-specific limit
    if (userId) {
        const { count: userUsageCount } = await supabase
            .from('coupon_codes')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('redeemed_by', userId)
            .eq('status', 'redeemed');

        if ((userUsageCount || 0) >= (campaign.max_per_user || 1)) {
            return { valid: false, message: 'You have reached the usage limit for this coupon campaign' };
        }
    }

    return {
        valid: true,
        message: 'Coupon code is valid!',
        campaign,
        codeDetails
    };
}

