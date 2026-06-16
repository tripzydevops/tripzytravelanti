import { supabase } from '../supabaseClient';
import { Deal } from '../../types';
import { transformDealFromDB } from './helpers';

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
// PARTNER ANALYTICS TRENDS (PHASE 5)
// =====================================================
export async function getPartnerRedemptionTrends(partnerId: string): Promise<{
    redemptionsLast30: number;
    redemptionsPrev30: number;
    viewsLast30: number;
    viewsPrev30: number;
    redemptionGrowth: number;
    viewGrowth: number;
} | null> {
    const { data, error } = await supabase
        .from('partner_redemption_trends')
        .select('*')
        .eq('partner_id', partnerId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching partner trends:', error);
        return null;
    }

    if (!data) return null;

    const redemptionsLast30 = data.redemptions_last_30 || 0;
    const redemptionsPrev30 = data.redemptions_prev_30 || 0;
    const viewsLast30 = data.views_last_30 || 0;
    const viewsPrev30 = data.views_prev_30 || 0;

    return {
        redemptionsLast30,
        redemptionsPrev30,
        viewsLast30,
        viewsPrev30,
        redemptionGrowth: redemptionsPrev30 > 0
            ? Math.round(((redemptionsLast30 - redemptionsPrev30) / redemptionsPrev30) * 100)
            : (redemptionsLast30 > 0 ? 100 : 0),
        viewGrowth: viewsPrev30 > 0
            ? Math.round(((viewsLast30 - viewsPrev30) / viewsPrev30) * 100)
            : (viewsLast30 > 0 ? 100 : 0),
    };
}

