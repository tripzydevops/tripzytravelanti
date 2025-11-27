import { supabase } from './supabaseClient';
import { SubscriptionPlan } from '../types';

export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
    const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

    if (error) {
        console.error('Error fetching subscription plans:', error);
        return [];
    }

    return (data || []).map(plan => {
        let redemptionsPerMonth = plan.redemptions_per_period;

        // Handle unlimited
        if (plan.redemptions_per_period >= 999999) {
            redemptionsPerMonth = Infinity;
        } else if (plan.billing_period === 'yearly') {
            redemptionsPerMonth = Math.floor(plan.redemptions_per_period / 12);
        }

        return {
            ...plan,
            redemptionsPerMonth,
            billingPeriod: plan.billing_period
        };
    });
};

export const getAllSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
    const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

    if (error) {
        console.error('Error fetching all subscription plans:', error);
        return [];
    }

    return (data || []).map(plan => {
        let redemptionsPerMonth = plan.redemptions_per_period;

        // Handle unlimited
        if (plan.redemptions_per_period >= 999999) {
            redemptionsPerMonth = Infinity;
        } else if (plan.billing_period === 'yearly') {
            redemptionsPerMonth = Math.floor(plan.redemptions_per_period / 12);
        }

        return {
            ...plan,
            redemptionsPerMonth,
            billingPeriod: plan.billing_period
        };
    });
};

export const createSubscriptionPlan = async (plan: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
        .from('subscription_plans')
        .insert([plan])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateSubscriptionPlan = async (id: string, updates: Partial<SubscriptionPlan>) => {
    const { data, error } = await supabase
        .from('subscription_plans')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteSubscriptionPlan = async (id: string) => {
    // Soft delete by setting is_active to false
    const { data, error } = await supabase
        .from('subscription_plans')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};
