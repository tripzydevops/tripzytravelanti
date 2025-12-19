import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenAI } from '@google/genai';
import { Deal } from '../types';

// Environment variables
const PINECONE_API_KEY = import.meta.env.VITE_PINECONE_API_KEY;
const PINECONE_INDEX_URL = import.meta.env.VITE_PINECONE_INDEX_URL;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Debug logging for configuration
if (import.meta.env.DEV) {
    console.log('[Pinecone Config Check]', {
        hasApiKey: !!PINECONE_API_KEY,
        hasIndexUrl: !!PINECONE_INDEX_URL,
        hasGeminiKey: !!GEMINI_API_KEY
    });
}

// Initialize clients
const pc = PINECONE_API_KEY ? new Pinecone({ apiKey: PINECONE_API_KEY }) : null;
const genAI = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

/**
 * Validates if Pinecone is fully configured.
 */
export function isVectorServiceConfigured(): boolean {
    return !!pc && !!PINECONE_INDEX_URL && !!genAI;
}

/**
 * Returns the reason why Pinecone might not be configured.
 */
export function getVectorServiceConfigError(): string | null {
    if (!PINECONE_API_KEY) return 'Missing VITE_PINECONE_API_KEY';
    if (!PINECONE_INDEX_URL) return 'Missing VITE_PINECONE_INDEX_URL';
    if (!GEMINI_API_KEY) return 'Missing VITE_GEMINI_API_KEY';
    return null;
}

/**
 * Generates an embedding for a given text using Google's text-embedding-004 model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    if (!genAI) {
        throw new Error('Gemini API Key is missing. Cannot generate embeddings.');
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
}

/**
 * Prepares a deal for indexing by combining relevant metadata into a searchable text string.
 */
function prepareDealText(deal: Deal): string {
    return `
        Title: ${deal.title}
        Vendor: ${deal.vendor}
        Category: ${deal.category}
        Description: ${deal.description}
        Required Tier: ${deal.requiredTier}
    `.trim();
}

/**
 * Upserts a deal vector to Pinecone.
 */
export async function upsertDealVector(deal: Deal) {
    if (!pc || !PINECONE_INDEX_URL) {
        console.warn(`Pinecone is not configured. Skipping vector upsert for ${deal.id}. Error: ${getVectorServiceConfigError()}`);
        return;
    }

    try {
        const text = prepareDealText(deal);
        const values = await generateEmbedding(text);

        // Extract host from URL (Pinecone SDK expects the host without https:// and trailing slashes)
        let host = PINECONE_INDEX_URL.replace('https://', '').replace('http://', '');
        if (host.endsWith('/')) {
            host = host.slice(0, -1);
        }

        const index = pc.index('', host);

        await index.upsert([
            {
                id: deal.id,
                values: values,
                metadata: {
                    title: deal.title,
                    vendor: deal.vendor,
                    category: deal.category,
                    requiredTier: deal.requiredTier,
                    discountedPrice: deal.discountedPrice,
                    type: 'deal'
                }
            }
        ]);

        console.log(`Successfully indexed deal in Pinecone: ${deal.title}`);
    } catch (error) {
        console.error(`Error indexing deal ${deal.id} in Pinecone:`, error);
        throw error; // Rethrow to allow caller to handle failure (e.g., stopping sync)
    }
}

/**
 * Queries Pinecone for similar deals based on a user's interests or recent activity.
 */
export async function querySimilarDeals(queryText: string, topK: number = 10): Promise<string[]> {
    if (!pc || !PINECONE_INDEX_URL) {
        console.warn('Pinecone is not configured. Returning empty results.');
        return [];
    }

    try {
        const queryVector = await generateEmbedding(queryText);

        let host = PINECONE_INDEX_URL.replace('https://', '').replace('http://', '');
        if (host.endsWith('/')) {
            host = host.slice(0, -1);
        }

        const index = pc.index('', host);

        const queryResponse = await index.query({
            vector: queryVector,
            topK: topK,
            includeMetadata: true
        });

        return queryResponse.matches.map(match => match.id);
    } catch (error) {
        console.error('Error querying similar deals from Pinecone:', error);
        return [];
    }
}
