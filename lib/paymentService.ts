import { supabase } from './supabaseClient';
import { PaymentTransaction, SubscriptionTier } from '../types';
import { PostgrestError } from '@supabase/supabase-js';

export interface CreatePaymentTransactionParams {
    userId: string;
    amount: number;
    currency: string;
    paymentMethod: 'stripe' | 'iyzico';
    tier: SubscriptionTier;
    taxId?: string;
}

export interface PaymentTransactionFilters {
    status?: 'success' | 'failed' | 'pending';
    paymentMethod?: 'stripe' | 'iyzico';
    startDate?: string;
    endDate?: string;
    userId?: string;
}

/**
 * Create a new payment transaction record
 */
export async function createPaymentTransaction(
    params: CreatePaymentTransactionParams
): Promise<{ data: PaymentTransaction | null; error: PostgrestError | null }> {
    const { data, error } = await supabase
        .from('payment_transactions')
        .insert({
            user_id: params.userId,
            amount: params.amount,
            currency: params.currency,
            status: 'pending',
            payment_method: params.paymentMethod,
            tier: params.tier,
            tax_id: params.taxId || null,
        })
        .select()
        .single();

    return { data, error };
}

/**
 * Update payment transaction status
 */
export async function updatePaymentTransactionStatus(
    transactionId: string,
    status: 'success' | 'failed' | 'pending',
    transactionIdFromProvider?: string,
    errorMessage?: string
): Promise<{ data: PaymentTransaction | null; error: PostgrestError | null }> {
    const updateData: Record<string, any> = {
        status,
    };

    if (transactionIdFromProvider) {
        updateData.transaction_id = transactionIdFromProvider;
    }

    if (errorMessage) {
        updateData.error_message = errorMessage;
    }

    const { data, error } = await supabase
        .from('payment_transactions')
        .update(updateData)
        .eq('id', transactionId)
        .select()
        .single();

    return { data, error };
}

/**
 * Get payment transactions with optional filters
 */
export async function getPaymentTransactions(
    filters?: PaymentTransactionFilters
): Promise<{ data: PaymentTransaction[] | null; error: PostgrestError | null }> {
    let query = supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters?.status) {
        query = query.eq('status', filters.status);
    }

    if (filters?.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod);
    }

    if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
    }

    if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    return { data, error };
}

/**
 * Get a specific payment transaction by ID
 */
export async function getPaymentTransactionById(
    transactionId: string
): Promise<{ data: PaymentTransaction | null; error: PostgrestError | null }> {
    const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

    return { data, error };
}

/**
 * Get payment history for a specific user
 */
export async function getUserPaymentHistory(
    userId: string
): Promise<{ data: PaymentTransaction[] | null; error: PostgrestError | null }> {
    const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    return { data, error };
}

/**
 * Get payment transactions with user information (for admin)
 * This requires a join with the users/profiles table
 */
export async function getPaymentTransactionsWithUserInfo(
    filters?: PaymentTransactionFilters
): Promise<{ data: PaymentTransaction[] | null; error: PostgrestError | null }> {
    let query = supabase
        .from('payment_transactions')
        .select('*, profiles:user_id(name, email, address, billing_address)')
        .order('created_at', { ascending: false });

    if (filters?.status) {
        query = query.eq('status', filters.status);
    }

    if (filters?.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod);
    }

    if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
    }

    if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    // Transform the data to flatten user info
    const transformedData = data?.map((transaction: any) => ({
        ...transaction,
        userName: transaction.profiles?.name || 'Unknown',
        userEmail: transaction.profiles?.email || 'Unknown',
        userAddress: transaction.profiles?.address || '',
        userBillingAddress: transaction.profiles?.billing_address || '',
    })) as PaymentTransaction[];

    return { data: transformedData, error };
}
