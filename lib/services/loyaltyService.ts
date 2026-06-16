import { supabase } from '../supabaseClient';
import { PaymentTransaction } from '../../types';

export async function addUserPoints(
    userId: string, 
    pointsToAdd: number, 
    type: string = 'earn_redemption', 
    referenceType?: string, 
    referenceId?: string,
    expiresAt?: string,
    metadata: any = {}
) {
    const { data, error } = await supabase.rpc('secure_earn_points', {
        p_user_id: userId,
        p_amount: pointsToAdd,
        p_type: type,
        p_reference_type: referenceType || null,
        p_reference_id: referenceId || null,
        p_expires_at: expiresAt || null,
        p_metadata: metadata
    });

    if (error) {
        console.warn('Error adding points via secure_earn_points, falling back to legacy add_user_points:', error);
        const { data: legacyData, error: legacyError } = await supabase.rpc('add_user_points', {
            user_uuid: userId,
            points_to_add: pointsToAdd
        });
        if (legacyError) {
            console.error('Legacy add_user_points failed:', legacyError);
            throw legacyError;
        }
        return legacyData;
    }

    return data;
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
// LOYALTY LEDGER (PHASE 1)
// =====================================================
export async function burnUserPoints(
    userId: string,
    pointsToBurn: number,
    type: string = 'burn_reward',
    referenceType?: string,
    referenceId?: string,
    metadata: any = {}
): Promise<any> {
    const { data, error } = await supabase.rpc('secure_burn_points', {
        p_user_id: userId,
        p_amount: pointsToBurn,
        p_type: type,
        p_reference_type: referenceType || null,
        p_reference_id: referenceId || null,
        p_metadata: metadata
    });

    if (error) {
        console.error('Error burning points via ledger:', error);
        throw error;
    }
    return data;
}

// =====================================================
// LOYALTY TRANSACTION HISTORY (PHASE 4)
// =====================================================
export async function getUserLoyaltyTransactions(userId: string, limit: number = 50): Promise<any[]> {
    const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching loyalty transactions:', error);
        return [];
    }
    return data || [];
}

