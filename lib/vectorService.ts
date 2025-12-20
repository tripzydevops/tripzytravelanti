import { supabase } from './supabaseClient';
import { Deal } from '../types';

/**
 * Validates if the Vector Service (Edge Function) is available.
 * Since keys are now backend-only, we just check if we have the Supabase instance.
 */
export function isVectorServiceConfigured(): boolean {
    return !!supabase;
}

/**
 * Returns the reason why the service might not be configured.
 */
export function getVectorServiceConfigError(): string | null {
    if (!supabase) return 'Supabase client not initialized';
    return null;
}

/**
 * Upserts a deal vector to Pinecone via Supabase Edge Function.
 * This approach keeps API keys secure on the backend.
 */
export async function upsertDealVector(deal: Deal) {
    try {
        console.log(`[VectorService] Requesting sync for deal: ${deal.title}`);

        const { data, error } = await supabase.functions.invoke('vector-sync', {
            body: {
                deal: {
                    id: deal.id,
                    title: deal.title,
                    vendor: deal.vendor,
                    category: deal.category,
                    description: deal.description,
                    requiredTier: deal.requiredTier,
                    discountedPrice: deal.discountedPrice
                },
                action: 'upsert'
            }
        });

        if (error) {
            console.error('[VectorService] Edge Function error:', error);
            throw error;
        }

        console.log(`[VectorService] Successfully synced deal: ${deal.title}`, data);
        return data;
    } catch (error) {
        console.error(`[VectorService] Error syncing deal ${deal.id}:`, error);
        throw error;
    }
}

/**
 * Deletes a deal vector from Pinecone via Supabase Edge Function.
 */
export async function deleteDealVector(dealId: string) {
    try {
        const { data, error } = await supabase.functions.invoke('vector-sync', {
            body: {
                deal: { id: dealId },
                action: 'delete'
            }
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`[VectorService] Error deleting deal ${dealId}:`, error);
        throw error;
    }
}

/**
 * Queries Pinecone for similar deals. 
 * NOTE: For now, we still need a way to generate embeddings for the query.
 * We should ideally move this to another Edge Function or use a public embedding model.
 * Since the user specifically asked about the "Sync" warning, we focus on the Upsert first.
 */
export async function querySimilarDeals(queryText: string, topK: number = 10): Promise<string[]> {
    try {
        const { data, error } = await supabase.functions.invoke('vector-sync', {
            body: {
                action: 'query',
                query: { text: queryText, topK }
            }
        });

        if (error || !data?.success) {
            console.error('[VectorService] Query error:', error || data?.error);
            return [];
        }

        const matches = data.results || [];
        return matches.map((m: any) => m.id);
    } catch (error) {
        console.error('[VectorService] querySimilarDeals failed:', error);
        return [];
    }
}
/**
 * Hashes a string using SHA-256 for cache keys
 */
async function hashPrompt(prompt: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(prompt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Checks if a cached response exists for the given prompt hash
 */
async function checkCache(promptHash: string): Promise<any | null> {
    const { data, error } = await supabase
        .from('generations_cache')
        .select('response_data')
        .eq('prompt_hash', promptHash)
        .maybeSingle();

    if (error) {
        console.error('[vectorService] Cache check error:', error);
        return null;
    }
    return data?.response_data;
}

/**
 * Saves a response to the cache
 */
async function saveToCache(promptHash: string, actionType: string, responseData: any) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Cache for 7 days

    const { error } = await supabase
        .from('generations_cache')
        .upsert({
            prompt_hash: promptHash,
            action_type: actionType,
            response_data: responseData,
            expires_at: expiresAt.toISOString()
        });

    if (error) {
        console.error('[vectorService] Cache save error:', error);
    }
}

/**
 * Ranks a list of candidate deals using Gemini via Supabase Edge Function.
 */
export async function rankDeals(prompt: string): Promise<string[]> {
    try {
        const promptHash = await hashPrompt(`rank:${prompt}`);
        const cached = await checkCache(promptHash);
        if (cached && Array.isArray(cached.results)) return cached.results;

        const { data, error } = await supabase.functions.invoke('vector-sync', {
            body: {
                action: 'rank',
                ranking: { prompt }
            }
        });

        if (error || !data?.success) {
            console.error('[VectorService] Rank error:', error || data?.error);
            return [];
        }

        if (data && data.success) {
            await saveToCache(promptHash, 'rank', data);
        }

        return data.results || [];
    } catch (error) {
        console.error('[VectorService] rankDeals failed:', error);
        return [];
    }
}

/**
 * Generates text (e.g. travel itineraries) using Gemini via Supabase Edge Function.
 */
export async function generateText(prompt: string): Promise<string> {
    try {
        const promptHash = await hashPrompt(`gen:${prompt}`);
        const cached = await checkCache(promptHash);
        if (cached && cached.text) return cached.text;

        const { data, error } = await supabase.functions.invoke('vector-sync', {
            body: {
                action: 'generate',
                generation: { prompt }
            }
        });

        if (error || !data?.success) {
            console.error('[VectorService] Generation error:', error || data?.error);
            return '';
        }

        if (data && data.success) {
            await saveToCache(promptHash, 'generate', data);
        }

        return data.text || '';
    } catch (error) {
        console.error('[VectorService] generateText failed:', error);
        return '';
    }
}

/**
 * Sends a message to the AI chatbot via Supabase Edge Function.
 */
export async function chatWithAI(message: string, history: any[], systemInstruction?: string) {
    try {
        const { data, error } = await supabase.functions.invoke('vector-sync', {
            body: {
                action: 'chat',
                chat: { message, history, systemInstruction }
            }
        });

        if (error || !data?.success) {
            console.error('[VectorService] Chat error:', error || data?.error);
            return null;
        }

        return data.response;
    } catch (error) {
        console.error('[VectorService] chatWithAI failed:', error);
        return null;
    }
}

/**
 * Gets search suggestions (Did you mean?) for a query.
 */
export async function getSearchSuggestions(queryText: string): Promise<string[]> {
    try {
        const promptHash = await hashPrompt(`suggest:${queryText}`);
        const cached = await checkCache(promptHash);
        if (cached && Array.isArray(cached.suggestions)) return cached.suggestions;

        const { data, error } = await supabase.functions.invoke('vector-sync', {
            body: {
                action: 'suggest',
                query: { text: queryText }
            }
        });

        if (error || !data?.success) {
            console.error('[VectorService] Suggestion error:', error || data?.error);
            return [];
        }

        if (data && data.success) {
            await saveToCache(promptHash, 'suggest', data);
        }

        return data.suggestions || [];
    } catch (error) {
        console.error('[VectorService] getSearchSuggestions failed:', error);
        return [];
    }
}


