import { supabase } from '../supabaseClient';
import { Deal } from '../../types';
import { transformDealFromDB } from './helpers';
import { upsertDealVector } from '../vectorService';

export interface Category {
    id: string;
    name: string;
    name_tr: string;
    icon?: string;
    default_image?: string;
    usage_count?: number;
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
        is_teasable: deal.isTeasable ?? true,
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

    const createdDeal = transformDealFromDB(data);

    // Index in vector database (async)
    upsertDealVector(createdDeal).catch(err => console.error('Failed to index new deal:', err));

    return createdDeal;
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
    if (updates.isTeasable !== undefined) dbUpdates.is_teasable = updates.isTeasable;
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

    const updatedDeal = transformDealFromDB(data);

    // Update index in vector database (async)
    upsertDealVector(updatedDeal).catch(err => console.error('Failed to update deal index:', err));

    return updatedDeal;
}

export async function deleteDeal(dealId: string) {
    const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId);

    if (error) {
        console.error('Error deleting deal:', error);
        throw error;
    }

    // Index update in vector database (async)
    const { deleteDealVector } = await import('../vectorService');
    deleteDealVector(dealId).catch(err => console.error('Failed to delete deal from vector index:', err));

    return { success: true };
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
// CATEGORY OPERATIONS
// =====================================================
export async function getCategories(): Promise<Category[]> {
    // We select *, and count deals that match the category name
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('name');

    if (catError) {
        console.error('Error fetching categories:', catError);
        return [];
    }

    // Since 'category' in deals is a string (name), we fetch counts separately or via a join if mapped
    // For MVP efficiency, we fetch all deals and count locally or use a count query
    const { data: counts, error: countError } = await supabase
        .from('deals')
        .select('category');

    if (countError) {
        console.error('Error fetching deal counts for categories:', countError);
        return categories;
    }

    return categories.map(cat => ({
        ...cat,
        usage_count: counts.filter(d => d.category === cat.name).length
    }));
}

export async function createCategory(category: Omit<Category, 'id'>) {
    const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateCategory(id: string, updates: Partial<Category>) {
    const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteCategory(id: string) {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

// =====================================================
// VECTOR / AI OPERATIONS
// =====================================================

/**
 * Fetch deals similar to a given deal using vector similarity search
 */
export async function getSimilarDeals(dealId: string, limit: number = 3): Promise<Deal[]> {
    try {
        const { data, error } = await supabase.functions.invoke('vector-sync', {
            body: {
                action: 'query',
                query: { dealId, topK: limit }
            }
        });

        if (error || !data?.success) {
            console.error('Vector query error:', error || data?.error);
            return [];
        }

        // The vector-sync function returns Pinecone matches. 
        // We need to fetch the actual deal data from Supabase for these IDs.
        const matches = data.results || [];
        const dealIds = matches.map((m: any) => m.id);

        if (dealIds.length === 0) return [];

        const { data: deals, error: dealsError } = await supabase
            .from('deals')
            .select('*')
            .in('id', dealIds);

        if (dealsError) {
            console.error('Error fetching deals for matches:', dealsError);
            return [];
        }

        // Return transformed deals, keeping the order from Pinecone (relevance)
        return dealIds.map((id: string) => {
            const deal = deals.find((d: any) => d.id === id);
            return deal ? transformDealFromDB(deal) : null;
        }).filter(Boolean) as Deal[];

    } catch (err) {
        console.error('getSimilarDeals failed:', err);
        return [];
    }
}

/**
 * Perform semantic search on deals using vector embeddings
 */
export async function searchDealsSemantic(text: string, limit: number = 20): Promise<Deal[]> {
    try {
        // If query is 'trending' or empty, return most recent active deals
        if (!text || text.toLowerCase() === 'trending') {
            const { data, error } = await supabase
                .from('deals')
                .select('*')
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data.map(transformDealFromDB);
        }

        const { data, error } = await supabase.functions.invoke('vector-sync', {
            body: {
                action: 'query',
                query: { text, topK: limit }
            }
        });

        if (error || !data?.success) {
            console.error('Semantic search error:', error || data?.error);
            return [];
        }

        const matches = data.results || [];
        const dealIds = matches.map((m: any) => m.id);

        if (dealIds.length === 0) return [];

        const { data: deals, error: dealsError } = await supabase
            .from('deals')
            .select('*')
            .in('id', dealIds);

        if (dealsError) {
            console.error('Error fetching deals for matches:', dealsError);
            return [];
        }

        // Return transformed deals, keeping the order from Pinecone (relevance score)
        return dealIds.map((id: string) => {
            const deal = deals.find((d: any) => d.id === id);
            return deal ? transformDealFromDB(deal) : null;
        }).filter(Boolean) as Deal[];

    } catch (err) {
        console.error('searchDealsSemantic failed:', err);
        return [];
    }
}

